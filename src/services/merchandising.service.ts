/** Product sections, B2C/B2B channels, bulk listing actions — admin API. */

import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"

export type SectionKey = "NEW_ARRIVAL" | "DEAL_OF_THE_DAY" | "CLEARANCE_SALE" | "FEATURED" | "BEST_SELLER"

export const SECTION_LABELS: Record<SectionKey, string> = {
  NEW_ARRIVAL: "New Arrival",
  DEAL_OF_THE_DAY: "Deal of the Day",
  CLEARANCE_SALE: "Clearance Sale",
  FEATURED: "Featured",
  BEST_SELLER: "Best Seller",
}

export interface SectionOverview {
  sections: Array<{ key: SectionKey; label: string; total: number; expired: number; scheduled: number }>
  channels: { b2c: number; b2b: number; both: number; total: number }
}

export interface SectionRow {
  id: string
  name: string
  brand: string | null
  condition: string
  thumbnail_url: string | null
  owner_name: string
  price: number
  mrp: number | null
  stock: number
  approval_status: string
  listing_status: string
  merch_section: SectionKey | null
  merch_starts_at: string | null
  merch_ends_at: string | null
  sell_b2c: boolean
  sell_b2b: boolean
  qc_status: string
}

export type BulkAction = "APPROVE" | "PAUSE" | "RESUME" | "DELETE"

export const merchApi = {
  overview: () => api.get<ApiResponse<SectionOverview>>("/admin/merchandising/overview").then((r) => r.data.data),
  section: (section: SectionKey | "NONE", params: { search?: string; page?: number; limit?: number }) =>
    api
      .get<{ data: SectionRow[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(
        `/admin/merchandising/sections/${section}`,
        { params },
      )
      .then((r) => r.data),
  move: (body: { ids: string[]; section: SectionKey | null; startsAt?: string; endsAt?: string }) =>
    api.post<ApiResponse<{ moved: number; missing: number }>>("/admin/merchandising/move", body).then((r) => r.data.data),
  channels: (body: { ids: string[]; b2c: boolean; b2b: boolean }) =>
    api.post<ApiResponse<{ updated: number }>>("/admin/merchandising/channels", body).then((r) => r.data.data),
  bulk: (body: { ids: string[]; action: BulkAction }) =>
    api
      .post<ApiResponse<{ done: number; failed: Array<{ id: string; name: string; reason: string }> }>>("/admin/merchandising/bulk", body)
      .then((r) => r.data.data),
  duplicate: (id: string) => api.post<ApiResponse<{ id: string }>>(`/admin/merchandising/listings/${id}/duplicate`).then((r) => r.data.data),
}
