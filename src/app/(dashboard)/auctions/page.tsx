"use client"

/**
 * Auctions — overview + list.
 * Platform admins see everything; vendors (when the vendor portal lands) see only their own —
 * the API scopes the data, this page is identical for both.
 */

import { useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Clock, Gavel, IndianRupee, Plus, Settings2, Timer, TrendingUp, Wallet } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataList } from "@/components/shared/data-list"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { StatCard } from "@/components/dashboard/StatCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuctionStatusBadge, Countdown, dt } from "@/components/auctions/auction-ui"
import { useAuctionAction, useAuctionAttention, useAuctionList, useAuctionStats } from "@/hooks/useAuctions"
import { usePermissions } from "@/hooks/usePermissions"
import { cn, formatINR, formatShort } from "@/lib/utils"
import type { Auction } from "@/services/auctions.service"

const FILTERS: Array<{ id: string; label: string; statuses: string }> = [
  { id: "all", label: "All", statuses: "" },
  { id: "live", label: "Live", statuses: "LIVE,PAUSED" },
  { id: "action", label: "Needs action", statuses: "PENDING_APPROVAL,AWAITING_PAYMENT" },
  { id: "scheduled", label: "Scheduled", statuses: "SCHEDULED,DRAFT" },
  { id: "finished", label: "Finished", statuses: "SOLD,UNSOLD,DEFAULTED,CANCELLED,REJECTED" },
]

const countFor = (counts: Record<string, number> | undefined, statuses: string) =>
  !counts ? 0 : statuses ? statuses.split(",").reduce((n, s) => n + (counts[s] ?? 0), 0) : Object.values(counts).reduce((a, b) => a + b, 0)

