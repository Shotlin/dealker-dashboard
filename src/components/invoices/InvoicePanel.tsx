"use client"

/**
 * Invoices of one listing: upload (auto-linked to the product and its
 * IMEI/serial), view / download the private file, verify or reject.
 * A verified invoice is permanent — no delete, no reject.
 */

import { useEffect, useState } from "react"
import { CheckCircle2, Download, Eye, FileText, Lock, Plus, Trash2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useInvoiceActions, useListingInvoices } from "@/hooks/useInvoices"
import { formatDateTime } from "@/lib/utils"
import { invoicesApi } from "@/services/invoices.service"
import type { Invoice, InvoiceForm, InvoiceStatus } from "@/services/invoices.service"

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n)

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; cls: string }> = {
  UPLOADED: { label: "Awaiting verification", cls: "bg-amber-50 text-amber-700" },
  VERIFIED: { label: "Verified", cls: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Rejected", cls: "bg-red-50 text-red-700" },
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const m = INVOICE_STATUS[status]
  return <Badge variant="outline" className={`border-0 text-[11px] font-medium ${m.cls}`}>{m.label}</Badge>
}

/** Opens the private file through the signed-in session. */
export function InvoiceViewer({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let revoked: string | null = null
    setUrl(null)
    setFailed(false)
    if (!invoice) return
    invoicesApi.fileBlob(invoice.id).then((b) => { revoked = URL.createObjectURL(b); setUrl(revoked) }).catch(() => setFailed(true))
    return () => { if (revoked) URL.revokeObjectURL(revoked) }
  }, [invoice])

  return (
    <Dialog open={!!invoice} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle className="text-base">Invoice {invoice?.invoice_number}</DialogTitle></DialogHeader>
        <div className="h-[70vh] overflow-hidden rounded-lg border bg-muted">
          {failed ? <p className="p-6 text-sm text-red-600">Could not load the invoice file.</p>
            : !url ? <Skeleton className="h-full w-full" />
            : invoice?.mime_type === "application/pdf"
              ? <iframe src={url} title="Invoice" className="h-full w-full" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={url} alt="Invoice" className="mx-auto h-full object-contain" />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export async function downloadInvoice(invoice: Invoice) {
  const blob = await invoicesApi.fileBlob(invoice.id, true)
  const href = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = href
  a.download = invoice.file_name
  a.click()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

const EMPTY: InvoiceForm = { invoiceNumber: "", invoiceDate: "", purchaseAmount: "", gstAmount: "", supplierName: "", imeiSerial: "" }

export function InvoiceActions({ invoice, onViewed }: { invoice: Invoice; onViewed?: (i: Invoice) => void }) {
  const actions = useInvoiceActions()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="h-8" onClick={() => onViewed?.(invoice)}><Eye className="mr-1.5 h-3.5 w-3.5" />View</Button>
        <Button size="sm" variant="outline" className="h-8" onClick={() => downloadInvoice(invoice)}><Download className="mr-1.5 h-3.5 w-3.5" />Download</Button>
        {invoice.status === "UPLOADED" && (
          <>
            <Button size="sm" className="h-8" disabled={actions.verify.isPending} onClick={() => actions.verify.mutate(invoice.id)}>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Verify
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-red-600" onClick={() => setRejecting(true)}>
              <XCircle className="mr-1.5 h-3.5 w-3.5" />Reject
            </Button>
          </>
        )}
        {invoice.status !== "VERIFIED" && (
          <Button size="sm" variant="ghost" className="h-8 text-red-600" disabled={actions.remove.isPending}
            onClick={() => { if (window.confirm("Remove this invoice?")) actions.remove.mutate(invoice.id) }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        {invoice.status === "VERIFIED" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" />Permanent record</span>
        )}
      </div>
      {rejecting && (
        <div className="space-y-2">
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What is wrong with this invoice? (required)" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setRejecting(false); setReason("") }}>Cancel</Button>
            <Button size="sm" variant="destructive" disabled={reason.trim().length < 5 || actions.reject.isPending}
              onClick={() => actions.reject.mutate({ id: invoice.id, reason: reason.trim() }, { onSuccess: () => { setRejecting(false); setReason("") } })}>
              Reject invoice
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function InvoicePanel({ listingId, defaultImei }: { listingId: string; defaultImei?: string | null }) {
  const { data: invoices, isLoading } = useListingInvoices(listingId)
  const actions = useInvoiceActions()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<InvoiceForm>(EMPTY)
  const [file, setFile] = useState<File | null>(null)
  const [viewing, setViewing] = useState<Invoice | null>(null)
  const set = (k: keyof InvoiceForm, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const valid = form.invoiceNumber.trim() && form.invoiceDate && Number(form.purchaseAmount) > 0 && file

  return (
    <div className="space-y-3" data-testid="invoice-panel">
      {isLoading ? <Skeleton className="h-16 w-full" /> : (invoices ?? []).length === 0 && !adding ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No invoice uploaded for this product yet.</p>
      ) : (
        (invoices ?? []).map((i) => (
          <div key={i.id} className="space-y-2 rounded-lg border p-3" data-testid="invoice-row">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{i.invoice_number}</span>
              <InvoiceStatusBadge status={i.status} />
              <span className="ml-auto text-sm font-medium tabular-nums">{inr(i.purchase_amount)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {i.invoice_date} · GST {inr(i.gst_amount)}{i.imei_serial ? ` · IMEI/serial ${i.imei_serial}` : ""}{i.supplier_name ? ` · ${i.supplier_name}` : ""}
            </p>
            {i.rejection_reason && <p className="rounded-md bg-red-50 p-2 text-xs text-red-800">{i.rejection_reason}</p>}
            {i.verified_at && i.status === "VERIFIED" && (
              <p className="text-xs text-muted-foreground">Verified {formatDateTime(i.verified_at)}{i.verified_by_name ? ` by ${i.verified_by_name}` : ""}</p>
            )}
            <InvoiceActions invoice={i} onViewed={setViewing} />
          </div>
        ))
      )}

      {adding ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Invoice number *</Label><Input className="h-9" value={form.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Invoice date *</Label><Input className="h-9" type="date" value={form.invoiceDate} onChange={(e) => set("invoiceDate", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Purchase amount (₹) *</Label><Input className="h-9" inputMode="decimal" value={form.purchaseAmount} onChange={(e) => set("purchaseAmount", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">GST amount (₹)</Label><Input className="h-9" inputMode="decimal" value={form.gstAmount} onChange={(e) => set("gstAmount", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Supplier</Label><Input className="h-9" value={form.supplierName} onChange={(e) => set("supplierName", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">IMEI / serial</Label><Input className="h-9" placeholder={defaultImei || "Taken from the product"} value={form.imeiSerial} onChange={(e) => set("imeiSerial", e.target.value)} /></div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Invoice file * <span className="text-muted-foreground">(PDF, JPG, PNG or WebP · max 10 MB)</span></Label>
            <Input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setForm(EMPTY); setFile(null) }}>Cancel</Button>
            <Button size="sm" disabled={!valid || actions.upload.isPending}
              onClick={() => file && actions.upload.mutate({ listingId, form, file }, { onSuccess: () => { setAdding(false); setForm(EMPTY); setFile(null) } })}>
              {actions.upload.isPending ? "Uploading…" : "Upload invoice"}
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="mr-1.5 h-4 w-4" />Add invoice</Button>
      )}
      <InvoiceViewer invoice={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}
