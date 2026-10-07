/**
 * Sponsored ads service — admin + vendor management surface.
 * One endpoint set (`/manage/ads`); the backend scopes by caller, so a vendor
 * only ever receives their own campaigns and wallet.
 */

import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"

const BASE = "/manage/ads"
const clean = (p: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null))

export type CampaignStatus = "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "PAUSED" | "REJECTED" | "SUSPENDED" | "ENDED"
export type MatchType = "EXACT" | "PHRASE" | "BROAD"
export type Targeting = "AUTO" | "MANUAL"

export interface AdRules {
  enabled: boolean
  campaigns_require_approval: boolean
  min_cpc: number
  max_cpc: number
  min_daily_budget: number
  min_topup: number
  max_topup: number
  gst_pct: number
  slots_per_page: number
  attribution_window_days: number
  max_products_per_campaign: number
  max_keywords_per_campaign: number
  max_campaigns_per_vendor: number
}

export type AdSettings = Omit<AdRules, "attribution_window_days"> & {
  first_slot_position: number
  slot_spacing: number
  max_ads_per_vendor_per_page: number
  min_quality_score: number
  click_dedupe_minutes: number
  impression_token_ttl_minutes: number
  attribution_window_days: number
  low_balance_threshold: number
}

export interface Campaign {
  id: string
  campaign_number: string
  vendor_id: string
  vendor_name?: string
  name: string
  status: CampaignStatus
  targeting: Targeting
  default_bid: number
  daily_budget: number
  total_budget: number | null
  starts_on: string
  ends_on: string | null
  rejected_reason?: string | null
  suspended_reason?: string | null
  paused_reason?: string | null
  created_at: string
  product_count?: number
  keyword_count?: number
  spent_today: number
  impressions_30d?: number
  clicks_30d?: number
  spend_30d?: number
  ctr_30d?: number
  avg_cpc_30d?: number
}

export interface CampaignProduct {
  product_id: string
  name: string
  brand?: string | null
  thumbnail?: string | null
  status: "ACTIVE" | "PAUSED"
  bid_override: number | null
  price: number | null
  stock: number
  impressions: number
  clicks: number
  spend: number
}

export interface CampaignKeyword {
  id: string
  keyword: string
  match_type: MatchType
  is_negative: boolean
  bid: number | null
  status: "ACTIVE" | "PAUSED"
  clicks: number
  spend: number
}

export interface CampaignDetail extends Campaign {
  totals_30d: { impressions: number; clicks: number; spend: number; ctr: number; avg_cpc: number }
  products: CampaignProduct[]
  keywords: CampaignKeyword[]
  events: Array<{ event: string; payload: Record<string, unknown>; actor_kind: string; created_at: string }>
}

export interface DailyPoint { day: string; impressions: number; clicks: number; spend: number }

export interface Totals {
  impressions: number
  clicks: number
  spend: number
  orders: number
  sales: number
  ctr: number
  avg_cpc: number
  acos: number | null
  roas: number | null
}

export interface Wallet {
  balance: number
  lifetime_topup: number
  lifetime_spend: number
  settlement_balance: number
  withdrawable: number
  active_campaigns: number
  daily_commitment: number
  low_balance: boolean
  gst_pct: number
  min_topup: number
  max_topup: number
}

export interface PlatformSummary {
  net_revenue: number
  gst_collected: number
  gross_billed: number
  topups: number
  promo_credits: number
  wallet_liability: number
  funded_vendors: number
  pending_review: number
  top_advertisers: Array<{ vendor_id: string; name: string; spend: number; clicks: number }>
}

export interface Overview {
  range_days: number
  totals: Totals
  daily: DailyPoint[]
  campaign_counts: Record<string, number>
  wallet?: Wallet
  platform?: PlatformSummary
}

export interface CampaignReport {
  campaign: { id: string; name: string; campaign_number: string; status: CampaignStatus }
  range_days: number
  attribution_window_days: number
  totals: Totals
  daily: DailyPoint[]
  products: Array<{ product_id: string; name: string; impressions: number; clicks: number; spend: number; orders: number; sales: number; acos: number | null }>
  keywords: Array<{ keyword: string; match_type: MatchType | null; clicks: number; spend: number; orders: number; sales: number; acos: number | null }>
}

export interface LedgerEntry {
  id: number
  entry_type: string
  amount: number
  tax_amount: number
  balance_after: number
  reason: string | null
  campaign_id: string | null
  campaign_name: string | null
  created_at: string
}

export interface Estimate {
  keyword: string
  match_type: MatchType
  competing_campaigns: number
  highest_bid: number | null
  recent_clicks_30d: number
  avg_cpc_30d: number | null
  floor: number
  ceiling: number
  suggested_bid: number
  competition: "LOW" | "MEDIUM" | "HIGH"
  gst_pct: number
  note: string
}

export interface SellableProduct {
  id: string
  name: string
  brand?: string | null
  thumbnail?: string | null
  rating_avg?: number
  rating_count?: number
  price: number
  stock_quantity: number
  seller_sku?: string | null
}

export interface KeywordInput { keyword: string; matchType: MatchType; bid?: number | null; negative?: boolean }

