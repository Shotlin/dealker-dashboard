/** Order stage timeline + manual override — admin API. */

import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"

export interface OrderStage {
  key: string
  label: string
  done: boolean
  current: boolean
  detail: string | null
  override: { reason: string; by: string | null; at: string } | null
  canOverride: boolean
  blocked: string | null
}

export interface OrderStages {
  orderId: string
  orderNumber: string
  status: string
  terminal: boolean
  stages: OrderStage[]
  history: Array<{ stage: string; reason: string; by: string | null; at: string }>
}

export const orderStagesApi = {
  get: (orderId: string) => api.get<ApiResponse<OrderStages>>(`/admin/order-stages/${orderId}`).then((r) => r.data.data),
  override: (orderId: string, stage: string, reason: string) =>
    api.post<ApiResponse<OrderStages>>(`/admin/order-stages/${orderId}/override`, { stage, reason }).then((r) => r.data.data),
}
