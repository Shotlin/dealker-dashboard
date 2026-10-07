"use client"

/**
 * Sponsored Ads — account overview + campaign list.
 * Vendors see their own account (wallet, performance, campaigns); platform admins see ad revenue
 * across all vendors and the review queue. The API scopes the data; the page is the same.
 */

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, Eye, IndianRupee, MousePointerClick, Percent, Plus, Receipt, Settings2, ShoppingBag, Target, Wallet } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataList } from "@/components/shared/data-list"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { StatCard } from "@/components/dashboard/StatCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  CampaignStatusBadge, SpendChart, VendorPicker, dateShort, num, pct, rupees, selectClass, useAdsRole,
} from "@/components/ads/ads-ui"
import { useAdOverview, useAdRules, useCampaignAction, useCampaignList } from "@/hooks/useAds"
import { usePermissions } from "@/hooks/usePermissions"
import { cn, formatINR } from "@/lib/utils"
import type { Campaign } from "@/services/ads.service"

const FILTERS: Array<{ id: string; label: string; statuses: string }> = [
  { id: "all", label: "All", statuses: "" },
  { id: "active", label: "Running", statuses: "ACTIVE" },
  { id: "review", label: "In review", statuses: "PENDING_REVIEW" },
  { id: "paused", label: "Paused", statuses: "PAUSED,SUSPENDED" },
  { id: "draft", label: "Drafts", statuses: "DRAFT,REJECTED" },
  { id: "ended", label: "Ended", statuses: "ENDED" },
]
const countFor = (counts: Record<string, number> | undefined, statuses: string) =>
  !counts ? 0 : statuses ? statuses.split(",").reduce((n, s) => n + (counts[s] ?? 0), 0) : Object.values(counts).reduce((a, b) => a + b, 0)

