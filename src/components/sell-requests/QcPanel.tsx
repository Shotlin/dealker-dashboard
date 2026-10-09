"use client"

import { useState } from "react"
import { CheckCircle2, ClipboardCheck, RotateCcw, XCircle } from "lucide-react"
import { toast } from "sonner"
import { cn, formatINR } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fmtDateTime } from "./sell-request-ui"
import { useQcAction } from "@/hooks/useSellRequests"
import type { DeviceCondition, InspectionInput, QcStatus, RequestKind, ScreenCondition, SellRequest } from "@/services/sell-requests.service"

const STATUS_META: Record<QcStatus, { label: string; tone: string }> = {
  NOT_STARTED: { label: "QC not started", tone: "bg-muted text-muted-foreground" },
  AWAITING_EVIDENCE: { label: "Awaiting photos / video", tone: "bg-amber-100 text-amber-800" },
  EVIDENCE_UPLOADED: { label: "Evidence uploaded", tone: "bg-sky-100 text-sky-800" },
  INSPECTION_PENDING: { label: "Inspection in progress", tone: "bg-indigo-100 text-indigo-800" },
  INSPECTION_COMPLETE: { label: "Awaiting QC decision", tone: "bg-violet-100 text-violet-800" },
  PASSED: { label: "QC passed", tone: "bg-emerald-100 text-emerald-800" },
  RECHECK: { label: "Recheck needed", tone: "bg-amber-100 text-amber-800" },
  FAILED: { label: "QC failed", tone: "bg-red-100 text-red-800" },
}
const FLOW: Array<{ key: string; label: string; at: QcStatus[] }> = [
  { key: "ev", label: "Evidence", at: ["EVIDENCE_UPLOADED"] },
  { key: "in", label: "Inspection", at: ["INSPECTION_PENDING", "INSPECTION_COMPLETE"] },
  { key: "res", label: "Result", at: ["PASSED", "RECHECK", "FAILED"] },
]
const ORDER: QcStatus[] = ["NOT_STARTED", "AWAITING_EVIDENCE", "EVIDENCE_UPLOADED", "INSPECTION_PENDING", "INSPECTION_COMPLETE", "PASSED"]
const PHYSICAL: DeviceCondition[] = ["EXCELLENT", "GOOD", "FAIR", "POOR"]
const SCREEN: Array<[ScreenCondition, string]> = [["FLAWLESS", "Flawless"], ["MINOR_SCRATCHES", "Minor scratches"], ["MAJOR_SCRATCHES", "Major scratches"], ["CRACKED", "Cracked"], ["DEAD_PIXELS", "Dead pixels"]]
const CHECKS: Array<[string, string]> = [["powersOn", "Powers on"], ["touch", "Touch works"], ["camera", "Cameras work"], ["speakers", "Speakers / mic"], ["wifi", "Wi-Fi / Bluetooth"], ["charging", "Charges normally"]]
const DECISION: Record<string, string> = { NONE: "—", PENDING: "Waiting for customer", ACCEPTED: "Customer accepted", DECLINED: "Customer declined" }
const ACTION_LABEL: Record<string, string> = {
  QC_OPENED: "QC opened", EVIDENCE_UPLOADED: "Evidence uploaded", INSPECTION_STARTED: "Inspection started", INSPECTION_SUBMITTED: "Inspection submitted",
  QC_PASSED: "QC passed", QC_RECHECK: "Sent for recheck", QC_FAILED: "QC failed", QC_REOPENED: "QC reopened", CUSTOMER_ACCEPTED: "Customer accepted", CUSTOMER_DECLINED: "Customer declined",
}

