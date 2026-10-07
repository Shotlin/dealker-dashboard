/**
 * Marketplace service — Dealker-specific surfaces (vendors, seller orders,
 * seller listings, loyalty, referrals, settlements, shipping).
 *
 * All endpoints hit the dealker-backend marketplace modules registered in
 * src/app.js. No mock data — pages render real API state only.
 */

import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"

/** Drop empty-string filters — the backend validates enums strictly. */
const clean = (p: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null))

export interface Paged<T> {
  data: T[]
  pagination?: { page: number; limit: number; total: number }
  stats?: Array<{ status: string; n: number }>
}

export interface Vendor {
  id: string
  name?: string
  legal_name?: string
  email?: string
  phone?: string
  status: string
  created_at?: string
}

export interface SellerOrderRow {
  id: string
  seller_order_number: string
  order_id: string
  parent_order_number?: string
  vendor_id: string | null
  vendor_name?: string | null
  shop_id: string | null
  shop_name?: string | null
  status: string
  fulfilment_status: string
  item_subtotal: string | number
  seller_discount: string | number
  commission_rate: string | number
  commission_amount: string | number
  payable_to_seller: string | number
  payment_method?: string
  payment_status?: string
  item_count?: number | string
  payout_status?: string
  created_at: string
}

export interface SellerListingRow {
  id: string
  product_name: string
  brand?: string | null
  shop_name?: string
  vendor_name?: string | null
  seller_sku?: string | null
  price: string | number
  sale_price?: string | number | null
  mrp?: string | number | null
  stock_quantity: number
  listing_status: string
  approval_status?: string
  nationwide_shipping_enabled?: boolean
  local_delivery_enabled?: boolean
}

export interface LoyaltySettings {
  enabled: boolean
  points_per_rupee: string | number
  point_value: string | number
  min_redeemable_points: number
  max_redemption_pct: string | number
  max_points_per_order: number | null
  expiry_days: number | null
  earning_trigger: string
  return_window_hold_days: number
  min_order_amount_to_earn: string | number
  stackable_with_coupons: boolean
  stackable_with_milestones: boolean
}

export interface LoyaltyStats {
  activePoints: number
  pendingPoints: number
  redeemedPoints: number
  expiredPoints: number
  pointsLiability: number
  customersWithPoints: number
  issuedThisMonth: number
  settings: LoyaltySettings
}

export interface ReferralRow {
  id: string
  referrer_name: string
  referred_name: string
  status: string
  order_number?: string | null
  created_at: string
}

export interface ReferralSettings {
  enabled: boolean
  referrer_reward_type: string
  referrer_reward_amount: string | number
  referee_reward_type: string
  referee_reward_amount: string | number
  min_first_order_value: string | number
  qualification_event: string
  max_referrals_per_month: number | null
}

export interface SettlementOverview {
  vendorsWithActivity: number
  commissionEarned: number
  gmvPosted: number
  totalPaidOut: number
  totalLiability: number
}

export interface PayoutRow {
  id: string
  payout_number: string
  vendor_name?: string
  amount: string | number
  status: string
  utr_number?: string | null
  created_at: string
}

export interface ShipmentRow {
  id: string
  seller_order_id: string
  seller_order_number?: string
  parent_order_number?: string
  provider: string
  awb?: string | null
  courier_name?: string | null
  status: string
  tracking_url?: string | null
  created_at: string
}

export interface ShippingProviderRow {
  provider: string
  enabled: boolean
  mode: string
  configured?: boolean
  last_test_status?: string | null
  last_test_message?: string | null
}

export interface ShippingRule {
  id: string
  name: string
  priority: number
  is_active: boolean
  pickup_pincode_prefix?: string | null
  delivery_pincode_prefix?: string | null
  max_weight_grams?: number | null
  cod_allowed?: boolean | null
  preferred_provider: string
  fallback_provider: string
}

export interface SupplyOrderRow {
  id: string
  supply_order_number?: string
  request_number?: string
  vendor_name?: string
  shop_name?: string
  status: string
  award_amount?: string | number
  created_at?: string
}

// ── Vendors ─────────────────────────────────────────────────────────────

export const marketplaceVendors = {
  list: (params: Record<string, unknown> = {}) =>
    api.get<Paged<Vendor>>("/vendors", { params: clean(params) }).then((r) => r.data),
  updateKyc: (id: string, kycStatus: string) =>
    api
      .patch<ApiResponse<Vendor>>(`/vendors/${id}/kyc`, { kycStatus })
      .then((r) => r.data.data),
}

// ── Seller orders ───────────────────────────────────────────────────────

export const sellerOrdersApi = {
  list: (params: Record<string, unknown> = {}) =>
    api.get<Paged<SellerOrderRow>>("/seller-orders", { params: clean(params) }).then((r) => r.data),
  detail: (id: string) =>
    api.get<ApiResponse<SellerOrderRow>>(`/seller-orders/${id}`).then((r) => r.data.data),
  updateStatus: (id: string, status: string, reason?: string) =>
    api
      .post<ApiResponse<SellerOrderRow>>(`/seller-orders/${id}/status`, { status, reason })
      .then((r) => r.data.data),
}