export interface CreateCampaignInput {
  vendorId?: string
  name: string
  targeting: Targeting
  defaultBid: number
  dailyBudget: number
  totalBudget?: number | null
  startsOn?: string
  endsOn?: string | null
  productIds: string[]
  keywords: KeywordInput[]
  submit?: boolean
}

export interface ClickRow {
  id: string
  created_at: string
  keyword: string | null
  cpc: number
  tax_amount: number
  charged: boolean
  not_charged_reason: string | null
  refunded: boolean
  product_name: string
  ip?: string
}

export interface VendorWalletRow {
  vendor_id: string
  name: string
  balance: number
  lifetime_topup: number
  lifetime_spend: number
  active_campaigns: number
}

interface Paged<T> { data: T[]; pagination: { page: number; limit: number; total: number } }

const unwrap = <T,>(p: Promise<{ data: ApiResponse<T> }>) => p.then((r) => r.data.data)

export const adsApi = {
  rules: () => unwrap<AdRules>(api.get(`${BASE}/rules`)),
  settings: () => unwrap<AdSettings>(api.get(`${BASE}/settings`)),
  updateSettings: (body: Partial<AdSettings>) => unwrap<AdSettings>(api.put(`${BASE}/settings`, body)),

  overview: (params: { days?: number; vendorId?: string }) => unwrap<Overview>(api.get(`${BASE}/overview`, { params: clean(params) })),
  estimate: (keyword: string, matchType: MatchType) => unwrap<Estimate>(api.get(`${BASE}/estimate`, { params: { keyword, matchType } })),
  products: (q: string, vendorId?: string) => unwrap<SellableProduct[]>(api.get(`${BASE}/products`, { params: clean({ q, vendorId }) })),

  list: (params: Record<string, unknown>) =>
    api.get<{ success: boolean; data: Campaign[]; counts: Record<string, number>; pagination: Paged<Campaign>["pagination"] }>(BASE, { params: clean(params) }).then((r) => r.data),
  get: (id: string) => unwrap<CampaignDetail>(api.get(`${BASE}/${id}`)),
  create: (body: CreateCampaignInput) => unwrap<CampaignDetail>(api.post(BASE, body)),
  update: (id: string, body: Record<string, unknown>) => unwrap<CampaignDetail>(api.put(`${BASE}/${id}`, body)),
  report: (id: string, days = 30) => unwrap<CampaignReport>(api.get(`${BASE}/${id}/report`, { params: { days } })),
  clicks: (id: string) => unwrap<ClickRow[]>(api.get(`${BASE}/${id}/clicks`)),
  action: (id: string, name: "submit" | "pause" | "resume" | "end" | "approve" | "reject" | "suspend" | "unsuspend", body: Record<string, unknown> = {}) =>
    unwrap<CampaignDetail>(api.post(`${BASE}/${id}/${name}`, body)),

  addProducts: (id: string, productIds: string[], bidOverride?: number | null) => unwrap<CampaignDetail>(api.post(`${BASE}/${id}/products`, { productIds, bidOverride })),
  updateProduct: (id: string, productId: string, body: { status?: string; bidOverride?: number | null }) => unwrap<CampaignDetail>(api.patch(`${BASE}/${id}/products/${productId}`, body)),
  removeProduct: (id: string, productId: string) => unwrap<CampaignDetail>(api.delete(`${BASE}/${id}/products/${productId}`)),
  addKeywords: (id: string, keywords: KeywordInput[]) => unwrap<CampaignDetail>(api.post(`${BASE}/${id}/keywords`, { keywords })),
  updateKeyword: (id: string, keywordId: string, body: { status?: string; bid?: number | null }) => unwrap<CampaignDetail>(api.patch(`${BASE}/${id}/keywords/${keywordId}`, body)),
  removeKeyword: (id: string, keywordId: string) => unwrap<CampaignDetail>(api.delete(`${BASE}/${id}/keywords/${keywordId}`)),

  wallet: (vendorId?: string) => unwrap<Wallet>(api.get(`${BASE}/wallet`, { params: clean({ vendorId }) })),
  statement: (params: Record<string, unknown>) => api.get<Paged<LedgerEntry>>(`${BASE}/wallet/statement`, { params: clean(params) }).then((r) => r.data),
  topUp: (amount: number, idempotencyKey: string) => unwrap<{ balance: number }>(api.post(`${BASE}/wallet/topup`, { amount, idempotencyKey })),
  withdraw: (amount: number) => unwrap<{ balance: number }>(api.post(`${BASE}/wallet/withdraw`, { amount })),
  wallets: (params: Record<string, unknown>) => api.get<Paged<VendorWalletRow>>(`${BASE}/wallets`, { params: clean(params) }).then((r) => r.data),
  credit: (body: { vendorId: string; amount: number; kind: "TOPUP_ADMIN" | "PROMO_CREDIT" | "ADJUSTMENT"; reason: string }) =>
    unwrap<{ balance: number }>(api.post(`${BASE}/wallet/credit`, body)),
  refundClick: (clickId: string, reason: string) => unwrap<{ refunded: boolean }>(api.post(`${BASE}/clicks/${clickId}/refund`, { reason })),
}

export function apiMessage(err: unknown, fallback = "Something went wrong"): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string }
  return e?.response?.data?.message || e?.message || fallback
}
