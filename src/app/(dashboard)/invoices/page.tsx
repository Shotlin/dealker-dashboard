"use client"

/**
 * Invoices — every seller purchase invoice, mapped to its product and IMEI.
 * View / download the private file, verify or reject. Verified invoices are
 * permanent.
 */

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Clock, FileText, IndianRupee, XCircle } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { StatCard } from "@/components/dashboard/StatCard"
import { InvoiceActions, InvoiceStatusBadge, InvoiceViewer } from "@/components/invoices/InvoicePanel"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useInvoiceStats, useInvoices } from "@/hooks/useInvoices"
import { useDebounce } from "@/hooks/useDebounce"
import { formatDateTime } from "@/lib/utils"
import type { Invoice } from "@/services/invoices.service"

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n)

const TABS = [
  { value: "", label: "All" },
  { value: "UPLOADED", label: "To verify" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
]

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd>
    </div>
  )
}

export default function InvoicesPage() {
  const [status, setStatus] = useState("UPLOADED")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<Invoice | null>(null)
  const debounced = useDebounce(search, 300)
  const stats = useInvoiceStats()
  const list = useInvoices({ status, search: debounced, page, limit: 25 })
  const rows = list.data?.data ?? []
  const meta = list.data?.meta
  const open = rows.find((r) => r.id === openId) ?? null
  const s = stats.data

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" subtitle="Seller purchase invoices, linked to the product and its IMEI. Verified invoices are kept permanently." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="To Verify" value={s ? String(s.pending) : "—"} icon={<Clock className="h-4 w-4 text-amber-500" />} />
        <StatCard label="Verified" value={s ? String(s.verified) : "—"} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
        <StatCard label="Rejected" value={s ? String(s.rejected) : "—"} icon={<XCircle className="h-4 w-4 text-red-500" />} />
        <StatCard label="Verified Purchase Value" value={s ? inr(s.verified_amount) : "—"} icon={<IndianRupee className="h-4 w-4 text-brand-500" />} />
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
        <Input className="h-9 w-[260px] text-xs" placeholder="Search invoice no., IMEI, product, seller…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      {list.isError ? <QueryErrorBlock error={list.error} onRetry={() => list.refetch()} /> : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead><TableHead>Product</TableHead><TableHead>Seller</TableHead>
                <TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading ? Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
              )) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                  <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />No invoices here.
                </TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                  <TableCell><p className="text-sm font-medium">{r.invoice_number}</p><p className="text-xs text-muted-foreground">{r.invoice_date}</p></TableCell>
                  <TableCell className="max-w-[240px] truncate text-sm">{r.product_name}{r.imei_serial && <span className="block text-xs text-muted-foreground">{r.imei_serial}</span>}</TableCell>
                  <TableCell className="text-sm">{r.vendor_name}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{inr(r.purchase_amount)}</TableCell>
                  <TableCell><InvoiceStatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</TableCell>
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

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle className="pr-6 text-base">Invoice {open?.invoice_number}</SheetTitle>
            {open && <InvoiceStatusBadge status={open.status} />}
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1">
            {open && (
              <div className="space-y-5 p-5">
                <dl className="divide-y">
                  <Row label="Product" value={open.product_name} />
                  <Row label="Seller" value={open.vendor_name} />
                  <Row label="Supplier" value={open.supplier_name} />
                  <Row label="Invoice date" value={open.invoice_date} />
                  <Row label="Purchase amount" value={inr(open.purchase_amount)} />
                  <Row label="GST" value={inr(open.gst_amount)} />
                  <Row label="IMEI / serial" value={open.imei_serial} />
                  <Row label="File" value={`${open.file_name} · ${(open.file_size / 1024).toFixed(0)} KB`} />
                  <Row label="Uploaded" value={`${formatDateTime(open.created_at)}${open.uploaded_by_name ? ` · ${open.uploaded_by_name}` : ""}`} />
                  <Row label="Verified" value={open.verified_at ? `${formatDateTime(open.verified_at)}${open.verified_by_name ? ` · ${open.verified_by_name}` : ""}` : null} />
                </dl>
                {open.rejection_reason && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{open.rejection_reason}</p>}
                <InvoiceActions invoice={open} onViewed={setViewing} />
                <Button variant="outline" size="sm" asChild><Link href={`/qc`}>Open in QC</Link></Button>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <InvoiceViewer invoice={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}
