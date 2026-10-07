"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useCountdown } from "@/hooks/useAuctions"
import type { AuctionStatus } from "@/services/auctions.service"

/** Status → label + colour. Colour is never the only signal: every badge carries text. */
export const STATUS_META: Record<AuctionStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
  PENDING_APPROVAL: { label: "Pending approval", className: "border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  REJECTED: { label: "Rejected", className: "border-red-300 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
  SCHEDULED: { label: "Scheduled", className: "border-blue-300 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" },
  LIVE: { label: "Live", className: "border-green-300 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" },
  PAUSED: { label: "Paused", className: "border-orange-300 bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200" },
  AWAITING_PAYMENT: { label: "Awaiting payment", className: "border-violet-300 bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200" },
  SOLD: { label: "Sold", className: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  UNSOLD: { label: "Unsold", className: "border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
  CANCELLED: { label: "Cancelled", className: "border-red-300 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
  DEFAULTED: { label: "Defaulted", className: "border-red-300 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
}

export function AuctionStatusBadge({ status, className }: { status: AuctionStatus; className?: string }) {
  const m = STATUS_META[status] ?? STATUS_META.DRAFT
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap", m.className, className)}>
      {status === "LIVE" && <span aria-hidden className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-green-600" />}
      {m.label}
    </Badge>
  )
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`
  return `${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`
}

/** Server-clock countdown. Turns red in the final 5 minutes. */
export function Countdown({
  endsAt, serverTime, className, endedLabel = "Ended",
}: { endsAt: string | null | undefined; serverTime?: string; className?: string; endedLabel?: string }) {
  const left = useCountdown(endsAt, serverTime)
  if (left === null) return <span className={className}>—</span>
  if (left <= 0) return <span className={cn("text-muted-foreground", className)}>{endedLabel}</span>
  return (
    <span className={cn("tabular-nums", left < 5 * 60_000 && "font-semibold text-red-600", className)} aria-live="off">
      {formatDuration(left)}
    </span>
  )
}

export const dt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"
