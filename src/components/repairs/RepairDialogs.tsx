"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatMoney } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRepairServices, useRepairSettings } from "@/hooks/useRepairs"
import { useMarketplaceVendors } from "@/hooks/useMarketplace"
import type { PaymentKind, PaymentMethod, QcResult, QuoteLine, Repair, RepairItem } from "@/services/repairs.service"

/** Generic "give a reason" dialog. */
export function NoteDialog({ open, title, description, label, confirm, required = true, destructive, pending, onClose, onSubmit }: {
  open: boolean; title: string; description?: string; label: string; confirm: string; required?: boolean; destructive?: boolean; pending?: boolean
  onClose: () => void; onSubmit: (text: string) => void
}) {
  const [text, setText] = useState("")
  const submit = () => {
    if (required && !text.trim()) return toast.error(`${label} is required`)
    onSubmit(text.trim())
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setText(""); onClose() } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}</DialogHeader>
        <div className="space-y-1.5"><Label htmlFor="rp-note">{label}</Label><Textarea id="rp-note" rows={4} value={text} onChange={(e) => setText(e.target.value)} /></div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={destructive ? "destructive" : "default"} disabled={pending} onClick={submit}>{confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Choose the service centre that will repair the device. */
export function AssignDialog({ open, title, confirm, currentId, pending, onClose, onSubmit }: {
  open: boolean; title: string; confirm: string; currentId?: string | null; pending?: boolean; onClose: () => void; onSubmit: (vendorId: string) => void
}) {
  const vendors = useMarketplaceVendors({ limit: 100 })
  const list = (vendors.data?.data ?? []).filter((v) => ["ACTIVE", "VERIFIED"].includes(v.status))
  const [id, setId] = useState<string>("")
  const value = id || currentId || ""
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Only active, verified service centres are listed.</DialogDescription></DialogHeader>
        <div className="space-y-1.5">
          <Label>Service centre</Label>
          <Select value={value} onValueChange={setId}>
            <SelectTrigger aria-label="Service centre"><SelectValue placeholder={vendors.isLoading ? "Loading…" : list.length ? "Choose a service centre" : "No active vendors"} /></SelectTrigger>
            <SelectContent>{list.map((v) => <SelectItem key={v.id} value={v.id}>{v.name || v.legal_name || v.email}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!value || pending} onClick={() => onSubmit(value)}>{confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DiagnosisDialog({ item, pending, onClose, onSubmit }: {
  item: RepairItem | null; pending?: boolean; onClose: () => void; onSubmit: (diagnosis: string, repairable: boolean) => void
}) {
  const [text, setText] = useState("")
  const [repairable, setRepairable] = useState(true)
  return (
    <Dialog open={!!item} onOpenChange={(o) => { if (!o) { setText(""); setRepairable(true); onClose() } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Diagnosis — {item?.brand} {item?.model}</DialogTitle><DialogDescription>Record what the technician found.</DialogDescription></DialogHeader>
        <div className="space-y-1.5"><Label htmlFor="dx">Findings</Label><Textarea id="dx" rows={4} defaultValue={item?.diagnosis ?? ""} onChange={(e) => setText(e.target.value)} /></div>
        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
          <Label htmlFor="rep" className="cursor-pointer text-sm font-normal">This device can be repaired</Label>
          <Switch id="rep" checked={repairable} onCheckedChange={setRepairable} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pending} onClick={() => { const t = text.trim() || item?.diagnosis || ""; if (!t) return toast.error("Describe what you found"); onSubmit(t, repairable) }}>Save diagnosis</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const KINDS: Array<[QuoteLine["kind"], string]> = [["LABOUR", "Labour"], ["PART", "Part"], ["DIAGNOSTIC", "Diagnostic"], ["OTHER", "Other"]]

/** Build the estimate. The server recalculates discount, tax and total; this preview is only a guide. */
export function QuoteDialog({ repair, open, pending, onClose, onSubmit }: {
  repair: Repair; open: boolean; pending?: boolean; onClose: () => void; onSubmit: (lines: QuoteLine[], note: string) => void
}) {
  const services = useRepairServices()
  const settings = useRepairSettings(open)
  const repairable = repair.items.filter((i) => i.status !== "FAILED")
  const [lines, setLines] = useState<QuoteLine[]>([])
  const [note, setNote] = useState("")
  // Start from the previous estimate when revising, otherwise one empty labour line per device.
  useEffect(() => {
    if (!open) return
    const prev = repair.quotes.find((q) => q.status === "SENT")
    setLines(prev ? prev.lines.map((l) => ({ ...l })) : repairable.map((i) => ({ itemId: i.id, kind: "LABOUR", description: "", qty: 1, unitPrice: 0 })))
    setNote("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const discountPct = repair.business?.contractDiscountPct ?? 0
  const taxPct = settings.data?.taxPct ?? 0
  const preview = useMemo(() => {
    const sub = lines.reduce((n, l) => n + Math.round((Number(l.qty) || 0) * Math.round((Number(l.unitPrice) || 0) * 100)), 0)
    const disc = Math.round((sub * discountPct) / 100)
    const tax = Math.round(((sub - disc) * taxPct) / 100)
    return { sub: sub / 100, disc: disc / 100, tax: tax / 100, total: (sub - disc + tax) / 100 }
  }, [lines, discountPct, taxPct])

  const set = (n: number, p: Partial<QuoteLine>) => setLines((cur) => cur.map((l, i) => (i === n ? { ...l, ...p } : l)))
  const addFromService = (itemId: string, code: string) => {
    const s = services.data?.find((x) => x.code === code)
    if (s) setLines((cur) => [...cur, { itemId, kind: "LABOUR", description: s.name, qty: 1, unitPrice: s.labourPrice, serviceCode: s.code }])
  }
  const submit = () => {
    const bad = lines.findIndex((l) => l.description.trim().length < 2)
    if (bad >= 0) return toast.error(`Line ${bad + 1}: add a description`)
    const unpriced = repairable.find((i) => !lines.some((l) => l.itemId === i.id && l.kind !== "DIAGNOSTIC"))
    if (unpriced) return toast.error(`${unpriced.brand} ${unpriced.model} has no repair line`)
    onSubmit(lines.map((l) => ({ ...l, qty: Number(l.qty), unitPrice: Number(l.unitPrice), description: l.description.trim() })), note.trim())
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{repair.quotes.some((q) => q.status === "SENT") ? "Revise estimate" : "Send estimate"}</DialogTitle>
          <DialogDescription>Every repairable device needs at least one line. Prices are before tax; the server calculates discount, GST and the total.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {repairable.map((item) => (
            <section key={item.id} className="rounded-lg border p-3" aria-label={`${item.brand} ${item.model}`}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{item.lineNo}. {item.brand} {item.model} <span className="font-normal text-muted-foreground">{item.imeiSerial ?? ""}</span></p>
                <Select value="" onValueChange={(c) => addFromService(item.id, c)}>
                  <SelectTrigger className="h-8 w-52" aria-label={`Add service for ${item.model}`}><SelectValue placeholder="Add from price list" /></SelectTrigger>
                  <SelectContent>{(services.data ?? []).filter((s) => s.isActive).map((s) => <SelectItem key={s.code} value={s.code}>{s.name} · {formatMoney(s.labourPrice)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                {lines.map((l, n) => l.itemId === item.id && (
                  <div key={n} className="grid grid-cols-[110px_1fr_64px_100px_32px] items-center gap-2">
                    <Select value={l.kind} onValueChange={(v) => set(n, { kind: v as QuoteLine["kind"] })}>
                      <SelectTrigger className="h-9" aria-label="Line type"><SelectValue /></SelectTrigger>
                      <SelectContent>{KINDS.map(([v, t]) => <SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input aria-label="Description" className="h-9" placeholder="e.g. OEM display assembly" value={l.description} onChange={(e) => set(n, { description: e.target.value })} />
                    <Input aria-label="Quantity" className="h-9" inputMode="numeric" value={l.qty} onChange={(e) => set(n, { qty: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
                    <Input aria-label="Unit price" className="h-9" inputMode="decimal" value={l.unitPrice} onChange={(e) => set(n, { unitPrice: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })} />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Remove line" onClick={() => setLines((cur) => cur.filter((_, i) => i !== n))}><Trash2 /></Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="ghost" size="sm" className="mt-2 h-7" onClick={() => setLines((cur) => [...cur, { itemId: item.id, kind: "PART", description: "", qty: 1, unitPrice: 0 }])}><Plus /> Add line</Button>
            </section>
          ))}
          <div className="space-y-1.5"><Label htmlFor="qn">Note to customer (optional)</Label><Textarea id="qn" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <dl className="ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm" aria-label="Estimate preview">
            <dt className="text-muted-foreground">Subtotal</dt><dd className="text-right tabular-nums">{formatMoney(preview.sub)}</dd>
            {discountPct > 0 && <><dt className="text-muted-foreground">Contract discount ({discountPct}%)</dt><dd className="text-right tabular-nums text-emerald-600">− {formatMoney(preview.disc)}</dd></>}
            <dt className="text-muted-foreground">GST ({taxPct}%)</dt><dd className="text-right tabular-nums">{formatMoney(preview.tax)}</dd>
            <dt className="border-t pt-1 font-semibold">Total</dt><dd className="border-t pt-1 text-right font-semibold tabular-nums">{formatMoney(preview.total)}</dd>
          </dl>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pending} onClick={submit}>Send estimate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Final QC per device. */
export function QcDialog({ repair, open, pending, onClose, onSubmit }: { repair: Repair; open: boolean; pending?: boolean; onClose: () => void; onSubmit: (r: QcResult[]) => void }) {
  const items = repair.items.filter((i) => i.status === "PENDING")
  const [res, setRes] = useState<Record<string, { passed: boolean; notes: string }>>({})
  const get = (id: string) => res[id] ?? { passed: true, notes: "" }
  const submit = () => {
    const out = items.map((i) => ({ itemId: i.id, passed: get(i.id).passed, notes: get(i.id).notes.trim() || undefined }))
    const bad = out.findIndex((r) => !r.passed && !r.notes)
    if (bad >= 0) return toast.error(`Say what failed on ${items[bad].brand} ${items[bad].model}`)
    onSubmit(out)
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Final quality check</DialogTitle><DialogDescription>Test every repaired device. Any failure sends the repair back for rework.</DialogDescription></DialogHeader>
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{i.lineNo}. {i.brand} {i.model}</p>
                <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{get(i.id).passed ? "Passed" : "Failed"}</span>
                  <Switch aria-label={`${i.model} passed QC`} checked={get(i.id).passed} onCheckedChange={(v) => setRes((c) => ({ ...c, [i.id]: { ...get(i.id), passed: v } }))} /></div>
              </div>
              {!get(i.id).passed && <Input aria-label={`What failed on ${i.model}`} className="mt-2" placeholder="What failed?" value={get(i.id).notes} onChange={(e) => setRes((c) => ({ ...c, [i.id]: { ...get(i.id), notes: e.target.value } }))} />}
            </li>
          ))}
        </ul>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending || !items.length} onClick={submit}>Submit QC</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const METHODS: PaymentMethod[] = ["CASH", "UPI", "CARD", "BANK", "COD", "WALLET"]

/** Record money received or refunded. A fresh idempotency key per dialog means a double-click can never record twice. */
export function PaymentDialog({ repair, open, pending, onClose, onSubmit }: {
  repair: Repair; open: boolean; pending?: boolean; onClose: () => void
  onSubmit: (p: { kind: PaymentKind; method: PaymentMethod; amount: number; reference?: string; note?: string; idempotencyKey: string }) => void
}) {
  const m = repair.money
  const [kind, setKind] = useState<PaymentKind | "">("")
  const [method, setMethod] = useState<PaymentMethod>("UPI")
  const [amount, setAmount] = useState("")
  const [reference, setReference] = useState("")
  const [note, setNote] = useState("")
  const key = useRef<string>("")
  if (open && !key.current) key.current = crypto.randomUUID()
  if (!open) key.current = ""

  const defaultKind: PaymentKind = m.refundable > 0 ? "REFUND" : ["ESTIMATE_REJECTED", "FAILED"].includes(repair.status) ? "DIAGNOSTIC" : m.amountPaid < m.advanceRequired ? "ADVANCE" : "BALANCE"
  const k = kind || defaultKind
  const suggested = k === "REFUND" ? m.refundable : k === "ADVANCE" ? Math.max(0, m.advanceRequired - m.amountPaid) : m.amountDue
  const value = amount === "" ? String(suggested || "") : amount
  const submit = () => {
    const n = Number(value)
    if (!Number.isFinite(n) || n <= 0) return toast.error("Enter an amount above zero")
    if (k === "REFUND" && !note.trim()) return toast.error("Give a reason for the refund")
    onSubmit({ kind: k, method, amount: n, reference: reference.trim() || undefined, note: note.trim() || undefined, idempotencyKey: key.current })
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setKind(""); setAmount(""); setReference(""); setNote(""); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>Total {formatMoney(m.approvedTotal)} · paid {formatMoney(m.amountPaid)} · due {formatMoney(m.amountDue)}{m.refundable > 0 && ` · refundable ${formatMoney(m.refundable)}`}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Type</Label>
            <Select value={k} onValueChange={(v) => { setKind(v as PaymentKind); setAmount("") }}>
              <SelectTrigger aria-label="Payment type"><SelectValue /></SelectTrigger>
              <SelectContent>{(["ADVANCE", "BALANCE", "DIAGNOSTIC", "REFUND"] as PaymentKind[]).map((x) => <SelectItem key={x} value={x}>{x[0] + x.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1.5"><Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger aria-label="Payment method"><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1.5"><Label htmlFor="pa">Amount (₹)</Label><Input id="pa" inputMode="decimal" value={value} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} /></div>
          <div className="space-y-1.5"><Label htmlFor="pr">Reference / UTR</Label><Input id="pr" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="pn">{k === "REFUND" ? "Reason (required)" : "Note"}</Label><Input id="pn" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={submit}>{k === "REFUND" ? "Record refund" : "Record payment"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
