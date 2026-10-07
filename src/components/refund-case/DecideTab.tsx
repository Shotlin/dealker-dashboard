"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Check, Lightbulb, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useCaseActions } from "@/hooks/useRefundCase"
import type { RefundCase, Verdict } from "@/types/refund-case.types"
import { DecisionButtons } from "./DecisionButtons"
import { PARTY, VERDICT, fmtDateTime, inr } from "./meta"

const GO_TAB: Record<string, "proof" | "talks" | "summary"> = {
  spoke_customer: "talks", spoke_seller: "talks", checked_customer_proof: "proof", checked_seller_proof: "proof", checked_delivery: "summary", checked_invoice: "summary",
}

export function DecideTab({ c, onGoTab }: { c: RefundCase; onGoTab: (t: "proof" | "talks" | "summary") => void }) {
  const { setCheck, patch } = useCaseActions(c.request.id)
  const locked = c.request.status !== "PENDING"
  const [findings, setFindings] = useState(c.investigation.findings)
  const [verdict, setVerdict] = useState<Verdict | null>(c.investigation.verdict)
  useEffect(() => { setFindings(c.investigation.findings); setVerdict(c.investigation.verdict) }, [c.investigation.findings, c.investigation.verdict])

  const done = c.checks.filter((k) => k.done).length
  const pct = Math.round((done / c.checks.length) * 100)
  const dirty = findings !== c.investigation.findings || verdict !== c.investigation.verdict
  const decided = c.request.status !== "PENDING"

  return (
    <div className="space-y-5">
      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-3 text-base"><span>Step 1 · Have we checked everything?</span><Badge variant="outline">{done} of {c.checks.length} done</Badge></CardTitle>
          <p className="text-sm text-muted-foreground">Tick each box once you have really done it. If something is marked “we already have this”, the proof is waiting for you.</p>
          <Progress value={pct} className="h-1.5" />
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {c.checks.map((k) => {
              const P = PARTY[k.party]
              const go = GO_TAB[k.key]
              return (
                <li key={k.key} className={cn("flex items-start gap-3 rounded-lg border p-3", k.done && "border-emerald-200 bg-emerald-50/50")}>
                  <button type="button" role="checkbox" aria-checked={k.done} aria-label={k.label} disabled={locked || setCheck.isPending}
                    onClick={() => setCheck.mutate({ key: k.key, done: !k.done })}
                    className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors disabled:opacity-60", k.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white hover:border-primary")}>
                    {k.done && <Check className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", k.done && "text-emerald-900")}>{k.label}</p>
                    <p className="text-xs text-muted-foreground">{k.help}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={cn("rounded-full border px-2 py-0.5", P.chip)}>{P.short}</span>
                      {k.done ? <span className="text-muted-foreground">Done by {k.by ?? "someone"} · {fmtDateTime(k.at)}</span>
                        : k.available ? <span className="inline-flex items-center gap-1 text-emerald-700"><Lightbulb className="h-3 w-3" />We already have this</span>
                        : <span className="text-muted-foreground">Nothing recorded yet</span>}
                    </div>
                  </div>
                  {go && !k.done && <Button size="sm" variant="ghost" className="shrink-0 text-xs" onClick={() => onGoTab(go)}>Go there<ArrowRight className="ml-1 h-3 w-3" /></Button>}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Step 2 · What did we find?</CardTitle>
          <p className="text-sm text-muted-foreground">Write it so a stranger can understand it a year from now. Then pick who was right.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea rows={5} value={findings} disabled={locked} onChange={(e) => setFindings(e.target.value)}
            placeholder="e.g. The seller’s packing video shows the phone was fine. The customer’s photos show a cracked screen with a courier dent on the box, so it broke during delivery." />
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(VERDICT) as Verdict[]).map((v) => {
              const V = VERDICT[v]
              return (
                <button key={v} type="button" disabled={locked} onClick={() => setVerdict(verdict === v ? null : v)}
                  className={cn("flex items-start gap-2.5 rounded-lg border-2 p-3 text-left transition-colors disabled:opacity-70", verdict === v ? V.tone : "border-border hover:bg-muted/40")}>
                  <V.icon className="mt-0.5 h-4 w-4 shrink-0" /><span><span className="block text-sm font-medium">{V.label}</span><span className="block text-xs opacity-80">{V.help}</span></span>
                </button>
              )
            })}
          </div>
          {!locked && <Button disabled={!dirty || patch.isPending} onClick={() => patch.mutate({ findings, verdict })}><Save className="mr-1.5 h-4 w-4" />Save what we found</Button>}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-3"><CardTitle className="text-base">Step 3 · Decide</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {decided ? (
            <p className="rounded-lg border bg-muted/40 p-4 text-sm">
              {c.request.status === "APPROVED" && <>This refund was <b>approved</b> by {c.request.resolved_by ?? "our team"} on {fmtDateTime(c.request.resolved_at)}. {inr(c.request.amount)} went {c.request.refund_to === "wallet" ? "to the customer’s wallet" : "back to the original payment method"}.</>}
              {c.request.status === "REJECTED" && <>This refund was <b>rejected</b> by {c.request.resolved_by ?? "our team"} on {fmtDateTime(c.request.resolved_at)}.</>}
              {c.request.status === "CANCELLED" && <>The customer cancelled this request.</>}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Approving sends <b>{inr(c.request.claimed_amount)}</b> to the customer and takes the seller’s share back. Rejecting sends the customer a message and closes the case.</p>
              {c.investigation.verdict && <p className="text-sm">Your findings say: <b>{VERDICT[c.investigation.verdict].label}</b>.</p>}
              <DecisionButtons c={c} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
