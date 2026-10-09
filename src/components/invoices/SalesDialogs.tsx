"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cn, formatMoney } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useInvoiceSettings, useSalesAction, useSaveInvoiceSettings } from "@/hooks/useSalesInvoices"
import { useMarketplaceVendors } from "@/hooks/useMarketplace"
import { GST_SLABS, type InvoiceSettings, type ManualLine, type SalesChannel, type SalesDocDetail } from "@/services/sales-invoices.service"

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const blank = (): ManualLine => ({ description: "", hsnSac: "", qty: 1, unitPrice: 0, discount: 0, taxRate: 18 })

/** Live preview only — the server recomputes every figure and is the source of truth. */
function preview(lines: ManualLine[], inclusive: boolean) {
  let taxable = 0, tax = 0
  for (const l of lines) {
    const gross = Math.round((l.qty || 0) * Math.round((l.unitPrice || 0) * 100)), net = gross - Math.round((l.discount || 0) * 100)
    const t = inclusive ? Math.round((net * 100) / (100 + l.taxRate)) : net
    taxable += t; tax += inclusive ? net - t : Math.round((t * l.taxRate) / 100)
  }
  return { taxable: taxable / 100, tax: tax / 100, total: (taxable + tax) / 100 }
}

export function LinesEditor({ lines, onChange, requireHsn }: { lines: ManualLine[]; onChange: (l: ManualLine[]) => void; requireHsn: boolean }) {
  const set = (n: number, p: Partial<ManualLine>) => onChange(lines.map((l, i) => (i === n ? { ...l, ...p } : l)))
  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[1fr_88px_56px_88px_80px_76px_32px] gap-2 text-xs text-muted-foreground sm:grid"><span>Description</span><span>HSN/SAC{requireHsn && " *"}</span><span>Qty</span><span>Rate (₹)</span><span>Discount</span><span>GST %</span><span /></div>
      {lines.map((l, n) => (
        <div key={n} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[1fr_88px_56px_88px_80px_76px_32px]">
          <Input aria-label={`Line ${n + 1} description`} className="col-span-2 h-9 sm:col-span-1" placeholder="Item or service" value={l.description} onChange={(e) => set(n, { description: e.target.value })} />
          <Input aria-label={`Line ${n + 1} HSN or SAC`} className="h-9" placeholder="8517" inputMode="numeric" value={l.hsnSac} onChange={(e) => set(n, { hsnSac: e.target.value.replace(/\D/g, "").slice(0, 8) })} />
          <Input aria-label={`Line ${n + 1} quantity`} className="h-9" inputMode="decimal" value={l.qty} onChange={(e) => set(n, { qty: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })} />
          <Input aria-label={`Line ${n + 1} rate`} className="h-9" inputMode="decimal" value={l.unitPrice} onChange={(e) => set(n, { unitPrice: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })} />
          <Input aria-label={`Line ${n + 1} discount`} className="h-9" inputMode="decimal" value={l.discount ?? 0} onChange={(e) => set(n, { discount: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })} />
          <Select value={String(l.taxRate)} onValueChange={(v) => set(n, { taxRate: Number(v) })}>
            <SelectTrigger aria-label={`Line ${n + 1} GST rate`} className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{GST_SLABS.map((s) => <SelectItem key={s} value={String(s)}>{s}%</SelectItem>)}</SelectContent>
          </Select>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Remove line ${n + 1}`} disabled={lines.length === 1} onClick={() => onChange(lines.filter((_, i) => i !== n))}><Trash2 /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...lines, blank()])}><Plus /> Add line</Button>
    </div>
  )
}

function Totals({ lines, inclusive }: { lines: ManualLine[]; inclusive: boolean }) {
  const t = useMemo(() => preview(lines, inclusive), [lines, inclusive])
  return (
    <dl className="ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-0.5 text-sm" aria-label="Preview totals">
      <dt className="text-muted-foreground">Taxable value</dt><dd className="text-right tabular-nums">{formatMoney(t.taxable)}</dd>
      <dt className="text-muted-foreground">GST</dt><dd className="text-right tabular-nums">{formatMoney(t.tax)}</dd>
      <dt className="border-t pt-1 font-semibold">Total</dt><dd className="border-t pt-1 text-right font-semibold tabular-nums">{formatMoney(t.total)}</dd>
    </dl>
  )
}

function checkLines(lines: ManualLine[], channel: SalesChannel): string | null {
  for (let n = 0; n < lines.length; n++) {
    const l = lines[n]
    if (l.description.trim().length < 2) return `Line ${n + 1}: add a description`
    if (!(l.qty > 0)) return `Line ${n + 1}: quantity must be above zero`
    if (channel === "B2B" && !l.hsnSac) return `Line ${n + 1}: HSN/SAC is required on business invoices`
    if (l.hsnSac && !/^\d{4,8}$/.test(l.hsnSac)) return `Line ${n + 1}: HSN/SAC must be 4–8 digits`
  }
  return null
}

/** Issue an invoice by hand — offline B2B sales, auctions, anything staff must bill. */
export function ManualInvoiceDialog({ open, onOpenChange, onIssued }: { open: boolean; onOpenChange: (o: boolean) => void; onIssued?: (id: string) => void }) {
  const issue = useSalesAction("Invoice issued")
  const vendors = useMarketplaceVendors({ limit: 100 })
  const [channel, setChannel] = useState<SalesChannel>("B2B")
  const [issuer, setIssuer] = useState("PLATFORM")
  const [b, setB] = useState({ name: "", businessName: "", gstin: "", address: "", state: "", phone: "" })
  const [lines, setLines] = useState<ManualLine[]>([blank()])
  const [inclusive, setInclusive] = useState(false)
  const [orderRef, setOrderRef] = useState(""), [po, setPo] = useState(""), [due, setDue] = useState(""), [notes, setNotes] = useState("")
  const sellers = (vendors.data?.data ?? []).filter((v) => ["ACTIVE", "VERIFIED"].includes(v.status))
  useEffect(() => { if (open) { setLines([blank()]); setB({ name: "", businessName: "", gstin: "", address: "", state: "", phone: "" }); setOrderRef(""); setPo(""); setDue(""); setNotes("") } }, [open])
  const b2b = channel === "B2B"

  const submit = () => {
    if (b2b) {
      if (!b.businessName.trim()) return toast.error("Business name is required")
      if (!GSTIN.test(b.gstin.trim().toUpperCase())) return toast.error("Enter the buyer’s valid 15-character GSTIN")
    } else if (!b.name.trim()) return toast.error("Buyer name is required")
    const bad = checkLines(lines, channel)
    if (bad) return toast.error(bad)
    issue.mutate({
      type: "manual",
      body: {
        channel, issuerVendorId: issuer === "PLATFORM" ? undefined : issuer, taxInclusive: inclusive || undefined, lines: lines.map((l) => ({ ...l, hsnSac: l.hsnSac || undefined })),
        buyer: { name: b.name.trim() || undefined, businessName: b2b ? b.businessName.trim() : undefined, gstin: b2b ? b.gstin.trim().toUpperCase() : undefined, address: b.address.trim() || undefined, state: b.state.trim() || undefined, phone: b.phone.trim() || undefined },
        orderRef: orderRef.trim() || undefined, poReference: b2b ? po.trim() || undefined : undefined, dueDate: due || undefined, notes: notes.trim() || undefined,
      },
    }, { onSuccess: (d) => { onOpenChange(false); onIssued?.((d as SalesDocDetail).id) } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>New invoice</DialogTitle><DialogDescription>For sales that did not come through an order or repair. Once issued it cannot be edited — corrections are made with a credit note.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Customer type">
          {([["B2B", "Business (B2B)"], ["B2C", "Individual (B2C)"]] as const).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={channel === v} onClick={() => setChannel(v)} className={cn("rounded-lg border px-3 py-2 text-sm font-medium", channel === v ? "border-brand-500 bg-brand-50 text-brand-700" : "hover:bg-muted")}>{l}</button>
          ))}
        </div>
        <div className="space-y-1.5"><Label>Sold by</Label>
          <Select value={issuer} onValueChange={setIssuer}><SelectTrigger aria-label="Sold by"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="PLATFORM">The platform (uses Invoice settings)</SelectItem>{sellers.map((v) => <SelectItem key={v.id} value={v.id}>{v.name || v.legal_name || v.email}</SelectItem>)}</SelectContent></Select></div>
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-semibold">Buyer</legend>
          {b2b && <><div className="space-y-1.5"><Label htmlFor="mb">Business name</Label><Input id="mb" value={b.businessName} onChange={(e) => setB({ ...b, businessName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="mg">GSTIN</Label><Input id="mg" maxLength={15} value={b.gstin} onChange={(e) => setB({ ...b, gstin: e.target.value.toUpperCase() })} aria-invalid={b.gstin.length === 15 && !GSTIN.test(b.gstin)} /></div></>}
          <div className="space-y-1.5"><Label htmlFor="mn">{b2b ? "Contact person" : "Name"}</Label><Input id="mn" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="mp">Phone</Label><Input id="mp" value={b.phone} onChange={(e) => setB({ ...b, phone: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ma">Address</Label><Input id="ma" value={b.address} onChange={(e) => setB({ ...b, address: e.target.value })} /></div>
          {!b2b && <div className="space-y-1.5"><Label htmlFor="ms">State (decides CGST/SGST vs IGST)</Label><Input id="ms" placeholder="e.g. Kerala" value={b.state} onChange={(e) => setB({ ...b, state: e.target.value })} /></div>}
        </fieldset>
        <fieldset className="space-y-2"><legend className="mb-1 text-sm font-semibold">Items</legend>
          <LinesEditor lines={lines} onChange={setLines} requireHsn={b2b} />
          <div className="flex items-center gap-2 pt-1"><Switch id="incl" checked={inclusive} onCheckedChange={setInclusive} /><Label htmlFor="incl" className="cursor-pointer text-sm font-normal">Rates already include GST</Label></div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="mo">Order / reference</Label><Input id="mo" value={orderRef} onChange={(e) => setOrderRef(e.target.value)} /></div>
          {b2b && <div className="space-y-1.5"><Label htmlFor="mpo">PO number</Label><Input id="mpo" value={po} onChange={(e) => setPo(e.target.value)} /></div>}
          <div className="space-y-1.5"><Label htmlFor="md">Due date</Label><Input id="md" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="mnote">Note on the invoice (optional)</Label><Textarea id="mnote" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <Totals lines={lines} inclusive={inclusive} />
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={issue.isPending} onClick={submit}>{issue.isPending ? "Issuing…" : "Issue invoice"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Credit part or all of an invoice, line by line. The server rejects anything beyond what was invoiced. */
export function CreditNoteDialog({ doc, open, onOpenChange }: { doc: SalesDocDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const act = useSalesAction("Credit note issued")
  const [pick, setPick] = useState<Record<number, string>>({})
  const [reason, setReason] = useState("")
  useEffect(() => { if (open) { setPick({}); setReason("") } }, [open])
  const rem = (i: number) => doc.creditable?.find((c) => c.index === i)?.remainingQty ?? 0
  const chosen = Object.entries(pick).filter(([, v]) => v !== undefined)
  const submit = () => {
    if (reason.trim().length < 3) return toast.error("Give a reason for the credit note")
    if (!chosen.length) return toast.error("Choose at least one line to credit")
    const lines = chosen.map(([i, v]) => ({ index: Number(i), qty: Number(v) }))
    const bad = lines.find((l) => !(l.qty > 0) || l.qty > rem(l.index) + 1e-9)
    if (bad) return toast.error(`Line ${bad.index + 1}: choose a quantity between 0 and ${rem(bad.index)}`)
    act.mutate({ type: "credit", id: doc.id, reason: reason.trim(), lines }, { onSuccess: () => onOpenChange(false) })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Credit note against {doc.number}</DialogTitle><DialogDescription>GST is reversed at the rate on the original line. The invoice itself never changes.</DialogDescription></DialogHeader>
        <ul className="divide-y rounded-lg border">
          {doc.lines.map((l, i) => {
            const left = rem(i)
            const on = pick[i] !== undefined
            return (
              <li key={i} className={cn("flex items-center gap-3 p-3", left <= 0 && "opacity-50")}>
                <input type="checkbox" className="h-4 w-4 accent-[#4F46E5]" aria-label={`Credit line ${i + 1}`} disabled={left <= 0} checked={on} onChange={(e) => setPick((c) => { const n = { ...c }; if (e.target.checked) n[i] = String(left); else delete n[i]; return n })} />
                <div className="min-w-0 flex-1 text-sm"><p className="truncate font-medium">{l.description}</p><p className="text-xs text-muted-foreground">{l.qty} × {formatMoney(l.unitPrice)} · GST {l.taxRate}% · {left <= 0 ? "fully credited" : `${left} left to credit`}</p></div>
                {on && <Input aria-label={`Quantity to credit on line ${i + 1}`} className="h-9 w-24" inputMode="decimal" value={pick[i]} onChange={(e) => setPick((c) => ({ ...c, [i]: e.target.value.replace(/[^\d.]/g, "") }))} />}
              </li>
            )
          })}
        </ul>
        <div className="space-y-1.5"><Label htmlFor="cnr">Reason (printed on the note)</Label><Textarea id="cnr" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Goods returned damaged" /></div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={act.isPending} onClick={submit}>{act.isPending ? "Issuing…" : "Issue credit note"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DebitNoteDialog({ doc, open, onOpenChange }: { doc: SalesDocDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const act = useSalesAction("Debit note issued")
  const [lines, setLines] = useState<ManualLine[]>([blank()])
  const [reason, setReason] = useState("")
  useEffect(() => { if (open) { setLines([blank()]); setReason("") } }, [open])
  const submit = () => {
    if (reason.trim().length < 3) return toast.error("Give a reason for the debit note")
    const bad = checkLines(lines, doc.channel)
    if (bad) return toast.error(bad)
    act.mutate({ type: "debit", id: doc.id, reason: reason.trim(), lines: lines.map((l) => ({ ...l, hsnSac: l.hsnSac || undefined })) }, { onSuccess: () => onOpenChange(false) })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>Debit note against {doc.number}</DialogTitle><DialogDescription>Adds charges to an issued invoice (for example freight that was under-billed).</DialogDescription></DialogHeader>
        <LinesEditor lines={lines} onChange={setLines} requireHsn={doc.channel === "B2B"} />
        <div className="space-y-1.5"><Label htmlFor="dnr">Reason</Label><Textarea id="dnr" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        <Totals lines={lines} inclusive={false} />
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={act.isPending} onClick={submit}>{act.isPending ? "Issuing…" : "Issue debit note"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Platform legal details (used when the platform itself is the seller) and repair HSN/SAC defaults. */
export function InvoiceSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const q = useInvoiceSettings(open)
  const save = useSaveInvoiceSettings()
  const [f, setF] = useState<InvoiceSettings | null>(null)
  useEffect(() => { if (q.data) setF(q.data) }, [q.data])
  const set = (p: Partial<InvoiceSettings>) => setF((c) => (c ? { ...c, ...p } : c))
  const submit = () => {
    if (!f) return
    if (f.gstin && !GSTIN.test(f.gstin)) return toast.error("Enter a valid 15-character GSTIN")
    save.mutate({ legalName: f.legalName ?? "", gstin: f.gstin ?? "", pan: f.pan ?? "", address: f.address ?? "", email: f.email ?? "", phone: f.phone ?? "", repairServiceSac: f.repairServiceSac, repairPartsHsn: f.repairPartsHsn, terms: f.terms, footer: f.footer }, { onSuccess: () => onOpenChange(false) })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Invoice settings</DialogTitle>
          <DialogDescription>Marketplace sellers are invoiced under their own legal profile (vendor KYC). These details apply when the platform itself is the seller.</DialogDescription></DialogHeader>
        {!f ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="sl">Legal name</Label><Input id="sl" value={f.legalName ?? ""} onChange={(e) => set({ legalName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="sg">GSTIN</Label><Input id="sg" maxLength={15} value={f.gstin ?? ""} onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="sa">Registered address</Label><Textarea id="sa" rows={2} value={f.address ?? ""} onChange={(e) => set({ address: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="sp">PAN</Label><Input id="sp" maxLength={10} value={f.pan ?? ""} onChange={(e) => set({ pan: e.target.value.toUpperCase() })} /></div>
            <div className="space-y-1.5"><Label htmlFor="sph">Phone</Label><Input id="sph" value={f.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ss">Repair service SAC</Label><Input id="ss" inputMode="numeric" value={f.repairServiceSac} onChange={(e) => set({ repairServiceSac: e.target.value.replace(/\D/g, "") })} /></div>
            <div className="space-y-1.5"><Label htmlFor="sh">Repair parts HSN</Label><Input id="sh" inputMode="numeric" value={f.repairPartsHsn} onChange={(e) => set({ repairPartsHsn: e.target.value.replace(/\D/g, "") })} /></div>
            <p className="text-xs text-amber-700 sm:col-span-2">The SAC / HSN codes are defaults for repair invoices. Confirm them with your accountant before go-live.</p>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="st">Terms printed on invoices</Label><Textarea id="st" rows={2} value={f.terms} onChange={(e) => set({ terms: e.target.value })} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="sf">Footer</Label><Input id="sf" value={f.footer} onChange={(e) => set({ footer: e.target.value })} /></div>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={!f || save.isPending} onClick={submit}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
