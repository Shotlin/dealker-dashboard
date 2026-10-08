"use client"

import { Laptop, Smartphone, Tablet } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { DeviceCategory, DeviceCondition, SellRequestStatus, SellRequestType } from "@/services/sell-requests.service"

export const STATUS_META: Record<SellRequestStatus, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200" },
  APPROVED: { label: "Approved", className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200" },
  IN_PROGRESS: { label: "In Progress", className: "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200" },
  COMPLETED: { label: "Completed", className: "border-teal-200 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-200" },
  REJECTED: { label: "Rejected", className: "border-red-200 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200" },
  CANCELLED: { label: "Cancelled", className: "border-red-200 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200" },
}

export const CONDITION_META: Record<DeviceCondition, { label: string; className: string }> = {
  EXCELLENT: { label: "Excellent", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200" },
  GOOD: { label: "Good", className: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200" },
  FAIR: { label: "Fair", className: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200" },
  POOR: { label: "Poor", className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200" },
}

export const TYPE_META: Record<SellRequestType, { label: string; className: string }> = {
  SELL_TO_AB: { label: "Sell to AB", className: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200" },
  BUY_NOW: { label: "Buy Now", className: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-200" },
  EXCHANGE: { label: "Exchange", className: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-200" },
}

export function StatusBadge({ status }: { status: SellRequestStatus }) {
  const m = STATUS_META[status]
  return <Badge variant="outline" className={cn("whitespace-nowrap rounded-full font-medium", m.className)}>{m.label}</Badge>
}

export function ConditionPill({ condition }: { condition: DeviceCondition }) {
  const m = CONDITION_META[condition]
  return <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", m.className)}>{m.label}</span>
}

export function TypePill({ type }: { type: SellRequestType }) {
  const m = TYPE_META[type]
  return <span className={cn("inline-block rounded-md px-2 py-0.5 text-xs font-medium", m.className)}>{m.label}</span>
}

const ICONS: Record<DeviceCategory, typeof Smartphone> = { Smartphone, Tablet, Laptop }

export function DeviceThumb({ category, className }: { category: DeviceCategory; className?: string }) {
  const Icon = ICONS[category]
  return (
    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 dark:from-slate-800 dark:to-slate-700 dark:text-slate-300", className)}>
      <Icon className="h-5 w-5" aria-hidden />
    </div>
  )
}

const PALETTE = ["bg-indigo-500", "bg-rose-500", "bg-emerald-500", "bg-amber-500", "bg-sky-500", "bg-violet-500", "bg-teal-500"]
export function PersonAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
  const color = PALETTE[Array.from(name).reduce((n, c) => n + c.charCodeAt(0), 0) % PALETTE.length]
  return (
    <div aria-hidden className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white", color, className)}>
      {initials}
    </div>
  )
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
export const fmtDateTime = (iso: string) => `${fmtDate(iso)}, ${fmtTime(iso)}`
