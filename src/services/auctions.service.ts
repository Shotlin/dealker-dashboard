/**
 * Auctions service — admin + vendor management surface.
 * One endpoint set (`/manage/auctions`); the backend scopes by caller, so a
 * vendor only ever receives their own auctions.
 */

import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"

const BASE = "/manage/auctions"
const clean = (p: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null))

export type AuctionStatus =
  | "DRAFT" | "PENDING_APPROVAL" | "REJECTED" | "SCHEDULED" | "LIVE" | "PAUSED"
  | "AWAITING_PAYMENT" | "SOLD" | "UNSOLD" | "CANCELLED" | "DEFAULTED"

export interface Auction {
  id: string
  auction_number: string
  product_id: string
  vendor_id: string | null
  owner_type: "ADMIN" | "VENDOR"
  seller_name?: string | null
  title: string
  description?: string | null
  image_url?: string | null
  status: AuctionStatus
  audience: "B2C" | "B2B"
  quantity: number
  eligible_vendor_ids?: string[] | null
  start_price: number
  current_price: number
  reserve_price: number | null
  bid_increment: number | null
  buy_now_price: number | null
  registration_fee: number
  fee_vendor_share_pct: number
  loser_fee_refund_pct: number
  anti_snipe_window_sec: number
  anti_snipe_extend_sec: number
  max_extensions: number
  extension_count: number
  payment_window_hours: number
  starts_at: string
  ends_at: string
  original_ends_at: string
  paused_at: string | null
  /** Private proxy ceiling — only present for platform users. */
  leader_max?: number | null
  leader_id: string | null
  bid_count: number
  bidder_count: number
  registration_count: number
  winner_id: string | null
  winning_bid: number | null
  fee_credit: number | null
  amount_due: number | null
  offer_round: number
  payment_deadline: string | null
  order_id: string | null
  rejected_reason?: string | null
  cancelled_reason?: string | null
  created_at: string
  server_time?: string
}

export interface AuctionRegistration {
  id: string
  bidder_no: number
  alias: string
  user_id: string | null
  name: string | null
  phone: string | null
  fee_amount: number
  status: "ACTIVE" | "APPLIED" | "REFUNDED" | "FORFEITED"
  refund_amount: number
  forfeited_amount: number
  highest_bid: number | null
  bid_count: number
  strikes?: number | null
  is_blocked?: boolean | null
  created_at: string
}

export interface AuctionBid {
  seq: number
  amount: number
  type: "MANUAL" | "AUTO" | "BUY_NOW"
  is_leading: boolean
  at: string
  alias: string
  max_amount?: number
  ip?: string
  user_id?: string
}

export interface AuctionFlag {
  type: string
  severity: "LOW" | "MEDIUM" | "HIGH"
  detail: string
  user_ids: string[]
}

export interface AuctionDetail {
  auction: Auction
  registrations: AuctionRegistration[]
  bids: AuctionBid[]
  price_series: Array<{ seq: number; amount: number; at: string }>
  fees: Partial<Record<"FEE_CHARGED" | "FEE_REFUNDED" | "FEE_APPLIED_TO_ORDER" | "FEE_FORFEIT_PLATFORM" | "FEE_FORFEIT_VENDOR", number>>
  events: Array<{ id: number; event_type: string; actor_role: string | null; payload: Record<string, unknown>; created_at: string }>
  flags: AuctionFlag[]
}

export interface AuctionStats {
  live: number
  ending_soon: number
  awaiting_payment: number
  pending_approval: number
  scheduled: number
  active_registrations: number
  platform_fee_revenue_30d: number
  vendor_fee_revenue_30d: number
  fees_collected_30d: number
  gmv_30d: number
  sold_30d: number
  sell_through_pct_30d: number | null
  avg_bids_per_auction_30d: number
  revenue_series: Array<{ day: string; revenue: number; collected: number }>
}

export interface AuctionRules {
  enabled: boolean
  min_registration_fee: number
  max_registration_fee: number
  fee_max_pct_of_start_price: number
  increment_tiers: Array<{ from: number; inc: number }>
  min_duration_minutes: number
  max_duration_days: number
  anti_snipe_window_sec: number
  anti_snipe_extend_sec: number
  max_extensions: number
  payment_window_hours: number
  vendor_fee_share_pct: number
  loser_fee_refund_pct: number
  vendor_auctions_require_approval: boolean
}

export interface AuctionSettings extends AuctionRules {
  max_offer_rounds: number
  max_live_auctions_per_vendor: number
  strike_limit: number
  bid_rate_limit_per_minute: number
  blocked_states: string[]
  consent_text: string
  consent_text_version: string
}

