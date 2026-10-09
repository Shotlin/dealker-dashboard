"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMerchActions } from "@/hooks/useMerchandising"
import { SECTION_LABELS } from "@/services/merchandising.service"
import type { SectionKey } from "@/services/merchandising.service"

const WINDOWED: Array<SectionKey | ""> = ["DEAL_OF_THE_DAY", "CLEARANCE_SALE", "FLASH_SALE"]
const NONE = "none"

/** Move listings into a section (or out of every section). Deals can have an end time. */
export function MoveSectionDialog({ open, ids, initial, onOpenChange, onDone }: {
  open: boolean
  ids: string[]
  initial?: SectionKey | null
  onOpenChange: (o: boolean) => void
  onDone?: () => void
}) {
  const { move } = useMerchActions()
  const [section, setSection] = useState<string>(initial ?? "NEW_ARRIVAL")
  const [endsAt, setEndsAt] = useState("")

  useEffect(() => { if (open) { setSection(initial ?? "NEW_ARRIVAL"); setEndsAt("") } }, [open, initial])

  const windowed = WINDOWED.includes(section as SectionKey)
  const endIso = endsAt ? new Date(endsAt).toISOString() : undefined
  const endInPast = !!endsAt && new Date(endsAt).getTime() <= Date.now()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move {ids.length} product{ids.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>A product sits in one section at a time — moving it replaces its current section.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label className="text-xs">Section</Label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(SECTION_LABELS) as SectionKey[]).map((k) => <SelectItem key={k} value={k}>{SECTION_LABELS[k]}</SelectItem>)}
                <SelectItem value={NONE}>Remove from every section</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {windowed && (
            <div className="space-y-1">
              <Label className="text-xs">Ends at (optional)</Label>
              <Input className="h-9" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              {endInPast ? <p className="text-xs text-red-600">Pick a time in the future</p>
                : <p className="text-xs text-muted-foreground">After this time the product disappears from the section on its own.</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={move.isPending || endInPast || ids.length === 0}
            onClick={() => move.mutate(
              { ids, section: section === NONE ? null : (section as SectionKey), endsAt: windowed ? endIso : undefined },
              { onSuccess: () => { onOpenChange(false); onDone?.() } },
            )}>
            {move.isPending ? "Moving…" : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
