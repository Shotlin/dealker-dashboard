import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { B2bOrderStatus, ReqStatus } from "@/types/b2b.admin.types"

const REQ: Record<ReqStatus, { label: string; cls: string }> = {
  OPEN: { label: "Open for quotes", cls: "bg-blue-50 text-blue-700" },
  AWARDED: { label: "Awarded", cls: "bg-indigo-50 text-indigo-700" },
  IN_FULFILMENT: { label: "In fulfilment", cls: "bg-amber-50 text-amber-700" },
  COMPLETED: { label: "Completed", cls: "bg-emerald-50 text-emerald-700" },
  CANCELLED: { label: "Cancelled", cls: "bg-slate-100 text-slate-600" },
  EXPIRED: { label: "Expired", cls: "bg-slate-100 text-slate-600" },
}
const ORD: Record<B2bOrderStatus, { label: string; cls: string }> = {
  PENDING_PAYMENT: { label: "Awaiting payment", cls: "bg-slate-100 text-slate-700" },
  PAID: { label: "Paid · to dispatch", cls: "bg-blue-50 text-blue-700" },
  PACKED: { label: "Packed", cls: "bg-indigo-50 text-indigo-700" },
  DISPATCHED: { label: "Dispatched", cls: "bg-amber-50 text-amber-700" },
  DELIVERED: { label: "Delivered", cls: "bg-teal-50 text-teal-700" },
  COMPLETED: { label: "Completed", cls: "bg-emerald-50 text-emerald-700" },
  DISPUTED: { label: "Disputed", cls: "bg-red-50 text-red-700" },
  CANCELLED: { label: "Cancelled", cls: "bg-slate-100 text-slate-600" },
  REFUNDED: { label: "Refunded", cls: "bg-violet-50 text-violet-700" },
}
const PAY: Record<string, { label: string; cls: string }> = {
  UNPAID: { label: "Unpaid", cls: "text-slate-500" },
  ESCROW_HELD: { label: "In escrow", cls: "text-blue-600" },
  RELEASED: { label: "Released", cls: "text-emerald-600" },
  REFUNDED: { label: "Refunded", cls: "text-violet-600" },
}

export function ReqStatusBadge({ status }: { status: ReqStatus }) {
  const m = REQ[status]
  return <Badge variant="outline" className={cn("border-0 text-[11px] font-medium", m.cls)}>{m.label}</Badge>
}
export function OrderStatusBadge({ status }: { status: B2bOrderStatus }) {
  const m = ORD[status]
  return <Badge variant="outline" className={cn("border-0 text-[11px] font-medium", m.cls)}>{m.label}</Badge>
}
export function PayState({ status }: { status: string }) {
  const m = PAY[status] ?? PAY.UNPAID
  return <span className={cn("text-xs font-medium", m.cls)}>{m.label}</span>
}

export const COND_LABEL: Record<string, string> = {
  NEW: "New", OPEN_BOX: "Open box", REFURBISHED: "Refurbished", USED_LIKE_NEW: "Used · Like new", USED_GOOD: "Used · Good", USED_FAIR: "Used · Fair",
}

export const dateShort = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—")
export const dateTime = (s: string) => new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
