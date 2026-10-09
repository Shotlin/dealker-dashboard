"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useCategories } from "@/hooks/useCategories"
import { useCreateListing, useUpdateListing } from "@/hooks/useListings"
import { useB2bVendors } from "@/hooks/useB2bAdmin"
import { isUsed, type ListingCondition, type ListingDetail, type ListingInput } from "@/types/listing.types"
import { CONDITION_META } from "./badges"
import { PhotoUploader } from "./PhotoUploader"

interface FormState {
  ownerVendorId: string
  name: string; brand: string; categoryId: string; description: string
  condition: ListingCondition; conditionNotes: string; usageDuration: string; warrantyInfo: string
  accessoriesIncluded: string; batteryHealth: string; serialNumber: string; imei: string; hasInvoice: boolean
  images: string[]; price: string; mrp: string; stock: string; sku: string
  handlingTimeDays: string; codEligible: boolean; nationwide: boolean; localDelivery: boolean
  specs: { k: string; v: string }[]
}

const empty: FormState = {
  ownerVendorId: "", name: "", brand: "", categoryId: "", description: "", condition: "NEW", conditionNotes: "", usageDuration: "", warrantyInfo: "",
  accessoriesIncluded: "", batteryHealth: "", serialNumber: "", imei: "", hasInvoice: true, images: [], price: "", mrp: "", stock: "1", sku: "",
  handlingTimeDays: "2", codEligible: true, nationwide: true, localDelivery: true, specs: [{ k: "", v: "" }],
}

