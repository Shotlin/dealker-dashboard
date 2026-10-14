"use client"

import { useState } from "react"
import { AlertTriangle, Clock, Eye, Flame, Gauge, Handshake, Layers, PackageSearch, Send, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDemandInsights } from "@/hooks/useB2bAdmin"
import { cn, formatINR } from "@/lib/utils"
import { dateShort } from "./shared"

const pct = (n: number) => `${Math.round(n * 100)}%`
const mins = (m: number | null) => (m == null ? "—" : m < 1 ? "< 1 min" : m < 60 ? `${m} min` : m < 1440 ? `${(m / 60).toFixed(1)} h` : `${(m / 1440).toFixed(1)} d`)
const ago = (iso: string) => {
  const h = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3600000))
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}
const range = (lo: number | null, hi: number | null) =>
  lo != null && hi != null && hi !== lo ? `${formatINR(lo)} – ${formatINR(hi)}` : lo != null || hi != null ? formatINR((lo ?? hi) as number) : "—"

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: React.ElementType; label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Card className="shadow-none">
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

/** Demand: what buyers are asking for, how well sellers serve it, and which requests nobody answered. */
export function DemandTab({ onOpen }: { onOpen: (id: string) => void }) {
  const [days, setDays] = useState(30)
  const { data, isLoading, isError } = useDemandInsights(days)

  if (isLoading) return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
  if (isError || !data) return <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Could not load demand insights. Try again in a moment.</p>

  const f = data.funnel
  const steps: [string, number][] = [["Requests posted", f.posted], ["Got at least one offer", f.quoted], ["Seller picked", f.awarded], ["Paid into escrow", f.paid], ["Completed", f.completed]]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Real buying requirements posted by vendors — what is in demand and how fast it is served.</p>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={PackageSearch} label="Requests posted" value={String(f.posted)} sub={`${f.units_needed.toLocaleString("en-IN")} units wanted`} />
        <Kpi icon={Send} label="Offer rate" value={f.posted ? pct(f.quoted / f.posted) : "—"} sub={`${f.quoted} of ${f.posted} got offers`} />
        <Kpi icon={Gauge} label="Units filled" value={f.units_needed ? pct(f.fill_rate) : "—"} sub={`${f.units_awarded.toLocaleString("en-IN")} of ${f.units_needed.toLocaleString("en-IN")} units awarded`} />
        <Kpi icon={Clock} label="Time to first offer" value={mins(data.avgMinutesToFirstOffer)} sub="Average across answered requests" />
        <Kpi icon={Users} label="Sellers who looked" value={String(data.reach.vendors_viewed)} sub={`${data.reach.views} views · ${data.reach.dismissed} passed`} />
        <Kpi icon={Flame} label="Urgent requests" value={String(f.urgent)} tone="bg-red-50 text-red-600" />
        <Kpi icon={Layers} label="Bulk requests (20+ units)" value={String(f.bulk)} tone="bg-amber-50 text-amber-600" />
        <Kpi icon={AlertTriangle} label="Unanswered (2h+)" value={String(data.unserved.length)} tone={data.unserved.length ? "bg-red-50 text-red-600" : undefined} />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="shadow-none xl:col-span-2">
          <CardContent className="space-y-3 p-4">
            <h2 className="text-sm font-semibold">From request to delivery</h2>
            {steps.map(([label, n], i) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{label}</span>
                  <span className="tabular-nums text-muted-foreground"><span className="font-medium text-foreground">{n}</span>{i > 0 && f.posted ? ` · ${pct(n / f.posted)}` : ""}</span>
                </div>
                <Progress value={f.posted ? (n / f.posted) * 100 : 0} className="h-2" />
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">A big drop between steps shows where deals stall: no offers (supply gap), no pick (price/quality), or no payment (buyer wallet).</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-none xl:col-span-3">
          <div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">Most requested models</h2></div>
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead>Model</TableHead><TableHead className="text-right">Requests</TableHead><TableHead className="text-right">Units</TableHead>
              <TableHead className="w-32">Filled</TableHead><TableHead className="text-right">Offers</TableHead><TableHead className="text-right">Avg target</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.topModels.length === 0 ? <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground">No requirements in this period.</TableCell></TableRow>
                : data.topModels.map((m) => (
                  <TableRow key={m.model}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {m.thumbnail_url ? <img src={m.thumbnail_url} alt="" className="h-9 w-9 rounded-md border object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted text-muted-foreground"><Handshake className="h-4 w-4" /></span>}
                        <div className="min-w-0"><p className="max-w-[220px] truncate text-sm font-medium">{m.example}</p>{m.brand && <p className="text-xs text-muted-foreground">{m.brand}</p>}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{m.requests}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.units_awarded}/{m.units_needed}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><Progress value={m.fill_rate * 100} className="h-1.5" /><span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{pct(m.fill_rate)}</span></div></TableCell>
                    <TableCell className="text-right tabular-nums">{m.offers}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.avg_target != null ? formatINR(m.avg_target) : "—"}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Card className="overflow-hidden shadow-none">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Requests nobody has answered</h2>
            <p className="text-xs text-muted-foreground">Open for 2+ hours with no offer — a supply gap. Reach out to sellers who hold this model or source it.</p>
          </div>
        </div>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Requirement</TableHead><TableHead>Buyer</TableHead><TableHead className="text-right">Units</TableHead><TableHead className="text-right">Target / unit</TableHead>
            <TableHead className="text-right">Seen by</TableHead><TableHead>Posted</TableHead><TableHead className="w-20" />
          </TableRow></TableHeader>
          <TableBody>
            {data.unserved.length === 0 ? <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Every recent request has at least one offer. 🎉</TableCell></TableRow>
              : data.unserved.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="max-w-[260px] truncate text-sm font-medium">{u.product_name}{u.is_urgent && <Badge className="ml-2 bg-red-50 text-[10px] text-red-700 hover:bg-red-50">Urgent</Badge>}</p>
                    <p className="text-xs text-muted-foreground">{u.requirement_number}{u.status === "EXPIRED" ? " · expired" : ` · closes ${dateShort(u.response_deadline)}`}</p>
                  </TableCell>
                  <TableCell className="text-sm">{u.buyer_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.quantity_needed}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{range(u.target_price, u.target_price_max)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums"><span className="inline-flex items-center gap-1 text-muted-foreground"><Eye className="h-3.5 w-3.5" />{u.view_count}</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ago(u.created_at)}</TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => onOpen(u.id)}>Open</Button></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
