import api from "@/lib/api"
import type {
  CannedReply, SupportAgent, SupportDetail, SupportFilters, SupportStats, SupportTicket,
  TicketCategory, TicketPriority, TicketStatus,
} from "@/types/support.types"

const clean = (p: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null && v !== "all"))

export const supportApi = {
  list: (filters: SupportFilters) =>
    api
      .get<{ data: SupportTicket[]; pagination: { page: number; limit: number; total: number } }>(
        "/admin/support/tickets",
        { params: clean({ ...filters, limit: 40 }) },
      )
      .then((r) => r.data),
  stats: () => api.get<{ data: SupportStats }>("/admin/support/stats").then((r) => r.data.data),
  agents: () => api.get<{ data: SupportAgent[] }>("/admin/support/agents").then((r) => r.data.data),
  canned: () => api.get<{ data: CannedReply[] }>("/admin/support/canned-replies").then((r) => r.data.data),
  detail: (id: string) => api.get<{ data: SupportDetail }>(`/admin/support/tickets/${id}`).then((r) => r.data.data),
  markRead: (id: string) => api.post(`/admin/support/tickets/${id}/read`).then(() => undefined),
  send: (id: string, body: string, internal: boolean) =>
    api.post(`/admin/support/tickets/${id}/messages`, { body, internal }).then((r) => r.data.data),
  update: (id: string, patch: { status?: TicketStatus; priority?: TicketPriority; category?: TicketCategory }) =>
    api.patch<{ data: SupportDetail }>(`/admin/support/tickets/${id}`, patch).then((r) => r.data.data),
  assign: (id: string, assigneeId: string | null) =>
    api.post<{ data: SupportDetail }>(`/admin/support/tickets/${id}/assign`, { assigneeId }).then((r) => r.data.data),
  start: (ctx: { orderId?: string; refundRequestId?: string }) =>
    api.post<{ data: SupportDetail }>("/admin/support/tickets/start", ctx).then((r) => r.data.data),
}
