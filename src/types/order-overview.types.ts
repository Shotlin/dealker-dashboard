export interface OverviewItem { id: string; name: string; quantity: number; unit_price: number; subtotal: number; image: string | null; condition: string | null; brand: string | null }
export interface OverviewShipEvent { status: string; label: string; note: string | null; location: string | null; at: string }
export interface OverviewSeller {
  id: string; number: string; status: string; fulfilment: string; payout_status: string
  vendor: { id: string | null; name: string | null; legal_name: string | null; gstin: string | null; phone: string | null; email: string | null; rating: number | null }
  pickup: { shop: string | null; address: string; city: string | null }
  items: OverviewItem[]
  payout: {
    state: "WAITING_DELIVERY" | "RETURN_WINDOW" | "READY" | "PROCESSING" | "PAID" | "ON_HOLD" | "REVERSED"; label: string; explanation: string; eligible_on: string | null; window_days: number
    earns: number; vendor_balance: number
    hold: { reason: string; since: string; vendor_wide: boolean } | null
    payout: { id: string; number: string; status: string; amount: number; utr: string | null; paid_at: string | null; created_at: string } | null
    ledger: { type: string; label: string; amount: number; reason: string | null; at: string }[]
  }
  money: { subtotal: number; shipping: number; commission_percent: number; commission: number; platform_charge: number; fee_tax: number; channel: "B2C" | "B2B"; payable_to_vendor: number }
  invoice: { number: string; url: string | null } | null
  media: { id: string; kind: "IMAGE" | "VIDEO"; url: string; caption: string | null; created_at: string }[]
  can_create_shipment: boolean
  shipment: { id: string; provider_status: string | null; created_at: string; provider: string; courier: string | null; awb: string | null; tracking_url: string | null; status: string; status_label: string; eta: string | null; cod_amount: number; charge: number; events: OverviewShipEvent[] } | null
  route: { from_city: string | null; from_state: string | null; to_city: string | null; to_state: string | null; distance_km: number | null }
  timestamps: { shipped_at: string | null; delivered_at: string | null; cancelled_at: string | null; estimated_delivery: string | null }
}
export interface OrderOverview {
  order: { id: string; number: string; status: string; placed_at: string; delivered_at: string | null; cancelled_reason: string | null; summary: string; payment_method: string; payment_status: string; delivery_mode: string; item_count: number; vendor_count: number }
  customer: { id: string; name: string | null; phone: string | null; email: string | null; since: string; orders: number; total_spent: number; address: { name?: string; phone?: string; line1?: string; city?: string; state?: string; pincode?: string } }
  payment: {
    method: string; status: string
    plan: "FULL_ONLINE" | "COD" | "PARTIAL"; advance_amount: number; amount_paid: number; amount_due: number
    gateway: { id: string | null; method: string | null; status: string; paid_at: string; refund_amount: number | null; refund_status: string | null } | null
    breakdown: { items: number; delivery: number; discount: number; tax_included: number; total: number; points_used: number; points_value: number; wallet_used: number }
    coupon: { code: string; saved: number; details: { description: string | null; discount_type: string; discount_value: string; max_discount: string | null; min_order_amount: string | null; coupon_type: string; absorber: string } | null } | null
    cashback: { amount: number; status: string; when: string; source: string; credited_at: string | null }[]
  }
  sellers: OverviewSeller[]
  timeline: { at: string; title: string; detail?: string; who?: string | null; kind: "order" | "shipment" | "proof" | "problem" | "support" }[]
  attention: string[]
  problems: { refunds: { id: string; status: string; scope: "FULL_ORDER" | "ITEMS"; items: { name: string; quantity: number; total: number }[] | null; source: "CUSTOMER" | "ADMIN"; reason: string; computed_amount: number; resolved_amount: number | null; refund_destination: string; created_at: string; resolved_at: string | null; refunded_at: string | null; admin_notes: string | null; reason_code: string | null; evidence: { url: string; kind: "IMAGE" | "VIDEO" }[] | null; resolved_by_name: string | null; seller_reversal: number }[]; tickets: { id: string; ticket_number: string; subject: string; status: string; created_at: string }[] }
}