export default function AdsPage() {
  const { can } = usePermissions()
  const { isPlatform } = useAdsRole()
  const [days, setDays] = useState(30)
  const [vendorId, setVendorId] = useState("")
  const [filter, setFilter] = useState("all")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)

  const overview = useAdOverview({ days, vendorId: vendorId || undefined })
  const list = useCampaignList({ status: FILTERS.find((f) => f.id === filter)?.statuses ?? "", q, vendorId: vendorId || undefined, page, limit: 15 })
  const act = useCampaignAction()
  const rules = useAdRules()

  if (overview.isError) return <QueryErrorBlock error={overview.error} onRetry={() => overview.refetch()} />
  const o = overview.data
  const t = o?.totals
  const w = o?.wallet
  const plat = o?.platform
  const canManage = can("ads.manage")

  return (
    <div className="space-y-6">
      <PageHeader title="Sponsored Ads" subtitle="Promote products in search results. You pay only when a shopper clicks — never for impressions.">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/ads/wallet"><Wallet /> Wallet &amp; billing</Link></Button>
          {can("ads.settings") && <Button asChild variant="outline" size="sm"><Link href="/ads/settings"><Settings2 /> Pricing rules</Link></Button>}
          {canManage && <Button asChild size="sm"><Link href="/ads/new"><Plus /> New campaign</Link></Button>}
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-end gap-3">
        {isPlatform && (
          <div className="w-56"><VendorPicker value={vendorId} onChange={(v) => { setVendorId(v); setPage(1) }} label="Vendor" allowAll /></div>
        )}
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Period</span>
          <select className={cn(selectClass, "w-36")} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Reporting period">
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select>
        </label>
      </div>

      {w?.low_balance && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:bg-amber-950 dark:text-amber-100">
          <p className="flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Your ad wallet has <strong>{rupees(w.balance)}</strong>
              {w.active_campaigns > 0 && <> — less than one day of spend ({rupees(w.daily_commitment, 0)}/day across {w.active_campaigns} running campaign{w.active_campaigns > 1 ? "s" : ""})</>}.
              Campaigns pause automatically when the wallet is empty.
            </span>
          </p>
          <Button asChild size="sm"><Link href="/ads/wallet">Add money</Link></Button>
        </div>
      )}

      {overview.isLoading || !t ? (
        <LoadingSkeleton variant="stat-card" count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
          <StatCard label="Ad spend" value={rupees(t.spend, 0)} icon={<IndianRupee className="h-4 w-4 text-brand-500" />} />
          <StatCard label="Impressions" value={num(t.impressions)} icon={<Eye className="h-4 w-4 text-blue-500" />} />
          <StatCard label="Clicks" value={num(t.clicks)} icon={<MousePointerClick className="h-4 w-4 text-violet-500" />} />
          <StatCard label="CTR" value={pct(t.ctr)} icon={<Percent className="h-4 w-4 text-amber-500" />} />
          <StatCard label="Avg. CPC" value={rupees(t.avg_cpc)} icon={<Receipt className="h-4 w-4 text-slate-500" />} />
          <StatCard label="Ad sales" value={formatINR(t.sales)} icon={<ShoppingBag className="h-4 w-4 text-green-600" />} />
          <StatCard label="ACOS" value={t.acos == null ? "—" : pct(t.acos, 1)} icon={<Target className="h-4 w-4 text-red-500" />} />
        </div>
      )}
      {t && (
        <p className="-mt-3 text-xs text-muted-foreground">
          Ad sales = orders placed within {rules.data?.attribution_window_days ?? 7} days of an ad click. ACOS = ad spend ÷ ad sales (lower is better){t.roas != null && <> · ROAS {t.roas.toFixed(2)}×</>}. Spend excludes GST.
        </p>
      )}

      <div className={cn("grid gap-4", plat ? "lg:grid-cols-3" : "")}>
        <section className={cn("rounded-xl border bg-card p-4", plat && "lg:col-span-2")} aria-labelledby="spend-h">
          <h2 id="spend-h" className="mb-2 text-sm font-semibold">Daily ad spend</h2>
          <SpendChart data={o?.daily ?? []} />
        </section>

        {plat && (
          <section className="rounded-xl border bg-card p-4" aria-labelledby="rev-h">
            <h2 id="rev-h" className="mb-3 text-sm font-semibold">Ad revenue · last {days} days</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Net ad revenue" value={rupees(plat.net_revenue, 0)} strong />
              <Row label="GST collected" value={rupees(plat.gst_collected, 0)} />
              <Row label="Vendor top-ups" value={rupees(plat.topups, 0)} />
              <Row label="Promo credit given" value={rupees(plat.promo_credits, 0)} />
              <Row label="Vendor wallet balances (owed in ads)" value={rupees(plat.wallet_liability, 0)} />
            </dl>
            {plat.top_advertisers.length > 0 && (
              <>
                <h3 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top advertisers</h3>
                <ul className="divide-y text-sm">
                  {plat.top_advertisers.slice(0, 5).map((a) => (
                    <li key={a.vendor_id} className="flex justify-between py-1.5"><span className="truncate">{a.name}</span><span className="tabular-nums">{rupees(a.spend, 0)}</span></li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
      </div>

      <section aria-labelledby="list-h" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="list-h" className="sr-only">Campaigns</h2>
          <div role="tablist" aria-label="Filter campaigns" className="flex flex-wrap gap-1.5">
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
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search campaign name or AD-…" className="h-9 w-full sm:w-64" aria-label="Search campaigns" />
        </div>

        {list.isLoading ? <LoadingSkeleton variant="table" /> : list.isError ? (
          <QueryErrorBlock error={list.error} onRetry={() => list.refetch()} />
        ) : (
          <>
            <DataList<Campaign>
              rows={list.data?.data ?? []}
              rowKey={(r) => r.id}
              emptyMessage={canManage ? "No campaigns yet — create your first one to start appearing at the top of search." : "No campaigns yet."}
              columns={[
                { id: "c", header: "Campaign", cell: (r) => (
                  <Link href={`/ads/${r.id}`} className="block hover:underline">
                    <span className="block max-w-[240px] truncate text-sm font-medium">{r.name}</span>
                    <span className="text-xs text-muted-foreground">{r.campaign_number} · {r.targeting === "AUTO" ? "Automatic" : "Keywords"} · {r.product_count ?? 0} product{r.product_count === 1 ? "" : "s"}</span>
                  </Link>) },
                ...(isPlatform ? [{ id: "v", header: "Vendor", cell: (r: Campaign) => <span className="text-sm">{r.vendor_name}</span> }] : []),
                { id: "b", header: "Budget / day", cell: (r) => (
                  <span className="text-sm tabular-nums">{rupees(r.daily_budget, 0)}
                    <span className="block text-xs text-muted-foreground">today {rupees(r.spent_today)} · bid {rupees(r.default_bid)}</span></span>) },
                { id: "p", header: "Last 30 days", cell: (r) => (
                  <span className="text-sm tabular-nums">{rupees(r.spend_30d ?? 0, 0)}
                    <span className="block text-xs text-muted-foreground">{num(r.clicks_30d)} clicks · CTR {pct(r.ctr_30d)}</span></span>) },
                { id: "d", header: "Dates", cell: (r) => <span className="text-xs text-muted-foreground">{dateShort(r.starts_on)} → {r.ends_on ? dateShort(r.ends_on) : "no end"}</span> },
                { id: "s", header: "Status", cell: (r) => (
                  <span className="flex items-center gap-2">
                    <CampaignStatusBadge status={r.status} />
                    {r.status === "PENDING_REVIEW" && can("ads.moderate") && (
                      <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate({ id: r.id, name: "approve" })}>
                        <CheckCircle2 /> Approve
                      </Button>
                    )}
                  </span>) },
              ]}
            />
            {list.data && list.data.pagination.total > list.data.pagination.limit && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{list.data.pagination.total} campaigns</span>
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

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("tabular-nums", strong && "text-base font-semibold")}>{value}</dd>
    </div>
  )
}
