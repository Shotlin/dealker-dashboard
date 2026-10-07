import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { TicketCategory, TicketPriority, TicketStatus } from "@/types/support.types"

export const STATUS_META: Record<TicketStatus, { label: string; cls: string }> = {
  OPEN: { label: "Open", cls: "bg-blue-50 text-blue-700" },
  ASSIGNED: { label: "Assigned", cls: "bg-indigo-50 text-indigo-700" },
  IN_PROGRESS: { label: "In progress", cls: "bg-amber-50 text-amber-700" },
  REOPENED: { label: "Reopened", cls: "bg-orange-50 text-orange-700" },
  RESOLVED: { label: "Resolved", cls: "bg-emerald-50 text-emerald-700" },
  CLOSED: { label: "Closed", cls: "bg-slate-100 text-slate-600" },
}

export const PRIORITY_META: Record<TicketPriority, { label: string; dot: string; cls: string }> = {
  LOW: { label: "Low", dot: "bg-slate-400", cls: "text-slate-600" },
  NORMAL: { label: "Normal", dot: "bg-sky-500", cls: "text-sky-700" },
  HIGH: { label: "High", dot: "bg-orange-500", cls: "text-orange-700" },
  URGENT: { label: "Urgent", dot: "bg-red-500", cls: "text-red-700" },
}

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  GENERAL: "General",
  ORDER: "Order",
  DELIVERY: "Delivery",
  RETURN_REFUND: "Return & refund",
  PAYMENT: "Payment",
  PRODUCT: "Product",
  ACCOUNT: "Account",
  SELLER: "Seller issue",
}

export function StatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  const m = STATUS_META[status]
  return (
    <Badge variant="outline" className={cn("border-0 text-[11px] font-medium", m.cls, className)}>
      {m.label}
    </Badge>
  )
}

export function PriorityDot({ priority, withLabel = false }: { priority: TicketPriority; withLabel?: boolean }) {
  const m = PRIORITY_META[priority]
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", m.cls)}>
      <span className={cn("h-2 w-2 rounded-full", m.dot)} />
      {withLabel && m.label}
    </span>
  )
}

export function initials(name?: string | null) {
  return (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
}
