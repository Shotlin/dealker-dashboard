"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EvidenceUploader } from "@/components/sell-requests/EvidenceUploader"
import { useCreateRepair, useRepairSettings } from "@/hooks/useRepairs"
import type { EvidenceMedia } from "@/services/sell-requests.service"
import { PROBLEM_LABEL, repairsApi, type CreateRepairInput, type ProblemCategory, type RepairChannel, type WarrantyStatus } from "@/services/repairs.service"

type Dev = CreateRepairInput["items"][number]
const blank = (): Dev => ({ category: "Smartphone", brand: "", model: "", imeiSerial: "", problemCategory: "SCREEN", problemDescription: "", warrantyStatus: "UNKNOWN" })
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const PHONE = /^\+?\d[\d ]{9,13}$/

/** Book a repair on a customer's behalf (walk-in / phone / business account), single or bulk. */
export function CreateRepairDialog({ open, onOpenChange, onCreated, defaultChannel = "B2C" }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated?: (id: string) => void; defaultChannel?: RepairChannel }) {
  const create = useCreateRepair()
  const settings = useRepairSettings(open)
  const [channel, setChannel] = useState<RepairChannel>(defaultChannel)
  const [name, setName] = useState(""), [phone, setPhone] = useState(""), [city, setCity] = useState("")
  const [business, setBusiness] = useState(""), [gstin, setGstin] = useState(""), [contact, setContact] = useState(""), [po, setPo] = useState("")
  const [mode, setMode] = useState<"DROP_OFF" | "PICKUP">("DROP_OFF"), [address, setAddress] = useState("")
  const [desc, setDesc] = useState("")
  const [items, setItems] = useState<Dev[]>([blank()])
  const [media, setMedia] = useState<EvidenceMedia[]>([])
  const [busy, setBusy] = useState(false)
  const [mk, setMk] = useState(0)
  const b2b = channel === "B2B"
  const max = b2b ? settings.data?.maxB2bDevices ?? 200 : settings.data?.maxB2cDevices ?? 3

  const upd = (n: number, p: Partial<Dev>) => setItems((c) => c.map((d, i) => (i === n ? { ...d, ...p } : d)))
  const reset = () => { setName(""); setPhone(""); setCity(""); setBusiness(""); setGstin(""); setContact(""); setPo(""); setMode("DROP_OFF"); setAddress(""); setDesc(""); setItems([blank()]); setMedia([]); setMk((k) => k + 1) }

  const submit = () => {
    if (name.trim().length < 2) return toast.error("Customer name is required")
    if (!PHONE.test(phone.trim())) return toast.error("Enter a valid phone number")
    if (b2b) {
      if (!business.trim()) return toast.error("Business name is required")
      if (!GSTIN.test(gstin.trim().toUpperCase())) return toast.error("Enter a valid 15-character GSTIN")
      if (!contact.trim()) return toast.error("Add the authorised contact person")
    }
    if (mode === "PICKUP" && address.trim().length < 10) return toast.error("Enter the full pickup address")
    const bad = items.findIndex((d) => !d.brand.trim() || !d.model.trim())
    if (bad >= 0) return toast.error(`Device ${bad + 1}: brand and model are required`)
    create.mutate({
      channel, customer: { name: name.trim(), phone: phone.trim(), city: city.trim() || undefined },
      businessName: b2b ? business.trim() : undefined, gstin: b2b ? gstin.trim().toUpperCase() : undefined, contactPerson: b2b ? contact.trim() : undefined, poReference: b2b ? po.trim() || undefined : undefined,
      serviceMode: mode, pickupAddress: mode === "PICKUP" ? address.trim() : undefined, description: desc.trim() || undefined,
      items: items.map((d) => ({ ...d, brand: d.brand.trim(), model: d.model.trim(), imeiSerial: d.imeiSerial?.trim() || undefined })),
      mediaIds: media.map((m) => m.id),
    }, { onSuccess: (r) => { onOpenChange(false); reset(); onCreated?.(r.id) } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>New repair request</DialogTitle><DialogDescription>Book on behalf of a walk-in customer, a phone request or a business with several devices.</DialogDescription></DialogHeader>

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Customer type">
          {([["B2C", "Individual customer"], ["B2B", "Business (bulk)"]] as const).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={channel === v} onClick={() => { setChannel(v); if (v === "B2C") setItems((c) => c.slice(0, settings.data?.maxB2cDevices ?? 3)) }}
              className={cn("rounded-lg border px-3 py-2 text-sm font-medium", channel === v ? "border-brand-500 bg-brand-50 text-brand-700" : "hover:bg-muted")}>{l}</button>
          ))}
        </div>

        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-semibold">{b2b ? "Business" : "Customer"}</legend>
          {b2b && <>
            <div className="space-y-1.5"><Label htmlFor="rb">Business name</Label><Input id="rb" value={business} onChange={(e) => setBusiness(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="rg">GSTIN</Label><Input id="rg" maxLength={15} value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} aria-invalid={gstin.length === 15 && !GSTIN.test(gstin)} /></div>
            <div className="space-y-1.5"><Label htmlFor="rc">Authorised contact</Label><Input id="rc" value={contact} onChange={(e) => setContact(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="rpo">PO reference (optional)</Label><Input id="rpo" value={po} onChange={(e) => setPo(e.target.value)} /></div>
          </>}
          <div className="space-y-1.5"><Label htmlFor="rn">{b2b ? "Contact name on file" : "Customer name"}</Label><Input id="rn" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="rph">Phone</Label><Input id="rph" inputMode="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!phone && !PHONE.test(phone)} /></div>
          <div className="space-y-1.5"><Label htmlFor="rci">City</Label><Input id="rci" value={city} onChange={(e) => setCity(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Handover</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as "DROP_OFF" | "PICKUP")}><SelectTrigger aria-label="Handover"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="DROP_OFF">Customer drops off</SelectItem><SelectItem value="PICKUP">Pickup from customer</SelectItem></SelectContent></Select></div>
          {mode === "PICKUP" && <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ra">Pickup address</Label><Textarea id="ra" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} /></div>}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-sm font-semibold">Devices ({items.length}/{max})</legend>
          {items.map((d, n) => (
            <div key={n} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-6">
              <Input aria-label={`Device ${n + 1} brand`} className="sm:col-span-1" placeholder="Brand" value={d.brand} onChange={(e) => upd(n, { brand: e.target.value })} />
              <Input aria-label={`Device ${n + 1} model`} className="sm:col-span-2" placeholder="Model" value={d.model} onChange={(e) => upd(n, { model: e.target.value })} />
              <Input aria-label={`Device ${n + 1} IMEI or serial`} className="sm:col-span-3" placeholder="IMEI / serial" value={d.imeiSerial} onChange={(e) => upd(n, { imeiSerial: e.target.value.toUpperCase() })} />
              <Select value={d.problemCategory} onValueChange={(v) => upd(n, { problemCategory: v as ProblemCategory })}><SelectTrigger aria-label={`Device ${n + 1} problem`} className="sm:col-span-2"><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(PROBLEM_LABEL) as ProblemCategory[]).map((k) => <SelectItem key={k} value={k}>{PROBLEM_LABEL[k]}</SelectItem>)}</SelectContent></Select>
              <Select value={d.warrantyStatus} onValueChange={(v) => upd(n, { warrantyStatus: v as WarrantyStatus })}><SelectTrigger aria-label={`Device ${n + 1} warranty`} className="sm:col-span-2"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="UNKNOWN">Warranty unknown</SelectItem><SelectItem value="IN_WARRANTY">In warranty</SelectItem><SelectItem value="OUT_OF_WARRANTY">Out of warranty</SelectItem></SelectContent></Select>
              <div className="flex gap-2 sm:col-span-2"><Input aria-label={`Device ${n + 1} problem details`} placeholder="Problem details" value={d.problemDescription} onChange={(e) => upd(n, { problemDescription: e.target.value })} />
                {items.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label={`Remove device ${n + 1}`} onClick={() => setItems((c) => c.filter((_, i) => i !== n))}><Trash2 /></Button>}</div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={items.length >= max} onClick={() => setItems((c) => [...c, blank()])}><Plus /> Add device</Button>
        </fieldset>

        <div className="space-y-1.5"><Label htmlFor="rd">Notes</Label><Textarea id="rd" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Photos &amp; video of the damage (optional)</Label>
          <EvidenceUploader key={mk} kind="SELL" upload={repairsApi.upload} discard={repairsApi.discard} limits={settings.data} onChange={setMedia} onBusyChange={setBusy} /></div>

        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={create.isPending || busy} onClick={submit}>{busy ? "Uploading…" : create.isPending ? "Creating…" : "Create request"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
