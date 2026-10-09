"use client"

import { Building2, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { RepairChannel, RepairStatus } from "@/services/repairs.service"

export const STATUS_META: Record<RepairStatus, { label: string; className: string }> = {
  REQUESTED: { label: "New request", className: "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200" },
  ACCEPTED: { label: "Accepted", className: "border-sky-200 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-200" },
  INSPECTION: { label: "Inspection", className: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200" },
  ESTIMATE_SENT: { label: "Awaiting approval", className: "border-violet-200 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-200" },
  ESTIMATE_APPROVED: { label: "Approved", className: "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200" },
  IN_REPAIR: { label: "In repair", className: "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200" },
  QC_PENDING: { label: "QC pending", className: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-200" },
  REPAIRED: { label: "Repaired", className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200" },
  READY_FOR_DELIVERY: { label: "Ready to deliver", className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200" },
  COMPLETED: { label: "Completed", className: "border-teal-200 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-200" },
  REJECTED: { label: "Rejected", className: "border-red-200 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200" },
  CANCELLED: { label: "Cancelled", className: "border-red-200 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200" },
  ESTIMATE_REJECTED: { label: "Estimate declined", className: "border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-200" },
  FAILED: { label: "Not repairable", className: "border-red-200 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200" },
}

export function RepairStatusBadge({ status }: { status: RepairStatus }) {
  const m = STATUS_META[status]
  return <Badge variant="outline" className={cn("whitespace-nowrap rounded-full font-medium", m.className)}>{m.label}</Badge>
}

export function ChannelPill({ channel }: { channel: RepairChannel }) {
  const B = channel === "B2B"
  const Icon = B ? Building2 : User
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", B ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200" : "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-200")}>
      <Icon className="h-3 w-3" aria-hidden />{channel}
    </span>
  )
}

export const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—")
export const fmtDay = (iso?: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—")