function InspectionForm({ requestId, kind, imei, onDone }: { requestId: string; kind: RequestKind; imei: string; onDone: () => void }) {
  const qc = useQcAction(kind)
  const [f, setF] = useState<InspectionInput>({
    physicalCondition: "GOOD", screenCondition: "FLAWLESS", imeiVerified: true, batteryHealth: undefined, functionality: { powersOn: true, touch: true, camera: true, speakers: true }, remarks: "",
  })
  const [observed, setObserved] = useState("")
  const [battery, setBattery] = useState("")
  const submit = () => {
    if (!f.imeiVerified && !observed.trim()) return toast.error(`Enter the IMEI you saw on the device (the request says ${imei})`)
    const b = battery.trim() === "" ? undefined : Number(battery)
    if (b !== undefined && (!Number.isInteger(b) || b < 0 || b > 100)) return toast.error("Battery health must be a whole number from 0 to 100")
    qc.mutate({ type: "inspection", id: requestId, body: { ...f, batteryHealth: b, imeiObserved: observed.trim() || undefined } }, { onSuccess: onDone })
  }
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-sm font-semibold">Record inspection</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Physical condition</Label>
          <Select value={f.physicalCondition} onValueChange={(v) => setF({ ...f, physicalCondition: v as DeviceCondition })}>
            <SelectTrigger aria-label="Physical condition"><SelectValue /></SelectTrigger>
            <SelectContent>{PHYSICAL.map((c) => <SelectItem key={c} value={c}>{c[0] + c.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Screen</Label>
          <Select value={f.screenCondition} onValueChange={(v) => setF({ ...f, screenCondition: v as ScreenCondition })}>
            <SelectTrigger aria-label="Screen condition"><SelectValue /></SelectTrigger>
            <SelectContent>{SCREEN.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qc-bat">Battery health (%)</Label>
          <Input id="qc-bat" inputMode="numeric" value={battery} onChange={(e) => setBattery(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="Optional" />
        </div>
        <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
          <Label htmlFor="qc-imei" className="cursor-pointer text-sm font-normal">IMEI matches <span className="font-mono text-xs">{imei}</span></Label>
          <Switch id="qc-imei" checked={f.imeiVerified} onCheckedChange={(v) => setF({ ...f, imeiVerified: v })} />
        </div>
        {!f.imeiVerified && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="qc-seen">IMEI / serial seen on the device</Label>
            <Input id="qc-seen" value={observed} onChange={(e) => setObserved(e.target.value.replace(/[^\w-]/g, "").slice(0, 20))} />
            <p className="text-xs text-red-700">A device whose IMEI does not match cannot pass QC.</p>
          </div>
        )}
      </div>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-1 text-xs font-medium text-muted-foreground">Functional checks</legend>
        {CHECKS.map(([k, l]) => (
          <label key={k} className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm">
            <input type="checkbox" checked={!!f.functionality[k]} onChange={(e) => setF({ ...f, functionality: { ...f.functionality, [k]: e.target.checked } })} className="h-4 w-4 accent-[#4F46E5]" />
            {l}
          </label>
        ))}
      </fieldset>
      <div className="space-y-1.5">
        <Label htmlFor="qc-rem">Remarks</Label>
        <Textarea id="qc-rem" rows={2} value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} placeholder="What did you find?" />
      </div>
      <Button className="w-full" disabled={qc.isPending} onClick={submit}><ClipboardCheck /> Submit inspection</Button>
    </div>
  )
}

function DecisionForm({ r, kind }: { r: SellRequest; kind: RequestKind }) {
  const qc = useQcAction(kind)
  const [note, setNote] = useState("")
  const [value, setValue] = useState(String(r.quote))
  const go = (result: "PASSED" | "RECHECK" | "FAILED") => {
    if (result !== "PASSED" && !note.trim()) return toast.error("Add a reason so the team or customer can act on it")
    qc.mutate({ type: "decision", id: r.id, result, note: note.trim() || undefined, finalValuation: result === "PASSED" ? Number(value) : undefined })
  }
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-sm font-semibold">QC decision</p>
      <div className="space-y-1.5">
        <Label htmlFor="qc-val">Final valuation (₹) — shown to the customer</Label>
        <Input id="qc-val" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} />
        <p className="text-xs text-muted-foreground">System quote {formatINR(r.quote)}. The customer must accept this value.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="qc-note">Note (required for recheck or fail)</Label>
        <Textarea id="qc-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button disabled={qc.isPending || !Number(value) && value !== "0"} onClick={() => go("PASSED")}><CheckCircle2 /> Pass</Button>
        <Button variant="outline" disabled={qc.isPending} onClick={() => go("RECHECK")}><RotateCcw /> Recheck</Button>
        <Button variant="outline" className="border-red-300 text-red-600" disabled={qc.isPending} onClick={() => go("FAILED")}><XCircle /> Fail</Button>
      </div>
    </div>
  )
}

/** Request-level QC (not listing QC): stepper, inspection form, decision, customer outcome and history. */
export function QcPanel({ r, kind, canAct }: { r: SellRequest; kind: RequestKind; canAct: boolean }) {
  const qcq = useQcAction(kind)
  const q = r.qc ?? { status: "NOT_STARTED" as QcStatus, customerDecision: "NONE" as const, history: [] }
  const meta = STATUS_META[q.status]
  const closed = ["REJECTED", "CANCELLED", "COMPLETED"].includes(r.status)
  const [reason, setReason] = useState("")
  const [reopening, setReopening] = useState(false)
  const idx = ORDER.indexOf(q.status === "RECHECK" || q.status === "FAILED" ? "PASSED" : q.status)
  const hasMedia = (r.media?.length ?? 0) > 0
  const canStart = canAct && !closed && (q.status === "EVIDENCE_UPLOADED" || q.status === "RECHECK" || (hasMedia && (q.status === "AWAITING_EVIDENCE" || q.status === "NOT_STARTED")))

  return (
    <section aria-label="Quality check" className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Quality check</p>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", meta.tone)}>{meta.label}</span>
      </div>

      <ol className="flex items-center gap-1 text-[11px]" aria-label="QC progress">
        {FLOW.map((s, i) => {
          const done = q.status !== "NOT_STARTED" && q.status !== "AWAITING_EVIDENCE" && idx > ORDER.indexOf(s.at[s.at.length - 1])
          const here = s.at.includes(q.status) || (s.key === "res" && ["RECHECK", "FAILED"].includes(q.status))
          return (
            <li key={s.key} className="flex flex-1 items-center gap-1">
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold", done ? "border-emerald-500 bg-emerald-500 text-white" : here ? "border-brand-600 bg-brand-600 text-white" : "text-muted-foreground")}>{i + 1}</span>
              <span className={cn(here ? "font-semibold" : "text-muted-foreground")}>{s.label}</span>
              {i < FLOW.length - 1 && <span aria-hidden className="h-px flex-1 bg-border" />}
            </li>
          )
        })}
      </ol>

      {(q.status === "NOT_STARTED" || q.status === "AWAITING_EVIDENCE") && !hasMedia && <p className="text-xs text-muted-foreground">Inspection can start once the customer or QC team has added at least one photo or video.</p>}

      {canStart && <Button className="w-full" disabled={qcq.isPending} onClick={() => qcq.mutate({ type: "start", id: r.id })}><ClipboardCheck /> {q.status === "RECHECK" ? "Start recheck" : "Start inspection"}</Button>}

      {canAct && !closed && q.status === "INSPECTION_PENDING" && <InspectionForm requestId={r.id} kind={kind} imei={r.device.imei} onDone={() => undefined} />}
      {canAct && !closed && q.status === "INSPECTION_COMPLETE" && <DecisionForm r={r} kind={kind} />}

      {q.inspectedAt && (
        <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
          <dt className="text-muted-foreground">Physical</dt><dd>{q.physicalCondition ? q.physicalCondition[0] + q.physicalCondition.slice(1).toLowerCase() : "—"}</dd>
          <dt className="text-muted-foreground">Screen</dt><dd>{SCREEN.find(([v]) => v === q.screenCondition)?.[1] ?? "—"}</dd>
          <dt className="text-muted-foreground">Battery</dt><dd>{q.batteryHealth != null ? `${q.batteryHealth}%` : "—"}</dd>
          <dt className="text-muted-foreground">IMEI</dt><dd className={cn(q.imeiVerified === false && "font-medium text-red-700")}>{q.imeiVerified ? "Verified" : `Mismatch${q.imeiObserved ? ` (saw ${q.imeiObserved})` : ""}`}</dd>
          <dt className="text-muted-foreground">Checks</dt>
          <dd className="flex flex-wrap gap-1">{Object.entries(q.functionality ?? {}).map(([k, v]) => <span key={k} className={cn("rounded px-1.5 py-0.5 text-[11px]", v ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{CHECKS.find(([c]) => c === k)?.[1] ?? k}</span>)}</dd>
          {q.remarks && <><dt className="text-muted-foreground">Remarks</dt><dd className="font-normal">{q.remarks}</dd></>}
          {q.inspectorName && <><dt className="text-muted-foreground">Inspector</dt><dd>{q.inspectorName}</dd></>}
        </dl>
      )}

      {q.status === "PASSED" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm dark:bg-emerald-950/20">
          <p className="flex justify-between"><span className="text-muted-foreground">Final valuation</span><b className="tabular-nums">{q.finalValuation != null ? formatINR(q.finalValuation) : "—"}</b></p>
          <p className="flex justify-between"><span className="text-muted-foreground">Customer</span><b>{DECISION[q.customerDecision]}</b></p>
        </div>
      )}

      {canAct && !closed && (q.status === "PASSED" || q.status === "FAILED") && q.customerDecision !== "ACCEPTED" && (
        reopening ? (
          <div className="flex gap-2">
            <Input aria-label="Reason for reopening QC" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why reopen?" />
            <Button disabled={!reason.trim() || qcq.isPending} onClick={() => qcq.mutate({ type: "reopen", id: r.id, reason: reason.trim() }, { onSuccess: () => { setReopening(false); setReason("") } })}>Reopen</Button>
          </div>
        ) : <Button variant="outline" size="sm" onClick={() => setReopening(true)}><RotateCcw /> Reopen for recheck</Button>
      )}

      {q.history.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">QC history ({q.history.length})</summary>
          <ol className="mt-2 space-y-1.5">
            {q.history.map((h, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium">{ACTION_LABEL[h.action] ?? h.action}</span>
                <span className="text-muted-foreground"> · {fmtDateTime(h.at)}{h.actorName ? ` · ${h.actorName}` : h.actorRole ? ` · ${h.actorRole.toLowerCase()}` : ""}</span>
                {h.note && <p className="text-muted-foreground">“{h.note}”</p>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  )
}
