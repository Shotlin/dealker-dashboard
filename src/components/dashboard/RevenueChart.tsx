"use client"

import { useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useRevenueChart } from "@/hooks/useDashboard"
import { formatINR, formatShort } from "@/lib/utils"

const RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const
type Metric = "revenue" | "orders"

const fmtDate = (v: string) => {
  const d = new Date(v)
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export function RevenueChart() {
  const [range, setRange] = useState<keyof typeof RANGES>("30d")
  const [metric, setMetric] = useState<Metric>("revenue")
  const { data, isLoading, isError } = useRevenueChart(RANGES[range])
  const empty = isError || !data?.length

  return (
    <Card className="h-full">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Sales performance</CardTitle>
          <CardDescription>Marketplace GMV and orders over time</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={metric}
            onValueChange={(v) => v && setMetric(v as Metric)}
          >
            <ToggleGroupItem value="revenue" className="px-3 text-xs">GMV</ToggleGroupItem>
            <ToggleGroupItem value="orders" className="px-3 text-xs">Orders</ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={range}
            onValueChange={(v) => v && setRange(v as keyof typeof RANGES)}
          >
            {Object.keys(RANGES).map((r) => (
              <ToggleGroupItem key={r} value={r} className="px-3 text-xs">{r}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full rounded-lg" />
        ) : empty ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            No sales in this period yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="dkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={fmtDate} />
              <YAxis tickLine={false} axisLine={false} width={48}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => (metric === "revenue" ? formatShort(v).replace("₹", "") : String(v))} />
              <Tooltip
                cursor={{ stroke: "hsl(var(--border))" }}
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(l) => fmtDate(String(l))}
                formatter={(v) => [metric === "revenue" ? formatINR(Number(v)) : Number(v), metric === "revenue" ? "GMV" : "Orders"]}
              />
              <Area type="monotone" dataKey={metric} stroke="#4F46E5" strokeWidth={2} fill="url(#dkFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
