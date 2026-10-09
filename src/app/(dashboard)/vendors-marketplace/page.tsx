"use client"

import { OrdersHubTabs } from "@/components/order-page/OrdersHubTabs"
import { Suspense, useState } from "react"
import { Plus, AlertTriangle, Banknote, Boxes, CheckCircle2, Handshake, Landmark, Percent, Send, Truck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { NewRequirementDialog } from "@/components/b2b/AdminActions"
import { OrdersTab } from "@/components/b2b/OrdersTab"
import { RequirementSheet } from "@/components/b2b/RequirementSheet"
import { SettingsTab } from "@/components/b2b/SettingsTab"
import { ReqStatusBadge, dateShort } from "@/components/b2b/shared"
import { useB2bRequirements, useB2bStats } from "@/hooks/useB2bAdmin"
import { useDebounce } from "@/hooks/useDebounce"
import { cn, formatINR, formatShort } from "@/lib/utils"

function Kpi({ icon: Icon, label, value, sub, tone, onClick }: { icon: React.ElementType; label: string; value: string; sub?: string; tone?: string; onClick?: () => void }) {
  return (
    <Card className={cn("shadow-none", onClick && "cursor-pointer transition-colors hover:bg-muted/40")} onClick={onClick}>
      <CardContent className="flex items-start gap-3 p-4">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary", tone)}><Icon className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function RequirementsTable({ limit = 25, compact = false, onOpen }: { limit?: number; compact?: boolean; onOpen: (id: string) => void }) {
  const [status, setStatus] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const q = useDebounce(search, 300)
  const { data, isLoading } = useB2bRequirements({ status, search: q, page, limit })
  const rows = data?.data ?? []
  const total = data?.pagination.total ?? 0
  return (
    <Card className="shadow-none">
      {!compact && (
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row">
          <Input className="sm:w-80" placeholder="Search product, buyer or requirement no…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1) }}>
            <SelectTrigger className="sm:w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {["OPEN", "AWARDED", "IN_FULFILMENT", "COMPLETED", "CANCELLED", "EXPIRED"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Requirement</TableHead><TableHead>Buyer</TableHead><TableHead className="text-right">Qty (awarded)</TableHead>
          <TableHead className="text-right">Quotes</TableHead><TableHead className="text-right">Best price</TableHead><TableHead className="text-right">Target</TableHead>
          <TableHead className="text-right">Order value</TableHead><TableHead>Dispatch</TableHead><TableHead>Status</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {isLoading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-10" /></TableCell></TableRow>)
            : rows.length === 0 ? <TableRow><TableCell colSpan={9} className="h-40 text-center text-muted-foreground">No requirements found.</TableCell></TableRow>
            : rows.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => onOpen(r.id)}>
                <TableCell>
                  <p className="max-w-[260px] truncate text-sm font-medium">{r.product_name}</p>
                  <p className="text-xs text-muted-foreground">{r.requirement_number} · {dateShort(r.created_at)}</p>
                </TableCell>
                <TableCell className="text-sm">{r.buyer_name}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">{r.quantity_needed} <span className="text-muted-foreground">({r.quantity_awarded})</span></TableCell>
                <TableCell className="text-right tabular-nums text-sm">{r.quote_count ?? 0}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">{r.best_price != null ? formatINR(r.best_price) : "—"}</TableCell>
                <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{r.target_price != null ? formatINR(r.target_price) : "—"}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">{r.order_value ? formatINR(r.order_value) : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground tabular-nums">{r.order_count ? `${r.dispatched_orders}/${r.order_count} sent` : "—"}</TableCell>
                <TableCell><ReqStatusBadge status={r.status} /></TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      {!compact && (
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>{total} requirement{total === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="tabular-nums">Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
            <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function B2bPage() {
  const [tab, setTab] = useState("overview")
  const [openId, setOpenId] = useState<string | null>(null)
  const [orderStatus, setOrderStatus] = useState("")
  const [creating, setCreating] = useState(false)
  const { data: s } = useB2bStats()
  const goOrders = (status: string) => { setOrderStatus(status); setTab("orders") }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <OrdersHubTabs />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors marketplace</h1>
          <p className="text-sm text-muted-foreground">Vendors post what they need, other vendors quote, the buyer splits the order, and Dealker holds the money in escrow until delivery. You can see and run every step from here.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" />New requirement</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/60 p-1">
          <TabsTrigger value="overview" className="px-3 py-1.5">Overview</TabsTrigger>
          <TabsTrigger value="requirements" className="px-3 py-1.5">Requirements {s && <span className="ml-1.5 rounded-full bg-background px-1.5 text-[11px] tabular-nums text-muted-foreground">{s.total_requirements}</span>}</TabsTrigger>
          <TabsTrigger value="orders" className="px-3 py-1.5">Orders & dispatch {s && <span className="ml-1.5 rounded-full bg-background px-1.5 text-[11px] tabular-nums text-muted-foreground">{s.orders}</span>}</TabsTrigger>
          <TabsTrigger value="disputes" className="px-3 py-1.5">Disputes {s && s.disputes > 0 && <span className="ml-1.5 rounded-full bg-red-100 px-1.5 text-[11px] font-medium tabular-nums text-red-700">{s.disputes}</span>}</TabsTrigger>
          <TabsTrigger value="settings" className="px-3 py-1.5">Commission</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon={Handshake} label="Open requirements" value={String(s?.open_requirements ?? "–")} sub={s ? `${s.total_requirements} posted in total` : undefined} onClick={() => setTab("requirements")} />
            <Kpi icon={Send} label="Quotes received" value={String(s?.quotes_received ?? "–")} />
            <Kpi icon={Boxes} label="B2B order value" value={s ? formatShort(s.order_value) : "–"} sub={s ? `${s.orders} orders` : undefined} />
            <Kpi icon={Truck} label="Dispatched / delivered" value={String(s?.dispatched ?? "–")} sub={s ? `${s.completed} completed` : undefined} onClick={() => goOrders("DISPATCHED")} />
            <Kpi icon={Landmark} label="Held in escrow" value={s ? formatShort(s.escrow_held) : "–"} sub="Paid by buyers, not yet released" />
            <Kpi icon={Banknote} label="Released to sellers" value={s ? formatShort(s.released_to_sellers) : "–"} />
            <Kpi icon={Percent} label="Commission earned" value={s ? formatShort(s.commission_earned) : "–"} />
            <Kpi icon={AlertTriangle} label="Open disputes" value={String(s?.disputes ?? "–")} tone={s && s.disputes > 0 ? "bg-red-50 text-red-600" : undefined} onClick={() => setTab("disputes")} />
          </div>

          {s && (s.awaiting_payment > 0 || s.awaiting_dispatch > 0 || s.disputes > 0) && (
            <Card className="shadow-none"><CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
              <span className="font-medium">Needs attention</span>
              {s.awaiting_payment > 0 && <button className="text-amber-700 hover:underline" onClick={() => goOrders("PENDING_PAYMENT")}>{s.awaiting_payment} order(s) waiting for buyer payment</button>}
              {s.awaiting_dispatch > 0 && <button className="text-blue-700 hover:underline" onClick={() => goOrders("PAID")}>{s.awaiting_dispatch} paid order(s) waiting for seller to dispatch</button>}
              {s.disputes > 0 && <button className="text-red-700 hover:underline" onClick={() => setTab("disputes")}><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />{s.disputes} dispute(s) to resolve</button>}
            </CardContent></Card>
          )}

          <div>
            <h2 className="mb-2 text-sm font-semibold">Latest requirements</h2>
            <RequirementsTable limit={6} compact onOpen={setOpenId} />
          </div>
        </TabsContent>

        <TabsContent value="requirements" className="mt-4"><RequirementsTable onOpen={setOpenId} /></TabsContent>
        <TabsContent value="orders" className="mt-4"><OrdersTab key={orderStatus} initialStatus={orderStatus} /></TabsContent>
        <TabsContent value="disputes" className="mt-4"><OrdersTab key="disputes" initialStatus="DISPUTED" /></TabsContent>
        <TabsContent value="settings" className="mt-4"><SettingsTab /></TabsContent>
      </Tabs>

      <RequirementSheet id={openId} onClose={() => setOpenId(null)} />
      {creating && <NewRequirementDialog open onClose={() => setCreating(false)} />}
    </div>
  )
}

export default function B2bSupplyPage() {
  return <Suspense fallback={null}><B2bPage /></Suspense>
}
