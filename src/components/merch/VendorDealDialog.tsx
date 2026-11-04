"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { campaignsApi, type CampaignInput } from "@/services/campaigns.service"
import { setVendorEntry } from "@/services/merch-sections.service"

const TIERS = [["FREE", "Any vendor"], ["PAID", "Paid plan +"], ["PREMIUM", "Premium +"], ["UNLIMITED", "Unlimited only"]] as const
const toIso = (v: string) => (v ? new Date(v).toISOString() : null)

/** Create a deal that vendors can join with their own products (a campaign opened to vendors). */
export function VendorDealDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState("")
  const [percent, setPercent] = useState("10")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [deadline, setDeadline] = useState("")
  const [tier, setTier] = useState<(typeof TIERS)[number][0]>("FREE")
  const [approval, setApproval] = useState(true)
  const [max, setMax] = useState("")

  const create = useMutation({
    mutationFn: async () => {
      const body: CampaignInput = {
        name: name.trim(), type: "FLASH_SALE", startsAt: toIso(start), endsAt: toIso(end),
        // Only the products vendors enter (and you approve) get the discount — never the whole catalogue.
        scope: { openToVendors: true } as unknown as CampaignInput["scope"],
        discount: { operation: "PERCENT", value: -Math.abs(Number(percent)) },
      }
      const deal = await campaignsApi.create(body)
      await setVendorEntry(deal.id, {
        open_to_vendors: true, min_vendor_tier: tier, require_approval: approval,
        entry_deadline: toIso(deadline), max_entries_per_vendor: max ? Number(max) : null,
      })
      return deal
    },
    onSuccess: () => {
      toast.success("Deal created and opened to vendors")
      qc.invalidateQueries({ queryKey: ["merch-deals"] })
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message || "Could not create the deal"),
  })
  const pct = Number(percent)
  const valid = name.trim().length >= 3 && pct > 0 && pct <= 90 && !!start && !!end && new Date(end) > new Date(start)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New vendor deal</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1"><Label>Deal name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Diwali Deals" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label>Discount %</Label><Input type="number" min={1} max={90} value={percent} onChange={(e) => setPercent(e.target.value)} /></div>
            <div className="space-y-1"><Label>Starts</Label><Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="space-y-1"><Label>Ends</Label><Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Vendors can join until</Label><Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
            <div className="space-y-1"><Label>Max products per vendor</Label><Input type="number" min={1} placeholder="No limit" value={max} onChange={(e) => setMax(e.target.value)} /></div>
          </div>
          <div className="space-y-1">
            <Label>Who can join</Label>
            <div className="flex flex-wrap gap-1">
              {TIERS.map(([v, label]) => (
                <button key={v} type="button" onClick={() => setTier(v)} className={`rounded-md border px-2.5 py-1.5 text-xs ${tier === v ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={approval} onChange={(e) => setApproval(e.target.checked)} />I approve each vendor product before it goes in</label>
          <p className="text-xs text-muted-foreground">The discount is taken from the vendor&apos;s own price when the deal starts, and prices go back when it ends. Start it from Campaigns once you have approved the entries, then attach it to a section.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!valid || create.isPending} onClick={() => create.mutate()}>{create.isPending ? "Creating…" : "Create deal"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
