export type ReqStatus = "OPEN" | "AWARDED" | "IN_FULFILMENT" | "COMPLETED" | "CANCELLED" | "EXPIRED"
export type B2bOrderStatus = "PENDING_PAYMENT" | "PAID" | "PACKED" | "DISPATCHED" | "DELIVERED" | "COMPLETED" | "DISPUTED" | "CANCELLED" | "REFUNDED"

export interface B2bStats {
  open_requirements: number; total_requirements: number; quotes_received: number; orders: number; order_value: number
  dispatched: number; completed: number; disputes: number; awaiting_payment: number; awaiting_dispatch: number
  escrow_held: number; released_to_sellers: number; commission_earned: number
}

export interface B2bRequirement {
  id: string; requirement_number: string; title: string; product_name: string; brand: string | null; category_name: string | null
  buyer_name: string; posted_by_type: "VENDOR" | "ADMIN"; condition_pref: string; quantity_needed: number; quantity_awarded: number
  target_price: number | null; description: string | null; delivery_city: string | null; delivery_pincode: string | null
  response_deadline: string; required_by: string | null; status: ReqStatus; cancel_reason: string | null; created_at: string
  quote_count?: number; best_price?: number | null; quantity_offered_total?: number
  order_value?: number; order_count?: number; dispatched_orders?: number
  /** Demand details the buyer asked for (migration 207). */
  storage?: string | null; target_price_max?: number | null; min_battery_health?: number | null
  display_pref?: "ANY" | "ORIGINAL" | "GRADE_AB"; fulfilment_pref?: "ANY" | "PICKUP" | "DELIVERY"; is_urgent?: boolean
  tags?: ("URGENT" | "BULK")[]; thumbnail_url?: string | null; view_count?: number; views?: { v: number; vendors: number }
}

export interface B2bQuote {
  id: string; seller_vendor_id: string; seller_name: string; seller_rating: number | null; quantity_offered: number; quantity_awarded: number
  unit_price: number; condition: string; delivery_days: number; note: string | null; seller_city?: string | null
  offer_state?: string; buyer_viewed_at?: string | null; seller_completed_orders?: number
  status: "SUBMITTED" | "SELECTED" | "PARTIALLY_SELECTED" | "NOT_SELECTED" | "WITHDRAWN" | "EXPIRED"; created_at: string
}

export interface B2bOrder {
  id: string; order_number: string; requirement_id: string; requirement_number?: string; product_name?: string
  seller_name: string; buyer_name: string; quantity: number; unit_price: number; subtotal: number
  commission_percent: number; commission_amount: number; seller_payable: number; status: B2bOrderStatus
  payment_status: "UNPAID" | "ESCROW_HELD" | "RELEASED" | "REFUNDED"; courier_name: string | null; awb: string | null; tracking_url: string | null
  dispatched_at: string | null; received_at: string | null; received_quantity: number | null; receipt_note: string | null
  released_amount: number | null; dispute_status: string | null; dispute_reason: string | null; dispute_resolution: string | null; created_at: string
  fulfilment_type?: "DELIVERY" | "PICKUP"; pickup_at?: string | null; pickup_note?: string | null; payment_method?: string | null; cancel_reason?: string | null
  thumbnail_url?: string | null
}

export interface B2bEvent { type: string; actor_label: string | null; note: string | null; order_id: string | null; created_at: string }

export interface B2bRequirementDetail {
  requirement: B2bRequirement
  quotes: B2bQuote[]
  orders: B2bOrder[]
  events: B2bEvent[]
  payment: { amount: number; method: string; reference: string; status: string; paid_at: string } | null
}

export interface B2bSettings {
  defaultPercent: number
  vendors: { id: string; name: string; override: number | null; orders: number }[]
}

/** GET /admin/b2b/insights — what buyers are asking for and how well it is served. */
export interface DemandInsights {
  days: number
  funnel: {
    posted: number; quoted: number; awarded: number; paid: number; completed: number
    units_needed: number; units_awarded: number; fill_rate: number; urgent: number; bulk: number
  }
  avgMinutesToFirstOffer: number | null
  reach: { vendors_viewed: number; views: number; dismissed: number }
  topModels: {
    model: string; example: string; brand: string | null; requests: number; units_needed: number; units_awarded: number
    fill_rate: number; avg_target: number | null; offers: number; thumbnail_url: string | null
  }[]
  unserved: {
    id: string; requirement_number: string; product_name: string; quantity_needed: number; target_price: number | null; target_price_max: number | null
    created_at: string; response_deadline: string; status: ReqStatus; is_urgent: boolean; buyer_name: string; view_count: number
  }[]
}
