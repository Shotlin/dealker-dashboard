"use client"

/** Campaign detail — performance, products, keywords, settings, activity (and click review for the platform). */

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Ban, CheckCircle2, Pause, Play, Plus, RotateCcw, Send, Square, Trash2, XCircle } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataList } from "@/components/shared/data-list"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { StatCard } from "@/components/dashboard/StatCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  CampaignStatusBadge, Field, PAUSE_REASONS, ReasonDialog, SpendChart, dateShort, dateTime, num, pct, rupees, selectClass, useAdsRole,
} from "@/components/ads/ads-ui"
import {
  useAddKeywords, useAddProducts, useAdProducts, useAdRules, useCampaign, useCampaignAction, useCampaignClicks, useCampaignReport,
  useRefundClick, useRemoveKeyword, useRemoveProduct, useUpdateCampaign, useUpdateKeyword, useUpdateProduct,
} from "@/hooks/useAds"
import { usePermissions } from "@/hooks/usePermissions"
import { formatINR } from "@/lib/utils"
import type { CampaignDetail, MatchType } from "@/services/ads.service"

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { can } = usePermissions()
  const { isPlatform } = useAdsRole()
  const [days, setDays] = useState(30)
  const [dialog, setDialog] = useState<null | "reject" | "suspend">(null)

  const q = useCampaign(id)
  const report = useCampaignReport(id, days)
  const act = useCampaignAction()

  if (q.isLoading) return <LoadingSkeleton variant="stat-card" count={4} />
  if (q.isError || !q.data) return <QueryErrorBlock error={q.error} onRetry={() => q.refetch()} />
  const c = q.data
  const canManage = can("ads.manage")
  const canModerate = can("ads.moderate")
  const editable = c.status !== "ENDED"
  const run = (name: Parameters<typeof act.mutate>[0]["name"], body?: Record<string, unknown>) => act.mutate({ id, name, body })
  const t = report.data?.totals

  return (
    <div className="space-y-6">
      <PageHeader title={c.name} subtitle={`${c.campaign_number}${isPlatform && c.vendor_name ? ` · ${c.vendor_name}` : ""} · ${c.targeting === "AUTO" ? "Automatic targeting" : "Keyword targeting"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <CampaignStatusBadge status={c.status} />
          <Button asChild variant="outline" size="sm"><Link href="/ads">All campaigns</Link></Button>
          {canManage && ["DRAFT", "REJECTED"].includes(c.status) && <Button size="sm" disabled={act.isPending} onClick={() => run("submit")}><Send /> {isPlatform ? "Launch" : "Submit for review"}</Button>}
          {canManage && c.status === "ACTIVE" && <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => run("pause")}><Pause /> Pause</Button>}
          {canManage && c.status === "PAUSED" && <Button size="sm" disabled={act.isPending} onClick={() => run("resume")}><Play /> Resume</Button>}
          {canManage && editable && c.status !== "SUSPENDED" && <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => { if (confirm("End this campaign? It can't be restarted — you can clone it by creating a new one.")) run("end") }}><Square /> End</Button>}
          {canModerate && c.status === "PENDING_REVIEW" && (
            <>
              <Button size="sm" disabled={act.isPending} onClick={() => run("approve")}><CheckCircle2 /> Approve</Button>
              <Button size="sm" variant="outline" onClick={() => setDialog("reject")}><XCircle /> Reject</Button>
            </>
          )}
          {canModerate && ["ACTIVE", "PAUSED", "PENDING_REVIEW"].includes(c.status) && <Button size="sm" variant="outline" onClick={() => setDialog("suspend")}><Ban /> Suspend</Button>}
          {canModerate && c.status === "SUSPENDED" && <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => run("unsuspend")}><RotateCcw /> Lift suspension</Button>}
        </div>
      </PageHeader>

      {c.status === "REJECTED" && c.rejected_reason && <Notice tone="red" title="Rejected">{c.rejected_reason} — edit the campaign and submit it again.</Notice>}
      {c.status === "SUSPENDED" && <Notice tone="red" title="Suspended by Dealker">{c.suspended_reason}</Notice>}
      {c.status === "PAUSED" && c.paused_reason && <Notice tone="amber" title="Paused">{PAUSE_REASONS[c.paused_reason] ?? c.paused_reason}{c.paused_reason === "OUT_OF_FUNDS" && <> <Link href="/ads/wallet" className="underline">Add money</Link></>}</Notice>}
      {c.status === "PENDING_REVIEW" && <Notice tone="amber" title="In review">Dealker is reviewing this campaign. It goes live as soon as it&apos;s approved.</Notice>}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Performance</h2>
        <select className={selectClass + " !w-36"} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Reporting period">
          <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </select>
      </div>
      {report.isLoading || !t ? <LoadingSkeleton variant="stat-card" count={4} /> : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
          <StatCard label="Spend" value={rupees(t.spend, 0)} icon={<span className="text-xs">₹</span>} />
          <StatCard label="Impressions" value={num(t.impressions)} icon={<span className="text-xs">👁</span>} />
          <StatCard label="Clicks" value={num(t.clicks)} icon={<span className="text-xs">⌖</span>} />
          <StatCard label="CTR / CPC" value={`${pct(t.ctr)} · ${rupees(t.avg_cpc)}`} icon={<span className="text-xs">%</span>} />
          <StatCard label="Orders · Sales" value={`${t.orders} · ${formatINR(t.sales)}`} icon={<span className="text-xs">🛒</span>} />
          <StatCard label="ACOS" value={t.acos == null ? "—" : pct(t.acos, 1)} icon={<span className="text-xs">🎯</span>} />
        </div>
      )}
      <section className="rounded-xl border bg-card p-4"><SpendChart data={report.data?.daily ?? []} /></section>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products ({c.products.length})</TabsTrigger>
          <TabsTrigger value="keywords">{c.targeting === "MANUAL" ? `Keywords (${c.keywords.filter((k) => !k.is_negative).length})` : "Search terms"}</TabsTrigger>
          <TabsTrigger value="settings">Budget &amp; bid</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          {isPlatform && canModerate && <TabsTrigger value="clicks">Click review</TabsTrigger>}
        </TabsList>

        <TabsContent value="products" className="space-y-3"><ProductsTab c={c} canManage={canManage && editable} report={report.data} /></TabsContent>
        <TabsContent value="keywords" className="space-y-3"><KeywordsTab c={c} canManage={canManage && editable} report={report.data} /></TabsContent>
        <TabsContent value="settings"><SettingsTab c={c} canManage={canManage && editable} /></TabsContent>
        <TabsContent value="activity">
          <DataList
            rows={c.events.map((e, i) => ({ ...e, i }))}
            rowKey={(r) => String(r.i)}
            emptyMessage="No activity yet."
            columns={[
              { id: "t", header: "When", cell: (r) => <span className="text-xs text-muted-foreground">{dateTime(r.created_at)}</span> },
              { id: "e", header: "Event", cell: (r) => <span className="text-sm font-medium">{r.event.replace(/_/g, " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase())}</span> },
              { id: "a", header: "By", cell: (r) => <Badge variant="outline">{r.actor_kind.toLowerCase()}</Badge> },
              { id: "d", header: "Details", cell: (r) => <span className="text-xs text-muted-foreground">{Object.entries(r.payload ?? {}).filter(([, v]) => typeof v !== "object").map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}</span> },
            ]}
          />
        </TabsContent>
        {isPlatform && canModerate && <TabsContent value="clicks"><ClicksTab id={id} /></TabsContent>}
      </Tabs>

      <ReasonDialog
        open={dialog === "reject"} onOpenChange={(o) => !o && setDialog(null)} pending={act.isPending}
        title="Reject campaign" description="The vendor sees this reason and can edit and resubmit." confirmLabel="Reject" destructive
        onConfirm={(reason) => { run("reject", { reason }); setDialog(null) }}
      />
      <ReasonDialog
        open={dialog === "suspend"} onOpenChange={(o) => !o && setDialog(null)} pending={act.isPending}
        title="Suspend campaign" description="Stops the campaign immediately. The vendor can't resume it until you lift the suspension." confirmLabel="Suspend" destructive
        onConfirm={(reason) => { run("suspend", { reason }); setDialog(null) }}
      />
    </div>
  )
}

function Notice({ tone, title, children }: { tone: "red" | "amber"; title: string; children: React.ReactNode }) {
  const cls = tone === "red" ? "border-red-300 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100" : "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
  return <div role="status" className={`rounded-xl border p-3 text-sm ${cls}`}><strong>{title}.</strong> {children}</div>
}

// ── Products ────────────────────────────────────────────────────────────

function ProductsTab({ c, canManage, report }: { c: CampaignDetail; canManage: boolean; report?: ReturnType<typeof useCampaignReport>["data"] }) {
  const add = useAddProducts(c.id)
  const upd = useUpdateProduct(c.id)
  const del = useRemoveProduct(c.id)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState("")
  const [picked, setPicked] = useState<string[]>([])
  const avail = useAdProducts(search, c.vendor_id, adding)
  const existing = new Set(c.products.map((p) => p.product_id))
  const perf = new Map((report?.products ?? []).map((p) => [p.product_id, p]))

  return (
    <>
      {canManage && (
        <div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}><Plus /> Add products</Button></div>
      )}
      {adding && (
        <div className="space-y-2 rounded-xl border bg-card p-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your products" aria-label="Search products" />
          <ul className="max-h-60 divide-y overflow-auto rounded-lg border">
            {avail.data?.filter((p) => !existing.has(p.id)).map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 p-2 hover:bg-muted">
                  <input type="checkbox" checked={picked.includes(p.id)} onChange={() => setPicked((x) => (x.includes(p.id) ? x.filter((i) => i !== p.id) : [...x, p.id]))} />
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{rupees(p.price, 0)}</span>
                </label>
              </li>
            ))}
            {avail.data && avail.data.filter((p) => !existing.has(p.id)).length === 0 && <li className="p-3 text-sm text-muted-foreground">Nothing else to add.</li>}
          </ul>
          <Button size="sm" disabled={!picked.length || add.isPending} onClick={() => add.mutate({ productIds: picked }, { onSuccess: () => { setPicked([]); setAdding(false) } })}>Add {picked.length || ""} selected</Button>
        </div>
      )}
      <DataList
        rows={c.products}
        rowKey={(r) => r.product_id}
        emptyMessage="No products in this campaign."
        columns={[
          { id: "p", header: "Product", cell: (r) => (
            <span className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.thumbnail ? <img src={r.thumbnail} alt="" className="h-10 w-10 rounded-md object-cover" /> : <div className="h-10 w-10 rounded-md bg-muted" />}
              <span className="min-w-0"><span className="block max-w-[260px] truncate text-sm font-medium">{r.name}</span>
                <span className="text-xs text-muted-foreground">{r.price != null && rupees(r.price, 0)} · {r.stock} in stock{r.stock === 0 && " — not showing"}</span></span>
            </span>) },
          { id: "b", header: "Bid", cell: (r) => (
            canManage
              ? <BidInput value={r.bid_override} placeholder={String(c.default_bid)} onSave={(v) => upd.mutate({ productId: r.product_id, bidOverride: v })} />
              : <span className="text-sm tabular-nums">{rupees(r.bid_override ?? c.default_bid)}</span>) },
          { id: "i", header: "Impr. / Clicks", cell: (r) => <span className="text-sm tabular-nums">{num(r.impressions)} / {num(r.clicks)}</span> },
          { id: "s", header: "Spend · Sales", cell: (r) => <span className="text-sm tabular-nums">{rupees(r.spend, 0)} · {formatINR(perf.get(r.product_id)?.sales ?? 0)}</span> },
          { id: "a", header: "", cell: (r) => canManage ? (
            <span className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => upd.mutate({ productId: r.product_id, status: r.status === "ACTIVE" ? "PAUSED" : "ACTIVE" })}>{r.status === "ACTIVE" ? <Pause /> : <Play />}{r.status === "ACTIVE" ? "Pause" : "Resume"}</Button>
              <Button size="sm" variant="ghost" aria-label={`Remove ${r.name}`} onClick={() => del.mutate(r.product_id)}><Trash2 /></Button>
            </span>) : <Badge variant="outline">{r.status.toLowerCase()}</Badge> },
        ]}
      />
    </>
  )
}

function BidInput({ value, placeholder, onSave }: { value: number | null; placeholder: string; onSave: (v: number | null) => void }) {
  const [v, setV] = useState(value == null ? "" : String(value))
  useEffect(() => setV(value == null ? "" : String(value)), [value])
  return (
    <Input type="number" step="0.5" className="h-8 w-24 text-sm" value={v} placeholder={placeholder} aria-label="Bid"
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { const n = v === "" ? null : Number(v); if (n !== value) onSave(n) }} />
  )
}

// ── Keywords ────────────────────────────────────────────────────────────

function KeywordsTab({ c, canManage, report }: { c: CampaignDetail; canManage: boolean; report?: ReturnType<typeof useCampaignReport>["data"] }) {
  const add = useAddKeywords(c.id)
  const upd = useUpdateKeyword(c.id)
  const del = useRemoveKeyword(c.id)
  const [text, setText] = useState("")
  const [mt, setMt] = useState<MatchType>("BROAD")
  const [neg, setNeg] = useState(false)
  const perf = new Map((report?.keywords ?? []).map((k) => [k.keyword, k]))

  return (
    <>
      {c.targeting === "AUTO" && (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          This is an automatic campaign — Dealker matches your products to relevant searches. Add negative keywords below to block searches you don&apos;t want.
        </p>
      )}
      {canManage && (
        <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <Field label={neg ? "Negative keywords (one per line)" : "Keywords (one per line)"}><Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} /></Field>
          <Field label="Match"><select className={selectClass} value={mt} onChange={(e) => setMt(e.target.value as MatchType)} disabled={neg}><option value="BROAD">Broad</option><option value="PHRASE">Phrase</option><option value="EXACT">Exact</option></select></Field>
          <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={neg} onChange={(e) => setNeg(e.target.checked)} /> Negative</label>
          <Button disabled={!text.trim() || add.isPending} onClick={() => add.mutate(text.split("\n").map((s) => s.trim()).filter(Boolean).map((keyword) => ({ keyword, matchType: neg ? "BROAD" : mt, negative: neg })), { onSuccess: () => setText("") })}><Plus /> Add</Button>
        </div>
      )}
      <DataList
        rows={c.keywords}
        rowKey={(r) => r.id}
        emptyMessage="No keywords yet."
        columns={[
          { id: "k", header: "Keyword", cell: (r) => <span className="text-sm font-medium">{r.is_negative ? "−" : ""}{r.keyword}</span> },
          { id: "m", header: "Match", cell: (r) => <Badge variant="outline">{r.is_negative ? "negative" : r.match_type.toLowerCase()}</Badge> },
          { id: "b", header: "Bid", cell: (r) => r.is_negative ? <span className="text-xs text-muted-foreground">—</span> : canManage
            ? <BidInput value={r.bid} placeholder={String(c.default_bid)} onSave={(v) => upd.mutate({ keywordId: r.id, bid: v })} />
            : <span className="text-sm tabular-nums">{rupees(r.bid ?? c.default_bid)}</span> },
          { id: "c", header: "Clicks · Spend", cell: (r) => <span className="text-sm tabular-nums">{r.is_negative ? "—" : `${num(r.clicks)} · ${rupees(r.spend, 0)}`}</span> },
          { id: "o", header: "Orders", cell: (r) => <span className="text-sm tabular-nums">{r.is_negative ? "—" : (perf.get(r.keyword)?.orders ?? 0)}</span> },
          { id: "a", header: "", cell: (r) => canManage ? (
            <span className="flex gap-1">
              {!r.is_negative && <Button size="sm" variant="outline" onClick={() => upd.mutate({ keywordId: r.id, status: r.status === "ACTIVE" ? "PAUSED" : "ACTIVE" })}>{r.status === "ACTIVE" ? "Pause" : "Resume"}</Button>}
              <Button size="sm" variant="ghost" aria-label={`Remove ${r.keyword}`} onClick={() => del.mutate(r.id)}><Trash2 /></Button>
            </span>) : null },
        ]}
      />
    </>
  )
}

// ── Budget & bid ────────────────────────────────────────────────────────

function SettingsTab({ c, canManage }: { c: CampaignDetail; canManage: boolean }) {
  const rules = useAdRules()
  const upd = useUpdateCampaign(c.id)
  const [f, setF] = useState({ name: c.name, bid: String(c.default_bid), daily: String(c.daily_budget), total: c.total_budget == null ? "" : String(c.total_budget), endsOn: c.ends_on ? String(c.ends_on).slice(0, 10) : "" })
  useEffect(() => setF({ name: c.name, bid: String(c.default_bid), daily: String(c.daily_budget), total: c.total_budget == null ? "" : String(c.total_budget), endsOn: c.ends_on ? String(c.ends_on).slice(0, 10) : "" }), [c])
  const r = rules.data
  return (
    <div className="grid max-w-2xl gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Field label="Name"><Input value={f.name} disabled={!canManage} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field></div>
      <Field label="Default bid (₹)" hint={r && `${rupees(r.min_cpc)} – ${rupees(r.max_cpc)}`}><Input type="number" step="0.5" value={f.bid} disabled={!canManage} onChange={(e) => setF({ ...f, bid: e.target.value })} /></Field>
      <Field label="Daily budget (₹)" hint={r && `Min ${rupees(r.min_daily_budget, 0)} · spent today ${rupees(c.spent_today)}`}><Input type="number" step="10" value={f.daily} disabled={!canManage} onChange={(e) => setF({ ...f, daily: e.target.value })} /></Field>
      <Field label="Total budget (₹)" hint="Empty = no lifetime cap"><Input type="number" step="100" value={f.total} disabled={!canManage} onChange={(e) => setF({ ...f, total: e.target.value })} /></Field>
      <Field label="End date" hint={`Started ${dateShort(c.starts_on)}`}><Input type="date" value={f.endsOn} disabled={!canManage} onChange={(e) => setF({ ...f, endsOn: e.target.value })} /></Field>
      {canManage && (
        <div className="sm:col-span-2">
          <Button disabled={upd.isPending} onClick={() => upd.mutate({ name: f.name, defaultBid: Number(f.bid), dailyBudget: Number(f.daily), totalBudget: f.total === "" ? null : Number(f.total), endsOn: f.endsOn || null })}>Save changes</Button>
          <p className="mt-2 text-xs text-muted-foreground">Bid and budget changes take effect within seconds — no re-approval needed.</p>
        </div>
      )}
    </div>
  )
}

// ── Click review (platform) ─────────────────────────────────────────────

function ClicksTab({ id }: { id: string }) {
  const q = useCampaignClicks(id, true)
  const refund = useRefundClick()
  const [target, setTarget] = useState<string | null>(null)
  return (
    <>
      <p className="text-sm text-muted-foreground">Latest 50 clicks. Refund a click that looks like bot or fraudulent traffic — the vendor is credited the price plus GST.</p>
      {q.isLoading ? <LoadingSkeleton variant="table" /> : (
        <DataList
          rows={q.data ?? []}
          rowKey={(r) => r.id}
          emptyMessage="No clicks yet."
          columns={[
            { id: "t", header: "When", cell: (r) => <span className="text-xs text-muted-foreground">{dateTime(r.created_at)}</span> },
            { id: "p", header: "Product / keyword", cell: (r) => <span className="text-sm">{r.product_name}<span className="block text-xs text-muted-foreground">{r.keyword ?? "auto"}</span></span> },
            { id: "c", header: "Charge", cell: (r) => r.charged ? <span className="text-sm tabular-nums">{rupees(r.cpc)} + {rupees(r.tax_amount)} GST</span> : <Badge variant="outline">free · {(r.not_charged_reason ?? "").toLowerCase().replace(/_/g, " ")}</Badge> },
            { id: "i", header: "IP", cell: (r) => <span className="text-xs text-muted-foreground">{r.ip ?? "—"}</span> },
            { id: "a", header: "", cell: (r) => r.charged && !r.refunded ? <Button size="sm" variant="outline" onClick={() => setTarget(r.id)}>Refund</Button> : r.refunded ? <Badge variant="outline">refunded</Badge> : null },
          ]}
        />
      )}
      <ReasonDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)} pending={refund.isPending} title="Refund this click" description="Credits the vendor's ad wallet." confirmLabel="Refund click"
        onConfirm={(reason) => { if (target) refund.mutate({ clickId: target, reason }, { onSuccess: () => setTarget(null) }) }} />
    </>
  )
}
