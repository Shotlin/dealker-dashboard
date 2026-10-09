"use client"

/**
 * Product Sections — New Arrival, Deal of the Day, Clearance Sale, Featured,
 * Best Seller, plus which channel (B2C / B2B) each product is sold in.
 * Moving a product into a section replaces its old one.
 */

import { useState } from "react"
import { ImageOff, Plus, Search } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { MoveSectionDialog } from "@/components/merch/MoveSectionDialog"
import { SectionBadge } from "@/components/merch/SectionBadge"
import { ApprovalBadge, ConditionBadge } from "@/components/listings/badges"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDebounce } from "@/hooks/useDebounce"
import { useMerchActions, useMerchOverview, useSectionListings } from "@/hooks/useMerchandising"
import { cn, formatDateTime, formatINR } from "@/lib/utils"
import type { SectionKey } from "@/services/merchandising.service"
import type { ApprovalStatus } from "@/types/listing.types"

type Tab = SectionKey | "NONE"

export default function ProductSectionsPage() {
  const overview = useMerchOverview()
  const [tab, setTab] = useState<Tab>("NEW_ARRIVAL")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [picked, setPicked] = useState<string[]>([])
  const [moving, setMoving] = useState(false)
  const debounced = useDebounce(search, 300)
  const list = useSectionListings(tab, debounced, page)
  const actions = useMerchActions()
  const rows = list.data?.data ?? []
  const meta = list.data?.meta
  const o = overview.data

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const allOn = rows.length > 0 && rows.every((r) => picked.includes(r.id))
  const switchTab = (t: Tab) => { setTab(t); setPage(1); setPicked([]) }

  const tabs: Array<{ key: Tab; label: string; count?: number }> = [
    ...(o?.sections ?? []).map((s) => ({ key: s.key as Tab, label: s.label, count: s.total })),
    { key: "NONE", label: "Not in a section" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Product Sections" subtitle="Decide what shows under New Arrival, Deal of the Day, Clearance, Featured and Best Seller — and whether a product sells to customers (B2C), vendors (B2B) or both." />

      {o && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[["Sold to customers (B2C)", o.channels.b2c], ["Sold to vendors (B2B)", o.channels.b2b], ["Sold in both", o.channels.both], ["All listings", o.channels.total]].map(([l, v]) => (
            <div key={String(l)} className="rounded-xl border bg-white px-4 py-3"><p className="text-2xl font-semibold tabular-nums">{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1 rounded-lg border p-0.5">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => switchTab(t.key)}
            className={cn("rounded-md px-3 py-1.5 text-xs font-medium", tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {t.label}{t.count !== undefined ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-9 pl-9 text-xs" placeholder="Search product, brand, vendor…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <span className="self-center text-xs text-muted-foreground">{picked.length} selected</span>
          <Button size="sm" disabled={!picked.length} onClick={() => setMoving(true)}><Plus className="mr-1 h-4 w-4" />{tab === "NONE" ? "Add to a section" : "Move"}</Button>
          <Button size="sm" variant="outline" disabled={!picked.length || actions.channels.isPending}
            onClick={() => actions.channels.mutate({ ids: picked, b2c: true, b2b: true })}>Sell in B2C + B2B</Button>
          <Button size="sm" variant="outline" disabled={!picked.length || actions.channels.isPending}
            onClick={() => actions.channels.mutate({ ids: picked, b2c: true, b2b: false })}>B2C only</Button>
          <Button size="sm" variant="outline" disabled={!picked.length || actions.channels.isPending}
            onClick={() => actions.channels.mutate({ ids: picked, b2c: false, b2b: true })}>B2B only</Button>
        </div>
      </div>

      {list.isError ? <QueryErrorBlock error={list.error} onRetry={() => list.refetch()} /> : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={allOn} onCheckedChange={(v) => setPicked(v ? rows.map((r) => r.id) : [])} aria-label="Select all" /></TableHead>
                <TableHead className="w-[300px]">Product</TableHead><TableHead>Condition</TableHead><TableHead className="text-right">Price</TableHead>
                <TableHead>Stock</TableHead><TableHead>Review</TableHead><TableHead>Channel</TableHead><TableHead>Section</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading ? Array.from({ length: 6 }).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-11 w-full" /></TableCell></TableRow>)
                : rows.length === 0 ? <TableRow><TableCell colSpan={8} className="h-40 text-center text-muted-foreground">No products here.</TableCell></TableRow>
                : rows.map((r) => (
                  <TableRow key={r.id} data-state={picked.includes(r.id) ? "selected" : undefined}>
                    <TableCell><Checkbox checked={picked.includes(r.id)} onCheckedChange={() => toggle(r.id)} aria-label={`Select ${r.name}`} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                          {r.thumbnail_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={r.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                            : <ImageOff className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0"><p className="truncate text-sm font-medium">{r.name}</p><p className="truncate text-xs text-muted-foreground">{r.owner_name}{r.brand ? ` · ${r.brand}` : ""}</p></div>
                      </div>
                    </TableCell>
                    <TableCell><ConditionBadge condition={r.condition as never} /></TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatINR(r.price)}</TableCell>
                    <TableCell className="text-sm tabular-nums">{r.stock}</TableCell>
                    <TableCell><ApprovalBadge status={r.approval_status as ApprovalStatus} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.sell_b2c && <Badge variant="outline" className="text-[11px]">B2C</Badge>}
                        {r.sell_b2b && <Badge variant="outline" className="text-[11px]">B2B</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <SectionBadge section={r.merch_section} endsAt={r.merch_ends_at} />
                      {r.merch_ends_at && <p className="mt-0.5 text-[11px] text-muted-foreground">until {formatDateTime(r.merch_ends_at)}</p>}
                    </TableCell>
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
      <MoveSectionDialog open={moving} ids={picked} initial={tab === "NONE" ? null : tab} onOpenChange={setMoving} onDone={() => setPicked([])} />
    </div>
  )
}
