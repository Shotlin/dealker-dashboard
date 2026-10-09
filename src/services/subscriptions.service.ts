/** Vendor subscriptions, plans and the vendor timeline — admin API. */

import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"

export type Tier = "FREE" | "PAID" | "PREMIUM" | "UNLIMITED"
export type Cycle = "MONTHLY" | "YEARLY" | "COMPLIMENTARY"

export const TIER_LABEL: Record<Tier, string> = { FREE: "Free", PAID: "Paid", PREMIUM: "Premium", UNLIMITED: "Unlimited" }

export interface Plan {
  id: string
  tier: Tier
  name: string
  description: string | null
  price_monthly: number
  price_yearly: number
  listing_limit: number | null
  features: string[]
  is_active: boolean
  vendor_count: number
}

export interface SubOverview {
  tiers: Array<{ tier: Tier; vendors: number; expiring: number }>
  totalVendors: number
  expiringSoon: number
  lapsed: number
  mrr: number
  collectedThisMonth: number
  startedThisMonth: number
}

export interface SubVendorRow {
  id: string
  name: string
  email: string
  vendor_status: string
  tier: Tier
  plan_name: string
  listing_limit: number | null
  listings_used: number
  started_at: string | null
  expires_at: string | null
  billing_cycle: Cycle | null
  auto_renew: boolean | null
  days_left: number | null
}

export interface SubVendorDetail extends SubVendorRow {
  phone: string | null
  amount_paid: number | null
  history: Array<{
    id: string; tier: Tier; plan_name: string; status: string; billing_cycle: Cycle; started_at: string; expires_at: string | null
    amount_paid: number; payment_ref: string | null; notes: string | null; cancelled_at: string | null; cancel_reason: string | null; created_by_name: string | null
  }>
  events: Array<{ id: number; event: string; from_tier: Tier | null; to_tier: Tier | null; detail: Record<string, unknown> | null; created_at: string; actor_name: string | null }>
}

export interface TimelineStage {
  key: string
  label: string
  done: boolean
  at: string | null
  metrics: Array<{ label: string; value: string | number; money?: boolean }>
}

export interface VendorTimeline {
  vendor: { id: string; name: string; status: string }
  stages: TimelineStage[]
  feed: Array<{ at: string; title: string; detail?: string | null }>
}

export interface AssignInput {
  tier: Tier
  cycle?: Cycle
  days?: number
  amountPaid?: number
  paymentRef?: string
  notes?: string
  autoRenew?: boolean
}

export const subscriptionsApi = {
  overview: () => api.get<ApiResponse<SubOverview>>("/admin/subscriptions/overview").then((r) => r.data.data),
  plans: () => api.get<ApiResponse<Plan[]>>("/admin/subscriptions/plans").then((r) => r.data.data),
  updatePlan: (id: string, body: Partial<{ name: string; description: string; priceMonthly: number; priceYearly: number; listingLimit: number | null; features: string[]; isActive: boolean }>) =>
    api.put<ApiResponse<Plan>>(`/admin/subscriptions/plans/${id}`, body).then((r) => r.data.data),
  vendors: (params: Record<string, unknown>) =>
    api
      .get<{ data: SubVendorRow[]; meta: { page: number; limit: number; total: number; totalPages: number } }>("/admin/subscriptions/vendors", { params })
      .then((r) => r.data),
  vendor: (id: string) => api.get<ApiResponse<SubVendorDetail>>(`/admin/subscriptions/vendors/${id}`).then((r) => r.data.data),
  timeline: (id: string) => api.get<ApiResponse<VendorTimeline>>(`/admin/subscriptions/vendors/${id}/timeline`).then((r) => r.data.data),
  assign: (id: string, body: AssignInput) => api.post<ApiResponse<SubVendorDetail>>(`/admin/subscriptions/vendors/${id}/assign`, body).then((r) => r.data.data),
  extend: (id: string, body: { days: number; reason: string }) => api.post<ApiResponse<SubVendorDetail>>(`/admin/subscriptions/vendors/${id}/extend`, body).then((r) => r.data.data),
  cancel: (id: string, reason: string) => api.post<ApiResponse<SubVendorDetail>>(`/admin/subscriptions/vendors/${id}/cancel`, { reason }).then((r) => r.data.data),
}
