/** Promotional campaigns — admin API. */

import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"
import type { Preview, PricingScope } from "@/services/pricing.service"
import type { SectionKey } from "@/services/merchandising.service"

export type CampaignType = "GENERAL" | "VENDOR" | "PRODUCT" | "DISCOUNT" | "FLASH_SALE" | "DEAL_OF_THE_DAY" | "CLEARANCE_SALE" | "COUPON"
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "ENDED" | "CANCELLED"

export const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = {
  GENERAL: "General campaign", VENDOR: "Vendor campaign", PRODUCT: "Product campaign", DISCOUNT: "Discount campaign",
  FLASH_SALE: "Flash sale", DEAL_OF_THE_DAY: "Deal of the day", CLEARANCE_SALE: "Clearance sale", COUPON: "Coupon campaign",
}

export interface CampaignDiscount { operation: "PERCENT" | "FIXED" | "DISCOUNT_FROM_MRP"; value: number; rounding?: string; allowBelowCost?: boolean }

export interface Campaign {
  id: string
  name: string
  type: CampaignType
  description: string | null
  status: CampaignStatus
  starts_at: string | null
  ends_at: string | null
  scope: PricingScope
  discount: CampaignDiscount | null
  section: SectionKey | null
  coupon_id: string | null
  coupon_code: string | null
  activated_at: string | null
  ended_at: string | null
  end_reason: string | null
  listing_count: number
  created_by_name: string | null
}

export interface CampaignStats { orders: number; units: number; revenue: number; customers: number; vendors: number; savings: number; couponUses: number; couponDiscount: number }

export interface CampaignDetail extends Campaign {
  stats: CampaignStats
  listings: Array<{ id: string; name: string; brand: string | null; owner_name: string; price_before: number | null; price_after: number | null }>
}

export interface CampaignOverview {
  active: number; scheduled: number; draft: number; ended: number; cancelled: number
  revenue: number; orders: number; customers: number; vendorsInvolved: number
}

export interface CampaignInput {
  name: string
  type: CampaignType
  description?: string
  startsAt?: string | null
  endsAt?: string | null
  scope?: PricingScope
  discount?: CampaignDiscount | null
  section?: SectionKey | null
  couponId?: string | null
}

export const campaignsApi = {
  overview: () => api.get<ApiResponse<CampaignOverview>>("/admin/campaigns/overview").then((r) => r.data.data),
  list: (params: Record<string, unknown>) =>
    api
      .get<{ data: Campaign[]; meta: { page: number; limit: number; total: number; totalPages: number } }>("/admin/campaigns", { params })
      .then((r) => r.data),
  get: (id: string) => api.get<ApiResponse<CampaignDetail>>(`/admin/campaigns/${id}`).then((r) => r.data.data),
  create: (body: CampaignInput) => api.post<ApiResponse<CampaignDetail>>("/admin/campaigns", body).then((r) => r.data.data),
  update: (id: string, body: Partial<CampaignInput>) => api.patch<ApiResponse<CampaignDetail>>(`/admin/campaigns/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/admin/campaigns/${id}`).then(() => undefined),
  preview: (body: CampaignInput) => api.post<ApiResponse<Preview>>("/admin/campaigns/preview", body).then((r) => r.data.data),
  schedule: (id: string) => api.post<ApiResponse<CampaignDetail>>(`/admin/campaigns/${id}/schedule`).then((r) => r.data.data),
  start: (id: string) => api.post<ApiResponse<CampaignDetail>>(`/admin/campaigns/${id}/start`).then((r) => r.data.data),
  end: (id: string, reason?: string) => api.post<ApiResponse<CampaignDetail>>(`/admin/campaigns/${id}/end`, { reason }).then((r) => r.data.data),
  cancel: (id: string, reason?: string) => api.post<ApiResponse<CampaignDetail>>(`/admin/campaigns/${id}/cancel`, { reason }).then((r) => r.data.data),
}