const fromDetail = (d: ListingDetail): FormState => ({
  ownerVendorId: d.vendor_id ?? "", name: d.name, brand: d.brand ?? "", categoryId: d.category_id ?? "", description: d.description ?? "", condition: d.condition,
  conditionNotes: d.condition_notes ?? "", usageDuration: d.usage_duration ?? "", warrantyInfo: d.warranty_info ?? "",
  accessoriesIncluded: d.accessories_included ?? "", batteryHealth: d.battery_health ? String(d.battery_health) : "",
  serialNumber: d.serial_number ?? "", imei: d.imei ?? "", hasInvoice: d.has_invoice, images: d.images, price: String(d.selling_price), mrp: d.mrp ? String(d.mrp) : "",
  stock: String(d.stock_quantity), sku: d.seller_sku ?? "", handlingTimeDays: String(d.handling_time_days ?? 2), codEligible: d.cod_eligible,
  nationwide: d.nationwide_shipping_enabled, localDelivery: d.local_delivery_enabled,
  specs: Object.entries(d.specifications ?? {}).map(([k, v]) => ({ k, v: String(v) })).concat([{ k: "", v: "" }]),
})

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function ListingForm({ initial }: { initial?: ListingDetail }) {
  const router = useRouter()
  const editing = Boolean(initial)
  const [f, setF] = useState<FormState>(initial ? fromDetail(initial) : empty)
  const cats = useCategories()
  const vendorOptions = useB2bVendors()
  const create = useCreateListing()
  const update = useUpdateListing(initial?.id ?? "")
  const busy = create.isPending || update.isPending
  const used = isUsed(f.condition)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }))
  const electronics = useMemo(() => {
    const c = (cats.data ?? []).find((x: { id: string; name: string }) => x.id === f.categoryId)
    return c ? /electronic|mobile|laptop|phone/i.test(c.name) : false
  }, [cats.data, f.categoryId])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const specifications = Object.fromEntries(f.specs.filter((s) => s.k.trim() && s.v.trim()).map((s) => [s.k.trim(), s.v.trim()]))
    const body: ListingInput = {
      ownerVendorId: !editing && f.ownerVendorId ? f.ownerVendorId : undefined,
      name: f.name.trim(), brand: f.brand.trim() || undefined, categoryId: f.categoryId || undefined, description: f.description.trim() || undefined,
      condition: f.condition, conditionNotes: f.conditionNotes.trim() || undefined, usageDuration: f.usageDuration.trim() || undefined,
      warrantyInfo: f.warrantyInfo.trim() || undefined, accessoriesIncluded: f.accessoriesIncluded.trim() || undefined,
      batteryHealth: f.batteryHealth ? Number(f.batteryHealth) : null, serialNumber: f.serialNumber.trim() || undefined, imei: f.imei.trim() || undefined, hasInvoice: f.hasInvoice,
      images: f.images, price: Number(f.price), mrp: f.mrp ? Number(f.mrp) : null, stock: used ? Math.min(1, Number(f.stock)) : Number(f.stock),
      sku: f.sku.trim() || undefined, specifications, handlingTimeDays: Number(f.handlingTimeDays || 2), codEligible: f.codEligible,
      nationwide: f.nationwide, localDelivery: f.localDelivery,
    }
    if (f.images.length < 3) return toast.error("Add at least 3 photos of the item")
    if (!body.categoryId) return toast.error("Choose a category")
    if (used && !f.conditionNotes.trim()) return toast.error("Describe the condition of this used item")
    if (editing) update.mutate(body, { onSuccess: () => router.push("/products") })
    else create.mutate(body, { onSuccess: () => router.push("/products") })
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-4xl space-y-5 pb-24">
      <Card className="shadow-none">
        <CardHeader><CardTitle className="text-base">Listed by</CardTitle><CardDescription>Add this product under Dealker, or on behalf of a vendor. Listings you add go live immediately.</CardDescription></CardHeader>
        <CardContent>
          <Select value={f.ownerVendorId || "__dealker__"} disabled={editing} onValueChange={(v) => set("ownerVendorId", v === "__dealker__" ? "" : v)}>
            <SelectTrigger className="sm:w-80"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__dealker__">Dealker (admin)</SelectItem>
              {(vendorOptions.data ?? []).map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {editing && <p className="mt-1 text-xs text-muted-foreground">The owner of an existing listing can’t be changed.</p>}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader><CardTitle className="text-base">Photos</CardTitle><CardDescription>Upload real photos of the exact item. Customers decide based on these.</CardDescription></CardHeader>
        <CardContent><PhotoUploader value={f.images} onChange={(v) => set("images", v)} /></CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader><CardTitle className="text-base">Basic details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Title *" className="sm:col-span-2"><Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Apple iPhone 15 (128GB, Blue)" required minLength={3} /></Field>
          <Field label="Brand"><Input value={f.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Apple" /></Field>
          <Field label="Category *">
            <Select value={f.categoryId} onValueChange={(v) => set("categoryId", v)}>
              <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
              <SelectContent>{(cats.data ?? []).map((c: { id: string; name: string }) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Description" className="sm:col-span-2"><Textarea rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Key features, what is included, reason for selling…" /></Field>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader><CardTitle className="text-base">Condition</CardTitle><CardDescription>Be honest — accurate condition notes reduce returns.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Condition *" hint={CONDITION_META[f.condition].hint}>
            <Select value={f.condition} onValueChange={(v) => { set("condition", v as ListingCondition); if (isUsed(v as ListingCondition)) set("stock", "1") }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(CONDITION_META) as ListingCondition[]).map((c) => <SelectItem key={c} value={c}>{CONDITION_META[c].label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {f.condition !== "NEW" && <Field label="Used for / age" hint="e.g. 6 months"><Input value={f.usageDuration} onChange={(e) => set("usageDuration", e.target.value)} /></Field>}
          {f.condition !== "NEW" && (
            <Field label={`Condition notes${used ? " *" : ""}`} className="sm:col-span-2" hint="Scratches, dents, repairs, screen or battery issues — anything a buyer should know.">
              <Textarea rows={3} value={f.conditionNotes} onChange={(e) => set("conditionNotes", e.target.value)} />
            </Field>
          )}
          <Field label="Warranty"><Input value={f.warrantyInfo} onChange={(e) => set("warrantyInfo", e.target.value)} placeholder="1 year brand warranty / 3 months seller warranty / No warranty" /></Field>
          <Field label="What's in the box"><Input value={f.accessoriesIncluded} onChange={(e) => set("accessoriesIncluded", e.target.value)} placeholder="Charger, original box, earphones…" /></Field>
          {(electronics || f.batteryHealth) && f.condition !== "NEW" && (
            <Field label="Battery health (%)"><Input type="number" min={1} max={100} value={f.batteryHealth} onChange={(e) => set("batteryHealth", e.target.value)} /></Field>
          )}
          <Field label="Serial number" hint="Private — only visible to Dealker."><Input value={f.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} /></Field>
          <Field label="IMEI" hint="15 digits, for phones and tablets. Checked during QC."><Input inputMode="numeric" value={f.imei} onChange={(e) => set("imei", e.target.value)} /></Field>
          <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
            <div><p className="text-sm font-medium">Purchase invoice available</p><p className="text-xs text-muted-foreground">Buyers trust listings that come with a bill.</p></div>
            <Switch checked={f.hasInvoice} onCheckedChange={(v) => set("hasInvoice", v)} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader><CardTitle className="text-base">Price & stock</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <Field label="Selling price (₹) *"><Input type="number" min={1} step="any" required value={f.price} onChange={(e) => set("price", e.target.value)} /></Field>
          <Field label="MRP (₹)" hint="Original price, shown struck-through"><Input type="number" min={0} step="any" value={f.mrp} onChange={(e) => set("mrp", e.target.value)} /></Field>
          <Field label="Quantity *" hint={used ? "Used items are single units" : undefined}>
            <Input type="number" min={0} max={used ? 1 : 100000} required disabled={used} value={used ? "1" : f.stock} onChange={(e) => set("stock", e.target.value)} />
          </Field>
          <Field label="SKU"><Input value={f.sku} onChange={(e) => set("sku", e.target.value)} /></Field>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader><CardTitle className="text-base">Specifications</CardTitle><CardDescription>Optional — storage, colour, size, model number…</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {f.specs.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input placeholder="Name (e.g. Storage)" value={s.k} onChange={(e) => set("specs", f.specs.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))} />
              <Input placeholder="Value (e.g. 128 GB)" value={s.v} onChange={(e) => set("specs", f.specs.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} />
              <Button type="button" variant="ghost" size="icon" onClick={() => set("specs", f.specs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => set("specs", [...f.specs, { k: "", v: "" }])}><Plus className="mr-1 h-4 w-4" />Add specification</Button>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader><CardTitle className="text-base">Delivery</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Dispatch within (days)"><Input type="number" min={0} max={30} value={f.handlingTimeDays} onChange={(e) => set("handlingTimeDays", e.target.value)} /></Field>
          <div className="space-y-2 sm:col-span-2">
            {([["codEligible", "Cash on delivery"], ["nationwide", "Ship across India"], ["localDelivery", "Local delivery"]] as const).map(([k, label]) => (
              <div key={k} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">{label}</span>
                <Switch checked={f[k]} onCheckedChange={(v) => set(k, v)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 p-3 backdrop-blur md:left-[var(--sidebar-width,16rem)]">
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-2">
          <Button type="button" variant="ghost" asChild><Link href="/products">Cancel</Link></Button>
          <Button type="submit" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Save changes" : "List product"}</Button>
        </div>
      </div>
    </form>
  )
}
