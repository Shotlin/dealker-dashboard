"use client"

/**
 * QC Management — every listing's quality-check status. Admin sets
 * Pending / Passed / Failed / Recheck by hand, or lets the automatic rules
 * (IMEI, photos, invoice, condition, price range, documents, serial, seller)
 * calculate it.
 */

import { useState } from "react"
import Link from "next/link"
import { ClipboardCheck, ImageOff, Settings, ShieldAlert, ShieldCheck, Wand2, XCircle } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { StatCard } from "@/components/dashboard/StatCard"
import { QcBadge } from "@/components/qc/QcBadge"
import { QcPanel } from "@/components/qc/QcPanel"
import { InvoicePanel } from "@/components/invoices/InvoicePanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useQcActions, useQcQueue, useQcStats } from "@/hooks/useQc"
import { useDebounce } from "@/hooks/useDebounce"
import { formatDateTime, formatINR } from "@/lib/utils"
import type { QcQueueRow } from "@/services/qc.service"

const TABS = [
  { value: "", label: "All" },
  { value: "QC_PENDING", label: "Pending" },
  { value: "QC_RECHECK", label: "Recheck" },
  { value: "QC_FAILED", label: "Failed" },
  { value: "QC_PASSED", label: "Passed" },
]

export default function QcPage() {
  const [status, setStatus] = useState("QC_PENDING")
  const [mode, setMode] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<QcQueueRow | null>(null)
  const debounced = useDebounce(search, 300)
  const stats = useQcStats()
  const queue = useQcQueue({ status, mode, search: debounced, page, limit: 25 })
  const actions = useQcActions()
  const rows = queue.data?.data ?? []
  const meta = queue.data?.meta
  const s = stats.data

  return (
    <div className="space-y-6">
      <PageHeader title="QC Management" subtitle="Decide by hand, or let the automatic rules calculate each product's QC status.">
        <Button size="sm" variant="outline" disabled={actions.runAutoBulk.isPending}
          onClick={() => actions.runAutoBulk.mutate(["QC_PENDING", "QC_RECHECK"])}>
          <Wand2 className="mr-1.5 h-4 w-4" />Run automatic QC on pending
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/qc/settings"><Settings className="mr-1.5 h-4 w-4" />Rules & settings</Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="QC Pending" value={s ? String(s.pending) : "—"} icon={<ClipboardCheck className="h-4 w-4 text-slate-500" />} />
        <StatCard label="QC Passed" value={s ? String(s.passed) : "—"} icon={<ShieldCheck className="h-4 w-4 text-emerald-500" />} />
        <StatCard label="QC Recheck" value={s ? String(s.recheck) : "—"} icon={<ShieldAlert className="h-4 w-4 text-amber-500" />} />
        <StatCard label="QC Failed" value={s ? String(s.failed) : "—"} icon={<XCircle className="h-4 w-4 text-red-500" />} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border p-0.5">
          {TABS.map((t) => (
            <button key={t.value} type="button" onClick={() => { setStatus(t.value); setPage(1) }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${status === t.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <Input className="h-9 w-[220px] text-xs" placeholder="Search product, IMEI, seller…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <Select value={mode || "all"} onValueChange={(v) => { setMode(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Decided by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Manual & automatic</SelectItem>
            <SelectItem value="MANUAL">Manual</SelectItem>
            <SelectItem value="AUTO">Automatic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {queue.isError ? <QueryErrorBlock error={queue.error} onRetry={() => queue.refetch()} /> : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[320px]">Product</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>QC</TableHead>
                <TableHead>Last checked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.isLoading ? Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-12 w-full" /></TableCell></TableRow>
              )) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center text-muted-foreground">Nothing in this queue.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpen(r)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                        {r.thumbnail_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={r.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                          : <ImageOff className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{r.brand ? `${r.brand} · ` : ""}{r.category_name}{r.imei ? ` · IMEI ${r.imei}` : ""}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{r.owner_name}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatINR(r.price)}</TableCell>
                  <TableCell className="text-sm">{r.invoice_count > 0 ? `${r.invoice_count} on file` : <span className="text-amber-600">None</span>}</TableCell>
                  <TableCell><QcBadge status={r.qc_status} score={r.qc_score} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.qc_checked_at ? `${formatDateTime(r.qc_checked_at)}${r.qc_mode ? ` · ${r.qc_mode === "AUTO" ? "auto" : "manual"}` : ""}` : "—"}
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

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle className="pr-6 text-base leading-snug">{open?.name}</SheetTitle>
            <p className="text-xs text-muted-foreground">{open?.owner_name} · {open && formatINR(open.price)}</p>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1">
            {open && (
              <div className="space-y-6 p-5">
                <QcPanel listingId={open.id} />
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Purchase invoice</h3>
                  <InvoicePanel listingId={open.id} defaultImei={open.imei} />
                </div>
                <Button variant="outline" size="sm" asChild><Link href={`/products/${open.id}/edit`}>Edit product</Link></Button>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}
