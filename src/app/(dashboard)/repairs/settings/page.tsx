"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Pencil, Plus } from "lucide-react"
import { formatMoney } from "@/lib/utils"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { usePermissions } from "@/hooks/usePermissions"
import { useBusinessTerms, useRepairServices, useRepairSettings, useSaveBusinessTerms, useSaveRepairService, useSaveRepairSettings } from "@/hooks/useRepairs"
import { PROBLEM_LABEL, type BusinessTerms, type ProblemCategory, type RepairServiceItem, type RepairSettings } from "@/services/repairs.service"

type NumKey = { [K in keyof RepairSettings]: RepairSettings[K] extends number ? K : never }[keyof RepairSettings]
const FIELDS: Array<{ title: string; hint?: string; fields: Array<{ key: NumKey; label: string; unit?: string; step?: number }> }> = [
  { title: "Charges & tax", hint: "GST on repairs is a placeholder (18%). Confirm the rate for services and parts with your accountant before going live.", fields: [
    { key: "diagnosticFee", label: "Diagnostic fee per device", unit: "₹" }, { key: "taxPct", label: "GST on estimates", unit: "%", step: 0.5 },
    { key: "advancePct", label: "Advance before repair starts", unit: "%" }, { key: "platformCommissionPct", label: "Platform commission", unit: "%", step: 0.5 } ] },
  { title: "Warranty & estimates", fields: [
    { key: "defaultWarrantyDays", label: "Repair warranty", unit: "days" }, { key: "estimateValidityDays", label: "Estimate valid for", unit: "days" } ] },
  { title: "Service levels (SLA)", fields: [
    { key: "slaInspectionHours", label: "Accept & inspect within", unit: "hours" }, { key: "slaRepairHours", label: "Finish repair within", unit: "hours" } ] },
  { title: "Booking limits", fields: [
    { key: "maxB2cDevices", label: "Devices per consumer request" }, { key: "maxB2bDevices", label: "Devices per business request" },
    { key: "maxImages", label: "Photos per device" }, { key: "maxVideos", label: "Videos per device" }, { key: "maxImageMb", label: "Largest photo", unit: "MB" }, { key: "maxVideoMb", label: "Largest video", unit: "MB" } ] },
]

function General() {
  const q = useRepairSettings()
  const save = useSaveRepairSettings()
  const [f, setF] = useState<RepairSettings | null>(null)
  useEffect(() => { if (q.data) setF(q.data) }, [q.data])
  if (q.isLoading || !f) return <Skeleton className="h-64 w-full" />
  const dirty = JSON.stringify(f) !== JSON.stringify(q.data)
  const toggles: Array<[keyof RepairSettings, string]> = [["enabled", "Accept repair requests"], ["b2cEnabled", "Consumer (B2C) repairs"], ["b2bEnabled", "Business (B2B) repairs"], ["requireAdvance", "Require advance before work starts"]]
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(f) }}>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Availability</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {toggles.map(([k, l]) => (
            <div key={k} className="flex items-center justify-between rounded-lg border px-3 py-2"><Label htmlFor={k} className="cursor-pointer text-sm font-normal">{l}</Label>
              <Switch id={k} checked={f[k] as boolean} onCheckedChange={(v) => setF({ ...f, [k]: v })} /></div>
          ))}
        </div>
      </section>
      {FIELDS.map((g) => (
        <section key={g.title} className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">{g.title}</h2>
          {g.hint && <p className="mb-3 text-xs text-amber-700">{g.hint}</p>}
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.fields.map((x) => (
              <div key={x.key} className="space-y-1.5"><Label htmlFor={x.key}>{x.label}{x.unit && <span className="text-muted-foreground"> ({x.unit})</span>}</Label>
                <Input id={x.key} type="number" min={0} step={x.step ?? 1} value={f[x.key]} onChange={(e) => setF({ ...f, [x.key]: Number(e.target.value) })} /></div>
            ))}
          </div>
        </section>
      ))}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={!dirty} onClick={() => setF(q.data ?? null)}>Reset</Button><Button type="submit" disabled={!dirty || save.isPending}>{save.isPending ? "Saving…" : "Save settings"}</Button></div>
    </form>
  )
}

