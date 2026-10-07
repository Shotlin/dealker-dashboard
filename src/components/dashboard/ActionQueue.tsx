"use client"

import Link from "next/link"
import { AlertTriangle, ChevronRight, ClipboardList, Landmark, PackageSearch, ShieldCheck, Store } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { usePendingActions } from "@/hooks/useDashboard"
import { useMarketplaceSummary } from "@/hooks/useMarketplace"
import { cn } from "@/lib/utils"

interface Row {
  label: string
  hint: string
  href: string
  count: number | undefined
  icon: React.ElementType
  tone: string
}

export function ActionQueue() {
  const pending = usePendingActions()
  const summary = useMarketplaceSummary()
  const loading = pending.isLoading || summary.isLoading

  const rows: Row[] = [
    {
      label: "Vendor KYC to review",
      hint: "New sellers waiting for verification",
      href: "/vendors",
      count: summary.data?.kycPending,
      icon: ShieldCheck,
      tone: "bg-violet-50 text-violet-600",
    },
    {
      label: "Listings awaiting approval",
      hint: "Seller products pending moderation",
      href: "/products?approval=PENDING",
      count: summary.data?.listingsPending,
      icon: PackageSearch,
      tone: "bg-sky-50 text-sky-600",
    },
    {
      label: "Orders to process",
      hint: "Pending confirmation",
      href: "/orders",
      count: pending.data?.pendingOrders,
      icon: ClipboardList,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      label: "Low-stock products",
      hint: "At or below threshold",
      href: "/products",
      count: pending.data?.lowStockProducts,
      icon: AlertTriangle,
      tone: "bg-red-50 text-red-600",
    },
  ]

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Needs your attention</CardTitle>
        <CardDescription>Marketplace work queue</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-1 pt-0">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
          : rows.map((r) => (
              <Link
                key={r.label}
                href={r.href}
                className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
              >
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", r.tone)}>
                  <r.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.hint}</span>
                </span>
                <Badge variant={r.count ? "default" : "secondary"} className="tabular-nums">
                  {r.count ?? 0}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
        {!loading && (
          <Link
            href="/settlements"
            className="group mt-2 flex items-center gap-3 rounded-lg border border-dashed p-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            <Landmark className="ml-1 h-4 w-4" />
            <span className="flex-1">Vendor payouts &amp; settlements</span>
            <Store className="h-4 w-4 opacity-0" />
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
