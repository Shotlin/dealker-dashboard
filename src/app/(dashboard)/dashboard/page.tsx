"use client"

/**
 * Main dashboard — every key number on one screen: sales (B2C / B2B), orders,
 * refunds & exchanges, COD / partial payments, wallets, commission & taxes,
 * people, abandoned carts, sell-on-phone, auctions, campaigns, subscriptions
 * and alerts. Click any widget to open the module behind it.
 */

import { useState } from "react"
import Link from "next/link"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { Group, Tile, compactInr, inr, num } from "@/components/command-center/Widgets"
import { ActionQueue } from "@/components/dashboard/ActionQueue"
import { CategoryDonut } from "@/components/dashboard/CategoryDonut"
import { OrdersByHourChart } from "@/components/dashboard/OrdersByHourChart"
import { RevenueChart } from "@/components/dashboard/RevenueChart"
import { TopProducts } from "@/components/dashboard/TopProducts"
import { useCommandCenter } from "@/hooks/useCommandCenter"
import { useCategoryRevenue } from "@/hooks/useDashboard"
import { cn, formatRelativeTime } from "@/lib/utils"
import type { CcPeriod } from "@/services/command-center.service"

const PERIOD_LABEL: Record<CcPeriod, string> = { today: "today", week: "the last 7 days", month: "the last 30 days", year: "the last year" }
const SEV: Record<string, string> = { CRITICAL: "bg-red-500", WARNING: "bg-amber-500", INFO: "bg-sky-500" }