function ServiceDialog({ item, open, onClose }: { item: RepairServiceItem | null; open: boolean; onClose: () => void }) {
  const save = useSaveRepairService()
  const [f, setF] = useState({ code: "", name: "", category: "SCREEN" as ProblemCategory, labourPrice: "0", estHours: "24", warrantyDays: "" })
  useEffect(() => {
    if (open) setF(item ? { code: item.code, name: item.name, category: item.category, labourPrice: String(item.labourPrice), estHours: String(item.estHours), warrantyDays: item.warrantyDays == null ? "" : String(item.warrantyDays) } : { code: "", name: "", category: "SCREEN", labourPrice: "0", estHours: "24", warrantyDays: "" })
  }, [open, item])
  const submit = () => {
    if (!item && !/^[A-Z][A-Z0-9_]{2,39}$/.test(f.code)) return toast.error("Code: 3–40 capital letters, digits or underscores")
    save.mutate({ id: item?.id ?? null, body: { ...(item ? {} : { code: f.code }), name: f.name, category: f.category, labourPrice: Number(f.labourPrice), estHours: Number(f.estHours), warrantyDays: f.warrantyDays === "" ? null : Number(f.warrantyDays) } }, { onSuccess: onClose })
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? "Edit service" : "New service"}</DialogTitle><DialogDescription>Labour prices are before GST. Staff can adjust them per estimate.</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {!item && <div className="space-y-1.5"><Label htmlFor="sc">Code</Label><Input id="sc" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="SCREEN_OLED" /></div>}
          <div className="space-y-1.5"><Label htmlFor="sn">Name</Label><Input id="sn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Category</Label><Select value={f.category} onValueChange={(v) => setF({ ...f, category: v as ProblemCategory })}><SelectTrigger aria-label="Category"><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(PROBLEM_LABEL) as ProblemCategory[]).map((k) => <SelectItem key={k} value={k}>{PROBLEM_LABEL[k]}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="sp">Labour price (₹)</Label><Input id="sp" type="number" min={0} value={f.labourPrice} onChange={(e) => setF({ ...f, labourPrice: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="sh">Typical hours</Label><Input id="sh" type="number" min={1} value={f.estHours} onChange={(e) => setF({ ...f, estHours: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="sw">Warranty days (blank = default)</Label><Input id="sw" type="number" min={0} value={f.warrantyDays} onChange={(e) => setF({ ...f, warrantyDays: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={save.isPending} onClick={submit}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Services() {
  const q = useRepairServices()
  const save = useSaveRepairService()
  const [edit, setEdit] = useState<RepairServiceItem | null>(null)
  const [open, setOpen] = useState(false)
  if (q.isLoading) return <Skeleton className="h-64 w-full" />
  return (
    <section className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => { setEdit(null); setOpen(true) }}><Plus /> New service</Button></div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground"><tr>{["Service", "Category", "Labour", "Hours", "Warranty", "Offered", ""].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {q.data?.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="px-3 py-2.5 font-medium">{s.name}<p className="font-mono text-[11px] font-normal text-muted-foreground">{s.code}</p></td>
                <td className="px-3 py-2.5">{PROBLEM_LABEL[s.category]}</td><td className="px-3 py-2.5 tabular-nums">{formatMoney(s.labourPrice)}</td>
                <td className="px-3 py-2.5 tabular-nums">{s.estHours}</td><td className="px-3 py-2.5">{s.warrantyDays == null ? "Default" : `${s.warrantyDays} d`}</td>
                <td className="px-3 py-2.5"><Switch aria-label={`Offer ${s.name}`} checked={s.isActive} disabled={save.isPending} onCheckedChange={(v) => save.mutate({ id: s.id, body: { isActive: v } })} /></td>
                <td className="px-3 py-2.5 text-right"><Button variant="ghost" size="icon" aria-label={`Edit ${s.name}`} onClick={() => { setEdit(s); setOpen(true) }}><Pencil /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ServiceDialog item={edit} open={open} onClose={() => setOpen(false)} />
    </section>
  )
}

