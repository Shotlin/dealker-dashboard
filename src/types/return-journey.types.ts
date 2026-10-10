export type PickupProvider = "SHIPROCKET" | "PORTER" | "BLUEDART" | "SELF"
export type PickupStatus = "PICKUP_SCHEDULED" | "PICKED_UP" | "IN_TRANSIT" | "RECEIVED" | "FAILED" | "CANCELLED"
export type QcResult = "OK" | "MINOR_ISSUE" | "FAILED"
export type PriceStatus = "NONE" | "PROPOSED" | "ACCEPTED" | "CLARIFICATION"

export interface ReturnPickup {
  provider: PickupProvider
  awb: string | null
  courier_name: string | null
  tracking_url: string | null
  status: PickupStatus
  provider_status: string | null
  scheduled_at: string | null
  picked_up_at: string | null
  received_at: string | null
  note: string | null
  events: { status: string; note: string | null; at: string }[]
}

export interface QcCheck { key?: string; label: string; status: QcResult; note?: string }

export interface ReturnQc {
  checks: QcCheck[]
  summary: string | null
  original_price: number
  revised_price: number | null
  price_status: PriceStatus
  customer_message: string | null
  inspected_at: string
  responded_at: string | null
}

export interface ReturnJourney {
  pickup: ReturnPickup | null
  qc: ReturnQc | null
  default_parts: { key: string; label: string }[]
}

export interface PickupInput {
  provider: PickupProvider
  awb?: string
  courierName?: string
  trackingUrl?: string
  scheduledAt?: string
  note?: string
}

export interface QcInput { checks: QcCheck[]; summary?: string; revisedPrice?: number | null }

export interface ReturnPolicy {
  window_days: number
  free_pickup: boolean
  points: { title: string; text: string }[]
  updated_at: string | null
}
