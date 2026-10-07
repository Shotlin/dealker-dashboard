"use client"

import { IndianRupee, ShoppingBag, TrendingDown, TrendingUp, UserPlus, Receipt } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatNumberShort, formatShort } from "@/lib/utils"
import type { DashboardStats } from "@/types/dashboard.types"

interface KpiProps {
  label: string
  value: string
  change?: number
  note: string
  icon: React.ElementType
}

function Kpi({ label, value, change, note, icon: Icon }: KpiProps) {
  const up = (change ?? 0) >= 0
  const Trend = up ? TrendingUp : TrendingDown
  return (
    <Card className="bg-card shadow-sm">
      <CardHeader className="relative pb-3">
        <CardDescription className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-100 text-brand-700 dark:bg-brand-100/20 dark:text-brand-500">
            <Icon className="h-3.5 w-3.5" />
          </span>
          {label}
        </CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">{value}</CardTitle>
        {change !== undefined && (
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className={cn(
                "gap-1 border-0 text-xs font-medium",
                up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
              )}
            >
              <Trend className="h-3 w-3" />
              {up ? "+" : ""}
              {change.toFixed(1)}%
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardFooter className="pt-0 text-xs text-muted-foreground">{note}</CardFooter>
    </Card>
  )
}

export function SectionCards({
  stats,
  isLoading,
  periodLabel,
}: {
  stats?: DashboardStats
  isLoading: boolean
  periodLabel: string
}) {
  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[124px] rounded-xl" />
        ))}
      </div>
    )
  }
  const aov = stats.orders.value > 0 ? stats.revenue.value / stats.orders.value : 0
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        label="Gross merchandise value"
        value={formatShort(stats.revenue.value)}
        change={stats.revenue.change}
        note={`Across all vendors · ${periodLabel}`}
        icon={IndianRupee}
      />
      <Kpi
        label="Orders"
        value={formatNumberShort(stats.orders.value)}
        change={stats.orders.change}
        note={`${formatNumberShort(stats.today.orders)} placed today`}
        icon={ShoppingBag}
      />
      <Kpi
        label="Customers"
        value={formatNumberShort(stats.customers.value)}
        change={stats.customers.change}
        note={`${formatNumberShort(stats.today.newCustomers)} joined today`}
        icon={UserPlus}
      />
      <Kpi
        label="Average order value"
        value={formatShort(aov)}
        note={`${formatNumberShort(stats.products.value)} products in catalog`}
        icon={Receipt}
      />
    </div>
  )
}
