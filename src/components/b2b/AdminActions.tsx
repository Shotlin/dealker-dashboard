"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCategories } from "@/hooks/useCategories"
import { useB2bMutations, useB2bVendors } from "@/hooks/useB2bAdmin"
import type { B2bOrder, B2bRequirement } from "@/types/b2b.admin.types"
import { COND_LABEL } from "./shared"

const DEALKER = "__dealker__"
const COURIERS = ["Delhivery", "Blue Dart", "DTDC", "Ecom Express", "XpressBees", "Shiprocket", "Porter", "Self delivery"]

function F({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><Label className="mb-1.5 block text-sm">{label}</Label>{children}</div>
}

/** Post a requirement on behalf of a vendor (or for Dealker itself). */
export function NewRequirementDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const vendors = useB2bVendors()
  const cats = useCategories()
  const { createRequirement } = useB2bMutations()
  const inOneWeek = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16)
  const [f, setF] = useState({ buyer: DEALKER, productName: "", brand: "", categoryId: "", quantity: "", targetPrice: "", conditionPref: "ANY", deliveryCity: "", deliveryPincode: "", responseDeadline: inOneWeek, description: "" })
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }))
  const ready = f.productName.trim().length >= 2 && Number(f.quantity) > 0 && f.responseDeadline
  const submit = () =>
    createRequirement.mutate({
      buyerVendorId: f.buyer === DEALKER ? null : f.buyer, productName: f.productName.trim(), brand: f.brand || undefined, categoryId: f.categoryId || undefined,
      quantity: Number(f.quantity), targetPrice: f.targetPrice ? Number(f.targetPrice) : null, conditionPref: f.conditionPref, deliveryCity: f.deliveryCity || undefined,
      deliveryPincode: f.deliveryPincode || undefined, responseDeadline: new Date(f.responseDeadline).toISOString(), description: f.description || undefined,
    }, { onSuccess: onClose })
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>New buying requirement</DialogTitle><DialogDescription>Post what is needed. All verified vendors (except the buyer) are notified and can send quotes.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Buyer" className="sm:col-span-2">
            <Select value={f.buyer} onValueChange={(v) => set("buyer", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={DEALKER}>Dealker (admin)</SelectItem>{(vendors.data ?? []).map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Product *" className="sm:col-span-2"><Input value={f.productName} onChange={(e) => set("productName", e.target.value)} placeholder="Apple iPhone 16 (128GB)" /></F>
          <F label="Quantity needed *"><Input type="number" min={1} value={f.quantity} onChange={(e) => set("quantity", e.target.value)} /></F>
          <F label="Target price per unit (₹)"><Input type="number" min={0} value={f.targetPrice} onChange={(e) => set("targetPrice", e.target.value)} /></F>
          <F label="Brand"><Input value={f.brand} onChange={(e) => set("brand", e.target.value)} /></F>
          <F label="Category">
            <Select value={f.categoryId} onValueChange={(v) => set("categoryId", v)}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>{(cats.data ?? []).map((c: { id: string; name: string }) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Condition wanted">
            <Select value={f.conditionPref} onValueChange={(v) => set("conditionPref", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ANY">Any</SelectItem><SelectItem value="NEW">New only</SelectItem><SelectItem value="USED_OR_REFURBISHED">Used / refurbished</SelectItem></SelectContent>
            </Select>
          </F>
          <F label="Quotes accepted until *"><Input type="datetime-local" value={f.responseDeadline} onChange={(e) => set("responseDeadline", e.target.value)} /></F>
          <F label="Deliver to (city)"><Input value={f.deliveryCity} onChange={(e) => set("deliveryCity", e.target.value)} /></F>
          <F label="Pincode"><Input value={f.deliveryPincode} onChange={(e) => set("deliveryPincode", e.target.value)} /></F>
          <F label="Notes for sellers" className="sm:col-span-2"><Textarea rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} /></F>
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!ready || createRequirement.isPending} onClick={submit}>Post requirement</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Enter or edit a quote on behalf of a seller. */
export function AddQuoteDialog({ requirement, onClose }: { requirement: B2bRequirement | null; onClose: () => void }) {
  const vendors = useB2bVendors()
  const { addQuote } = useB2bMutations()
  const [f, setF] = useState({ seller: "", quantity: "", unitPrice: "", condition: "NEW", deliveryDays: "3", note: "" })
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }))
  if (!requirement) return null
  const sellers = (vendors.data ?? []).filter((v) => v.name !== requirement.buyer_name)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add quote for a vendor</DialogTitle><DialogDescription>{requirement.quantity_needed} × {requirement.product_name} · up to {requirement.quantity_needed} units. Saving again for the same vendor updates their quote.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Seller *" className="sm:col-span-2">
            <Select value={f.seller} onValueChange={(v) => set("seller", v)}>
              <SelectTrigger><SelectValue placeholder="Choose vendor" /></SelectTrigger>
              <SelectContent>{sellers.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Units offered *"><Input type="number" min={1} max={requirement.quantity_needed} value={f.quantity} onChange={(e) => set("quantity", e.target.value)} /></F>
          <F label="Price per unit (₹) *"><Input type="number" min={1} value={f.unitPrice} onChange={(e) => set("unitPrice", e.target.value)} /></F>
          <F label="Condition">
            <Select value={f.condition} onValueChange={(v) => set("condition", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(COND_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Delivery in (days)"><Input type="number" min={0} value={f.deliveryDays} onChange={(e) => set("deliveryDays", e.target.value)} /></F>
          <F label="Note" className="sm:col-span-2"><Textarea rows={2} value={f.note} onChange={(e) => set("note", e.target.value)} /></F>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!f.seller || !(Number(f.quantity) > 0) || !(Number(f.unitPrice) > 0) || addQuote.isPending}
            onClick={() => addQuote.mutate({ id: requirement.id, sellerVendorId: f.seller, quantity: Number(f.quantity), unitPrice: Number(f.unitPrice), condition: f.condition, deliveryDays: Number(f.deliveryDays || 0), note: f.note || undefined }, { onSuccess: onClose })}>
            Save quote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DispatchDialog({ order, onClose }: { order: B2bOrder | null; onClose: () => void }) {
  const { setOrderStatus } = useB2bMutations()
  const [courier, setCourier] = useState("Delhivery")
  const [awb, setAwb] = useState("")
  const [url, setUrl] = useState("")
  if (!order) return null
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Dispatch {order.order_number}</DialogTitle><DialogDescription>{order.seller_name} → {order.buyer_name} · {order.quantity} units</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <F label="Courier"><Select value={courier} onValueChange={setCourier}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COURIERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></F>
          <F label="Tracking number (AWB) *"><Input value={awb} onChange={(e) => setAwb(e.target.value)} /></F>
          <F label="Tracking link"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></F>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!awb.trim() || setOrderStatus.isPending} onClick={() => setOrderStatus.mutate({ id: order.id, status: "DISPATCHED", courierName: courier, awb: awb.trim(), trackingUrl: url || undefined }, { onSuccess: onClose })}>Mark dispatched</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ReceiveDialog({ order, onClose }: { order: B2bOrder | null; onClose: () => void }) {
  const { receive } = useB2bMutations()
  const [qty, setQty] = useState(order ? String(order.quantity) : "")
  const [ok, setOk] = useState(true)
  const [note, setNote] = useState("")
  if (!order) return null
  const clean = Number(qty) === order.quantity && ok
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Confirm receipt · {order.order_number}</DialogTitle><DialogDescription>Record what the buyer actually received. A clean receipt releases the money to the seller; anything else opens a dispute.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <F label={`Units received (ordered ${order.quantity})`}><Input type="number" min={0} max={order.quantity} value={qty} onChange={(e) => setQty(e.target.value)} /></F>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="h-4 w-4" />Everything received was as described and undamaged</label>
          {!clean && <F label="What went wrong *"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></F>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={receive.isPending || (!clean && !note.trim())} variant={clean ? "default" : "destructive"}
            onClick={() => receive.mutate({ id: order.id, receivedQuantity: Number(qty), ok, note: note || undefined }, { onSuccess: onClose })}>
            {clean ? "Confirm & release payment" : "Raise dispute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
