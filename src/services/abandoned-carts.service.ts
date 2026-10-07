import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"
import type {
  AbandonedCart,
  AbandonedCartDetail,
  AbandonedCartFilters,
  AbandonedCartSummary,
  SendReminderPayload,
  IssueCouponPayload,
  QuickCouponMeta,
  BulkReminderResult,
  QuickCouponResult,
} from "@/types/abandoned-cart.types"

export async function getAbandonedCarts(filters: AbandonedCartFilters = {}) {
  const params: Record<string, unknown> = {}
  if (filters.page) params.page = filters.page
  if (filters.limit) params.limit = filters.limit
  if (filters.search) params.search = filters.search
  if (filters.status) params.status = filters.status
  if (filters.minValue !== undefined) params.minValue = filters.minValue
  if (filters.maxValue !== undefined) params.maxValue = filters.maxValue
  if (filters.sortBy) params.sortBy = filters.sortBy
  if (filters.sortOrder) params.sortOrder = filters.sortOrder

  const { data } = await api.get<
    ApiResponse<{
      carts: AbandonedCart[]
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>
  >("/admin/abandoned-carts", { params })

  return {
    carts: Array.isArray(data.data?.carts) ? data.data.carts : [],
    pagination: data.data?.pagination ?? {
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      total: 0,
      totalPages: 0,
    },
  }
}

export async function getAbandonedCartsSummary() {
  const { data } = await api.get<ApiResponse<AbandonedCartSummary>>("/admin/abandoned-carts/summary")
  return data.data
}

export async function getAbandonedCartDetail(id: string) {
  const { data } = await api.get<ApiResponse<AbandonedCartDetail>>(`/admin/abandoned-carts/${id}`)
  return data.data
}

export async function sendAbandonedCartReminder(id: string, payload: SendReminderPayload) {
  const { data } = await api.post<ApiResponse<{ notificationId: string }>>(
    `/admin/abandoned-carts/${id}/notify`,
    payload
  )
  return data.data
}

export async function issueAbandonedCartCoupon(id: string, payload: IssueCouponPayload) {
  const { data } = await api.post<ApiResponse<{ couponId: string; code?: string }>>(
    `/admin/abandoned-carts/${id}/coupon`,
    payload
  )
  return data.data
}

export async function getQuickCouponMeta() {
  const { data } = await api.get<ApiResponse<QuickCouponMeta>>("/admin/abandoned-carts/presets")
  return data.data
}

export async function sendBulkAbandonedCartReminder(
  ids: string[],
  payload: Pick<SendReminderPayload, "title" | "body" | "deepLink">
) {
  const { data } = await api.post<ApiResponse<BulkReminderResult>>("/admin/abandoned-carts/bulk-notify", {
    ids,
    ...payload,
  })
  return data.data
}

export async function sendQuickCoupon(
  id: string,
  payload: { preset: string; validHours?: number; notify?: boolean }
) {
  const { data } = await api.post<ApiResponse<QuickCouponResult>>(
    `/admin/abandoned-carts/${id}/quick-coupon`,
    payload
  )
  return data.data
}
