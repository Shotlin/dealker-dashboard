"use client"

import { useRef, useState } from "react"
import { Headphones, Loader2, PhoneIncoming, PhoneOutgoing, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useCaseActions } from "@/hooks/useRefundCase"
import { uploadEvidenceFile } from "@/services/refund-case.service"
import type { Party, RefundCase } from "@/types/refund-case.types"
import { PARTY } from "./meta"

type CallParty = Exclude<Party, "TEAM">

export function LogCallDialog({ c, open, onOpenChange, defaultParty = "CUSTOMER" }: { c: RefundCase; open: boolean; onOpenChange: (o: boolean) => void; defaultParty?: CallParty }) {
  const { call } = useCaseActions(c.request.id)
  const [party, setParty] = useState<CallParty>(defaultParty)
  const [direction, setDirection] = useState<"OUTGOING" | "INCOMING">("OUTGOING")
  const [outcome, setOutcome] = useState<"SPOKE" | "NO_ANSWER">("SPOKE")
  const [person, setPerson] = useState("")
  const [minutes, setMinutes] = useState("")
  const [summary, setSummary] = useState("")
  const [rec, setRec] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const who = party === "SELLER" ? c.sellers[0]?.name : c.request.customer.name
  const reset = () => { setPerson(""); setMinutes(""); setSummary(""); setRec(null); setOutcome("SPOKE"); setDirection("OUTGOING") }

  const save = async () => {
    setBusy(true)
    try {
      const recordingUrl = rec ? (await uploadEvidenceFile(rec)).url : undefined
      await call.mutateAsync({
        party, direction, outcome, summary: summary.trim(), recordingUrl,
        person: person.trim() || undefined, minutes: minutes ? Math.max(0, Math.round(Number(minutes))) : undefined,
      })
      reset()
      onOpenChange(false)
    } catch (e) {
      if (!(e as { response?: unknown })?.response) toast.error("Could not upload the recording. Try a smaller file.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Write down a phone call</DialogTitle>
          <DialogDescription>Record who you spoke to and what they said. It goes on the timeline with your name and the time.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Who did you talk to?</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["CUSTOMER", "SELLER", "COURIER"] as const).map((p) => {
                const P = PARTY[p]
                return <button key={p} type="button" onClick={() => setParty(p)} className={cn("flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm", party === p ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted/50")}><P.icon className="h-4 w-4" />{P.short}</button>
              })}
            </div>
            {who && <p className="text-xs text-muted-foreground">{who}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {([["OUTGOING", "We called them", PhoneOutgoing], ["INCOMING", "They called us", PhoneIncoming]] as const).map(([v, label, Icon]) => (
              <button key={v} type="button" onClick={() => setDirection(v)} className={cn("flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm", direction === v ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted/50")}><Icon className="h-4 w-4" />{label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([["SPOKE", "We spoke"], ["NO_ANSWER", "No answer"]] as const).map(([v, label]) => (
              <button key={v} type="button" onClick={() => setOutcome(v)} className={cn("rounded-lg border py-2 text-sm", outcome === v ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted/50")}>{label}</button>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_110px] gap-3">
            <div className="space-y-1.5"><Label htmlFor="call-person">Person’s name (optional)</Label><Input id="call-person" value={person} onChange={(e) => setPerson(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="call-min">Minutes</Label><Input id="call-min" type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} /></div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="call-summary">{outcome === "NO_ANSWER" ? "Anything to remember?" : "What did they say?"}</Label>
            <Textarea id="call-summary" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)}
              placeholder={outcome === "NO_ANSWER" ? "e.g. Phone was switched off. Will try again tomorrow." : "e.g. Customer says the box was already open when it arrived. Seller says it was sealed."} />
          </div>

          <div>
            <input ref={fileRef} type="file" hidden accept="audio/*,video/*" onChange={(e) => setRec(e.target.files?.[0] ?? null)} />
            {rec ? (
              <div className="flex items-center justify-between rounded-lg border p-2.5 text-sm"><span className="flex min-w-0 items-center gap-2"><Headphones className="h-4 w-4 shrink-0" /><span className="truncate">{rec.name}</span></span><button type="button" aria-label="Remove recording" onClick={() => setRec(null)}><X className="h-4 w-4" /></button></div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Headphones className="mr-1.5 h-4 w-4" />Attach call recording (optional)</Button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy || summary.trim().length < 3} onClick={save}>{busy ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving…</> : "Save to timeline"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function NoteDialog({ caseId, open, onOpenChange }: { caseId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { note } = useCaseActions(caseId)
  const [body, setBody] = useState("")
  const [party, setParty] = useState<Party>("TEAM")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a private note</DialogTitle>
          <DialogDescription>Only our team can see this. Use it for anything worth remembering.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(["TEAM", "CUSTOMER", "SELLER", "COURIER"] as const).map((p) => <button key={p} type="button" onClick={() => setParty(p)} className={cn("rounded-full border px-3 py-1 text-xs", party === p ? "border-primary bg-primary/5 font-medium" : "text-muted-foreground")}>{p === "TEAM" ? "General" : `About the ${PARTY[p].short.toLowerCase()}`}</button>)}
          </div>
          <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your note…" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!body.trim() || note.isPending} onClick={() => note.mutate({ body: body.trim(), party }, { onSuccess: () => { setBody(""); onOpenChange(false) } })}>Save note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