export default function AuctionsPage() {
  const { can } = usePermissions()
  const [filter, setFilter] = useState("all")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const statuses = FILTERS.find((f) => f.id === filter)?.statuses ?? ""

  const stats = useAuctionStats()
  const attention = useAuctionAttention()
  const list = useAuctionList({ status: statuses, q, page, limit: 15 })
  const act = useAuctionAction()

  if (stats.isError) return <QueryErrorBlock error={stats.error} onRetry={() => stats.refetch()} />
  const s = stats.data
  const feeRevenue = (s?.platform_fee_revenue_30d ?? 0) + (s?.vendor_fee_revenue_30d ?? 0)
  const canManage = can("auctions.manage")
  const canModerate = can("auctions.moderate")

  return (
    <div className="space-y-6">
      <PageHeader title="Auctions" subtitle="Paid-registration ascending auctions — live control, approvals and fee revenue.">
        <div className="flex gap-2">
          {can("auctions.settings") && (
            <Button asChild variant="outline" size="sm"><Link href="/auctions/settings"><Settings2 /> Rules &amp; risk</Link></Button>
          )}
          {canManage && (
            <Button asChild size="sm"><Link href="/auctions/new"><Plus /> Create auction</Link></Button>
          )}
        </div>
      </PageHeader>

      {stats.isLoading || !s ? (
        <LoadingSkeleton variant="stat-card" count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Live now" value={String(s.live)} icon={<Gavel className="h-4 w-4 text-green-600" />} />
          <StatCard label="Ending < 1h" value={String(s.ending_soon)} icon={<Timer className="h-4 w-4 text-red-500" />} />
          <StatCard label="Awaiting payment" value={String(s.awaiting_payment)} icon={<Wallet className="h-4 w-4 text-violet-500" />} />
          <StatCard label="Pending approval" value={String(s.pending_approval)} icon={<Clock className="h-4 w-4 text-amber-500" />} />
          <StatCard label="Fee revenue · 30d" value={formatShort(feeRevenue)} icon={<IndianRupee className="h-4 w-4 text-brand-500" />} />
          <StatCard label="Auction GMV · 30d" value={formatShort(s.gmv_30d)} icon={<TrendingUp className="h-4 w-4 text-blue-500" />} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-4 lg:col-span-2" aria-labelledby="rev-h">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 id="rev-h" className="text-sm font-semibold">Entry-fee flow · last 30 days</h2>
            {s && (
              <p className="text-xs text-muted-foreground">
                Sell-through {s.sell_through_pct_30d ?? "—"}{s.sell_through_pct_30d != null && "%"} · avg {s.avg_bids_per_auction_30d} bids / auction
              </p>
            )}
          </div>
          {s && s.revenue_series.length > 0 ? (
            <div className="h-48 text-brand-500" role="img" aria-label="Fees collected and kept per day">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={s.revenue_series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => formatShort(v)} />
                  <Tooltip formatter={(v, n) => [formatINR(Number(v ?? 0)), n === "collected" ? "Collected" : "Forfeited (kept)"]} />
                  <Area type="monotone" dataKey="collected" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.12} />
                  <Area type="monotone" dataKey="revenue" stroke="currentColor" fill="currentColor" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">No fee activity yet — it appears once the first auction settles.</p>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4" aria-labelledby="att-h">
          <h2 id="att-h" className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="h-4 w-4 text-amber-500" /> Needs attention
          </h2>
          {attention.data?.length ? (
            <ul className="divide-y">
              {attention.data.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/auctions/${a.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.status === "PENDING_APPROVAL" && `Waiting for approval · ${a.seller_name ?? "Platform"}`}
                      {a.status === "AWAITING_PAYMENT" && <>Winner to pay · <Countdown endsAt={a.payment_deadline} endedLabel="overdue" />{a.offer_round > 1 && " · 2nd chance"}</>}
                      {a.status === "REJECTED" && "Rejected — vendor can edit and resubmit"}
                    </p>
                  </Link>
                  {a.status === "PENDING_APPROVAL" && canModerate && (
                    <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate({ id: a.id, name: "approve" })}>
                      <CheckCircle2 /> Approve
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">All clear — nothing waiting on you.</p>
          )}
        </section>
      </div>

      <section aria-labelledby="list-h" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="list-h" className="sr-only">All auctions</h2>
          <div role="tablist" aria-label="Filter auctions" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button key={f.id} role="tab" aria-selected={filter === f.id}
                onClick={() => { setFilter(f.id); setPage(1) }}
                className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filter === f.id ? "border-brand-500 bg-brand-50 text-brand-700" : "text-muted-foreground hover:bg-muted")}>
                {f.label}
                <span className="ml-1.5 tabular-nums opacity-70">{countFor(list.data?.counts, f.statuses)}</span>
              </button>
            ))}
          </div>
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search title or AU-…" className="h-9 w-full sm:w-64" aria-label="Search auctions" />
        </div>

        {list.isLoading ? <LoadingSkeleton variant="table" /> : list.isError ? (
          <QueryErrorBlock error={list.error} onRetry={() => list.refetch()} />
        ) : (
          <>
            <DataList<Auction>
              rows={list.data?.data ?? []}
              rowKey={(r) => r.id}
              emptyMessage={canManage ? "No auctions yet — create the first one." : "No auctions yet."}
              columns={[
                { id: "a", header: "Auction", cell: (r) => (
                  <Link href={`/auctions/${r.id}`} className="flex items-center gap-3 hover:underline">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.image_url ? <img src={r.image_url} alt="" className="h-10 w-10 rounded-md object-cover" /> : <div className="h-10 w-10 rounded-md bg-muted" />}
                    <span className="min-w-0"><span className="block max-w-[220px] truncate text-sm font-medium">{r.title}</span>
                      <span className="text-xs text-muted-foreground">{r.auction_number}</span></span>
                  </Link>) },
                { id: "s", header: "Seller", cell: (r) => <span className="text-sm">{r.owner_type === "ADMIN" ? "Dealker (own)" : r.seller_name ?? "Vendor"}</span> },
                { id: "p", header: "Price", cell: (r) => (
                  <span className="text-sm tabular-nums"><span className="font-semibold">{formatINR(r.bid_count > 0 ? r.current_price : r.start_price)}</span>
                    <span className="block text-xs text-muted-foreground">from {formatINR(r.start_price)}</span></span>) },
                { id: "b", header: "Activity", cell: (r) => (
                  <span className="text-xs text-muted-foreground tabular-nums">{r.bid_count} bids · {r.bidder_count} bidders<br />{r.registration_count} registered · fee {formatINR(r.registration_fee)}</span>) },
                { id: "e", header: "Ends", cell: (r) => (
                  ["LIVE", "PAUSED", "SCHEDULED"].includes(r.status)
                    ? <span className="text-sm"><Countdown endsAt={r.ends_at} serverTime={r.server_time} /><span className="block text-xs text-muted-foreground">{dt(r.ends_at)}</span></span>
                    : <span className="text-xs text-muted-foreground">{dt(r.ends_at)}</span>) },
                { id: "st", header: "Status", cell: (r) => <AuctionStatusBadge status={r.status} /> },
              ]}
            />
            {list.data && list.data.pagination.total > list.data.pagination.limit && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{list.data.pagination.total} auctions</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={page * list.data.pagination.limit >= list.data.pagination.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
