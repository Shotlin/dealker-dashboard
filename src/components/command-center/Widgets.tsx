"use client"

import Link from "next/link"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
export const compactInr = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return inr(n)
}
export const num = (n: number) => new Intl.NumberFormat("en-IN").format(n)

/** Up / down against the previous equal period. `goodWhenDown` flips the colours (cancellations, refunds…). */
export function Trend({ change, goodWhenDown = false }: { change: number; goodWhenDown?: boolean }) {
  if (!Number.isFinite(change) || change === 0) return <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground"><Minus className="h-3 w-3" />0%</span>
  const up = change > 0
  const good = goodWhenDown ? !up : up
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-medium", good ? "text-emerald-600" : "text-red-600")}>
      <Icon className="h-3 w-3" />{Math.abs(change)}%
    </span>
  )
}

/** One dashboard widget. Clicking opens the module behind it. */
export function Tile({ id, label, value, sub, trend, goodWhenDown, href, tone, loading, children }: {
  id: string
  label: string
  value?: React.ReactNode
  sub?: React.ReactNode
  trend?: number
  goodWhenDown?: boolean
  href?: string
  tone?: "default" | "warn" | "danger" | "good"
  loading?: boolean
  children?: React.ReactNode
}) {
  const body = (
    <div data-testid={`widget-${id}`}
      className={cn("h-full rounded-xl border bg-white p-4 transition-shadow", href && "hover:shadow-sm",
        tone === "warn" && "border-amber-200 bg-amber-50/40", tone === "danger" && "border-red-200 bg-red-50/40", tone === "good" && "border-emerald-200 bg-emerald-50/40")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {trend !== undefined && !loading && <Trend change={trend} goodWhenDown={goodWhenDown} />}
      </div>
      {loading ? <Skeleton className="mt-2 h-7 w-24" /> : value !== undefined && <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>}
      {sub && !loading && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      {children}
    </div>
  )
  return href ? <Link href={href} className="block h-full">{body}</Link> : body
}

export function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2"><h2 className="text-sm font-semibold tracking-tight">{title}</h2>{hint && <span className="text-xs text-muted-foreground">{hint}</span>}</div>
      {children}
    </section>
  )
}
