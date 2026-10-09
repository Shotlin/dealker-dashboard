"use client"

import { useState } from "react"
import { BadgeCheck, CircleAlert, Play, Plus, ShieldX } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EvidenceUploader } from "./EvidenceUploader"
import { useAttachEvidence, useVerifyEvidence } from "@/hooks/useSellRequests"
import { evidenceApi, mediaSrc, type EvidenceMedia, type EvidenceStage, type RequestKind, type SellRequest } from "@/services/sell-requests.service"

export const STAGE_LABEL: Record<EvidenceStage, string> = {
  CUSTOMER_SUBMISSION: "Customer submission",
  PICKUP_INSPECTION: "Pickup inspection",
  TECHNICIAN_QC: "Technician QC",
  FINAL_QC: "Final QC",
  DISPUTE: "Dispute",
}
const STAGES = Object.keys(STAGE_LABEL) as EvidenceStage[]

function VerifyBadge({ m }: { m: EvidenceMedia }) {
  if (m.verification.status === "VERIFIED") return <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-700"><BadgeCheck className="h-3 w-3" aria-hidden />Verified</span>
  if (m.verification.status === "REJECTED") return <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-red-700"><ShieldX className="h-3 w-3" aria-hidden />Rejected</span>
  return <span className="text-[11px] text-muted-foreground">Unreviewed</span>
}

/** Photos + videos for a request: view, add (staff), and verify / reject (QC staff). */
export function EvidenceSection({ r, kind, canAdd, canReview }: { r: SellRequest; kind: RequestKind; canAdd: boolean; canReview: boolean }) {
  const media = r.media ?? []
  const legacy = r.images ?? []
  const [view, setView] = useState<{ m: EvidenceMedia; src: string } | null>(null)
  const [retried, setRetried] = useState(false)
  const [adding, setAdding] = useState(false)
  const [stage, setStage] = useState<EvidenceStage>("TECHNICIAN_QC")
  const [staged, setStaged] = useState<EvidenceMedia[]>([])
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")
  const attach = useAttachEvidence(kind)
  const verify = useVerifyEvidence(kind)

  const open = (m: EvidenceMedia) => { setRetried(false); setView({ m, src: mediaSrc(m.url) }) }
  // A link older than 30 minutes is refused; mint a fresh one once instead of showing a broken player.
  const onMediaError = async () => {
    if (!view || retried) return toast.error("This file could not be loaded")
    setRetried(true)
    try { const fresh = await evidenceApi(kind).link(view.m.id); setView({ m: fresh, src: mediaSrc(fresh.url) }) } catch { toast.error("This file could not be loaded") }
  }
  const byStage = STAGES.map((s) => [s, media.filter((m) => m.stage === s)] as const).filter(([, l]) => l.length)
  const total = media.length + legacy.length

  const submitAdd = () => {
    attach.mutate({ id: r.id, mediaIds: staged.map((m) => m.id), stage }, { onSuccess: () => { setAdding(false); setStaged([]) } })
  }
  const doVerify = (m: EvidenceMedia, status: "VERIFIED" | "REJECTED", note?: string) =>
    verify.mutate({ mediaId: m.id, status, note }, { onSuccess: () => { setView(null); setRejecting(false); setReason("") } })

  return (
    <section aria-label="Evidence" className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Photos &amp; video {total > 0 && <span className="font-normal text-muted-foreground">({r.imageCount} photo{r.imageCount === 1 ? "" : "s"}, {r.videoCount ?? 0} video{(r.videoCount ?? 0) === 1 ? "" : "s"})</span>}</p>
        {canAdd && <Button size="sm" variant="outline" className="h-7" onClick={() => setAdding(true)}><Plus /> Add evidence</Button>}
      </div>

      {total === 0 && <p className="text-xs text-muted-foreground">No photos or video were uploaded for this request.</p>}

      {byStage.map(([s, list]) => (
        <div key={s}>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{STAGE_LABEL[s]}</p>
          <div className="flex flex-wrap gap-2">
            {list.map((m) => (
              <button key={m.id} type="button" onClick={() => open(m)} aria-label={`Open ${m.mediaType === "VIDEO" ? "video" : "photo"} ${m.filename}`}
                className={cn("relative h-16 w-16 overflow-hidden rounded-lg border bg-muted focus-visible:ring-2 focus-visible:ring-ring", m.verification.status === "REJECTED" && "border-red-400 opacity-70")}>
                {m.mediaType === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaSrc(m.url)} alt={m.filename} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <>
                    <video src={mediaSrc(m.url)} preload="metadata" muted className="h-full w-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30"><Play className="h-5 w-5 fill-white text-white" aria-hidden /></span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {legacy.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Earlier uploads</p>
          <div className="flex flex-wrap gap-2">
            {legacy.map((u, i) => (
              <a key={u} href={u} target="_blank" rel="noreferrer" aria-label={`Open earlier photo ${i + 1}`} className="h-16 w-16 overflow-hidden rounded-lg border focus-visible:ring-2 focus-visible:ring-ring">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`${r.device.model} earlier photo ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!view} onOpenChange={(o) => { if (!o) { setView(null); setRejecting(false); setReason("") } }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{view?.m.filename}</DialogTitle>
            <DialogDescription>
              {view && <>{STAGE_LABEL[view.m.stage]} · added by {view.m.uploadedByRole.toLowerCase()} · <VerifyBadge m={view.m} />{view.m.verification.note && <> — {view.m.verification.note}</>}</>}
            </DialogDescription>
          </DialogHeader>
          {view && (view.m.mediaType === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={view.src} alt={view.m.filename} onError={onMediaError} className="max-h-[65vh] w-full rounded-lg object-contain" />
          ) : (
            <video key={view.src} src={view.src} controls preload="metadata" onError={onMediaError} className="max-h-[65vh] w-full rounded-lg bg-black" />
          ))}
          {canReview && view && (
            <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
              {rejecting ? (
                <div className="flex gap-2">
                  <Input aria-label="Reason for rejecting this file" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this file not acceptable?" />
                  <Button variant="destructive" disabled={!reason.trim() || verify.isPending} onClick={() => doVerify(view.m, "REJECTED", reason.trim())}>Reject file</Button>
                  <Button variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="border-red-300 text-red-600" disabled={verify.isPending} onClick={() => setRejecting(true)}><CircleAlert /> Reject</Button>
                  <Button disabled={verify.isPending || view.m.verification.status === "VERIFIED"} onClick={() => doVerify(view.m, "VERIFIED")}><BadgeCheck /> Mark verified</Button>
                </div>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={adding} onOpenChange={(o) => { if (!o) { setAdding(false); setStaged([]) } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add evidence</DialogTitle>
            <DialogDescription>Inspection photos and videos stay with this request permanently, even after it is closed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Stage</p>
            <Select value={stage} onValueChange={(v) => setStage(v as EvidenceStage)}>
              <SelectTrigger aria-label="Evidence stage"><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <EvidenceUploader key={String(adding)} kind={kind} onChange={setStaged} onBusyChange={setBusy} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button disabled={!staged.length || busy || attach.isPending} onClick={submitAdd}>{busy ? "Uploading…" : attach.isPending ? "Saving…" : `Attach ${staged.length || ""} file${staged.length === 1 ? "" : "s"}`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
