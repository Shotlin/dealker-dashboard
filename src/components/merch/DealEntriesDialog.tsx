"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ImageOff } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatINR } from "@/lib/utils"
import { decideDealEntries, getDealEntries, setVendorEntry, type DealRow } from "@/services/merch-sections.service"

/** Approve or reject the products vendors entered into a deal. Locked once the deal starts. */
export function DealEntriesDialog({ deal, onClose }: { deal: DealRow | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [picked, setPicked] = useState<string[]>([])
  const open = !!deal
  const locked = deal ? !["DRAFT", "SCHEDULED"].includes(deal.status) : true
  const q = useQuery({ queryKey: ["merch-deal-entries", deal?.id], queryFn: () => getDealEntries(deal!.id), enabled: open })
  const refresh = () => { qc.invalidateQueries({ queryKey: ["merch-deal-entries", deal?.id] }); qc.invalidateQueries({ queryKey: ["merch-deals"] }) }
  const decide = useMutation({
    mutationFn: (d: "APPROVED" | "REJECTED") => decideDealEntries(deal!.id, picked, d),
    onSuccess: () => { setPicked([]); refresh() },
    onError: (e: Error) => toast.error(e.message || "Could not save"),
  })
  const toggleOpen = useMutation({
    mutationFn: () => setVendorEntry(deal!.id, { open_to_vendors: !deal!.open_to_vendors, min_vendor_tier: deal!.min_vendor_tier, require_approval: deal!.require_approval, entry_deadline: deal!.entry_deadline, max_entries_per_vendor: deal!.max_entries_per_vendor }),
    onSuccess: () => { refresh(); onClose() },
    onError: (e: Error) => toast.error(e.message || "Could not save"),
  })
  const rows = q.data ?? []
  const toggle = (id: string) => setPicked((x) => (x.includes(id) ? x.filter((i) => i !== id) : [...x, id]))

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPicked([]); onClose() } }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Vendor entries — {deal?.name}</DialogTitle></DialogHeader>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{deal?.open_to_vendors ? `Open to vendors (${deal.min_vendor_tier.toLowerCase()} plan or higher${deal.max_entries_per_vendor ? `, max ${deal.max_entries_per_vendor} each` : ""})` : "Closed to vendors"}</span>
          {!locked && <Button size="sm" variant="outline" className="ml-auto" disabled={toggleOpen.isPending} onClick={() => toggleOpen.mutate()}>{deal?.open_to_vendors ? "Close to vendors" : "Open to vendors"}</Button>}
        </div>
        {locked && <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">This deal has started, so entries are locked.</p>}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{picked.length} selected</span>
          <Button size="sm" disabled={locked || !picked.length || decide.isPending} onClick={() => decide.mutate("APPROVED")}>Approve</Button>
          <Button size="sm" variant="outline" disabled={locked || !picked.length || decide.isPending} onClick={() => decide.mutate("REJECTED")}>Reject</Button>
        </div>
        <div className="max-h-96 divide-y overflow-y-auto rounded-lg border">
          {q.isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
          {!q.isLoading && rows.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No vendor has entered a product yet.</p>}
          {rows.map((e) => (
            <label key={e.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
              <Checkbox checked={picked.includes(e.id)} disabled={locked} onCheckedChange={() => toggle(e.id)} />
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {e.thumbnail_url ? <img src={e.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <ImageOff className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{e.product_name}</p><p className="truncate text-xs text-muted-foreground">{e.vendor_name} · stock {e.stock_quantity}</p>
                {e.busy_in && <p className="truncate text-xs text-amber-600">Already in the live deal “{e.busy_in}” — it will not get this discount.</p>}</div>
              <span className="text-sm tabular-nums">{formatINR(Number(e.sale_price ?? e.price))}</span>
              <Badge variant={e.status === "APPROVED" ? "default" : "outline"} className={e.status === "REJECTED" ? "text-red-600" : ""}>{e.status.toLowerCase()}</Badge>
            </label>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
