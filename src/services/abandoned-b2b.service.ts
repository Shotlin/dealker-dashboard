/** B2B abandoned carts — vendor orders left unpaid, with follow-ups. */

import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"

const clean = (p: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null))

export type B2bState = "OPEN" | "CONTACTED" | "WILL_PAY" | "LOST" | "RECOVERED"

export interface B2bAbandonedRow {
  id: string
  order_number: string
  quantity: number
  unit_price: number
  subtotal: number
  created_at: string
  updated_at: string
  idle_hours: number
  requirement_title: string
  product_name: string
  brand: string | null
  buyer_id: string
  buyer_name: string
  buyer_phone: string | null
  buyer_email: string | null
  buyer_city: string | null
  seller_name: string
  state: B2bState
  follow_up_note: string | null
  follow_up_at: string | null
  follow_up_by: string | null
  touches: number
}

export interface B2bSummary {
  hours: number
  open: number
  contacted: number
  willPay: number
  lost: number
  recovered: number
  atRiskValue: number
  recoveredValue: number
}

export interface B2bFollowUp { id: number; status: "CONTACTED" | "WILL_PAY" | "LOST"; note: string; created_at: string; by_name: string | null }

export const abandonedB2bApi = {
  summary: (hours: number) => api.get<ApiResponse<B2bSummary>>("/admin/abandoned-b2b/summary", { params: { hours } }).then((r) => r.data.data),
  list: (params: Record<string, unknown>) =>
    api.get<{ data: B2bAbandonedRow[]; meta: { page: number; limit: number; total: number; totalPages: number } }>("/admin/abandoned-b2b", { params: clean(params) }).then((r) => r.data),
  history: (orderId: string) => api.get<ApiResponse<B2bFollowUp[]>>(`/admin/abandoned-b2b/${orderId}/history`).then((r) => r.data.data),
  followUp: (orderId: string, body: { status: B2bFollowUp["status"]; note: string }) =>
    api.post<ApiResponse<B2bFollowUp[]>>(`/admin/abandoned-b2b/${orderId}/follow-up`, body).then((r) => r.data.data),
}
