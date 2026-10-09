/**
 * Sell & Exchange requests — admin management surface.
 *
 * Two SEPARATE sections that share one valuation engine:
 *   SELL      — a customer sells an old device.            /manage/sell-requests      codes SELL-…
 *   EXCHANGE  — a customer buys a new device and trades    /manage/exchange-requests  codes EXCH-…
 *               the old one in against it.
 * The backend scopes every call to its section, so one never returns the other's rows.
 *
 * Flow: model + IMEI → condition QA (scratches, age, bill / box / charger, screen & skin replaced …) →
 * server-computed value → vendors place offers → admin assigns, approves, completes.
 */

import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"

export type RequestKind = "SELL" | "EXCHANGE"
export type SellRequestStatus = "PENDING" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED" | "CANCELLED"
export type SellRequestType = "SELL_TO_AB" | "BUY_NOW" | "EXCHANGE"
export type DeviceCondition = "EXCELLENT" | "GOOD" | "FAIR" | "POOR"
export type DeviceCategory = "Smartphone" | "Tablet" | "Laptop"
export type Scratches = "NONE" | "MINOR" | "MAJOR"

export interface DeviceQA {
  ageMonths: number
  screenScratches: Scratches
  bodyDents: boolean
  screenReplaced: boolean
  /** Back-panel / skin replaced or wrapped. */
  skinReplaced: boolean
  billAvailable: boolean
  boxAvailable: boolean
  chargerAvailable: boolean
  batteryHealth: number
  powersOn: boolean
}

export interface CatalogModel {
  id: string
  name: string
  category: DeviceCategory
  variants: string[]
  colors: string[]
  /** Base resale value (₹) for the top variant in mint condition. */
  basePrice: number
  isActive?: boolean
}

export interface VendorOffer {
  vendorId: string
  vendorName: string
  city: string
  rating: number
  distanceKm: number
  amount: number
  status: "OPEN" | "ACCEPTED" | "DECLINED"
}

export interface ExchangeOrder {
  id: string
  orderNumber: string
  status: string
  total: number | null
  linkedAt: string | null
}

export interface SellSettings {
  enabled: boolean
  rules: Record<string, number>
  defaultRules: Record<string, number>
  maxTotalDeductionPct: number
  variantStepPct: number
  maxImages: number
  maxVideos: number
  maxImageMb: number
  maxVideoMb: number
  /** When on, a request needs a passed QC before approval and an accepted valuation before completion. */
  qcRequiredForApproval: boolean
}

export type EvidenceStage = "CUSTOMER_SUBMISSION" | "PICKUP_INSPECTION" | "TECHNICIAN_QC" | "FINAL_QC" | "DISPUTE"
export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED"

export interface EvidenceMedia {
  id: string
  mediaType: "IMAGE" | "VIDEO"
  stage: EvidenceStage
  filename: string
  mimeType: string
  size: number
  checksum: string
  uploadedAt: string
  uploadedByRole: "CUSTOMER" | "ADMIN" | "VENDOR"
  attached: boolean
  verification: { status: VerificationStatus; note?: string; at: string | null }
  /** API-relative signed link (valid 30 min). Resolve with `mediaSrc()`. */
  url: string
}

export type QcStatus =
  | "NOT_STARTED" | "AWAITING_EVIDENCE" | "EVIDENCE_UPLOADED" | "INSPECTION_PENDING"
  | "INSPECTION_COMPLETE" | "PASSED" | "RECHECK" | "FAILED"
export type CustomerDecision = "NONE" | "PENDING" | "ACCEPTED" | "DECLINED"

export interface QcHistoryItem {
  at: string
  action: string
  from: string | null
  to: string | null
  note?: string
  actorRole: string | null
  actorName?: string
}

export interface RequestQc {
  status: QcStatus
  inspectorName?: string | null
  physicalCondition?: DeviceCondition | null
  imeiVerified?: boolean | null
  imeiObserved?: string | null
  screenCondition?: ScreenCondition | null
  batteryHealth?: number | null
  functionality?: Record<string, boolean>
  remarks?: string | null
  finalValuation?: number | null
  customerDecision: CustomerDecision
  inspectedAt?: string | null
  history: QcHistoryItem[]
}

export type ScreenCondition = "FLAWLESS" | "MINOR_SCRATCHES" | "MAJOR_SCRATCHES" | "CRACKED" | "DEAD_PIXELS"

export interface InspectionInput {
  physicalCondition: DeviceCondition
  screenCondition: ScreenCondition
  imeiVerified: boolean
  imeiObserved?: string
  batteryHealth?: number
  functionality: Record<string, boolean>
  remarks?: string
}

export interface ModelInput {
  name: string
  category: DeviceCategory
  variants: string[]
  colors: string[]
  basePrice: number
  isActive?: boolean
}

export interface TimelineEvent {
  label: string
  at: string
  done: boolean
}

export interface ExchangeDetails {
  newProduct: string
  newProductPrice: number
  tradeInValue: number
  payable: number
}

