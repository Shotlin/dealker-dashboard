export type TicketStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REOPENED"
export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT"
export type TicketCategory =
  | "GENERAL" | "ORDER" | "DELIVERY" | "RETURN_REFUND" | "PAYMENT" | "PRODUCT" | "ACCOUNT" | "SELLER"

export interface SupportTicket {
  id: string
  ticket_number: string
  subject: string
  status: TicketStatus
  priority: TicketPriority
  category: TicketCategory
  channel: string
  customer: { id: string; name: string | null; phone: string | null; email: string | null }
  assignee: { id: string; name: string | null; email: string | null } | null
  order: {
    id: string; order_number: string; status: string; total: number
    items?: { name: string; quantity: number; price: number }[]
    sellers?: string[]
  } | null
  refund: { id: string; status: string; amount: number } | null
  last_message_at: string | null
  last_message_preview: string | null
  last_sender_type: "CUSTOMER" | "AGENT" | "SYSTEM" | null
  agent_unread: number
  first_response_at: string | null
  resolved_at: string | null
  created_at: string
}

export interface SupportMessage {
  id: string
  sender_type: "CUSTOMER" | "AGENT" | "SYSTEM"
  sender_id: string | null
  sender_name: string | null
  body: string
  is_internal: boolean
  created_at: string
}

export interface SupportEvent {
  id: string
  type: "CREATED" | "ASSIGNED" | "STATUS" | "PRIORITY" | "CATEGORY"
  from_value: string | null
  to_value: string | null
  from_name: string | null
  to_name: string | null
  actor_name: string | null
  created_at: string
}

export interface SupportDetail {
  ticket: SupportTicket
  messages: SupportMessage[]
  events: SupportEvent[]
  context: {
    orders_count: number
    total_spent: number
    tickets_count: number
    joined_at: string
    other_tickets: { id: string; ticket_number: string; subject: string; status: TicketStatus; created_at: string }[]
  } | null
}

export interface SupportStats {
  open: number
  unassigned: number
  mine: number
  urgent: number
  resolved_today: number
  unread: number
  avg_first_response_seconds: number
}

export interface SupportAgent {
  id: string
  name: string | null
  email: string | null
  role_name: string | null
  open_tickets: number
}

export interface CannedReply { id: string; title: string; body: string; category: string | null }

export type SupportView = "all" | "mine" | "unassigned" | "open" | "resolved"
export interface SupportFilters {
  view?: SupportView
  status?: string
  priority?: string
  category?: string
  search?: string
  page?: number
}
