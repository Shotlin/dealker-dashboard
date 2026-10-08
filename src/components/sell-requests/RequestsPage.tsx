"use client"

/**
 * One section of the Sell / Exchange area: KPI strip + request list on the left, detail panel on the right.
 * Rendered by two separate routes (/sell-requests and /exchange-requests) — each calls its own API and
 * never shows the other's rows.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, ClipboardList, Clock, Link2Off, MoreHorizontal, Plus, Search, Settings2, ShoppingCart, XCircle } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn, formatINR, formatNumber } from "@/lib/utils"
import { usePermissions } from "@/hooks/usePermissions"
import { useDebounce } from "@/hooks/useDebounce"
import { useRequestAction, useRequestList, useRequestStats } from "@/hooks/useSellRequests"
import { SellRequestDetailPanel } from "@/components/sell-requests/SellRequestDetailPanel"
import { CreateSellRequestDialog } from "@/components/sell-requests/CreateSellRequestDialog"
import { ConditionPill, DeviceThumb, PersonAvatar, StatusBadge, TypePill, fmtDate, fmtTime } from "@/components/sell-requests/sell-request-ui"
import type { RequestKind, SellRequest, SellRequestStats } from "@/services/sell-requests.service"

const TABS = [
  { id: "all", label: "All Requests" },
  { id: "pending", label: "Pending" },
  { id: "progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
]

function Kpi({ label, value, change, icon, tone }: { label: string; value: number; change: number; icon: React.ReactNode; tone: string }) {
  const up = change >= 0
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", tone)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{formatNumber(value)}</p>
        <p className={cn("text-xs font-medium", up ? "text-emerald-600" : "text-red-600")}>
          {up ? "↑" : "↓"} {Math.abs(change)}% <span className="font-normal text-muted-foreground">vs last week</span>
        </p>
      </div>
    </div>
  )
}

function KpiStrip({ s, kind }: { s: SellRequestStats; kind: RequestKind }) {
  if (kind === "EXCHANGE") {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Total Exchanges" value={s.total} change={s.trend.total} tone="bg-violet-50 text-violet-600" icon={<ClipboardList className="h-6 w-6" />} />
        <Kpi label="Pending Review" value={s.pending} change={s.trend.pending} tone="bg-amber-50 text-amber-600" icon={<Clock className="h-6 w-6" />} />
        <Kpi label="Approved" value={s.approved} change={s.trend.approved} tone="bg-emerald-50 text-emerald-600" icon={<CheckCircle2 className="h-6 w-6" />} />
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Link2Off className="h-6 w-6" /></div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Awaiting New Order</p>
            <p className="text-2xl font-bold tabular-nums">{formatNumber(s.awaitingOrder ?? 0)}</p>
            <p className="text-xs text-muted-foreground">no order linked yet</p>
          </div>
        </div>
        <Kpi label="Completed" value={s.completed} change={s.trend.completed} tone="bg-teal-50 text-teal-600" icon={<ShoppingCart className="h-6 w-6" />} />
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Kpi label="Total Requests" value={s.total} change={s.trend.total} tone="bg-indigo-50 text-indigo-600" icon={<ClipboardList className="h-6 w-6" />} />
      <Kpi label="Pending Review" value={s.pending} change={s.trend.pending} tone="bg-amber-50 text-amber-600" icon={<Clock className="h-6 w-6" />} />
      <Kpi label="Approved" value={s.approved} change={s.trend.approved} tone="bg-emerald-50 text-emerald-600" icon={<CheckCircle2 className="h-6 w-6" />} />
      <Kpi label="Rejected" value={s.rejected} change={s.trend.rejected} tone="bg-red-50 text-red-600" icon={<XCircle className="h-6 w-6" />} />
      <Kpi label="Completed" value={s.completed} change={s.trend.completed} tone="bg-teal-50 text-teal-600" icon={<ShoppingCart className="h-6 w-6" />} />
    </div>
  )
}

function pageWindow(page: number, pages: number): Array<number | "…"> {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const out: Array<number | "…"> = [1]
  if (page > 3) out.push("…")
  for (let p = Math.max(2, page - 1); p <= Math.min(pages - 1, page + 1); p++) out.push(p)
  if (page < pages - 2) out.push("…")
  out.push(pages)
  return out
}

export function RequestsPage({ kind }: { kind: RequestKind }) {
  const isExchange = kind === "EXCHANGE"
  const [tab, setTab] = useState("all")
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("all")
  const [condition, setCondition] = useState("all")
  const [type, setType] = useState("all")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(14)
  const [selected, setSelected] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const { can } = usePermissions()
  const dq = useDebounce(q, 300)

  const stats = useRequestStats(kind)
  const list = useRequestList(kind, { status: tab, q: dq, category, condition, type, page, limit })
  const act = useRequestAction(kind)

  useEffect(() => { setPage(1); setChecked(new Set()) }, [tab, dq, category, condition, type, limit])
  useEffect(() => { if (!selected && list.data?.items[0]) setSelected(list.data.items[0].id) }, [list.data, selected])

  if (stats.isError) return <QueryErrorBlock error={stats.error} onRetry={() => stats.refetch()} />
  const rows: SellRequest[] = list.data?.items ?? []
  const allChecked = rows.length > 0 && rows.every((r) => checked.has(r.id))
  const toggle = (id: string) => setChecked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const counts = list.data?.counts ?? {}
  const from = list.data && list.data.total ? (list.data.page - 1) * limit + 1 : 0
  const to = list.data ? Math.min(list.data.page * limit, list.data.total) : 0

  return (
    <div className="space-y-5">
      <PageHeader
        title={isExchange ? "Exchange Request Management" : "Sell Request Management"}
        subtitle={isExchange ? "Customers buying a new phone and trading in their old one — track each trade-in, its order and the amount to pay." : "Customers selling their old phone — review the valuation, pick a vendor offer and take action."}>
        {can("sell_requests.settings") && <Button asChild variant="outline"><Link href="/sell-requests/settings"><Settings2 /> Valuation settings</Link></Button>}
        <Button className="bg-brand-600 hover:bg-brand-700" onClick={() => setCreating(true)}><Plus /> {isExchange ? "Create Exchange Request" : "Create Sell Request"}</Button>
      </PageHeader>

      {stats.isLoading || !stats.data ? <LoadingSkeleton variant="stat-card" count={5} /> : <KpiStrip s={stats.data} kind={kind} />}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-xl border bg-card shadow-sm">
          <div role="tablist" aria-label="Request status" className="flex gap-6 overflow-x-auto border-b px-4">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                className={cn("-mb-px whitespace-nowrap border-b-2 py-3 text-sm font-medium", tab === t.id ? "border-brand-600 text-brand-600" : "border-transparent text-muted-foreground hover:text-foreground")}>
                {t.label} ({counts[t.id] ?? 0})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 p-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input aria-label="Search requests" className="pl-9" placeholder={isExchange ? "Search by IMEI, model, customer, exchange ID…" : "Search by IMEI, model, customer, request ID…"} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={category} onValueChange={setCategory}><SelectTrigger className="w-[150px]" aria-label="Product category"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Categories</SelectItem><SelectItem value="Smartphone">Smartphones</SelectItem><SelectItem value="Tablet">Tablets</SelectItem><SelectItem value="Laptop">Laptops</SelectItem></SelectContent></Select>
            <Select value={condition} onValueChange={setCondition}><SelectTrigger className="w-[150px]" aria-label="Condition"><SelectValue placeholder="Condition" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Conditions</SelectItem><SelectItem value="EXCELLENT">Excellent</SelectItem><SelectItem value="GOOD">Good</SelectItem><SelectItem value="FAIR">Fair</SelectItem><SelectItem value="POOR">Poor</SelectItem></SelectContent></Select>
            {!isExchange && (
              <Select value={type} onValueChange={setType}><SelectTrigger className="w-[150px]" aria-label="Request type"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="SELL_TO_AB">Sell to AB</SelectItem><SelectItem value="BUY_NOW">Buy Now</SelectItem></SelectContent></Select>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-y bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                  <th className="w-10 px-4 py-2.5"><Checkbox aria-label="Select all" checked={allChecked} onCheckedChange={(v) => setChecked(v ? new Set(rows.map((r) => r.id)) : new Set())} /></th>
                  {(isExchange
                    ? ["ID", "Customer", "Old device (trade-in)", "New device", "Trade-in value", "Customer pays", "Order", "Status", "Date", "Action"]
                    : ["ID", "Customer", "Product", "Condition", "Estimated Price", "Request Type", "Status", "Date", "Action"]
                  ).map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => setSelected(r.id)} aria-selected={selected === r.id}
                    className={cn("cursor-pointer border-b last:border-0 hover:bg-muted/40", selected === r.id && "bg-brand-50/60 dark:bg-brand-900/20")}>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><Checkbox aria-label={`Select ${r.code}`} checked={checked.has(r.id)} onCheckedChange={() => toggle(r.id)} /></td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs font-medium">{r.code}</td>
                    <td className="px-3 py-3"><div className="flex items-center gap-2"><PersonAvatar name={r.customer.name} /><div className="min-w-0"><p className="truncate font-medium">{r.customer.name}</p><p className="text-xs text-muted-foreground">{r.customer.phone}</p></div></div></td>
                    <td className="px-3 py-3"><div className="flex items-center gap-2"><DeviceThumb category={r.device.category} /><div className="min-w-0"><p className="truncate font-medium">{r.device.model}{r.device.category === "Smartphone" && r.device.variant.length < 8 ? ` (${r.device.variant})` : ""}</p><p className="truncate text-xs text-muted-foreground">{r.device.color}</p></div></div></td>
                    {isExchange ? (
                      <>
                        <td className="px-3 py-3"><p className="font-medium">{r.exchange?.newProduct}</p><p className="text-xs text-muted-foreground">{r.exchange ? formatINR(r.exchange.newProductPrice) : ""}</p></td>
                        <td className="whitespace-nowrap px-3 py-3 tabular-nums"><p className="font-medium">{formatINR(r.quote)}</p><ConditionPill condition={r.condition} /></td>
                        <td className="whitespace-nowrap px-3 py-3 font-medium tabular-nums">{r.exchange ? formatINR(r.exchange.payable) : "—"}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs">{r.exchangeOrder ? <span className="font-medium">{r.exchangeOrder.orderNumber}</span> : <span className="text-rose-600">Not linked</span>}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-3"><ConditionPill condition={r.condition} /></td>
                        <td className="whitespace-nowrap px-3 py-3 font-medium tabular-nums">{formatINR(r.quote)}</td>
                        <td className="px-3 py-3"><TypePill type={r.type} /></td>
                      </>
                    )}
                    <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs"><p>{fmtDate(r.createdAt)}</p><p className="text-muted-foreground">{fmtTime(r.createdAt)}</p></td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8" aria-label={`Actions for ${r.code}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelected(r.id)}>View details</DropdownMenuItem>
                          {(r.status === "PENDING" || r.status === "IN_PROGRESS") && <DropdownMenuItem onClick={() => act.mutate({ id: r.id, action: "APPROVE" })}>Approve</DropdownMenuItem>}
                          {(r.status === "PENDING" || r.status === "IN_PROGRESS") && <DropdownMenuItem className="text-red-600" onClick={() => setSelected(r.id)}>Reject… (open details)</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {list.isLoading && <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">Loading requests…</td></tr>}
                {!list.isLoading && rows.length === 0 && <tr><td colSpan={11} className="p-10 text-center text-muted-foreground">No requests match these filters.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs text-muted-foreground">
            <span>Showing {from} to {to} of {formatNumber(list.data?.total ?? 0)} entries</span>
            <nav aria-label="Pagination" className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">‹</Button>
              {pageWindow(list.data?.page ?? 1, list.data?.pages ?? 1).map((p, i) => p === "…"
                ? <span key={`e${i}`} className="px-1">…</span>
                : <Button key={p} size="icon" className={cn("h-8 w-8", p === (list.data?.page ?? 1) ? "bg-brand-600 text-white hover:bg-brand-700" : "")} variant={p === (list.data?.page ?? 1) ? "default" : "outline"} onClick={() => setPage(p)} aria-current={p === list.data?.page ? "page" : undefined}>{p}</Button>)}
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= (list.data?.pages ?? 1)} onClick={() => setPage(page + 1)} aria-label="Next page">›</Button>
            </nav>
            <label className="flex items-center gap-2">Rows per page
              <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}><SelectTrigger className="h-8 w-[72px]"><SelectValue /></SelectTrigger>
                <SelectContent>{[7, 14, 28, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent></Select>
            </label>
          </div>
        </section>

        <div className="xl:sticky xl:top-4"><SellRequestDetailPanel id={selected} kind={kind} /></div>
      </div>

      <CreateSellRequestDialog kind={kind} open={creating} onOpenChange={setCreating} onCreated={(id) => { setTab("all"); setSelected(id) }} />
    </div>
  )
}
