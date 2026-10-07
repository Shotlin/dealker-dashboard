"use client"

import Link from "next/link"
import { useState } from "react"
import { CalendarClock, ExternalLink, ImagePlus, NotebookPen, PhoneCall, Play, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useCaseActions } from "@/hooks/useRefundCase"
import type { CaseStatus, RefundCase } from "@/types/refund-case.types"
import { CASE_STATUS, PICKABLE_STATUS, deadlineText } from "./meta"

const toLocalInput = (iso: string | null) => {
  if (!iso) return ""
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function StartCard({ c }: { c: RefundCase }) {
  const { start } = useCaseActions(c.request.id)
  const [days, setDays] = useState("3")
  const [owner, setOwner] = useState<string>("me")
  const [note, setNote] = useState("")
  return (
    <Card className="border-primary/30 bg-primary/5 shadow-none">
      <CardHeader className="pb-2"><CardTitle className="text-base">Start the investigation</CardTitle><p className="text-sm text-muted-foreground">Pick who is in charge and how long we have. The customer is not told.</p></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>Who is in charge?</Label>
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="me">Me</SelectItem>{c.team.map((t) => <SelectItem key={t.id} value={t.id}>{t.name ?? t.email}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>How long do we have?</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {["1", "3", "7", "14"].map((d) => <button key={d} type="button" onClick={() => setDays(d)} className={cn("rounded-lg border bg-background py-1.5 text-sm", days === d ? "border-primary font-medium ring-1 ring-primary" : "text-muted-foreground")}>{d} day{d === "1" ? "" : "s"}</button>)}
          </div>
        </div>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="First note (optional)" />
        <Button className="w-full" disabled={start.isPending} onClick={() => start.mutate({ ownerId: owner === "me" ? undefined : owner, dueInDays: Number(days), note: note.trim() || undefined })}><Play className="mr-1.5 h-4 w-4" />Start investigating</Button>
      </CardContent>
    </Card>
  )
}

export function CaseSidebar({ c, onAddProof, onLogCall, onAddNote }: { c: RefundCase; onAddProof: () => void; onLogCall: () => void; onAddNote: () => void }) {
  const { patch } = useCaseActions(c.request.id)
  const inv = c.investigation
  const open = c.request.status === "PENDING"
  const done = c.checks.filter((k) => k.done).length
  const st = CASE_STATUS[inv.status]

  return (
    <div className="space-y-4 lg:sticky lg:top-4">
      {open && inv.status === "NOT_STARTED" && <StartCard c={c} />}

      {inv.status !== "NOT_STARTED" && (
        <Card className="shadow-none">
          <CardHeader className="pb-3"><CardTitle className="text-base">Case control</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Where are we?</Label>
              {open ? (
                <Select value={inv.status} onValueChange={(v) => patch.mutate({ status: v as (typeof PICKABLE_STATUS)[number] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PICKABLE_STATUS.map((s) => <SelectItem key={s} value={s}>{CASE_STATUS[s as CaseStatus].label}</SelectItem>)}</SelectContent>
                </Select>
              ) : <p className="text-sm font-medium">{st.label}</p>}
              <p className="text-xs text-muted-foreground">{st.help}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><UserCog className="h-3.5 w-3.5" />Who is in charge?</Label>
              {open ? (
                <Select value={inv.owner?.id ?? "none"} onValueChange={(v) => patch.mutate({ ownerId: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Nobody yet" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Nobody</SelectItem>{c.team.map((t) => <SelectItem key={t.id} value={t.id}>{t.name ?? t.email}</SelectItem>)}</SelectContent>
                </Select>
              ) : <p className="text-sm font-medium">{inv.owner?.name ?? "—"}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due" className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" />Finish by</Label>
              {open ? (
                <>
                  <Input id="due" type="datetime-local" defaultValue={toLocalInput(inv.due_at)} key={inv.due_at ?? "none"}
                    onBlur={(e) => { const v = e.target.value ? new Date(e.target.value).toISOString() : null; if (v !== inv.due_at && (v === null || !inv.due_at || Math.abs(new Date(v).getTime() - new Date(inv.due_at).getTime()) > 60000)) patch.mutate({ dueAt: v }) }} />
                  <div className="flex gap-1.5">
                    {[1, 3, 7].map((d) => <Button key={d} type="button" size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => patch.mutate({ dueAt: new Date(Date.now() + d * 86400000).toISOString() })}>+{d} day{d === 1 ? "" : "s"}</Button>)}
                  </div>
                </>
              ) : null}
              <p className={cn("text-xs", inv.overdue ? "font-medium text-red-600" : "text-muted-foreground")}>{open ? deadlineText(inv.hours_left) : "Case closed"}</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Checks done</span><b>{done} of {c.checks.length}</b></div>
              <Progress value={(done / c.checks.length) * 100} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      )}

      {open && (
        <Card className="shadow-none">
          <CardHeader className="pb-3"><CardTitle className="text-base">Quick actions</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" className="justify-start" onClick={onAddProof}><ImagePlus className="mr-2 h-4 w-4" />Add photo, video or file</Button>
            <Button variant="outline" className="justify-start" onClick={onLogCall}><PhoneCall className="mr-2 h-4 w-4" />Write down a phone call</Button>
            <Button variant="outline" className="justify-start" onClick={onAddNote}><NotebookPen className="mr-2 h-4 w-4" />Add a private note</Button>
          </CardContent>
        </Card>
      )}

      <Button variant="ghost" size="sm" asChild className="w-full justify-start text-muted-foreground"><Link href={`/orders/${c.request.order.id}`}>Open the full order page<ExternalLink className="ml-1.5 h-3.5 w-3.5" /></Link></Button>
    </div>
  )
}
