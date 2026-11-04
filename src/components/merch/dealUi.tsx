import { cn, formatDateTime } from "@/lib/utils"
import type { DealInfo } from "@/services/merch-sections.service"

const STATUS: Record<DealInfo["status"], { label: string; cls: string }> = {
  ACTIVE: { label: "Live", cls: "bg-green-50 text-green-700" },
  SCHEDULED: { label: "Scheduled", cls: "bg-amber-50 text-amber-700" },
  DRAFT: { label: "Draft", cls: "bg-slate-100 text-slate-600" },
  ENDED: { label: "Ended", cls: "bg-slate-100 text-slate-500" },
  CANCELLED: { label: "Cancelled", cls: "bg-red-50 text-red-700" },
}

export function DealStatusChip({ status }: { status: DealInfo["status"] }) {
  const s = STATUS[status]
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", s.cls)}>{s.label}</span>
}

export function dealWindow(d: Pick<DealInfo, "starts_at" | "ends_at">) {
  if (!d.starts_at && !d.ends_at) return "No dates set"
  return `${d.starts_at ? formatDateTime(d.starts_at) : "—"} → ${d.ends_at ? formatDateTime(d.ends_at) : "—"}`
}

export function discountLabel(d: { discount?: { operation: string; value: number } | null }) {
  if (!d.discount) return "—"
  const v = Math.abs(Number(d.discount.value))
  return d.discount.operation === "PERCENT" ? `${v}% off` : d.discount.operation === "FIXED" ? `₹${v} off` : `${v}% off MRP`
}

/** "ends in 1h 43m" / "starts in 2d" / "ended". */
export function dealTiming(d: Pick<DealInfo, "status" | "starts_at" | "ends_at">, now = Date.now()) {
  const span = (ms: number) => {
    const m = Math.max(Math.round(ms / 60000), 0)
    return m >= 1440 ? `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h` : m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
  }
  if (d.status === "ACTIVE" && d.ends_at) return `ends in ${span(new Date(d.ends_at).getTime() - now)}`
  if (d.status === "SCHEDULED" && d.starts_at) return `starts in ${span(new Date(d.starts_at).getTime() - now)}`
  return d.status === "ENDED" ? "ended" : ""
}