export interface SellRequest {
  id: string
  code: string
  kind: RequestKind
  status: SellRequestStatus
  type: SellRequestType
  createdAt: string
  customer: { name: string; phone: string; email: string; city: string; totalRequests: number }
  device: { model: string; variant: string; color: string; category: DeviceCategory; imei: string }
  condition: DeviceCondition
  qa: DeviceQA
  description: string
  imageCount: number
  images?: string[]
  /** Private evidence (photos + QC video). Historical requests have `[]` and keep using `images`. */
  media?: EvidenceMedia[]
  videoCount?: number
  qc?: RequestQc
  deductions?: Array<{ label: string; pct: number }>
  finalPrice?: number | null
  /** Value the customer expects. */
  expectedPrice: number
  /** System-computed quote. */
  quote: number
  offers: VendorOffer[]
  assignedVendor: string | null
  exchange?: ExchangeDetails
  exchangeOrder?: ExchangeOrder | null
  timeline: TimelineEvent[]
  adminNote?: string
}

export interface SellRequestStats {
  /** Sum of the system value of approved + completed requests (₹). */
  approvedValue: number
  /** EXCHANGE only: open or approved exchanges whose new-product order is not linked yet. */
  awaitingOrder?: number
  total: number
  pending: number
  approved: number
  rejected: number
  completed: number
  /** % change, requests created last 7d vs the 7d before. */
  trend: Record<"total" | "pending" | "approved" | "rejected" | "completed", number>
}

export interface SellRequestFilters {
  status?: string
  q?: string
  category?: string
  condition?: string
  type?: string
  page?: number
  limit?: number
}

export interface SellRequestList {
  items: SellRequest[]
  total: number
  page: number
  pages: number
  counts: Record<string, number>
}

export type SellRequestAction = "APPROVE" | "REJECT" | "CANCEL" | "REQUEST_INFO" | "ASSIGN_VENDOR" | "COMPLETE"

export interface CreateSellRequestInput {
  type: SellRequestType
  customer: { name: string; phone: string }
  model: string
  variant: string
  color: string
  imei: string
  qa: DeviceQA
  expectedPrice: number
  description?: string
  exchange?: { newProduct: string; newProductPrice: number }
  /** EXCHANGE only: order the customer already placed for the new product. */
  orderNumber?: string
  images?: string[]
  /** Ids of files uploaded through `evidenceApi.upload`. */
  mediaIds?: string[]
}

export interface QuoteResult {
  quote: number
  condition: DeviceCondition
  base: number
  totalPct: number
  deductions: Array<{ label: string; pct: number }>
}

export interface QuoteInput {
  model: string
  variant: string
  color: string
  qa: DeviceQA
}

export const DEFAULT_QA: DeviceQA = {
  ageMonths: 12,
  screenScratches: "NONE",
  bodyDents: false,
  screenReplaced: false,
  skinReplaced: false,
  billAvailable: true,
  boxAvailable: true,
  chargerAvailable: true,
  batteryHealth: 90,
  powersOn: true,
}

/** Luhn check — an IMEI is 15 digits. Mirrors the server rule for instant feedback only. */
export function isValidImei(v: string): boolean {
  if (!/^\d{15}$/.test(v)) return false
  let sum = 0
  for (let i = 0; i < 15; i++) {
    let n = Number(v[14 - i])
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9 }
    sum += n
  }
  return sum % 10 === 0
}

const BASES: Record<RequestKind, string> = { SELL: "/manage/sell-requests", EXCHANGE: "/manage/exchange-requests" }
const clean = (p: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null && v !== "all"))

const ACTION_PATH: Record<SellRequestAction, string> = {
  APPROVE: "approve",
  REJECT: "reject",
  CANCEL: "cancel",
  REQUEST_INFO: "request-info",
  ASSIGN_VENDOR: "assign-vendor",
  COMPLETE: "complete",
}

/** The API for one section. */
export function requestsApi(kind: RequestKind) {
  const BASE = BASES[kind]
  return {
    stats: () => api.get<ApiResponse<SellRequestStats>>(`${BASE}/stats`).then((r) => r.data.data),
    list: (f: SellRequestFilters) =>
      api.get<ApiResponse<SellRequestList>>(BASE, { params: clean({ ...f }) }).then((r) => r.data.data),
    get: (id: string) => api.get<ApiResponse<SellRequest>>(`${BASE}/${id}`).then((r) => r.data.data),
    create: (body: CreateSellRequestInput) => api.post<ApiResponse<SellRequest>>(BASE, body).then((r) => r.data.data),
    act: (id: string, action: SellRequestAction, payload?: { note?: string; vendorId?: string }) =>
      api.post<ApiResponse<SellRequest>>(`${BASE}/${id}/${ACTION_PATH[action]}`, {
        vendorId: payload?.vendorId,
        reason: payload?.note,
        message: payload?.note,
      }).then((r) => r.data.data),
    /** EXCHANGE only. */
    linkOrder: (id: string, orderNumber: string) =>
      api.post<ApiResponse<SellRequest>>(`${BASE}/${id}/link-order`, { orderNumber }).then((r) => r.data.data),
    models: () => api.get<ApiResponse<CatalogModel[]>>(`${BASE}/models`).then((r) => r.data.data),
    quote: (body: QuoteInput) => api.post<ApiResponse<QuoteResult>>(`${BASE}/quote`, body).then((r) => r.data.data),
  }
}

