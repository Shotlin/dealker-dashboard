"use client"

/**
 * Create / edit a campaign: type, name, when it runs, which products take
 * part, and the discount (or the coupon it promotes). "Preview" shows what the
 * discount would do right now, with the same safety skips as price control.
 */

import { useEffect, useMemo, useState } from "react"
import { PreviewTable } from "@/components/pricing/PreviewTable"
import { ScopePicker, scopeIsEmpty } from "@/components/pricing/ScopePicker"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCampaignActions } from "@/hooks/useCampaigns"
import { useCoupons } from "@/hooks/useCoupons"
import { CAMPAIGN_TYPE_LABEL } from "@/services/campaigns.service"
import type { CampaignDetail, CampaignInput, CampaignType } from "@/services/campaigns.service"
import type { Preview, PricingScope } from "@/services/pricing.service"

type Mode = "PERCENT" | "FIXED" | "DISCOUNT_FROM_MRP"
const TYPES = Object.keys(CAMPAIGN_TYPE_LABEL) as CampaignType[]
const NEEDS_DISCOUNT: CampaignType[] = ["DISCOUNT", "FLASH_SALE", "DEAL_OF_THE_DAY", "CLEARANCE_SALE"]

/** Local datetime-local string ⇄ ISO. */
const toLocal = (iso?: string | null) => {
  if (!iso) return ""
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const toIso = (local: string) => (local ? new Date(local).toISOString() : null)

export function CampaignForm({ open, onOpenChange, existing }: { open: boolean; onOpenChange: (o: boolean) => void; existing?: CampaignDetail | null }) {
  const actions = useCampaignActions()
  const coupons = useCoupons({}, { shopScoped: false, fetchAll: true })
  const [type, setType] = useState<CampaignType>("FLASH_SALE")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [scope, setScope] = useState<PricingScope>({})
  const [mode, setMode] = useState<Mode>("PERCENT")
  const [amount, setAmount] = useState("10")
  const [couponId, setCouponId] = useState("")
  const [preview, setPreview] = useState<Preview | null>(null)

  useEffect(() => {
    if (!open) return
    setPreview(null)
    if (existing) {
      setType(existing.type); setName(existing.name); setDescription(existing.description ?? "")
      setStartsAt(toLocal(existing.starts_at)); setEndsAt(toLocal(existing.ends_at)); setScope(existing.scope ?? {})
      setMode((existing.discount?.operation as Mode) ?? "PERCENT"); setAmount(existing.discount ? String(Math.abs(existing.discount.value)) : "10")
      setCouponId(existing.coupon_id ?? "")
    } else {
      setType("FLASH_SALE"); setName(""); setDescription(""); setStartsAt(""); setEndsAt(""); setScope({}); setMode("PERCENT"); setAmount("10"); setCouponId("")
    }
  }, [open, existing])

  const isCoupon = type === "COUPON"
  const body = useMemo<CampaignInput>(() => ({
    name, type, description: description || undefined, startsAt: toIso(startsAt), endsAt: toIso(endsAt),
    scope: isCoupon ? {} : scope,
    discount: isCoupon ? null : { operation: mode, value: mode === "DISCOUNT_FROM_MRP" ? Number(amount) : -Math.abs(Number(amount)) },
    couponId: isCoupon ? couponId || null : null,
  }), [name, type, description, startsAt, endsAt, scope, mode, amount, couponId, isCoupon])
  useEffect(() => { setPreview(null) }, [body])

  const amountOk = Number(amount) > 0 && (mode !== "PERCENT" || Number(amount) <= 90) && (mode !== "DISCOUNT_FROM_MRP" || Number(amount) <= 95)
  const baseOk = name.trim().length >= 3 && (isCoupon ? !!couponId : !scopeIsEmpty(scope) && amountOk)
  const windowOk = !startsAt || !endsAt || new Date(endsAt) > new Date(startsAt)
  const unit = mode === "FIXED" ? "₹" : "%"

  const save = (andSchedule: boolean) => {
    const done = (c: CampaignDetail) => { if (andSchedule) actions.schedule.mutate(c.id); onOpenChange(false) }
    if (existing) actions.update.mutate({ id: existing.id, body }, { onSuccess: done })
    else actions.create.mutate(body, { onSuccess: done })
  }
  const busy = actions.create.isPending || actions.update.isPending || actions.schedule.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit campaign" : "New campaign"}</DialogTitle>
          <DialogDescription>When it starts, the discount is applied and products join the section; when it ends everything is put back.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[62vh] pr-3">
          <div className="space-y-4 py-1">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as CampaignType)} disabled={!!existing}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{CAMPAIGN_TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Name *</Label><Input className="h-9" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali flash sale" /></div>
              <div className="space-y-1"><Label className="text-xs">Starts</Label><Input className="h-9" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Ends</Label><Input className="h-9" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                {!windowOk && <p className="text-xs text-red-600">The end must be after the start</p>}</div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>

            {isCoupon ? (
              <div className="space-y-1">
                <Label className="text-xs">Coupon to promote *</Label>
                <Select value={couponId || "none"} onValueChange={(v) => setCouponId(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose a coupon…</SelectItem>
                    {(coupons.data?.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">No prices change. The campaign reports how often the coupon was used while it ran.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Which products take part *</Label>
                  <ScopePicker value={scope} onChange={setScope} />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Discount type</Label>
                    <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENT">% off the current price</SelectItem>
                        <SelectItem value="FIXED">₹ off the current price</SelectItem>
                        <SelectItem value="DISCOUNT_FROM_MRP">% off the MRP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">How much ({unit}) {NEEDS_DISCOUNT.includes(type) ? "*" : ""}</Label>
                    <Input className="h-9" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    {!amountOk && <p className="text-xs text-red-600">Enter a positive amount ({mode === "PERCENT" ? "up to 90" : mode === "DISCOUNT_FROM_MRP" ? "up to 95" : "in ₹"})</p>}
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" className="h-9" disabled={!baseOk || actions.preview.isPending}
                      onClick={() => actions.preview.mutate(body, { onSuccess: setPreview })}>
                      {actions.preview.isPending ? "Checking…" : "Preview discount"}
                    </Button>
                  </div>
                </div>
                {preview && <PreviewTable preview={preview} />}
              </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" disabled={!baseOk || !windowOk || busy} onClick={() => save(false)}>Save draft</Button>
          <Button disabled={!baseOk || !windowOk || !startsAt || !endsAt || busy} onClick={() => save(true)}>Save & schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