export interface AuctionProduct {
  id: string
  name: string
  brand: string | null
  price: string
  sale_price: string | null
  thumbnail_url: string | null
  owner_type: "ADMIN" | "VENDOR"
  owner_vendor_id: string | null
  vendor_name: string | null
  stock_quantity: number
}

export interface AuctionRisk {
  bidders: Array<{ user_id: string; name: string; phone: string; strikes: number; is_blocked: boolean; blocked_reason: string | null }>
  shared_ip: Array<{ auction_id: string; auction_number: string; title: string; ip: string; bidders: number }>
  duels: Array<{ auction_id: string; auction_number: string; title: string; bid_count: number }>
  seller_linked: Array<{ auction_id: string; auction_number: string; title: string; bidder: string }>
}

export interface CreateAuctionInput {
  productId: string
  audience?: "B2C" | "B2B"
  quantity?: number
  eligibleVendorIds?: string[]
  title?: string
  description?: string
  startPrice: number
  reservePrice?: number | null
  bidIncrement?: number | null
  buyNowPrice?: number | null
  registrationFee: number
  startsAt?: string
  endsAt?: string
  durationHours?: number
  loserFeeRefundPct?: number
  feeVendorSharePct?: number
  saveAsDraft?: boolean
}

type Paged<T> = { data: T[]; pagination: { page: number; limit: number; total: number }; counts?: Record<string, number> }

export interface AuctionOrderRow {
  id: string
  auction_number: string
  title: string
  audience: "B2C" | "B2B"
  quantity: number
  unit_price: number | null
  winning_bid: number
  amount_due: number
  auction_status: AuctionStatus
  winner_name: string | null
  winner_phone: string | null
  seller_name: string | null
  order_id: string | null
  order_number: string | null
  order_status: string | null
  payment_status: string | null
  stages: Array<{ key: string; label: string; done: boolean }>
  current: string
}

export const auctionsApi = {
  orders: (params: Record<string, unknown> = {}) =>
    api.get<Paged<AuctionOrderRow>>(`${BASE}/orders`, { params: clean(params) }).then((r) => r.data),
  stats: () => api.get<ApiResponse<AuctionStats>>(`${BASE}/stats`).then((r) => r.data.data),
  attention: () => api.get<ApiResponse<Array<Pick<Auction, "id" | "auction_number" | "title" | "status" | "payment_deadline" | "created_at" | "offer_round"> & { seller_name: string | null }>>>(`${BASE}/attention`).then((r) => r.data.data),
  rules: () => api.get<ApiResponse<AuctionRules>>(`${BASE}/rules`).then((r) => r.data.data),
  list: (params: Record<string, unknown> = {}) => api.get<Paged<Auction>>(BASE, { params: clean(params) }).then((r) => r.data),
  get: (id: string) => api.get<ApiResponse<AuctionDetail>>(`${BASE}/${id}`).then((r) => r.data.data),
  products: (q: string) => api.get<ApiResponse<AuctionProduct[]>>(`${BASE}/products`, { params: clean({ q }) }).then((r) => r.data.data),
  create: (body: CreateAuctionInput) => api.post<ApiResponse<Auction>>(BASE, body).then((r) => r.data.data),
  update: (id: string, body: Partial<CreateAuctionInput>) => api.put<ApiResponse<Auction>>(`${BASE}/${id}`, body).then((r) => r.data.data),
  action: (id: string, name: string, body: Record<string, unknown> = {}) =>
    api.post<ApiResponse<Auction>>(`${BASE}/${id}/${name}`, body).then((r) => r.data.data),
  settings: () => api.get<ApiResponse<AuctionSettings>>(`${BASE}/settings`).then((r) => r.data.data),
  updateSettings: (body: Partial<AuctionSettings>) => api.put<ApiResponse<AuctionSettings>>(`${BASE}/settings`, body).then((r) => r.data.data),
  risk: () => api.get<ApiResponse<AuctionRisk>>(`${BASE}/risk`).then((r) => r.data.data),
  blockBidder: (userId: string, reason?: string) => api.post(`${BASE}/bidders/${userId}/block`, { reason }).then((r) => r.data),
  unblockBidder: (userId: string) => api.post(`${BASE}/bidders/${userId}/unblock`).then((r) => r.data),
}

/** Pull the backend's human message out of an axios error. */
export function apiMessage(err: unknown, fallback = "Something went wrong"): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string }
  return e?.response?.data?.message || e?.message || fallback
}