export const sellRequestsApi = requestsApi("SELL")
export const exchangeRequestsApi = requestsApi("EXCHANGE")

/** Valuation settings + device catalogue are shared by both sections and live under Sell. */
const SHARED = BASES.SELL
export const sellSettingsApi = {
  settings: () => api.get<ApiResponse<SellSettings>>(`${SHARED}/settings`).then((r) => r.data.data),
  updateSettings: (body: Partial<Pick<SellSettings, "enabled" | "rules" | "maxTotalDeductionPct" | "variantStepPct" | "maxImages" | "maxVideos" | "maxImageMb" | "maxVideoMb" | "qcRequiredForApproval">>) =>
    api.put<ApiResponse<SellSettings>>(`${SHARED}/settings`, body).then((r) => r.data.data),
  createModel: (body: ModelInput) => api.post<ApiResponse<CatalogModel>>(`${SHARED}/models`, body).then((r) => r.data.data),
  updateModel: (id: string, body: Partial<ModelInput>) => api.put<ApiResponse<CatalogModel>>(`${SHARED}/models/${id}`, body).then((r) => r.data.data),
}

/** Pull the backend's human message out of an axios error. */
export function apiMessage(err: unknown, fallback = "Something went wrong"): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string }
  return e?.response?.data?.message || e?.message || fallback
}

// ── Evidence (photos + QC video) and request-level QC ───────────────────

/** Turn an API-relative signed link into a URL the browser can load. */
export function mediaSrc(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  const base = process.env.NEXT_PUBLIC_API_URL || ""
  try {
    return new URL(path, base || (typeof window !== "undefined" ? window.location.origin : "http://localhost")).toString()
  } catch {
    return path
  }
}

/** The backend reports per-file problems in `data.files[0]`; fall back to the generic message. */
export function uploadErrorMessage(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { message?: string; data?: { files?: Array<{ message?: string }> } } }; code?: string; message?: string }
  const perFile = e?.response?.data?.data?.files?.[0]?.message
  if (perFile) return perFile
  if (e?.response?.status === 413) return "The file is too large for the server. Ask an admin to check the upload limits."
  if (e?.response?.status === 401) return "Your session expired. Sign in again, then retry."
  if (e?.code === "ECONNABORTED" || e?.code === "ERR_NETWORK") return "Network problem — the upload did not finish. Retry."
  return e?.response?.data?.message || e?.message || "Upload failed"
}

/**
 * Evidence + QC calls for one section. Uploads are one file per request so each file has its own
 * progress and can be retried alone. Uploads use no client timeout: the shared axios instance
 * cancels every request after 15 s, which is shorter than a QC video takes on a mobile network.
 */
export function evidenceApi(kind: RequestKind) {
  const BASE = BASES[kind]
  return {
    upload: async (file: File, opts: { onProgress?: (pct: number) => void; signal?: AbortSignal } = {}) => {
      const fd = new FormData()
      fd.append("files", file, file.name)
      const r = await api.post<ApiResponse<{ files: Array<{ ok: boolean; media?: EvidenceMedia; message?: string }> }>>(`${BASE}/media`, fd, {
        timeout: 0,
        signal: opts.signal,
        onUploadProgress: (e) => { if (e.total) opts.onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100))) },
      })
      const f = r.data.data.files[0]
      if (!f?.ok || !f.media) throw new Error(f?.message || "Upload failed")
      opts.onProgress?.(100)
      return f.media
    },
    discard: (mediaId: string) => api.delete(`${BASE}/media/${mediaId}`).then(() => undefined),
    attach: (id: string, mediaIds: string[], stage: EvidenceStage) =>
      api.post<ApiResponse<SellRequest>>(`${BASE}/${id}/media`, { mediaIds, stage }).then((r) => r.data.data),
    verify: (mediaId: string, status: VerificationStatus, note?: string) =>
      api.post<ApiResponse<EvidenceMedia>>(`${BASE}/media/${mediaId}/verify`, { status, note }).then((r) => r.data.data),
    link: (mediaId: string) => api.get<ApiResponse<EvidenceMedia>>(`${BASE}/media/${mediaId}/link`).then((r) => r.data.data),
    qcStart: (id: string, inspectorId?: string) => api.post(`${BASE}/${id}/qc/start`, { inspectorId }).then((r) => r.data.data),
    qcInspection: (id: string, body: InspectionInput) => api.post(`${BASE}/${id}/qc/inspection`, body).then((r) => r.data.data),
    qcDecision: (id: string, body: { result: "PASSED" | "RECHECK" | "FAILED"; note?: string; finalValuation?: number }) =>
      api.post(`${BASE}/${id}/qc/decision`, body).then((r) => r.data.data),
    qcReopen: (id: string, reason: string) => api.post(`${BASE}/${id}/qc/reopen`, { reason }).then((r) => r.data.data),
  }
}
