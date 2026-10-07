"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ActionQueue } from "@/components/dashboard/ActionQueue"
import { CategoryDonut } from "@/components/dashboard/CategoryDonut"
import { OrdersByHourChart } from "@/components/dashboard/OrdersByHourChart"
import { RecentOrders } from "@/components/dashboard/RecentOrders"
import { RevenueChart } from "@/components/dashboard/RevenueChart"
import { SectionCards } from "@/components/dashboard/SectionCards"
import { TopProducts } from "@/components/dashboard/TopProducts"
import {
  useCategoryRevenue,
  useDashboardStats,
  useRecentOrders,
} from "@/hooks/useDashboard"

type Period = "today" | "week" | "month" | "year"
const PERIODS: Record<Period, string> = {
  today: "today",
  week: "this week",
  month: "this month",
  year: "this year",
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("week")
  const { data: stats, isLoading: statsLoading } = useDashboardStats(period)
  const { data: recentOrders, isLoading: ordersLoading } = useRecentOrders(8)
  const { data: categoryData, isLoading: categoryLoading } = useCategoryRevenue()

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Marketplace overview</h1>
          <p className="text-sm text-muted-foreground">
            Sales, vendors and orders across Dealker — all in one place.
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="h-9">
            <TabsTrigger value="today" className="px-3 text-xs">Today</TabsTrigger>
            <TabsTrigger value="week" className="px-3 text-xs">7 days</TabsTrigger>
            <TabsTrigger value="month" className="px-3 text-xs">30 days</TabsTrigger>
            <TabsTrigger value="year" className="px-3 text-xs">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <SectionCards stats={stats} isLoading={statsLoading} periodLabel={PERIODS[period]} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <ActionQueue />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <TopProducts />
        <CategoryDonut data={categoryData} isLoading={categoryLoading} />
        <OrdersByHourChart />
      </div>

      <RecentOrders data={recentOrders} isLoading={ordersLoading} />
    </div>
  )
}
