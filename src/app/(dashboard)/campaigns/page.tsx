"use client"

/**
 * Campaigns — flash sales, deal of the day, clearance, vendor / product /
 * discount campaigns and coupon pushes. Overview → Sales → Orders → Revenue →
 * Vendors → Customers for every campaign.
 */

import { useState } from "react"
import Link from "next/link"
import { CalendarClock, IndianRupee, Megaphone, Plus, ShoppingBag, Store, Ticket, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { StatCard } from "@/components/dashboard/StatCard"
import { CampaignForm } from "@/components/campaigns/CampaignForm"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCampaign, useCampaignActions, useCampaignOverview, useCampaigns } from "@/hooks/useCampaigns"
import { useDebounce } from "@/hooks/useDebounce"
import { cn, formatDateTime } from "@/lib/utils"
import { CAMPAIGN_TYPE_LABEL } from "@/services/campaigns.service"
import type { Campaign, CampaignStatus, CampaignType } from "@/services/campaigns.service"

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
const STATUS_CLS: Record<CampaignStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700", SCHEDULED: "bg-sky-50 text-sky-700", ACTIVE: "bg-emerald-50 text-emerald-700",
  ENDED: "bg-zinc-100 text-zinc-600", CANCELLED: "bg-red-50 text-red-700",
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge variant="outline" className={cn("border-0 text-[11px] font-medium", STATUS_CLS[status])}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>
}

function discountText(c: Pick<Campaign, "discount" | "type" | "coupon_code">) {
  if (c.type === "COUPON") return c.coupon_code ? `Coupon ${c.coupon_code}` : "Coupon"
  if (!c.discount) return "—"
  const v = Math.abs(c.discount.value)
  return c.discount.operation === "FIXED" ? `₹${v} off` : c.discount.operation === "DISCOUNT_FROM_MRP" ? `${v}% off MRP` : `${v}% off`
}

function Actions({ c, onEdit }: { c: Campaign; onEdit: () => void }) {
  const a = useCampaignActions()
  const busy = a.start.isPending || a.end.isPending || a.schedule.isPending || a.cancel.isPending || a.remove.isPending
  return (
    <div className="flex flex-wrap gap-1.5">
      {["DRAFT", "SCHEDULED"].includes(c.status) && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit}>Edit</Button>}
      {c.status === "DRAFT" && c.starts_at && c.ends_at && <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => a.schedule.mutate(c.id)}>Schedule</Button>}
      {["DRAFT", "SCHEDULED"].includes(c.status) && (
        <Button size="sm" className="h-7 text-xs" disabled={busy}
          onClick={() => { if (window.confirm(`Start “${c.name}” now? Prices change immediately.`)) a.start.mutate(c.id) }}>Start now</Button>
      )}
      {c.status === "ACTIVE" && (
        <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" disabled={busy}
          onClick={() => { if (window.confirm(`End “${c.name}” now? Prices go back to normal.`)) a.end.mutate(c.id) }}>End now</Button>
      )}
      {["DRAFT", "SCHEDULED"].includes(c.status) && c.status === "SCHEDULED" && (
        <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={busy} onClick={() => { if (window.confirm("Cancel this scheduled campaign?")) a.cancel.mutate(c.id) }}>Cancel</Button>
      )}
      {["DRAFT", "CANCELLED"].includes(c.status) && (
        <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" disabled={busy} onClick={() => { if (window.confirm("Delete this campaign?")) a.remove.mutate(c.id) }}>Delete</Button>
      )}
    </div>
  )
}

