import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ApprovalStatus, ListingCondition, ListingStatus } from "@/types/listing.types"

export const CONDITION_META: Record<ListingCondition, { label: string; cls: string; hint: string }> = {
  NEW: { label: "New", cls: "bg-emerald-50 text-emerald-700", hint: "Brand new, sealed" },
  OPEN_BOX: { label: "Open box", cls: "bg-teal-50 text-teal-700", hint: "Unused, box opened" },
  REFURBISHED: { label: "Refurbished", cls: "bg-sky-50 text-sky-700", hint: "Professionally restored and tested" },
  USED_LIKE_NEW: { label: "Used · Like new", cls: "bg-indigo-50 text-indigo-700", hint: "No visible marks" },
  USED_GOOD: { label: "Used · Good", cls: "bg-amber-50 text-amber-700", hint: "Light scratches, fully working" },
  USED_FAIR: { label: "Used · Fair", cls: "bg-orange-50 text-orange-700", hint: "Visible wear, fully working" },
}

export function ConditionBadge({ condition }: { condition: ListingCondition }) {
  const m = CONDITION_META[condition]
  return <Badge variant="outline" className={cn("border-0 text-[11px] font-medium", m.cls)}>{m.label}</Badge>
}

export function OwnerBadge({ type, name }: { type: "ADMIN" | "VENDOR"; name: string }) {
  return type === "ADMIN" ? (
    <Badge className="gap-1 bg-primary/10 text-[11px] font-medium text-primary hover:bg-primary/10">Dealker</Badge>
  ) : (
    <span className="inline-flex max-w-[160px] items-center truncate text-sm">{name}</span>
  )
}

const APPROVAL: Record<ApprovalStatus, { label: string; cls: string }> = {
  PENDING: { label: "Pending review", cls: "bg-amber-50 text-amber-700" },
  APPROVED: { label: "Approved", cls: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Changes needed", cls: "bg-red-50 text-red-700" },
}
export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const m = APPROVAL[status]
  return <Badge variant="outline" className={cn("border-0 text-[11px] font-medium", m.cls)}>{m.label}</Badge>
}

export function StockCell({ stock, status }: { stock: number; status: ListingStatus }) {
  if (status === "PAUSED") return <span className="text-xs font-medium text-slate-500">Paused</span>
  if (stock === 0) return <span className="text-xs font-medium text-red-600">Out of stock</span>
  return <span className="tabular-nums text-sm">{stock}</span>
}
