"use client"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SellRequestDetailPanel } from "./SellRequestDetailPanel"

/** The sell request detail panel in a side sheet (used from the payouts queue). */
export function SellRequestDetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  return (
    <Sheet open={!!id} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="sr-only"><SheetTitle>Sell request</SheetTitle><SheetDescription>Sell request details and actions</SheetDescription></SheetHeader>
        {id && <SellRequestDetailPanel id={id} kind="SELL" />}
      </SheetContent>
    </Sheet>
  )
}
