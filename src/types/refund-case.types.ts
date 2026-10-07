import type { OrderOverview } from "./order-overview.types"
import type { RefundRequestStatus } from "./refund-request.types"

export type Party = "CUSTOMER" | "SELLER" | "COURIER" | "TEAM"
export type EvidenceKind = "IMAGE" | "VIDEO" | "AUDIO" | "INVOICE" | "DOCUMENT"
export type EvidenceReview = "UNREVIEWED" | "SUPPORTS_CUSTOMER" | "SUPPORTS_SELLER" | "NOT_USEFUL"
export type CaseStatus = "NOT_STARTED" | "OPEN" | "WAITING_CUSTOMER" | "WAITING_SELLER" | "READY_TO_DECIDE" | "DECIDED"
export type Verdict = "CUSTOMER_RIGHT" | "SELLER_RIGHT" | "PARTLY_BOTH"

export interface CaseEvidence {
  id: string
  origin: "CASE" | "PACKING" | "INVOICE" | "TRACKING" | "CHAT"
  side: Party
  kind: EvidenceKind
  url: string
  title: string
  note: string | null
  review: EvidenceReview
  review_note?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  added_by: string | null
  added_at: string | null
  removable: boolean
}

export interface CaseProduct {
  id: string
  name: string
  quantity: number
  unit_price: number | null
  subtotal: number
  image: string | null
  brand: string | null
  condition: string | null
  disputed: boolean
  seller: { id: string | null; name: string | null; phone: string | null; parcel: string } | null
}

export interface CaseMessage {
  id: string
  from: "CUSTOMER" | "AGENT" | "SYSTEM"
  name: string | null
  body: string
  internal: boolean
  attachments: unknown[]
  at: string
}

export interface CaseConversation {
  id: string
  number: string
  subject: string
  status: string
  started_at: string
  assignee: string | null
  linked_to_request: boolean
  messages: CaseMessage[]
}

export interface CaseCheck {
  key: string
  party: Party
  label: string
  help: string
  done: boolean
  note: string | null
  by: string | null
  at: string | null
  available: boolean
}

export interface CaseTimelineEntry {
  id: string
  at: string
  group: "ORDER" | "CASE" | "CHAT"
  party: Party | null
  title: string
  body: string | null
  actor: string | null
  internal: boolean
  type: string
  meta?: { direction?: string; outcome?: string; minutes?: number | null; recordingUrl?: string | null; person?: string | null }
}

export interface RefundCase {
  request: {
    id: string
    status: RefundRequestStatus
    scope: "ALL" | "SPECIFIC"
    reason: string
    source: "CUSTOMER" | "ADMIN"
    amount: number
    claimed_amount: number
    refund_to: "wallet" | "original" | null
    preferred_destination: "wallet" | "original"
    created_at: string
    resolved_at: string | null
    resolved_by: string | null
    admin_note: string | null
    last_error: string | null
    order: { id: string; number: string; status: string; total: number; wallet_used: number }
    customer: { id: string; name: string | null; phone: string | null; email: string | null }
  }
  investigation: {
    status: CaseStatus
    started_at: string | null
    due_at: string | null
    owner: { id: string; name: string | null; email: string | null } | null
    findings: string
    verdict: Verdict | null
    hours_left: number | null
    overdue: boolean
  }
  overview: OrderOverview | null
  products: CaseProduct[]
  evidence: CaseEvidence[]
  conversations: CaseConversation[]
  checks: CaseCheck[]
  timeline: CaseTimelineEntry[]
  sellers: { id: string | null; name: string | null; legal_name: string | null; phone: string | null; email: string | null; rating: number | null; parcel: string; city: string | null }[]
  team: { id: string; name: string | null; email: string | null; open_tickets: number }[]
}

export interface CasePatch {
  status?: Exclude<CaseStatus, "NOT_STARTED" | "DECIDED">
  ownerId?: string | null
  dueAt?: string | null
  findings?: string
  verdict?: Verdict | null
}
