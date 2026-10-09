/**
 * Sales documents — GST tax invoices, bills of supply, credit and debit notes (B2C + B2B).
 * Documents are immutable once issued; files are fetched as authenticated blobs (never public links).
 */
import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"

export type DocType = "TAX_INVOICE" | "BILL_OF_SUPPLY" | "CREDIT_NOTE" | "DEBIT_NOTE"
export type SalesChannel = "B2C" | "B2B"

export interface DocLine {
  description: string; hsnSac: string; unit: string; qty: number; unitPrice: number; discount: number
  taxable: number; taxRate: number; cgst: number; sgst: number; igst: number; total: number
}

export interface Party {
  name?: string | null; businessName?: string | null; legalName?: string | null; gstin?: string | null; pan?: string | null
  address?: string | null; shipTo?: string | null; state?: string | null; stateCode?: string | null; phone?: string | null; email?: string | null
}

export interface PaymentInfo { status: "PAID" | "PARTIAL" | "UNPAID" | "UNTRACKED"; paid: number | null; due: number | null }

export interface SalesDoc {
  id: string
  docType: DocType
  number: string
  channel: SalesChannel
  issueDate: string
  dueDate: string | null
  orderRef: string | null
  poReference: string | null
  sourceType: "REPAIR" | "SELLER_ORDER" | "MANUAL"
  sourceId: string | null
  refDocumentId: string | null
  refNumber: string | null
  reason: string | null
  seller: { name: string; gstin: string | null; state: string | null }
  buyer: { name: string; gstin: string | null }
  taxable: number; cgst: number; sgst: number; igst: number; roundOff: number; total: number
  supplyType: "INTRA" | "INTER"
  createdAt: string
  payment: PaymentInfo | null
  irn: { status: string; value: string | null }
  credited?: number
}

export interface SalesDocDetail extends SalesDoc {
  sellerFull: Party; buyerFull: Party; placeOfSupply: string; posAssumed: boolean
  lines: DocLine[]
  taxSummary: Array<{ hsnSac: string; taxRate: number; taxable: number; cgst: number; sgst: number; igst: number }>
  payments: Array<{ kind: string; method: string; amount: number; reference?: string | null }>
  notes: string | null; terms: string | null
  pdf: { bytes: number; checksum: string }
  creditable?: Array<{ index: number; remainingQty: number }>
  notesIssued: SalesDoc[]
  history: Array<{ kind: string; at: string; actorRole: string | null; actorName?: string; meta: Record<string, unknown> }>
}

export interface SalesList {
  items: SalesDoc[]; total: number; page: number; pages: number
  summary: { byChannel: Record<SalesChannel, number>; invoiced: number; credited: number }
}

export interface InvoiceSettings {
  legalName: string | null; gstin: string | null; pan: string | null; address: string | null; stateCode: string | null
  email: string | null; phone: string | null; repairServiceSac: string; repairPartsHsn: string; terms: string; footer: string
}

export interface ManualLine { description: string; hsnSac?: string; qty: number; unitPrice: number; discount?: number; taxRate: number; unit?: string }

export interface ManualInvoiceInput {
  channel: SalesChannel
  issuerVendorId?: string
  buyer: { name?: string; businessName?: string; gstin?: string; address?: string; state?: string; phone?: string; email?: string }
  lines: ManualLine[]
  taxInclusive?: boolean
  orderRef?: string
  poReference?: string
  dueDate?: string
  notes?: string
}

export const DOC_LABEL: Record<DocType, string> = { TAX_INVOICE: "Tax invoice", BILL_OF_SUPPLY: "Bill of supply", CREDIT_NOTE: "Credit note", DEBIT_NOTE: "Debit note" }
export const GST_SLABS = [0, 0.25, 3, 5, 12, 18, 28]

/** With responseType "blob" an error body arrives as a Blob; turn it back into the server's JSON so the message is not lost. */
async function readBlobError(e: unknown): Promise<never> {
  const err = e as { response?: { data?: unknown } }
  if (err?.response?.data instanceof Blob) {
    try { err.response.data = JSON.parse(await err.response.data.text()) } catch { /* keep the generic error */ }
  }
  throw e
}

const BASE = "/manage/sales-invoices"
const clean = (p: Record<string, unknown>) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null && v !== "all"))
const unwrap = <T,>(r: { data: ApiResponse<T> }) => r.data.data

export const salesInvoicesApi = {
  list: (f: Record<string, unknown>) => api.get<ApiResponse<SalesList>>(BASE, { params: clean(f) }).then(unwrap),
  get: (id: string) => api.get<ApiResponse<SalesDocDetail>>(`${BASE}/${id}`).then(unwrap),
  forSource: (type: "repair" | "order", id: string) => api.get<ApiResponse<{ id: string; number: string; docType: DocType } | null>>(`${BASE}/for/${type}/${id}`).then(unwrap),
  issueRepair: (id: string) => api.post<ApiResponse<SalesDocDetail>>(`${BASE}/issue/repair/${id}`).then(unwrap),
  issueOrder: (id: string) => api.post<ApiResponse<SalesDocDetail>>(`${BASE}/issue/order/${id}`).then(unwrap),
  issueManual: (b: ManualInvoiceInput) => api.post<ApiResponse<SalesDocDetail>>(BASE, b).then(unwrap),
  creditNote: (id: string, b: { reason: string; lines: Array<{ index: number; qty?: number }>; notes?: string }) => api.post<ApiResponse<SalesDocDetail>>(`${BASE}/${id}/credit-notes`, b).then(unwrap),
  debitNote: (id: string, b: { reason: string; lines: ManualLine[]; taxInclusive?: boolean }) => api.post<ApiResponse<SalesDocDetail>>(`${BASE}/${id}/debit-notes`, b).then(unwrap),
  settings: () => api.get<ApiResponse<InvoiceSettings>>(`${BASE}/settings`).then(unwrap),
  saveSettings: (b: Partial<InvoiceSettings>) => api.put<ApiResponse<InvoiceSettings>>(`${BASE}/settings`, b).then(unwrap),
  pdf: async (id: string, download: boolean) => {
    const r = await api.get<Blob>(`${BASE}/${id}/pdf`, { params: download ? { download: 1 } : {}, responseType: "blob", timeout: 60_000 }).catch(readBlobError)
    return new Blob([r.data], { type: "application/pdf" })
  },
  exportCsv: async (f: Record<string, unknown>) => {
    const r = await api.get<Blob>(`${BASE}/export`, { params: clean(f), responseType: "blob", timeout: 60_000 }).catch(readBlobError)
    return { blob: r.data, truncated: String(r.headers["x-truncated"]) === "true", count: Number(r.headers["x-row-count"] ?? 0) }
  },
}

/** Open a stored PDF in a new tab. The tab is opened first (inside the click) so pop-up blockers allow it. */
export async function viewPdf(id: string) {
  const tab = window.open("", "_blank")
  try {
    const blob = await salesInvoicesApi.pdf(id, false)
    const url = URL.createObjectURL(blob)
    if (tab) tab.location.href = url
    else window.location.href = url
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000)
  } catch (e) {
    tab?.close()
    throw e
  }
}

export async function downloadPdf(id: string, number: string) {
  const blob = await salesInvoicesApi.pdf(id, true)
  saveBlob(blob, `${number.replace(/\//g, "-")}.pdf`)
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