export default function DashboardPage() {
  const [period, setPeriod] = useState<CcPeriod>("week")
  const { data: d, isLoading, isError, error, refetch, isFetching } = useCommandCenter(period)
  const { data: categoryData, isLoading: categoryLoading } = useCategoryRevenue()
  const l = isLoading || !d
  const p = PERIOD_LABEL[period]

  if (isError && !d) return <QueryErrorBlock error={error} onRetry={() => refetch()} />

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Marketplace overview</h1>
          <p className="text-sm text-muted-foreground">
            Everything across Dealker, for {p}. Updates every 30 seconds{isFetching ? " · refreshing…" : ""}.
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as CcPeriod)}>
          <TabsList className="h-9">
            <TabsTrigger value="today" className="px-3 text-xs">Today</TabsTrigger>
            <TabsTrigger value="week" className="px-3 text-xs">7 days</TabsTrigger>
            <TabsTrigger value="month" className="px-3 text-xs">30 days</TabsTrigger>
            <TabsTrigger value="year" className="px-3 text-xs">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Group title="Sales & orders" hint="Trend is against the period before">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <Tile id="total-sales" label="Total sales" loading={l} href="/orders" value={d && compactInr(d.sales.total.value)} trend={d?.sales.total.change} sub="B2C + B2B" />
          <Tile id="b2c-sales" label="B2C sales" loading={l} href="/orders" value={d && compactInr(d.sales.b2c.value)} trend={d?.sales.b2c.change} sub="Vendors → customers" />
          <Tile id="b2b-sales" label="B2B sales" loading={l} href="/vendors-marketplace" value={d && compactInr(d.sales.b2b.value)} trend={d?.sales.b2b.change} sub={d && `${num(d.orders.b2bOrders.value)} vendor order${d.orders.b2bOrders.value === 1 ? "" : "s"}`} />
          <Tile id="total-orders" label="Total orders" loading={l} href="/orders" value={d && num(d.orders.total.value)} trend={d?.orders.total.change} />
          <Tile id="pending-orders" label="Pending orders" loading={l} href="/orders" tone={d && d.orders.pending.value > 0 ? "warn" : "default"} value={d && num(d.orders.pending.value)} sub="Waiting right now" />
          <Tile id="delivered-orders" label="Delivered" loading={l} href="/orders" tone="good" value={d && num(d.orders.delivered.value)} trend={d?.orders.delivered.change} />
          <Tile id="cancelled-orders" label="Cancelled" loading={l} href="/orders" value={d && num(d.orders.cancelled.value)} trend={d?.orders.cancelled.change} goodWhenDown />
        </div>
      </Group>

      <Group title="After-sales & payments">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile id="refunds" label="Refunds" loading={l} href="/refund-requests" value={d && num(d.refunds.value)} trend={d?.refunds.change} goodWhenDown sub={d && `${inr(d.refunds.amount)} refunded`} />
          <Tile id="exchanges" label="Exchanges" loading={l} href="/exchange-requests" value={d && num(d.exchanges.value)} trend={d?.exchanges.change} sub={d && `${d.exchanges.completed} completed`} />
          <Tile id="cod-partial" label="COD / partial payment" loading={l} href="/orders"
            value={d && num(d.payments.codOrders + d.payments.partialOrders)} sub={d && `${d.payments.codOrders} COD · ${d.payments.partialOrders} partial · ${compactInr(d.payments.codValue)}`}>
            {d && <p className="mt-1 text-[11px] text-muted-foreground">{d.payments.prepaidShare}% paid fully online</p>}
          </Tile>
          <Tile id="sell-leads" label="Sell-on-phone leads" loading={l} href="/sell-requests" value={d && num(d.sellOnPhone.value)} trend={d?.sellOnPhone.change} sub={d && `${d.sellOnPhone.completed} completed · ${inr(d.sellOnPhone.payoutValue)}`} />
        </div>
      </Group>

      <Group title="Money">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <Tile id="customer-wallet" label="Customer wallet" loading={l} href="/wallet" value={d && compactInr(d.wallets.customer.balance)} sub={d && `${num(d.wallets.customer.holders)} customers hold a balance`} />
          <Tile id="vendor-wallet" label="Vendor wallet" loading={l} href="/vendor-wallet" value={d && compactInr(d.wallets.vendor.balance)}
            sub={d && `${compactInr(d.wallets.vendor.pendingPayouts)} payouts pending${d.wallets.vendor.vendorsOnHold ? ` · ${d.wallets.vendor.vendorsOnHold} on hold` : ""}`} />
          <Tile id="vendor-commission" label="Vendor commission" loading={l} href="/commission" value={d && compactInr(d.money.vendorCommission.value)} trend={d?.money.vendorCommission.change} sub="Earned by Dealker" />
          <Tile id="platform-charges" label="Platform charges" loading={l} href="/commission" value={d && compactInr(d.money.platformCharges.value)} trend={d?.money.platformCharges.change} />
          <Tile id="tax" label="Tax / GST" loading={l} href="/settings/fees" value={d && compactInr(d.money.tax.total)} sub={d && `${inr(d.money.tax.salesTax)} on sales · ${inr(d.money.tax.feeTax)} on fees`} />
        </div>
      </Group>

      <Group title="People">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile id="live-users" label="Live users" loading={l} href="/customer-activity" value={d && num(d.users.live.customers + d.users.live.staff)}
            sub={d && `${d.users.live.customers} customers · ${d.users.live.staff} staff (last 5 min)`} tone="good" />
          <Tile id="retained" label="Retained customers" loading={l} href="/customers" value={d && num(d.users.retained.returningBuyers)} sub={d && `${d.users.retained.rate}% of ${num(d.users.retained.buyers)} buyers came back`} />
          <Tile id="new-customers" label="New customers" loading={l} href="/customers" value={d && num(d.users.newCustomers.value)} trend={d?.users.newCustomers.change} />
          <Tile id="new-vendors" label="New vendors" loading={l} href="/vendors" value={d && num(d.users.newVendors.value)} trend={d?.users.newVendors.change} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Tile id="top-buyers" label="Top buyers" loading={l} href="/customers">
            <ol className="mt-2 space-y-1.5">
              {(d?.users.topBuyers ?? []).map((b, i) => (
                <li key={b.id} className="flex items-center justify-between gap-2 text-sm"><span className="truncate"><span className="mr-2 text-xs text-muted-foreground">{i + 1}</span>{b.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{b.orders} orders · {compactInr(b.spent)}</span></li>
              ))}
              {d && d.users.topBuyers.length === 0 && <li className="text-xs text-muted-foreground">No orders in this period.</li>}
            </ol>
          </Tile>
          <Tile id="top-vendors" label="Top vendors" loading={l} href="/vendors">
            <ol className="mt-2 space-y-1.5">
              {(d?.users.topVendors ?? []).map((v, i) => (
                <li key={v.id} className="flex items-center justify-between gap-2 text-sm"><span className="truncate"><span className="mr-2 text-xs text-muted-foreground">{i + 1}</span>{v.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{v.orders} orders · {compactInr(v.sales)}</span></li>
              ))}
              {d && d.users.topVendors.length === 0 && <li className="text-xs text-muted-foreground">No vendor sales in this period.</li>}
            </ol>
          </Tile>
        </div>
      </Group>

      <Group title="Abandoned carts" hint="Leads that left without buying">
        <div className="grid gap-3 md:grid-cols-2">
          <Tile id="abandoned-b2c" label="Abandoned carts — B2C" loading={l} href="/abandoned-carts" tone={d && d.abandoned.b2c.open > 0 ? "warn" : "default"}
            value={d && num(d.abandoned.b2c.open)} sub={d && `${compactInr(d.abandoned.b2c.openValue)} waiting · ${d.abandoned.b2c.recovered} recovered in ${p}`} />
          <Tile id="abandoned-b2b" label="Abandoned carts — B2B" loading={l} href="/abandoned-carts/b2b" tone={d && d.abandoned.b2b.count > 0 ? "warn" : "default"}
            value={d && num(d.abandoned.b2b.count)} sub={d && `${compactInr(d.abandoned.b2b.value)} wholesale value unpaid for 24 h+`} />
        </div>
      </Group>

      <Group title="Auctions">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Tile id="auction-activity" label="Auction activity" loading={l} href="/auctions" value={d && num(d.auctions.bids)} sub={d && `bids in ${p} · ${compactInr(d.auctions.revenue)} auction revenue`} />
          <Tile id="active-auctions" label="Active auctions" loading={l} href="/auctions" tone="good" value={d && num(d.auctions.live)}
            sub={d && `${d.auctions.scheduled} scheduled · ${d.auctions.endingSoon} ending in 24 h${d.auctions.pendingApproval ? ` · ${d.auctions.pendingApproval} to approve` : ""}`} />
          <Tile id="auction-winners" label="Auction winners" loading={l} href="/auctions" value={d && num(d.auctions.winners)} sub={d && `${d.auctions.awaitingPayment} awaiting payment`} />
        </div>
      </Group>

      <Group title="Growth & alerts">
        <div className="grid gap-3 lg:grid-cols-3">
          <Tile id="campaigns" label="Campaign overview" loading={l} href="/campaigns" value={d && num(d.campaigns.active)} sub="running now">
            {d && (
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {[["Scheduled", d.campaigns.scheduled], ["Orders", d.campaigns.orders], ["Revenue", compactInr(d.campaigns.revenue)], ["Customers", d.campaigns.customers], ["Vendors", d.campaigns.vendorsInvolved]].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium tabular-nums">{v}</dd></div>
                ))}
              </dl>
            )}
          </Tile>
          <Tile id="subscriptions" label="Subscription overview" loading={l} href="/subscriptions" value={d && compactInr(d.subscriptions.mrr)} sub="monthly recurring">
            {d && (
              <div className="mt-2 space-y-1 text-xs">
                {d.subscriptions.tiers.map((t) => (
                  <div key={t.tier} className="flex justify-between"><span className="text-muted-foreground">{t.tier.charAt(0) + t.tier.slice(1).toLowerCase()} vendors</span><span className="font-medium tabular-nums">{t.vendors}</span></div>
                ))}
                <div className="flex justify-between border-t pt-1"><span className={cn(d.subscriptions.expiringSoon > 0 ? "text-amber-700" : "text-muted-foreground")}>Expiring in 7 days</span><span className="font-medium tabular-nums">{d.subscriptions.expiringSoon}</span></div>
              </div>
            )}
          </Tile>
          <Tile id="alerts" label="Notifications / alerts" loading={l} href="/alerts" tone={d && d.alerts.summary.critical > 0 ? "danger" : "default"}
            value={d && num(d.alerts.summary.total)} sub={d && `last 7 days · ${d.alerts.summary.critical} critical · ${d.alerts.summary.warning} warnings`}>
            <ul className="mt-2 space-y-1.5">
              {(d?.alerts.recent ?? []).slice(0, 4).map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-xs">
                  <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", SEV[a.severity])} />
                  <span className="min-w-0 flex-1 truncate">{a.title}</span>
                  <span className="shrink-0 text-muted-foreground">{formatRelativeTime(a.created_at)}</span>
                </li>
              ))}
              {d && d.alerts.recent.length === 0 && <li className="text-xs text-muted-foreground">Nothing needs attention.</li>}
            </ul>
          </Tile>
        </div>
      </Group>

      <Group title="Trends & queue">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><RevenueChart /></div>
          <ActionQueue />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <TopProducts />
          <CategoryDonut data={categoryData} isLoading={categoryLoading} />
          <OrdersByHourChart />
        </div>
      </Group>
      <p className="pb-2 text-center text-xs text-muted-foreground">Need a deeper cut? <Link href="/analytics" className="underline">Analytics</Link></p>
    </div>
  )
}