// ── Seller listings (admin moderation) ──────────────────────────────────

export const sellerListingsApi = {
  list: (params: Record<string, unknown> = {}) =>
    api.get<Paged<SellerListingRow>>("/admin/seller-listings", { params: clean(params) }).then((r) => r.data),
  moderate: (id: string, body: { listingStatus?: string; approvalStatus?: string; reason?: string }) =>
    api
      .patch<ApiResponse<SellerListingRow>>(`/admin/seller-listings/${id}/moderate`, body)
      .then((r) => r.data.data),
}

// ── Loyalty ─────────────────────────────────────────────────────────────

export const loyaltyApi = {
  settings: () =>
    api.get<ApiResponse<LoyaltySettings>>("/admin/loyalty/settings").then((r) => r.data.data),
  updateSettings: (body: Partial<LoyaltySettings>) =>
    api.put<ApiResponse<LoyaltySettings>>("/admin/loyalty/settings", body).then((r) => r.data.data),
  stats: () =>
    api.get<ApiResponse<LoyaltyStats>>("/admin/loyalty/stats").then((r) => r.data.data),
  customers: (params: Record<string, unknown> = {}) =>
    api.get<Paged<Record<string, unknown>>>("/admin/loyalty/customers", { params: clean(params) }).then((r) => r.data),
  adjust: (customerId: string, points: number, reason: string) =>
    api
      .post<ApiResponse<unknown>>(`/admin/loyalty/customers/${customerId}/adjust`, { points, reason })
      .then((r) => r.data),
}

// ── Referrals ───────────────────────────────────────────────────────────

export const referralsApi = {
  settings: () =>
    api.get<ApiResponse<ReferralSettings>>("/admin/referrals/settings").then((r) => r.data.data),
  updateSettings: (body: Partial<ReferralSettings>) =>
    api.put<ApiResponse<ReferralSettings>>("/admin/referrals/settings", body).then((r) => r.data.data),
  list: (params: Record<string, unknown> = {}) =>
    api.get<Paged<ReferralRow>>("/admin/referrals", { params: clean(params) }).then((r) => r.data),
}

// ── Settlements ─────────────────────────────────────────────────────────

export const settlementsApi = {
  overview: () =>
    api.get<ApiResponse<SettlementOverview>>("/admin/settlements/overview").then((r) => r.data.data),
  payouts: (params: Record<string, unknown> = {}) =>
    api.get<Paged<PayoutRow>>("/admin/settlements/payouts", { params: clean(params) }).then((r) => r.data),
  vendorStatement: (vendorId: string, params: Record<string, unknown> = {}) =>
    api
      .get<Paged<Record<string, unknown>> & { summary?: unknown }>(
        `/admin/settlements/vendors/${vendorId}/statement`,
        { params: clean(params) }
      )
      .then((r) => r.data),
  createPayout: (vendorId: string, body: { amount?: number; notes?: string }) =>
    api.post<ApiResponse<PayoutRow>>(`/admin/settlements/vendors/${vendorId}/payouts`, body).then((r) => r.data.data),
  markPayoutPaid: (payoutId: string, utrNumber?: string) =>
    api
      .post<ApiResponse<PayoutRow>>(`/admin/settlements/payouts/${payoutId}/mark-paid`, { utrNumber })
      .then((r) => r.data.data),
}

// ── Shipping ────────────────────────────────────────────────────────────

export const shippingApi = {
  providers: () =>
    api.get<ApiResponse<ShippingProviderRow[]>>("/admin/shipping/providers").then((r) => r.data.data),
  updateProvider: (provider: string, body: Record<string, unknown>) =>
    api.put<ApiResponse<ShippingProviderRow>>(`/admin/shipping/providers/${provider}`, body).then((r) => r.data.data),
  testProvider: (provider: string, body: { pickupPincode: string; deliveryPincode: string }) =>
    api.post<ApiResponse<Record<string, unknown>>>(`/admin/shipping/providers/${provider}/test`, body).then((r) => r.data),
  rules: () =>
    api.get<ApiResponse<ShippingRule[]>>("/admin/shipping/rules").then((r) => r.data.data),
  saveRule: (body: Partial<ShippingRule>) =>
    api.post<ApiResponse<ShippingRule[]>>("/admin/shipping/rules", body).then((r) => r.data.data),
  shipments: (params: Record<string, unknown> = {}) =>
    api.get<Paged<ShipmentRow>>("/admin/shipping/shipments", { params: clean(params) }).then((r) => r.data),
  track: (shipmentId: string) =>
    api.post<ApiResponse<ShipmentRow>>(`/admin/shipping/shipments/${shipmentId}/track`).then((r) => r.data.data),
}

// ── B2B supply (vendor-procurement module) ──────────────────────────────

export const b2bSupplyApi = {
  supplies: (params: Record<string, unknown> = {}) =>
    api.get<Paged<SupplyOrderRow>>("/vendor-procurement/supplies", { params: clean(params) }).then((r) => r.data),
}
