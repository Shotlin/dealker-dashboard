"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, ChevronLeft, ChevronRight, Plus, Search, Settings2 } from "lucide-react"
import { cn, formatMoney } from "@/lib/utils"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { CreateRepairDialog } from "@/components/repairs/CreateRepairDialog"
import { RepairDetailSheet } from "@/components/repairs/RepairDetailPanel"
import { ChannelPill, RepairStatusBadge, fmtDay } from "@/components/repairs/repair-ui"
import { useDebounce } from "@/hooks/useDebounce"
import { usePermissions } from "@/hooks/usePermissions"
import { useRepairList, useRepairStats } from "@/hooks/useRepairs"
import type { RepairTab } from "@/services/repairs.service"

const CHANNELS = [["all", "All"], ["B2B", "B2B"], ["B2C", "B2C"]] as const
const TABS: Array<[RepairTab, string]> = [
  ["all", "All"], ["new", "New"], ["intake", "Intake"], ["approval", "Awaiting approval"], ["progress", "In progress"],
  ["qc", "QC pending"], ["ready", "Ready to deliver"], ["problem", "Failed / declined"], ["completed", "Completed"], ["closed", "Closed"],
]

function Kpi({ label, value, tone, hint }: { label: string; value: string | number; tone?: "warn" | "bad"; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-xl font-semibold tabular-nums", tone === "warn" && "text-amber-700", tone === "bad" && "text-red-700")}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

export default function RepairsPage() {
  const { can } = usePermissions()
  const [channel, setChannel] = useState<(typeof CHANNELS)[number][0]>("all")
  const [tab, setTab] = useState<RepairTab>("all")
  const [q, setQ] = useState("")
  const [overdue, setOverdue] = useState(false)
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const search = useDebounce(q, 350)
  const stats = useRepairStats()
  const list = useRepairList({ channel, tab, q: search, page, limit: 15, overdue: overdue ? 1 : undefined })
  const s = stats.data
  const counts = list.data?.counts

  return (
    <div className="space-y-5">
      <PageHeader title="Repairs" subtitle="Mobile and device repairs for individual customers and businesses — one queue, two channels.">
        {can("repairs.settings") && <Button asChild variant="outline"><Link href="/repairs/settings"><Settings2 /> Settings &amp; pricing</Link></Button>}
        {can("repairs.manage") && <Button onClick={() => setCreating(true)}><Plus /> New repair</Button>}
      </PageHeader>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.isLoading ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[74px]" />) : s && <>
          <Kpi label="Open repairs" value={s.open} hint={`${s.b2b} B2B · ${s.b2c} B2C in total`} />
          <Kpi label="Awaiting approval" value={s.awaitingApproval} tone={s.awaitingApproval > 0 ? "warn" : undefined} />
          <Kpi label="Failed / rework" value={s.problems} tone={s.problems > 0 ? "warn" : undefined} />
          <Kpi label="SLA breached" value={s.slaBreached} tone={s.slaBreached > 0 ? "bad" : undefined} />
          <Kpi label="Outstanding" value={formatMoney(s.outstanding)} hint={s.overdue ? `${s.overdue} overdue` : undefined} tone={s.overdue ? "bad" : undefined} />
          <Kpi label="Completed this month" value={formatMoney(s.completedValueMonth)} />
        </>}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border p-0.5" role="radiogroup" aria-label="Channel">
          {CHANNELS.map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={channel === v} onClick={() => { setChannel(v); setPage(1) }}
              className={cn("rounded-md px-4 py-1.5 text-sm font-medium transition-colors", channel === v ? "bg-brand-600 text-white" : "text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#4F46E5]" checked={overdue} onChange={(e) => { setOverdue(e.target.checked); setPage(1) }} /> Overdue payments only</label>
          <div className="relative w-64"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input aria-label="Search repairs" className="pl-8" placeholder="Code, name, PO, IMEI, model…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} /></div>
        </div>
      </div>

      <nav aria-label="Repair queues" className="flex flex-wrap gap-1.5">
        {TABS.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={tab === v} onClick={() => { setTab(v); setPage(1) }}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium", tab === v ? "border-brand-500 bg-brand-50 text-brand-700" : "hover:bg-muted")}>
            {l}<span className="ml-1.5 tabular-nums text-muted-foreground">{counts ? counts[v] ?? 0 : "–"}</span>
          </button>
        ))}
      </nav>

      {list.isError ? <QueryErrorBlock error={list.error} onRetry={() => list.refetch()} /> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>{["Request", "Customer", "Devices", "Status", "Service centre", "Amount", "Requested"].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {list.isLoading && Array.from({ length: 6 }, (_, i) => <tr key={i}><td colSpan={7} className="p-2"><Skeleton className="h-9 w-full" /></td></tr>)}
              {list.data?.items.map((r) => (
                <tr key={r.id} onClick={() => setOpen(r.id)} className="cursor-pointer border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2.5">
                    <button type="button" className="text-left font-semibold text-brand-700 hover:underline focus-visible:underline" onClick={(e) => { e.stopPropagation(); setOpen(r.id) }}>{r.code}</button>
                    <div className="mt-0.5 flex items-center gap-1.5"><ChannelPill channel={r.channel} />
                      {r.sla.breached && <AlertTriangle className="h-3.5 w-3.5 text-red-600" aria-label="SLA breached" />}</div>
                  </td>
                  <td className="px-3 py-2.5"><p className="font-medium">{r.business?.name ?? r.customer.name}</p><p className="text-xs text-muted-foreground">{r.business ? `PO ${r.business.poReference || "—"}` : r.customer.phone}</p></td>
                  <td className="px-3 py-2.5"><p>{r.firstDevice}</p><p className="text-xs text-muted-foreground">{r.deviceCount > 1 ? `+${r.deviceCount - 1} more` : "1 device"}</p></td>
                  <td className="px-3 py-2.5"><RepairStatusBadge status={r.status} /></td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.serviceCenter ?? <span className="text-amber-700">Unassigned</span>}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.money.approvedTotal > 0 ? <><p>{formatMoney(r.money.approvedTotal)}</p>
                    {r.money.amountDue > 0 && <p className={cn("text-xs", r.money.overdue ? "font-medium text-red-700" : "text-amber-700")}>{formatMoney(r.money.amountDue)} due{r.money.overdue && " · overdue"}</p>}</> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{fmtDay(r.createdAt)}</td>
                </tr>
              ))}
              {list.data && !list.data.items.length && (
                <tr><td colSpan={7} className="px-3 py-14 text-center text-muted-foreground">
                  <p className="font-medium text-foreground">No repairs here</p>
                  <p className="text-sm">{search || tab !== "all" || channel !== "all" || overdue ? "Nothing matches these filters." : "Repairs booked by customers and businesses appear here."}</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {list.data && list.data.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Page {list.data.page} of {list.data.pages} · {list.data.total} repairs</p>
          <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft /> Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= list.data.pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight /></Button></div>
        </div>
      )}

      <RepairDetailSheet id={open} onClose={() => setOpen(null)} />
      <CreateRepairDialog open={creating} onOpenChange={setCreating} defaultChannel={channel === "B2B" ? "B2B" : "B2C"} onCreated={setOpen} />
    </div>
  )
}
