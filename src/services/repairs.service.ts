/**
 * Repairs — B2C (single device) and B2B (bulk) mobile / device repairs.
 * All money (quote totals, tax, advance, balance, commission) is computed by the server.
 */
import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"
import type { EvidenceMedia } from "@/services/sell-requests.service"

export type RepairChannel = "B2C" | "B2B"
export type RepairStatus =
  | "REQUESTED" | "ACCEPTED" | "INSPECTION" | "ESTIMATE_SENT" | "ESTIMATE_APPROVED" | "IN_REPAIR" | "QC_PENDING"
  | "REPAIRED" | "READY_FOR_DELIVERY" | "COMPLETED" | "REJECTED" | "CANCELLED" | "ESTIMATE_REJECTED" | "FAILED"
export type RepairTab = "all" | "new" | "intake" | "approval" | "progress" | "qc" | "ready" | "problem" | "completed" | "closed"
export type ProblemCategory = "SCREEN" | "BATTERY" | "CHARGING" | "WATER_DAMAGE" | "SOFTWARE" | "CAMERA" | "AUDIO" | "BODY" | "BOARD" | "BIOMETRIC" | "DATA" | "OTHER"
export type WarrantyStatus = "IN_WARRANTY" | "OUT_OF_WARRANTY" | "UNKNOWN"
export type PaymentKind = "ADVANCE" | "BALANCE" | "DIAGNOSTIC" | "REFUND"
export type PaymentMethod = "CASH" | "UPI" | "CARD" | "BANK" | "COD" | "WALLET"

export interface RepairItem {
  id: string
  lineNo: number
  category: string
  brand: string
  model: string
  imeiSerial: string | null
  problemCategory: ProblemCategory
  problemDescription: string
  warrantyStatus: WarrantyStatus
  accessories: string | null
  status: "PENDING" | "REPAIRED" | "FAILED"
  diagnosis: string | null
  qcPassed: boolean | null
  qcNotes: string | null
  deliveredAt: string | null
}

export interface QuoteLine {
  itemId: string | null
  kind: "LABOUR" | "PART" | "DIAGNOSTIC" | "OTHER"
  description: string
  qty: number
  unitPrice: number
  amount?: number
  serviceCode?: string
}

export interface RepairQuote {
  id: string
  version: number
  status: "SENT" | "APPROVED" | "REJECTED" | "SUPERSEDED" | "EXPIRED"
  lines: QuoteLine[]
  subtotal: number
  discountPct: number
  discountAmount: number
  taxable: number
  taxPct: number
  taxAmount: number
  total: number
  note: string | null
  validUntil: string
  expired: boolean
  createdAt: string
}

export interface RepairMoney {
  approvedTotal: number
  advanceRequired: number
  amountPaid: number
  amountDue: number
  refundable: number
  dueDate: string | null
  overdue: boolean
}

export interface RepairPayment { id: string; kind: PaymentKind; method: PaymentMethod; amount: number; reference: string | null; note: string | null; at: string }

export interface Repair {
  id: string
  code: string
  channel: RepairChannel
  status: RepairStatus
  createdAt: string
  updatedAt: string
  customer: { name: string; phone: string; email: string; city: string }
  business: { name: string; gstin: string; poReference: string | null; contactPerson: string; contractDiscountPct: number; paymentTermsDays: number } | null
  serviceMode: "PICKUP" | "DROP_OFF"
  pickupAddress: string | null
  pickupSlot: string | null
  description: string
  serviceCenterId: string | null
  serviceCenter: string | null
  technician: string | null
  deviceReceivedAt: string | null
  money: RepairMoney
  warrantyUntil: string | null
  reworkCount: number
  reopenedCount: number
  sla: { inspectionDue: string | null; repairDue: string | null; breached: boolean }
  deviceCount: number
  deliveredCount: number
  note?: string
  firstDevice?: string | null
  items: RepairItem[]
  quotes: RepairQuote[]
  payments: RepairPayment[]
  timeline: Array<{ kind: string; label: string; at: string; from: string | null; to: string | null }>
  media: Array<EvidenceMedia & { itemId?: string | null }>
  settlement?: { commissionPct: number; commission: number; vendorPayable: number } | null
  /** Sales invoice issued for this repair, if any. */
  invoice?: { id: string; number: string; docType: string } | null
}

export interface RepairList { items: Repair[]; total: number; page: number; pages: number; counts: Record<string, number> }

export interface RepairStats {
  total: number; b2b: number; b2c: number; open: number; awaitingApproval: number; problems: number
  slaBreached: number; outstanding: number; overdue: number; completedValueMonth: number
}

export interface RepairSettings {
  enabled: boolean; b2cEnabled: boolean; b2bEnabled: boolean; requireAdvance: boolean
  diagnosticFee: number; advancePct: number; taxPct: number; platformCommissionPct: number
  defaultWarrantyDays: number; estimateValidityDays: number; slaInspectionHours: number; slaRepairHours: number
  maxB2cDevices: number; maxB2bDevices: number; maxImages: number; maxVideos: number; maxImageMb: number; maxVideoMb: number
}

export interface RepairServiceItem {
  id: string; code: string; name: string; category: ProblemCategory; deviceCategory: "ANY" | "Smartphone" | "Tablet" | "Laptop"
  labourPrice: number; estHours: number; warrantyDays: number | null; isActive: boolean
}