function Terms() {
  const q = useBusinessTerms()
  const save = useSaveBusinessTerms()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ gstin: "", businessName: "", discountPct: "0", paymentTermsDays: "0", creditLimit: "0", isActive: true })
  const edit = (t?: BusinessTerms) => { setF(t ? { gstin: t.gstin, businessName: t.businessName, discountPct: String(t.discountPct), paymentTermsDays: String(t.paymentTermsDays), creditLimit: String(t.creditLimit), isActive: t.isActive } : { gstin: "", businessName: "", discountPct: "0", paymentTermsDays: "0", creditLimit: "0", isActive: true }); setOpen(true) }
  const submit = () => {
    if (Number(f.paymentTermsDays) > 0 && Number(f.creditLimit) <= 0) return toast.error("Set a credit limit to allow payment terms")
    save.mutate({ gstin: f.gstin.trim().toUpperCase(), businessName: f.businessName.trim(), discountPct: Number(f.discountPct), paymentTermsDays: Number(f.paymentTermsDays), creditLimit: Number(f.creditLimit), isActive: f.isActive }, { onSuccess: () => setOpen(false) })
  }
  if (q.isLoading) return <Skeleton className="h-48 w-full" />
  return (
    <section className="space-y-3">
      <p className="text-sm text-muted-foreground">Contract pricing for business customers, matched by GSTIN on every new B2B request. Credit terms only apply when a credit limit is set; without them the business pays an advance like anyone else.</p>
      <div className="flex justify-end"><Button onClick={() => edit()}><Plus /> Add business</Button></div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground"><tr>{["Business", "GSTIN", "Discount", "Terms", "Credit limit", "Status", ""].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {q.data?.map((t) => (
              <tr key={t.id} className="border-b last:border-0"><td className="px-3 py-2.5 font-medium">{t.businessName}</td><td className="px-3 py-2.5 font-mono text-xs">{t.gstin}</td>
                <td className="px-3 py-2.5">{t.discountPct}%</td><td className="px-3 py-2.5">{t.paymentTermsDays > 0 ? `${t.paymentTermsDays} days` : "Pay first"}</td>
                <td className="px-3 py-2.5 tabular-nums">{formatMoney(t.creditLimit)}</td><td className="px-3 py-2.5">{t.isActive ? "Active" : "Inactive"}</td>
                <td className="px-3 py-2.5 text-right"><Button variant="ghost" size="icon" aria-label={`Edit ${t.businessName}`} onClick={() => edit(t)}><Pencil /></Button></td></tr>
            ))}
            {!q.data?.length && <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No business contracts yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Business contract</DialogTitle><DialogDescription>Saving an existing GSTIN updates its terms. Existing requests keep the terms they were booked with.</DialogDescription></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="tg">GSTIN</Label><Input id="tg" maxLength={15} value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tb">Business name</Label><Input id="tb" value={f.businessName} onChange={(e) => setF({ ...f, businessName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="td">Discount (%)</Label><Input id="td" type="number" min={0} max={60} value={f.discountPct} onChange={(e) => setF({ ...f, discountPct: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tt">Payment terms (days)</Label><Input id="tt" type="number" min={0} max={120} value={f.paymentTermsDays} onChange={(e) => setF({ ...f, paymentTermsDays: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tl">Credit limit (₹)</Label><Input id="tl" type="number" min={0} value={f.creditLimit} onChange={(e) => setF({ ...f, creditLimit: e.target.value })} /></div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2"><Label htmlFor="ta" className="cursor-pointer text-sm font-normal">Active</Label><Switch id="ta" checked={f.isActive} onCheckedChange={(v) => setF({ ...f, isActive: v })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={save.isPending} onClick={submit}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default function RepairSettingsPage() {
  const { can } = usePermissions()
  return (
    <div className="space-y-5">
      <PageHeader title="Repair settings" subtitle="Charges, warranty, service levels, the labour price list and business contracts.">
        <Button asChild variant="outline" size="sm"><Link href="/repairs"><ArrowLeft /> Back to repairs</Link></Button>
      </PageHeader>
      {!can("repairs.settings") ? (
        <p role="alert" className="rounded-lg border p-6 text-center text-sm text-muted-foreground">You need the “repairs.settings” permission to change these.</p>
      ) : (
        <Tabs defaultValue="general">
          <TabsList><TabsTrigger value="general">General</TabsTrigger><TabsTrigger value="services">Price list</TabsTrigger><TabsTrigger value="terms">Business contracts</TabsTrigger></TabsList>
          <TabsContent value="general"><General /></TabsContent><TabsContent value="services"><Services /></TabsContent><TabsContent value="terms"><Terms /></TabsContent>
        </Tabs>
      )}
    </div>
  )
}
