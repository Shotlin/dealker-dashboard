/** Review moderation — product reviews and vendor (shop) reviews are separate lists. */

export type ReviewKind = "PRODUCT" | "VENDOR"
export type ReviewStatus = "SUBMITTED" | "APPROVED" | "PUBLISHED" | "REJECTED" | "HIDDEN" | "REMOVED"
export type ReviewAction = "APPROVE" | "PUBLISH" | "REJECT" | "HIDE" | "REMOVE" | "RESTORE"

export interface ReviewRow {
  id: string
  kind: ReviewKind
  rating: number
  comment: string | null
  status: ReviewStatus
  flagged: boolean
  flag_reason: string | null
  moderation_note: string | null
  moderated_at: string | null
  admin_reply: string | null
  replied_at: string | null
  created_at: string
  order_id: string | null
  is_verified_purchase: boolean
  user_name: string
  user_phone: string | null
  /** product id (PRODUCT) or vendor id (VENDOR) */
  subject_id: string
  /** product name (PRODUCT) or vendor name (VENDOR) */
  subject_name: string
  vendor_id: string | null
  vendor_name: string | null
  report_count: number
}

export interface ReviewReport { id: number; reason: string; created_at: string; reporter_name: string }
export interface ReviewDetail extends ReviewRow { reports: ReviewReport[] }

export interface ReviewQueueSummary {
  byStatus: Record<ReviewStatus, number>
  pending: number
  total: number
  flagged: number
  reported: number
  lowPending: number
  avgPublished: number
}

export interface ReviewSummary {
  settings: { auto_publish: boolean; updated_at: string | null }
  product: ReviewQueueSummary
  vendor: ReviewQueueSummary
}

export interface ReviewListParams {
  status?: string
  rating?: string
  flagged?: boolean
  search?: string
  page?: number
  limit?: number
}
