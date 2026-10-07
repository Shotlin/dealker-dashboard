"use client"

import { useState } from "react"
import { AlertTriangle, Ban, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useApproveRefundRequest, useRejectRefundRequest } from "@/hooks/useRefundRequests"
import { cn } from "@/lib/utils"
import type { RefundCase } from "@/types/refund-case.types"
import { inr } from "./meta"

/** Approve / Reject buttons plus the "are you sure?" steps. Used in the header and on the Decide tab. */
export function DecisionButtons({ c, size = "default", className }: { c: RefundCase; size?: "default" | "sm"; className?: string }) {
  const r = c.request
  const approve = useApproveRefundRequest()
  const reject = useRejectRefundRequest()
  const [mode, setMode] = useState<"approve" | "reject" | null>(null)
  const [sure, setSure] = useState(false)
  const [dest, setDest] = useState<"wallet" | "original">(r.preferred_destination)
  const [note, setNote] = useState("")

  if (r.status !== "PENDING") return null
  const missing = c.checks.filter((k) => !k.done)
  const close = () => { setMode(null); setSure(false); setNote("") }

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        <Button size={size} variant="outline" onClick={() => setMode("reject")}><Ban className="mr-1.5 h-4 w-4" />Reject refund</Button>
        <Button size={size} onClick={() => { setDest(r.preferred_destination); setMode("approve") }}><Check className="mr-1.5 h-4 w-4" />Approve refund</Button>
      </div>

      <Dialog open={mode === "approve"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve this refund</DialogTitle>
            <DialogDescription>Order {r.order.number} · {r.customer.name ?? "customer"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Money going back to the customer</p>
              <p className="text-2xl font-semibold tabular-nums">{inr(r.claimed_amount)}</p>
              <p className="text-xs text-muted-foreground">{r.scope === "ALL" ? "The full amount they paid." : "Only the items they asked to return."} The amount is worked out by the system and can’t be edited.</p>
            </div>
            {missing.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="flex items-center gap-1.5 font-medium"><AlertTriangle className="h-4 w-4" />{missing.length} check{missing.length === 1 ? " is" : "s are"} not ticked yet</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">{missing.slice(0, 4).map((m) => <li key={m.key}>{m.label}</li>)}{missing.length > 4 && <li>and {missing.length - 4} more</li>}</ul>
                <p className="mt-1 text-xs">You can still approve, but it is safer to finish them first.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Where should the money go?</Label>
              <RadioGroup value={dest} onValueChange={(v) => setDest(v as "wallet" | "original")} className="gap-2">
                {[
                  { v: "wallet", t: "Customer’s Dealker wallet", d: "Arrives instantly." },
                  { v: "original", t: "Original payment method", d: "Takes 5–7 working days." },
                ].map((o) => (
                  <label key={o.v} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3", dest === o.v && "border-primary bg-primary/5")}>
                    <RadioGroupItem value={o.v} className="mt-0.5" />
                    <span><span className="block text-sm font-medium">{o.t}</span><span className="block text-xs text-muted-foreground">{o.d}</span></span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-1.5">
              <Label>Note for the case file (optional)</Label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why are you approving this?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button onClick={() => setSure(true)}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={mode === "approve" && sure} onOpenChange={setSure}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send {inr(r.claimed_amount)} to the customer?</AlertDialogTitle>
            <AlertDialogDescription>
              Money moves right away to {dest === "wallet" ? "the customer’s wallet" : "their original payment method"}, and the seller’s earnings for these items are taken back. This cannot be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, go back</AlertDialogCancel>
            <AlertDialogAction disabled={approve.isPending} onClick={() => approve.mutate({ id: r.id, payload: { refundTo: dest, ...(note.trim() ? { note: note.trim() } : {}) } }, { onSuccess: close })}>
              Yes, approve refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={mode === "reject"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject this refund</DialogTitle>
            <DialogDescription>No money will move. The customer is told the request was not approved.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Message to the customer — say why</Label>
            <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: The photos show the item is in the same condition the seller packed it in." />
          </div>
          {c.investigation.verdict === "CUSTOMER_RIGHT" && (
            <p className="flex items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Your own findings say the customer is right. Please double-check before rejecting.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button variant="destructive" disabled={reject.isPending} onClick={() => setSure(true)}>Reject refund</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={mode === "reject" && sure} onOpenChange={setSure}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this refund request?</AlertDialogTitle>
            <AlertDialogDescription>The customer will be told it was not approved{note.trim() ? ", along with your message" : ""}. The case will be closed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, go back</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => reject.mutate({ id: r.id, payload: { adminNote: note.trim() || undefined } }, { onSuccess: close })}>
              Yes, reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
