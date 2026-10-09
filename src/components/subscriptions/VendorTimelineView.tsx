"use client"

import { CheckCircle2, Circle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useVendorTimeline } from "@/hooks/useSubscriptions"
import { cn, formatDateTime } from "@/lib/utils"

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

/** Registered → Approved → Subscription → Products → Orders → Sales → Commission → Wallet → Refunds → Reviews → Auction → Renewal */
export function VendorTimelineView({ vendorId }: { vendorId: string }) {
  const { data, isLoading } = useVendorTimeline(vendorId)
  if (isLoading || !data) return <Skeleton className="h-64 w-full" />
  return (
    <div className="space-y-5" data-testid="vendor-timeline">
      <ol className="space-y-0">
        {data.stages.map((s, i) => (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0" data-testid={`stage-${s.key}`} data-done={s.done}>
            {i < data.stages.length - 1 && <span className={cn("absolute left-[9px] top-5 h-full w-px", s.done ? "bg-emerald-300" : "bg-border")} />}
            {s.done ? <CheckCircle2 className="relative z-10 mt-0.5 h-5 w-5 shrink-0 bg-white text-emerald-600" /> : <Circle className="relative z-10 mt-0.5 h-5 w-5 shrink-0 bg-white text-slate-300" />}
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium", !s.done && "text-muted-foreground")}>
                {s.label}
                {s.at && <span className="ml-2 text-xs font-normal text-muted-foreground">{formatDateTime(s.at)}</span>}
              </p>
              <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                {s.metrics.map((m) => (
                  <span key={m.label}>{m.label}: <b className="font-medium text-foreground">{m.money ? inr(Number(m.value)) : m.value}</b></span>
                ))}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent activity</p>
        <ul className="divide-y rounded-lg border text-sm">
          {data.feed.map((f, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 px-3 py-2">
              <span>{f.title}{f.detail ? <span className="text-xs text-muted-foreground"> — {f.detail}</span> : null}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(f.at)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
