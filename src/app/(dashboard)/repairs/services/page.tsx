"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatMoney } from "@/lib/utils"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { useDebounce } from "@/hooks/useDebounce"
import { useMarketplaceVendors } from "@/hooks/useMarketplace"
import { usePermissions } from "@/hooks/usePermissions"
import { useDeleteVendorService, useSaveVendorService, useVendorServices } from "@/hooks/useRepairs"
import { PROBLEM_LABEL, type ProblemCategory, type VendorService } from "@/services/repairs.service"

const DEVICE_TYPES = ["Smartphone", "Tablet", "Laptop", "Other"] as const
const ALL = "__all__"

type Form = {
  vendorId: string; deviceCategory: (typeof DEVICE_TYPES)[number]; brand: string; model: string; problemCategory: ProblemCategory; title: string
  partsPrice: string; labourPrice: string; estDaysMin: string; estDaysMax: string; warrantyDays: string; pickupDelivery: boolean; isActive: boolean
}
const BLANK: Form = { vendorId: "", deviceCategory: "Smartphone", brand: "", model: "", problemCategory: "SCREEN", title: "", partsPrice: "0", labourPrice: "0", estDaysMin: "1", estDaysMax: "2", warrantyDays: "90", pickupDelivery: true, isActive: true }

function ServiceDialog({ item, open, onClose, vendors }: { item: VendorService | null; open: boolean; onClose: () => void; vendors: Array<{ id: string; name: string }> }) {
  const save = useSaveVendorService()
  const [f, setF] = useState<Form>(BLANK)
  useEffect(() => {
    if (!open) return
    setF(item ? {
      vendorId: item.vendorId, deviceCategory: item.deviceCategory, brand: item.brand, model: item.model ?? "", problemCategory: item.problemCategory, title: item.title,
      partsPrice: String(item.partsPrice), labourPrice: String(item.labourPrice), estDaysMin: String(item.estDaysMin), estDaysMax: String(item.estDaysMax),
      warrantyDays: String(item.warrantyDays), pickupDelivery: item.pickupDelivery, isActive: item.isActive,
    } : BLANK)
  }, [open, item])
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((c) => ({ ...c, [k]: v }))
  const submit = () => {
    if (!item && !f.vendorId) return toast.error("Choose the repair shop")
    if (!f.brand.trim()) return toast.error("Brand is required")
    if (Number(f.partsPrice) + Number(f.labourPrice) <= 0) return toast.error("Set a price above zero")
    if (Number(f.estDaysMax) < Number(f.estDaysMin)) return toast.error("Maximum days cannot be below minimum days")
    save.mutate({
      id: item?.id ?? null,
      body: {
        ...(item ? {} : { vendorId: f.vendorId }), deviceCategory: f.deviceCategory, brand: f.brand.trim(), model: f.model.trim() || null, problemCategory: f.problemCategory,
        title: f.title.trim() || undefined, partsPrice: Number(f.partsPrice), labourPrice: Number(f.labourPrice), estDaysMin: Number(f.estDaysMin), estDaysMax: Number(f.estDaysMax),
        warrantyDays: Number(f.warrantyDays), pickupDelivery: f.pickupDelivery, isActive: f.isActive,
      },
    }, { onSuccess: onClose })
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{item ? "Edit repair service" : "Add repair service"}</DialogTitle>
          <DialogDescription>Prices are before GST. Leave the model blank to price every model of the brand. Customers get a live quote when a shop prices every issue they selected.</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {!item && (
            <div className="space-y-1.5 sm:col-span-2"><Label>Repair shop</Label>
              <Select value={f.vendorId} onValueChange={(v) => set("vendorId", v)}><SelectTrigger aria-label="Repair shop"><SelectValue placeholder="Choose a shop" /></SelectTrigger>
                <SelectContent>{vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select></div>
          )}
          <div className="space-y-1.5"><Label>Device type</Label>
            <Select value={f.deviceCategory} onValueChange={(v) => set("deviceCategory", v as Form["deviceCategory"])}><SelectTrigger aria-label="Device type"><SelectValue /></SelectTrigger>
              <SelectContent>{DEVICE_TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Repair</Label>
            <Select value={f.problemCategory} onValueChange={(v) => set("problemCategory", v as ProblemCategory)}><SelectTrigger aria-label="Repair type"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(PROBLEM_LABEL) as ProblemCategory[]).map((k) => <SelectItem key={k} value={k}>{PROBLEM_LABEL[k]}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="vs-brand">Brand</Label><Input id="vs-brand" value={f.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Apple" /></div>
          <div className="space-y-1.5"><Label htmlFor="vs-model">Model (optional)</Label><Input id="vs-model" value={f.model} onChange={(e) => set("model", e.target.value)} placeholder="iPhone 14 Pro" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="vs-title">Shown to customers as (optional)</Label><Input id="vs-title" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Display replacement" /></div>
          <div className="space-y-1.5"><Label htmlFor="vs-parts">Parts price (₹)</Label><Input id="vs-parts" type="number" min={0} value={f.partsPrice} onChange={(e) => set("partsPrice", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="vs-labour">Labour price (₹)</Label><Input id="vs-labour" type="number" min={0} value={f.labourPrice} onChange={(e) => set("labourPrice", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="vs-dmin">Fastest (days)</Label><Input id="vs-dmin" type="number" min={0} value={f.estDaysMin} onChange={(e) => set("estDaysMin", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="vs-dmax">Slowest (days)</Label><Input id="vs-dmax" type="number" min={0} value={f.estDaysMax} onChange={(e) => set("estDaysMax", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="vs-war">Warranty (days)</Label><Input id="vs-war" type="number" min={0} value={f.warrantyDays} onChange={(e) => set("warrantyDays", e.target.value)} /></div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">Pickup &amp; delivery <Switch checked={f.pickupDelivery} onCheckedChange={(v) => set("pickupDelivery", v)} aria-label="Pickup and delivery" /></label>
            <label className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">Offered to customers <Switch checked={f.isActive} onCheckedChange={(v) => set("isActive", v)} aria-label="Offered to customers" /></label>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={save.isPending} onClick={submit}>{save.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function VendorPriceListsPage() {
  const { can } = usePermissions()
  const manage = can("repairs.manage")
  const [vendorId, setVendorId] = useState(ALL)
  const [q, setQ] = useState("")
  const search = useDebounce(q, 300)
  const list = useVendorServices({ vendorId: vendorId === ALL ? undefined : vendorId, q: search })
  const vendors = useMarketplaceVendors({ limit: 100 })
  const vendorOptions = (vendors.data?.data ?? []).filter((v) => ["ACTIVE", "VERIFIED"].includes(v.status)).map((v) => ({ id: v.id, name: v.name || v.legal_name || v.email || "Vendor" }))
  const save = useSaveVendorService()
  const del = useDeleteVendorService()
  const [edit, setEdit] = useState<VendorService | null>(null)
  const [open, setOpen] = useState(false)
  const [removing, setRemoving] = useState<VendorService | null>(null)

  return (
    <div className="space-y-5">
      <PageHeader title="Vendor price lists" subtitle="What each repair shop repairs and charges. These prices become live quotes when a customer in range asks for the same repair.">
        <Button asChild variant="outline"><Link href="/repairs"><ArrowLeft /> Repair requests</Link></Button>
        {manage && <Button onClick={() => { setEdit(null); setOpen(true) }}><Plus /> Add repair service</Button>}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64"><Select value={vendorId} onValueChange={setVendorId}><SelectTrigger aria-label="Filter by shop"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>All shops</SelectItem>{vendorOptions.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="relative w-64"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input aria-label="Search price lists" className="pl-8" placeholder="Brand, model, repair…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      {list.isError ? <QueryErrorBlock error={list.error} onRetry={() => list.refetch()} /> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>{["Shop", "Device", "Repair", "Parts", "Labour", "Total (pre-GST)", "Time", "Warranty", "Offered", ""].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {list.isLoading && Array.from({ length: 5 }, (_, i) => <tr key={i}><td colSpan={10} className="p-2"><Skeleton className="h-9 w-full" /></td></tr>)}
              {list.data?.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-3 py-2.5 font-medium">{s.vendor}</td>
                  <td className="px-3 py-2.5">{s.brand} {s.model ?? <span className="text-muted-foreground">(all models)</span>}<p className="text-xs text-muted-foreground">{s.deviceCategory}</p></td>
                  <td className="px-3 py-2.5">{s.title}<p className="text-xs text-muted-foreground">{PROBLEM_LABEL[s.problemCategory]}{s.pickupDelivery ? " · pickup & delivery" : ""}</p></td>
                  <td className="px-3 py-2.5 tabular-nums">{formatMoney(s.partsPrice)}</td><td className="px-3 py-2.5 tabular-nums">{formatMoney(s.labourPrice)}</td>
                  <td className="px-3 py-2.5 font-semibold tabular-nums">{formatMoney(s.total)}</td>
                  <td className="px-3 py-2.5">{s.estDaysMin === s.estDaysMax ? `${s.estDaysMax} d` : `${s.estDaysMin}–${s.estDaysMax} d`}</td><td className="px-3 py-2.5">{s.warrantyDays} d</td>
                  <td className="px-3 py-2.5"><Switch aria-label={`Offer ${s.title}`} checked={s.isActive} disabled={!manage || save.isPending} onCheckedChange={(v) => save.mutate({ id: s.id, body: { isActive: v } })} /></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    {manage && <><Button variant="ghost" size="icon" aria-label={`Edit ${s.title}`} onClick={() => { setEdit(s); setOpen(true) }}><Pencil /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Remove ${s.title}`} onClick={() => setRemoving(s)}><Trash2 className="text-red-600" /></Button></>}
                  </td>
                </tr>
              ))}
              {list.data && !list.data.length && (
                <tr><td colSpan={10} className="px-3 py-14 text-center text-muted-foreground"><p className="font-medium text-foreground">No repair services yet</p>
                  <p className="text-sm">{search || vendorId !== ALL ? "Nothing matches these filters." : "Add what a shop repairs and charges so customers nearby get live quotes."}</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ServiceDialog item={edit} open={open} onClose={() => setOpen(false)} vendors={vendorOptions} />
      <Dialog open={!!removing} onOpenChange={(o) => { if (!o) setRemoving(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove this repair service?</DialogTitle><DialogDescription>{removing && `${removing.vendor} will stop quoting ${removing.title} for ${removing.brand} ${removing.model ?? "(all models)"}. Quotes already sent are not affected.`}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setRemoving(null)}>Keep it</Button>
            <Button variant="destructive" disabled={del.isPending} onClick={() => removing && del.mutate(removing.id, { onSuccess: () => setRemoving(null) })}>Remove</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
