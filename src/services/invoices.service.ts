/** Seller purchase invoices — admin API. Files are fetched as authenticated blobs. */

import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"

const clean = (p: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null))

export type InvoiceStatus = "UPLOADED" | "VERIFIED" | "REJECTED"

export interface Invoice {
  id: string
  shop_product_id: string
  vendor_id: string | null
  vendor_name: string
  product_name: string
  invoice_number: string
  invoice_date: string
  purchase_amount: number
  gst_amount: number
  supplier_name: string | null
  imei_serial: string | null
  file_name: string
  mime_type: string
  file_size: number
  status: InvoiceStatus
  rejection_reason: string | null
  verified_at: string | null
  verified_by_name: string | null
  uploaded_by_name: string | null
  created_at: string
}

export interface InvoiceStats { total: number; pending: number; verified: number; rejected: number; verified_amount: number }

export interface InvoiceForm {
  invoiceNumber: string
  invoiceDate: string
  purchaseAmount: string
  gstAmount: string
  supplierName: string
  imeiSerial: string
}

export const invoicesApi = {
  stats: () => api.get<ApiResponse<InvoiceStats>>("/admin/invoices/stats").then((r) => r.data.data),
  list: (params: Record<string, unknown>) =>
    api
      .get<{ data: Invoice[]; meta: { page: number; limit: number; total: number; totalPages: number } }>("/admin/invoices", { params: clean(params) })
      .then((r) => r.data),
  forListing: (listingId: string) =>
    api.get<{ data: Invoice[] }>(`/admin/invoices/listing/${listingId}`).then((r) => r.data.data),
  upload: (listingId: string, form: InvoiceForm, file: File) => {
    const fd = new FormData()
    fd.append("invoice_number", form.invoiceNumber)
    fd.append("invoice_date", form.invoiceDate)
    fd.append("purchase_amount", form.purchaseAmount)
    fd.append("gst_amount", form.gstAmount || "0")
    fd.append("supplier_name", form.supplierName)
    fd.append("imei_serial", form.imeiSerial)
    fd.append("file", file)
    return api
      .post<ApiResponse<Invoice>>(`/admin/invoices/listing/${listingId}`, fd, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data.data)
  },
  verify: (id: string) => api.post<ApiResponse<Invoice>>(`/admin/invoices/${id}/verify`).then((r) => r.data.data),
  reject: (id: string, reason: string) => api.post<ApiResponse<Invoice>>(`/admin/invoices/${id}/reject`, { reason }).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/admin/invoices/${id}`).then(() => undefined),
  /** The file sits in private storage, so it is fetched with the session and turned into a blob URL. */
  fileBlob: (id: string, download = false) =>
    api.get<Blob>(`/admin/invoices/${id}/file`, { params: download ? { download: 1 } : undefined, responseType: "blob" }).then((r) => r.data),
}
