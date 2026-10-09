/** Global price control, bulk stock and batch history — admin API. */

import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"

export type PriceOperation = "PERCENT" | "FIXED" | "SET" | "DISCOUNT_FROM_MRP"
export type StockOperation = "SET" | "ADD" | "SUBTRACT"
export type PriceTarget = "RETAIL" | "WHOLESALE" | "BOTH"
export type Rounding = "NONE" | "RUPEE" | "TEN"

export interface PricingScope {
  all?: boolean
  vendorIds?: string[]
  categoryIds?: string[]
  brands?: string[]
  listingIds?: string[]
  owner?: "ADMIN" | "VENDOR" | null
  channel?: "B2C" | "B2B" | null
}

export interface PriceParams {
  operation: PriceOperation
  value: number
  rounding?: Rounding
  target?: PriceTarget
  allowLargeChange?: boolean
  allowBelowCost?: boolean
}

export interface StockParams { operation: StockOperation; value: number }

export interface PreviewRow {
  id: string
  name: string
  brand: string | null
  field: "sale_price" | "wholesale_price" | "stock_quantity"
  old: number | null
  new: number | null
  skip: string | null
}

export interface Preview {
  summary: { total: number; changed: number; skipped: number; listings: number; skipReasons: Record<string, number> }
  sample: PreviewRow[]
  truncated: boolean
}

export interface Batch {
  id: string
  kind: "PRICE" | "STOCK"
  operation: string
  params: Record<string, unknown>
  scope: PricingScope
  note: string | null
  status: "APPLIED" | "REVERTED"
  item_count: number
  skipped_count: number
  created_by_name: string | null
  created_at: string
  reverted_by_name: string | null
  reverted_at: string | null
}

export interface BatchItem {
  field: string
  old_value: number
  new_value: number
  current_value: number | null
  name: string
  brand: string | null
  listing_id: string
}

export const pricingApi = {
  brands: () => api.get<ApiResponse<{ brand: string; listings: number }[]>>("/admin/pricing/brands").then((r) => r.data.data),
  previewPrice: (body: { scope: PricingScope; params: PriceParams }) =>
    api.post<ApiResponse<Preview>>("/admin/pricing/price/preview", body).then((r) => r.data.data),
  applyPrice: (body: { scope: PricingScope; params: PriceParams; note?: string }) =>
    api.post<ApiResponse<{ batchId: string; changed: number; skipped: number }>>("/admin/pricing/price/apply", body).then((r) => r.data.data),
  previewStock: (body: { scope: PricingScope; params: StockParams }) =>
    api.post<ApiResponse<Preview>>("/admin/pricing/stock/preview", body).then((r) => r.data.data),
  applyStock: (body: { scope: PricingScope; params: StockParams; note?: string }) =>
    api.post<ApiResponse<{ batchId: string; changed: number; skipped: number }>>("/admin/pricing/stock/apply", body).then((r) => r.data.data),
  batches: (params: { page?: number; limit?: number }) =>
    api
      .get<{ data: Batch[]; meta: { page: number; limit: number; total: number; totalPages: number } }>("/admin/pricing/batches", { params })
      .then((r) => r.data),
  batchItems: (id: string, page = 1) =>
    api.get<{ batch: Batch; data: BatchItem[] }>(`/admin/pricing/batches/${id}`, { params: { page, limit: 50 } }).then((r) => r.data),
  revert: (id: string) => api.post<ApiResponse<{ restored: number; conflicts: number }>>(`/admin/pricing/batches/${id}/revert`).then((r) => r.data.data),
}
