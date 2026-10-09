"use client"

import { useState } from "react"
import { Download, Eye, FileMinus2, FilePlus2, FileSpreadsheet, FileText, Settings2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { cn, formatMoney } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { CreditNoteDialog, DebitNoteDialog, InvoiceSettingsDialog, ManualInvoiceDialog } from "@/components/invoices/SalesDialogs"
import { useDebounce } from "@/hooks/useDebounce"
import { usePermissions } from "@/hooks/usePermissions"
import { salesKeys, useSalesDoc, useSalesDocs } from "@/hooks/useSalesInvoices"
import { apiMessage } from "@/services/sell-requests.service"
import { DOC_LABEL, downloadPdf, salesInvoicesApi, saveBlob, viewPdf, type DocType, type PaymentInfo, type SalesChannel, type SalesDoc } from "@/services/sales-invoices.service"

const day = (s?: string | null) => (s ? new Date(`${s.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—")
const dt = (s: string) => new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
const SOURCE: Record<string, string> = { REPAIR: "Repair", SELLER_ORDER: "Order", MANUAL: "Manual" }

function TypePill({ t }: { t: DocType }) {
  const tone = t === "CREDIT_NOTE" ? "bg-amber-50 text-amber-800" : t === "DEBIT_NOTE" ? "bg-violet-50 text-violet-800" : t === "BILL_OF_SUPPLY" ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-800"
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", tone)}>{DOC_LABEL[t]}</span>
}

function PayBadge({ p }: { p: PaymentInfo | null }) {
  if (!p) return <span className="text-muted-foreground">—</span>
  const m = { PAID: ["Paid", "bg-emerald-50 text-emerald-700"], PARTIAL: ["Part paid", "bg-amber-50 text-amber-700"], UNPAID: ["Unpaid", "bg-red-50 text-red-700"], UNTRACKED: ["Not tracked", "bg-muted text-muted-foreground"] }[p.status]
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", m[1])}>{m[0]}</span>
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-1 rounded-lg border p-3"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>{children}</section>
}

function DocDetail({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  const { data: d, isLoading, isError } = useSalesDoc(id)
  const { can } = usePermissions()
  const [credit, setCredit] = useState(false), [debit, setDebit] = useState(false)
  const qc = useQueryClient()
  // Every view/download is audited server-side; refresh so the History panel shows it.
  const run = (fn: () => Promise<unknown>) => fn().then(() => qc.invalidateQueries({ queryKey: salesKeys.detail(id) })).catch((e) => toast.error(apiMessage(e, "Could not open the file")))
  if (isLoading) return <div className="space-y-3 p-2"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-40 w-full" /></div>
  if (isError || !d) return <p role="alert" className="p-6 text-sm text-red-700">This document could not be loaded.</p>
  const isInvoice = d.docType === "TAX_INVOICE" || d.docType === "BILL_OF_SUPPLY"
  const intra = d.supplyType === "INTRA"
  const creditable = (d.creditable ?? []).some((c) => c.remainingQty > 0)
  return (
    <div className="space-y-4 pb-6">
      <header className="pr-8">
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">{d.number}</h2><TypePill t={d.docType} /><PayBadge p={d.payment} /></div>
        <p className="text-xs text-muted-foreground">Issued {day(d.issueDate)} · {d.channel} · {SOURCE[d.sourceType]}{d.orderRef ? ` ${d.orderRef}` : ""}{d.poReference ? ` · PO ${d.poReference}` : ""}</p>
        {d.refNumber && <p className="text-xs">Against <button type="button" className="font-medium text-brand-700 underline" onClick={() => d.refDocumentId && onOpen(d.refDocumentId)}>{d.refNumber}</button>{d.reason && <> — {d.reason}</>}</p>}
      </header>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => run(() => viewPdf(d.id))}><Eye /> View PDF</Button>
        <Button size="sm" variant="outline" onClick={() => run(() => downloadPdf(d.id, d.number))}><Download /> Download</Button>
        {isInvoice && can("sales_invoices.credit") && <Button size="sm" variant="outline" disabled={!creditable} onClick={() => setCredit(true)}><FileMinus2 /> Credit note</Button>}
        {isInvoice && can("sales_invoices.credit") && <Button size="sm" variant="outline" onClick={() => setDebit(true)}><FilePlus2 /> Debit note</Button>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Block title="Seller"><p className="text-sm font-medium">{d.sellerFull.legalName}</p><p className="text-xs text-muted-foreground">{d.sellerFull.address}</p>
          <p className="text-xs">{d.sellerFull.gstin ? `GSTIN ${d.sellerFull.gstin}` : "Not registered for GST"} · {d.sellerFull.state}</p></Block>
        <Block title="Buyer"><p className="text-sm font-medium">{d.buyerFull.businessName || d.buyerFull.name}</p>{d.buyerFull.businessName && d.buyerFull.name && <p className="text-xs text-muted-foreground">Attn: {d.buyerFull.name}</p>}
          <p className="text-xs text-muted-foreground">{d.buyerFull.address}</p><p className="text-xs">{d.buyerFull.gstin ? `GSTIN ${d.buyerFull.gstin}` : "Consumer"}{d.buyerFull.state && ` · ${d.buyerFull.state}`}</p></Block>
      </div>
      <p className="text-xs text-muted-foreground">Place of supply {d.placeOfSupply}{d.posAssumed && " (assumed — buyer’s state unknown)"} · {intra ? "CGST + SGST" : "IGST"}</p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground"><tr>{["Item", "HSN/SAC", "Qty", "Taxable", "GST", "Amount"].map((h, i) => <th key={h} scope="col" className={cn("px-3 py-2 font-medium", i >= 2 && "text-right")}>{h}</th>)}</tr></thead>
          <tbody>
            {d.lines.map((l, i) => (
              <tr key={i} className="border-b last:border-0"><td className="px-3 py-2">{l.description}</td><td className="px-3 py-2 text-muted-foreground">{l.hsnSac || "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{l.qty}</td><td className="px-3 py-2 text-right tabular-nums">{formatMoney(l.taxable)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(l.cgst + l.sgst + l.igst)} <span className="text-xs text-muted-foreground">({l.taxRate}%)</span></td><td className="px-3 py-2 text-right tabular-nums">{formatMoney(l.total)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-0.5 text-sm">
        <dt className="text-muted-foreground">Taxable value</dt><dd className="text-right tabular-nums">{formatMoney(d.taxable)}</dd>
        {intra ? <><dt className="text-muted-foreground">CGST</dt><dd className="text-right tabular-nums">{formatMoney(d.cgst)}</dd><dt className="text-muted-foreground">SGST</dt><dd className="text-right tabular-nums">{formatMoney(d.sgst)}</dd></>
          : <><dt className="text-muted-foreground">IGST</dt><dd className="text-right tabular-nums">{formatMoney(d.igst)}</dd></>}
        {d.roundOff !== 0 && <><dt className="text-muted-foreground">Round off</dt><dd className="text-right tabular-nums">{formatMoney(d.roundOff)}</dd></>}
        <dt className="border-t pt-1 font-semibold">Total</dt><dd className="border-t pt-1 text-right font-semibold tabular-nums">{formatMoney(d.total)}</dd>
        {isInvoice && d.payment?.paid != null && <><dt className="text-muted-foreground">Paid</dt><dd className="text-right tabular-nums">{formatMoney(d.payment.paid)}</dd><dt className="text-muted-foreground">Balance due</dt><dd className={cn("text-right tabular-nums", (d.payment.due ?? 0) > 0 && "font-medium text-amber-700")}>{formatMoney(d.payment.due ?? 0)}</dd></>}
        {isInvoice && (d.credited ?? 0) > 0 && <><dt className="text-muted-foreground">Credited</dt><dd className="text-right tabular-nums text-amber-700">− {formatMoney(d.credited ?? 0)}</dd></>}
      </dl>

      {d.notesIssued.length > 0 && (
        <Block title="Credit & debit notes">
          <ul className="divide-y text-sm">{d.notesIssued.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-3 py-1.5"><button type="button" className="text-left font-medium text-brand-700 hover:underline" onClick={() => onOpen(n.id)}>{n.number}</button>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{n.reason}</span><span className="tabular-nums">{n.docType === "CREDIT_NOTE" ? "− " : "+ "}{formatMoney(n.total)}</span></li>
          ))}</ul>
        </Block>
      )}

      <p className="text-[11px] text-muted-foreground">E-invoice (IRN): {d.irn.status === "NOT_INTEGRATED" ? "not integrated — no IRN or QR code has been generated." : d.irn.value}</p>

      <Block title="History">
        <ol className="space-y-1.5">{[...d.history].reverse().map((h, i) => (
          <li key={i} className="flex justify-between gap-3 text-xs"><span>{({ ISSUED: "Issued", VIEWED: "PDF viewed", DOWNLOADED: "PDF downloaded", CREDIT_NOTE_ISSUED: "Credit note issued", DEBIT_NOTE_ISSUED: "Debit note issued" } as Record<string, string>)[h.kind] ?? h.kind}{h.actorName ? ` · ${h.actorName}` : h.actorRole ? ` · ${h.actorRole.toLowerCase()}` : ""}</span><span className="text-muted-foreground">{dt(h.at)}</span></li>
        ))}</ol>
      </Block>

      {credit && <CreditNoteDialog doc={d} open onOpenChange={setCredit} />}
      {debit && <DebitNoteDialog doc={d} open onOpenChange={setDebit} />}
    </div>
  )
}

export function SalesInvoicesPanel({ channel }: { channel: "all" | SalesChannel }) {
  const { can } = usePermissions()
  const [q, setQ] = useState(""), [type, setType] = useState("all"), [from, setFrom] = useState(""), [to, setTo] = useState(""), [page, setPage] = useState(1)
  const [stack, setStack] = useState<string[]>([])
  const [creating, setCreating] = useState(false), [settings, setSettings] = useState(false)
  const search = useDebounce(q, 350)
  const filters = { channel, docType: type, q: search, from, to, page, limit: 20 }
  const list = useSalesDocs(filters)
  const openId = stack[stack.length - 1] ?? null
  const s = list.data?.summary

  const exportCsv = async () => {
    try {
      const { blob, truncated, count } = await salesInvoicesApi.exportCsv({ channel, docType: type, q: search, from, to })
      saveBlob(blob, `sales-documents-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success(truncated ? `Exported the first ${count} rows — narrow the dates to get the rest` : `Exported ${count} rows`)
    } catch (e) { toast.error(apiMessage(e, "Export failed")) }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Documents", list.data ? String(list.data.total) : "—"], ["B2B / B2C", s ? `${s.byChannel.B2B} / ${s.byChannel.B2C}` : "—"], ["Invoiced", s ? formatMoney(s.invoiced) : "—"], ["Credited", s ? formatMoney(s.credited) : "—"]].map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-0.5 text-xl font-semibold tabular-nums">{v}</p></div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input aria-label="Search documents" className="h-9 w-64" placeholder="Number, order, PO, buyer, GSTIN…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
        <Select value={type} onValueChange={(v) => { setType(v); setPage(1) }}>
          <SelectTrigger aria-label="Document type" className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All types</SelectItem>{(Object.keys(DOC_LABEL) as DocType[]).map((t) => <SelectItem key={t} value={t}>{DOC_LABEL[t]}</SelectItem>)}</SelectContent>
        </Select>
        <Input aria-label="From date" type="date" className="h-9 w-36" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} />
        <Input aria-label="To date" type="date" className="h-9 w-36" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} />
        <div className="ml-auto flex gap-2">
          {can("sales_invoices.export") && <Button variant="outline" size="sm" onClick={exportCsv}><FileSpreadsheet /> Export CSV</Button>}
          {can("sales_invoices.settings") && <Button variant="outline" size="sm" onClick={() => setSettings(true)}><Settings2 /> Settings</Button>}
          {can("sales_invoices.issue") && <Button size="sm" onClick={() => setCreating(true)}><FilePlus2 /> New invoice</Button>}
        </div>
      </div>

      {list.isError ? <QueryErrorBlock error={list.error} onRetry={() => list.refetch()} /> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground"><tr>{["Document", "Date", "Buyer", "Source", "Seller", "Total", "Payment"].map((h) => <th key={h} scope="col" className={cn("px-3 py-2.5 font-medium", h === "Total" && "text-right")}>{h}</th>)}</tr></thead>
            <tbody>
              {list.isLoading && Array.from({ length: 6 }, (_, i) => <tr key={i}><td colSpan={7} className="p-2"><Skeleton className="h-9 w-full" /></td></tr>)}
              {list.data?.items.map((d: SalesDoc) => (
                <tr key={d.id} onClick={() => setStack([d.id])} className="cursor-pointer border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2.5"><button type="button" className="text-left font-semibold text-brand-700 hover:underline" onClick={(e) => { e.stopPropagation(); setStack([d.id]) }}>{d.number}</button>
                    <div className="mt-0.5 flex items-center gap-1.5"><TypePill t={d.docType} /><span className="text-[11px] text-muted-foreground">{d.channel}</span></div></td>
                  <td className="px-3 py-2.5 text-muted-foreground">{day(d.issueDate)}</td>
                  <td className="px-3 py-2.5"><p className="font-medium">{d.buyer.name || "—"}</p>{d.buyer.gstin && <p className="font-mono text-[11px] text-muted-foreground">{d.buyer.gstin}</p>}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{SOURCE[d.sourceType]}{d.orderRef && <p className="text-xs">{d.orderRef}</p>}{d.refNumber && <p className="text-xs">vs {d.refNumber}</p>}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{d.seller.name}</td>
                  <td className={cn("px-3 py-2.5 text-right tabular-nums", d.docType === "CREDIT_NOTE" && "text-amber-700")}>{d.docType === "CREDIT_NOTE" ? "− " : ""}{formatMoney(d.total)}</td>
                  <td className="px-3 py-2.5"><PayBadge p={d.payment} /></td>
                </tr>
              ))}
              {list.data && !list.data.items.length && (
                <tr><td colSpan={7} className="px-3 py-14 text-center text-muted-foreground"><FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  <p className="font-medium text-foreground">No documents here</p><p className="text-sm">{search || type !== "all" || from || to ? "Nothing matches these filters." : "Invoices appear here when repairs are completed, orders are delivered, or staff issue one."}</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {list.data && list.data.pages > 1 && (
        <div className="flex items-center justify-between text-sm"><p className="text-muted-foreground">Page {list.data.page} of {list.data.pages} · {list.data.total} documents</p>
          <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= list.data.pages} onClick={() => setPage((p) => p + 1)}>Next</Button></div></div>
      )}

      <Sheet open={!!openId} onOpenChange={(o) => { if (!o) setStack([]) }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="sr-only"><SheetTitle>Document details</SheetTitle><SheetDescription>Invoice or note details and actions</SheetDescription></SheetHeader>
          {stack.length > 1 && <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => setStack((s) => s.slice(0, -1))}>← Back</Button>}
          {openId && <DocDetail id={openId} onOpen={(id) => setStack((s) => [...s, id])} />}
        </SheetContent>
      </Sheet>
      <ManualInvoiceDialog open={creating} onOpenChange={setCreating} onIssued={(id) => setStack([id])} />
      <InvoiceSettingsDialog open={settings} onOpenChange={setSettings} />
    </div>
  )
}
