"use client"

import { useRef, useState } from "react"
import { Link2, Loader2, UploadCloud, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useCaseActions } from "@/hooks/useRefundCase"
import { uploadEvidenceFile } from "@/services/refund-case.service"
import type { EvidenceKind, Party } from "@/types/refund-case.types"
import { KIND, PARTY } from "./meta"

const SIDES: { v: Party; hint: string }[] = [
  { v: "CUSTOMER", hint: "Photos or videos the customer sent us" },
  { v: "SELLER", hint: "Proof the seller gave us" },
  { v: "COURIER", hint: "Delivery partner’s proof" },
  { v: "TEAM", hint: "Something our team found or made" },
]

export function AddProofDialog({ caseId, open, onOpenChange, defaultSide = "CUSTOMER" }: { caseId: string; open: boolean; onOpenChange: (o: boolean) => void; defaultSide?: Party }) {
  const { addEvidence } = useCaseActions(caseId)
  const [side, setSide] = useState<Party>(defaultSide)
  const [mode, setMode] = useState<"file" | "link">("file")
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState("")
  const [kind, setKind] = useState<EvidenceKind>("IMAGE")
  const [title, setTitle] = useState("")
  const [note, setNote] = useState("")
  const [progress, setProgress] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const reset = () => { setFile(null); setUrl(""); setTitle(""); setNote(""); setProgress(null); setMode("file"); setKind("IMAGE") }
  const busy = progress !== null || addEvidence.isPending
  const ready = (mode === "file" ? Boolean(file) : url.trim().length > 3) && title.trim().length > 1

  const pick = (f: File | null) => {
    setFile(f)
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "))
  }

  const save = async () => {
    try {
      let finalUrl = url.trim()
      let finalKind = kind
      if (mode === "file" && file) {
        setProgress(0)
        const up = await uploadEvidenceFile(file, setProgress)
        finalUrl = up.url
        finalKind = up.kind
      }
      await addEvidence.mutateAsync({ side, kind: finalKind, url: finalUrl, title: title.trim(), note: note.trim() || undefined })
      reset()
      onOpenChange(false)
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || "Could not upload that file. Check its size and type, then try again.")
    } finally {
      setProgress(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) { onOpenChange(o); if (!o) reset() } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add proof to this case</DialogTitle>
          <DialogDescription>Photos, videos, call recordings, invoices — anything that helps us find out what really happened.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Who is this proof from?</Label>
            <div className="grid grid-cols-2 gap-2">
              {SIDES.map(({ v, hint }) => {
                const P = PARTY[v]
                return (
                  <button key={v} type="button" onClick={() => setSide(v)} className={cn("flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors", side === v ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
                    <P.icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span><span className="block text-sm font-medium">{P.short}</span><span className="block text-[11px] leading-tight text-muted-foreground">{hint}</span></span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
              {([["file", "Upload a file", UploadCloud], ["link", "Paste a link", Link2]] as const).map(([m, label, Icon]) => (
                <button key={m} type="button" onClick={() => setMode(m)} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5", mode === m ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}><Icon className="h-3.5 w-3.5" />{label}</button>
              ))}
            </div>
            {mode === "file" ? (
              <div>
                <input ref={input} type="file" hidden accept="image/*,video/*,audio/*,application/pdf" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
                {file ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                    <span className="min-w-0 truncate">{file.name} <span className="text-xs text-muted-foreground">({(file.size / 1048576).toFixed(1)} MB)</span></span>
                    {!busy && <button type="button" onClick={() => { setFile(null); if (input.current) input.current.value = "" }} aria-label="Remove file"><X className="h-4 w-4" /></button>}
                  </div>
                ) : (
                  <button type="button" onClick={() => input.current?.click()} className="flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-sm text-muted-foreground hover:bg-muted/40">
                    <UploadCloud className="h-6 w-6" />Click to choose a photo, video, recording or PDF
                  </button>
                )}
                {progress !== null && <Progress value={progress} className="mt-2 h-1.5" />}
              </div>
            ) : (
              <div className="space-y-2">
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(KIND) as EvidenceKind[]).map((k) => {
                    const K = KIND[k]
                    return <button key={k} type="button" onClick={() => setKind(k)} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs", kind === k ? "border-primary bg-primary/5 font-medium" : "text-muted-foreground")}><K.icon className="h-3 w-3" />{K.label}</button>
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proof-title">What is this?</Label>
            <Input id="proof-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Photo of the cracked screen" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proof-note">Anything we should know? (optional)</Label>
            <Textarea id="proof-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Customer sent this on WhatsApp after our call" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!ready || busy} onClick={save}>{busy ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving…</> : "Add proof"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
