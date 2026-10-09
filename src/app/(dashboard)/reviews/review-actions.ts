/** Review moderation state machine — mirrors the backend (review-moderation.service.js). */

import type { ReviewAction, ReviewStatus } from "@/types/review.types"

export const STATUS_META: Record<ReviewStatus, { label: string; cls: string }> = {
  SUBMITTED: { label: "Awaiting", cls: "bg-amber-50 text-amber-700" },
  APPROVED: { label: "Approved", cls: "bg-sky-50 text-sky-700" },
  PUBLISHED: { label: "Published", cls: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Rejected", cls: "bg-red-50 text-red-700" },
  HIDDEN: { label: "Hidden", cls: "bg-slate-100 text-slate-600" },
  REMOVED: { label: "Removed", cls: "bg-slate-200 text-slate-500" },
}

export const ACTION_RULES: Record<ReviewAction, {
  label: string; from: ReviewStatus[]; hint: string; reason?: boolean; confirm?: boolean; danger?: boolean
}> = {
  PUBLISH: { label: "Publish", from: ["SUBMITTED", "APPROVED", "HIDDEN"], hint: "Customers will see it and it counts toward the rating." },
  APPROVE: { label: "Approve", from: ["SUBMITTED"], hint: "Approved reviews stay hidden from customers until published." },
  REJECT: { label: "Reject", from: ["SUBMITTED", "APPROVED"], reason: true, danger: true, hint: "The customer's review is not published. They can edit and resubmit it." },
  HIDE: { label: "Hide", from: ["PUBLISHED"], confirm: true, hint: "Takes it off the storefront and out of the rating. You can publish it again." },
  REMOVE: { label: "Remove", from: ["SUBMITTED", "APPROVED", "PUBLISHED", "REJECTED", "HIDDEN"], reason: true, danger: true, hint: "Removes it for good from the storefront and the rating. The customer can't review this order again." },
  RESTORE: { label: "Restore", from: ["REJECTED", "REMOVED"], hint: "Puts it back in the awaiting queue." },
}

const ORDER: ReviewAction[] = ["PUBLISH", "APPROVE", "RESTORE", "REJECT", "HIDE", "REMOVE"]

/** Actions that make sense for a review in this state, in button order. */
export const actionsFor = (status: ReviewStatus): ReviewAction[] => ORDER.filter((a) => ACTION_RULES[a].from.includes(status))
