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
  updateSettings: (body: Partial<Pick<SellSettings, "enabled" | "rules" | "maxTotalDeductionPct" | "variantStepPct" | "maxImages">>) =>
    api.put<ApiResponse<SellSettings>>(`${SHARED}/settings`, body).then((r) => r.data.data),
  createModel: (body: ModelInput) => api.post<ApiResponse<CatalogModel>>(`${SHARED}/models`, body).then((r) => r.data.data),
  updateModel: (id: string, body: Partial<ModelInput>) => api.put<ApiResponse<CatalogModel>>(`${SHARED}/models/${id}`, body).then((r) => r.data.data),
  uploadImages: async (files: File[]) => {
    const fd = new FormData()
    files.forEach((f) => fd.append("file", f))
    const r = await api.post<{ data: { urls: string[] } }>("/uploads/local", fd, { headers: { "Content-Type": "multipart/form-data" } })
    return r.data.data.urls
  },
}

/** Pull the backend's human message out of an axios error. */
export function apiMessage(err: unknown, fallback = "Something went wrong"): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string }
  return e?.response?.data?.message || e?.message || fallback
}
