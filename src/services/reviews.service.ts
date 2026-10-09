/** Review moderation API — /admin/reviews/:kind (product | vendor). */

import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"
import type {
  ReviewAction, ReviewDetail, ReviewKind, ReviewListParams, ReviewRow, ReviewSummary,
} from "@/types/review.types"

const clean = (p: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null && v !== false))
const seg = (k: ReviewKind) => k.toLowerCase()

export interface ReviewPage {
  data: ReviewRow[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export const reviewsApi = {
  summary: () => api.get<ApiResponse<ReviewSummary>>("/admin/reviews/summary").then((r) => r.data.data),
  setAutoPublish: (autoPublish: boolean) =>
    api.put<ApiResponse<{ auto_publish: boolean }>>("/admin/reviews/settings", { autoPublish }).then((r) => r.data.data),
  list: (kind: ReviewKind, params: ReviewListParams) =>
    api.get<ReviewPage>(`/admin/reviews/${seg(kind)}`, { params: clean({ ...params }) }).then((r) => r.data),
  get: (kind: ReviewKind, id: string) =>
    api.get<ApiResponse<ReviewDetail>>(`/admin/reviews/${seg(kind)}/${id}`).then((r) => r.data.data),
  moderate: (kind: ReviewKind, id: string, action: ReviewAction, note?: string) =>
    api.post<ApiResponse<ReviewDetail>>(`/admin/reviews/${seg(kind)}/${id}/moderate`, { action, note }).then((r) => r.data.data),
  bulk: (kind: ReviewKind, ids: string[], action: ReviewAction, note?: string) =>
    api.post<ApiResponse<{ done: string[]; failed: { id: string; reason: string }[] }>>(`/admin/reviews/${seg(kind)}/bulk`, { ids, action, note }).then((r) => r.data.data),
  reply: (kind: ReviewKind, id: string, text: string) =>
    api.put<ApiResponse<ReviewDetail>>(`/admin/reviews/${seg(kind)}/${id}/reply`, { text }).then((r) => r.data.data),
  flag: (kind: ReviewKind, id: string, flagged: boolean, reason?: string) =>
    api.put<ApiResponse<ReviewDetail>>(`/admin/reviews/${seg(kind)}/${id}/flag`, { flagged, reason }).then((r) => r.data.data),
}