export default function CampaignsPage() {
  const overview = useCampaignOverview()
  const [status, setStatus] = useState("")
  const [type, setType] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<string | "new" | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const debounced = useDebounce(search, 300)
  const list = useCampaigns({ status, type, search: debounced, page, limit: 20 })
  const detail = useCampaign(openId)
  const editDetail = useCampaign(editing && editing !== "new" ? editing : null)
  const o = overview.data
  const rows = list.data?.data ?? []
  const meta = list.data?.meta

  return (
    <div className="space-y-6">
      <PageHeader title="Campaigns" subtitle="Flash sales, deals, clearance, vendor and product campaigns, and coupon pushes — scheduled, applied and reverted automatically.">
        <Button size="sm" variant="outline" asChild><Link href="/coupons"><Ticket className="mr-1.5 h-4 w-4" />Coupons</Link></Button>
        <Button size="sm" onClick={() => setEditing("new")}><Plus className="mr-1.5 h-4 w-4" />New campaign</Button>
      </PageHeader>

      {overview.isError ? <QueryErrorBlock error={overview.error} onRetry={() => overview.refetch()} /> : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Running now" value={o ? String(o.active) : "—"} icon={<Megaphone className="h-4 w-4 text-emerald-500" />} />
          <StatCard label="Scheduled" value={o ? String(o.scheduled) : "—"} icon={<CalendarClock className="h-4 w-4 text-sky-500" />} />
          <StatCard label="Campaign revenue" value={o ? inr(o.revenue) : "—"} icon={<IndianRupee className="h-4 w-4 text-brand-500" />} />
          <StatCard label="Campaign orders" value={o ? String(o.orders) : "—"} icon={<ShoppingBag className="h-4 w-4 text-blue-500" />} />
          <StatCard label="Customers reached" value={o ? String(o.customers) : "—"} icon={<Users className="h-4 w-4 text-violet-500" />} />
          <StatCard label="Vendors taking part" value={o ? String(o.vendorsInvolved) : "—"} icon={<Store className="h-4 w-4 text-amber-500" />} />
          <StatCard label="Drafts" value={o ? String(o.draft) : "—"} icon={<Megaphone className="h-4 w-4 text-slate-400" />} />
          <StatCard label="Ended" value={o ? String(o.ended) : "—"} icon={<Megaphone className="h-4 w-4 text-zinc-400" />} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input className="h-9 w-[220px] text-xs" placeholder="Search campaigns…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {(["ACTIVE", "SCHEDULED", "DRAFT", "ENDED", "CANCELLED"] as CampaignStatus[]).map((s) => <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type || "all"} onValueChange={(v) => { setType(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="h-9 w-[170px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any type</SelectItem>
            {(Object.keys(CAMPAIGN_TYPE_LABEL) as CampaignType[]).map((t) => <SelectItem key={t} value={t}>{CAMPAIGN_TYPE_LABEL[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {list.isError ? <QueryErrorBlock error={list.error} onRetry={() => list.refetch()} /> : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Campaign</TableHead><TableHead>Discount</TableHead><TableHead>Runs</TableHead><TableHead>Products</TableHead><TableHead>Status</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
                : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="h-36 text-center text-muted-foreground">No campaigns yet — create one to get started.</TableCell></TableRow>
                : rows.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setOpenId(c.id)}>
                    <TableCell><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{CAMPAIGN_TYPE_LABEL[c.type]}{c.section ? ` · ${c.section.replace(/_/g, " ").toLowerCase()}` : ""}</p></TableCell>
                    <TableCell className="text-sm">{discountText(c)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.starts_at ? formatDateTime(c.starts_at) : "—"}<br />{c.ends_at ? `→ ${formatDateTime(c.ends_at)}` : ""}</TableCell>
                    <TableCell className="text-sm tabular-nums">{c.status === "ACTIVE" || c.status === "ENDED" ? c.listing_count : "—"}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}><Actions c={c} onEdit={() => setEditing(c.id)} /></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          Page {meta.page} of {meta.totalPages}
          <Button variant="ghost" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <CampaignForm open={editing === "new" || (!!editing && !!editDetail.data)} onOpenChange={(o) => !o && setEditing(null)} existing={editing === "new" ? null : editDetail.data ?? null} />

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle className="text-base">{detail.data?.name ?? "Campaign"}</SheetTitle>
            {detail.data && <div className="flex flex-wrap items-center gap-2"><StatusBadge status={detail.data.status} /><span className="text-xs text-muted-foreground">{CAMPAIGN_TYPE_LABEL[detail.data.type]} · {discountText(detail.data)}</span></div>}
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1">
            {!detail.data ? <div className="p-5"><Skeleton className="h-40 w-full" /></div> : (
              <div className="space-y-5 p-5">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3" data-testid="campaign-stats">
                  {[["Orders", detail.data.stats.orders], ["Units sold", detail.data.stats.units], ["Revenue", inr(detail.data.stats.revenue)],
                    ["Customers", detail.data.stats.customers], ["Vendors", detail.data.stats.vendors], ["Customer savings", inr(detail.data.stats.savings)]].map(([l, v]) => (
                    <div key={String(l)} className="rounded-lg border p-3"><p className="text-lg font-semibold tabular-nums">{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>
                  ))}
                </div>
                {detail.data.coupon_code && (
                  <div className="rounded-lg border p-3 text-sm">Coupon <b>{detail.data.coupon_code}</b>: used {detail.data.stats.couponUses}× · {inr(detail.data.stats.couponDiscount)} discount given</div>
                )}
                {detail.data.end_reason && <p className="text-xs text-muted-foreground">Ended: {detail.data.end_reason}</p>}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Products ({detail.data.listing_count})</p>
                  <ul className="divide-y rounded-lg border text-sm">
                    {detail.data.listings.length === 0 && <li className="px-3 py-3 text-muted-foreground">{detail.data.status === "ACTIVE" || detail.data.status === "ENDED" ? "No product took part." : "Products are picked when the campaign starts."}</li>}
                    {detail.data.listings.map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="truncate">{l.name}<span className="text-xs text-muted-foreground"> · {l.owner_name}</span></span>
                        {l.price_before != null && l.price_after != null && <span className="shrink-0 text-xs tabular-nums"><s className="text-muted-foreground">{inr(l.price_before)}</s> {inr(l.price_after)}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}