export interface BusinessTerms { id: string; gstin: string; businessName: string; discountPct: number; paymentTermsDays: number; creditLimit: number; isActive: boolean }

export interface CreateRepairInput {
  channel: RepairChannel
  customer: { name: string; phone: string; email?: string; city?: string }
  businessName?: string
  gstin?: string
  contactPerson?: string
  poReference?: string
  serviceMode: "PICKUP" | "DROP_OFF"
  pickupAddress?: string
  description?: string
  items: Array<{ category: string; brand: string; model: string; imeiSerial?: string; problemCategory: ProblemCategory; problemDescription?: string; warrantyStatus: WarrantyStatus; accessories?: string }>
  mediaIds?: string[]
}

export interface QcResult { itemId: string; passed: boolean; notes?: string }

export const PROBLEM_LABEL: Record<ProblemCategory, string> = {
  SCREEN: "Screen / display", BATTERY: "Battery", CHARGING: "Charging port", WATER_DAMAGE: "Water damage", SOFTWARE: "Software / OS",
  CAMERA: "Camera", AUDIO: "Speaker / mic", BODY: "Body / glass", BOARD: "Motherboard", BIOMETRIC: "Face ID / fingerprint", DATA: "Data recovery", OTHER: "Other",
}

const BASE = "/manage/repairs"
const clean = (p: Record<string, unknown>) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null && v !== "all"))
const unwrap = <T,>(r: { data: ApiResponse<T> }) => r.data.data

export const repairsApi = {
  stats: () => api.get<ApiResponse<RepairStats>>(`${BASE}/stats`).then(unwrap),
  list: (f: Record<string, unknown>) => api.get<ApiResponse<RepairList>>(BASE, { params: clean(f) }).then(unwrap),
  get: (id: string) => api.get<ApiResponse<Repair>>(`${BASE}/${id}`).then(unwrap),
  create: (b: CreateRepairInput) => api.post<ApiResponse<Repair>>(BASE, b).then(unwrap),
  act: (id: string, action: string, body: Record<string, unknown> = {}) => api.post<ApiResponse<Repair>>(`${BASE}/${id}/${action}`, body).then(unwrap),
  diagnose: (id: string, itemId: string, body: { diagnosis: string; repairable: boolean }) =>
    api.post<ApiResponse<Repair>>(`${BASE}/${id}/items/${itemId}/diagnosis`, body).then(unwrap),
  quote: (id: string, body: { lines: QuoteLine[]; note?: string }) => api.post<ApiResponse<Repair>>(`${BASE}/${id}/quotes`, body).then(unwrap),
  qc: (id: string, results: QcResult[], note?: string) => api.post<ApiResponse<Repair>>(`${BASE}/${id}/qc`, { results, note }).then(unwrap),
  pay: (id: string, body: { kind: PaymentKind; method: PaymentMethod; amount: number; reference?: string; note?: string; idempotencyKey: string }) =>
    api.post<ApiResponse<Repair>>(`${BASE}/${id}/payments`, body).then(unwrap),
  settings: () => api.get<ApiResponse<RepairSettings>>(`${BASE}/config/settings`).then(unwrap),
  saveSettings: (b: Partial<RepairSettings>) => api.put<ApiResponse<RepairSettings>>(`${BASE}/config/settings`, b).then(unwrap),
  services: () => api.get<ApiResponse<RepairServiceItem[]>>(`${BASE}/config/services`).then(unwrap),
  saveService: (id: string | null, b: Partial<RepairServiceItem>) =>
    (id ? api.put<ApiResponse<RepairServiceItem>>(`${BASE}/config/services/${id}`, b) : api.post<ApiResponse<RepairServiceItem>>(`${BASE}/config/services`, b)).then(unwrap),
  terms: () => api.get<ApiResponse<BusinessTerms[]>>(`${BASE}/config/terms`).then(unwrap),
  saveTerms: (b: Omit<BusinessTerms, "id">) => api.put<ApiResponse<BusinessTerms>>(`${BASE}/config/terms`, b).then(unwrap),
  // evidence (same private storage + signed links as sell requests)
  upload: async (file: File, opts: { onProgress?: (pct: number) => void; signal?: AbortSignal } = {}) => {
    const fd = new FormData()
    fd.append("files", file, file.name)
    const r = await api.post<ApiResponse<{ files: Array<{ ok: boolean; media?: EvidenceMedia; message?: string }> }>>(`${BASE}/media`, fd, {
      timeout: 0, signal: opts.signal,
      onUploadProgress: (e) => { if (e.total) opts.onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100))) },
    })
    const f = r.data.data.files[0]
    if (!f?.ok || !f.media) throw new Error(f?.message || "Upload failed")
    opts.onProgress?.(100)
    return f.media
  },
  discard: (mediaId: string) => api.delete(`${BASE}/media/${mediaId}`).then(() => undefined),
  attach: (id: string, mediaIds: string[], stage: string, itemId?: string) => api.post<ApiResponse<Repair>>(`${BASE}/${id}/media`, { mediaIds, stage, itemId }).then(unwrap),
  link: (mediaId: string) => api.get<ApiResponse<EvidenceMedia>>(`${BASE}/media/${mediaId}/link`).then(unwrap),
}
