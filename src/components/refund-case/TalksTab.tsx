"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, Lock, MessageCircle, NotebookPen, PhoneCall, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useSendMessage, useStartConversation } from "@/hooks/useSupport"
import { cn } from "@/lib/utils"
import type { CaseConversation, CaseTimelineEntry, Party, RefundCase } from "@/types/refund-case.types"
import { PARTY, fmtDateTime, PrivateBadge } from "./meta"
import { useQueryClient } from "@tanstack/react-query"

function Thread({ conv, canReply }: { conv: CaseConversation; canReply: boolean }) {
  const send = useSendMessage(conv.id)
  const [text, setText] = useState("")
  const [priv, setPriv] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }) }, [conv.messages.length])
  const closed = ["RESOLVED", "CLOSED"].includes(conv.status)

  return (
    <div className="space-y-3">
      <div className="max-h-[420px] space-y-2.5 overflow-y-auto rounded-lg bg-muted/30 p-3">
        {conv.messages.map((m) => {
          if (m.from === "SYSTEM") return <p key={m.id} className="text-center text-xs text-muted-foreground">{m.body}</p>
          const mine = m.from === "AGENT"
          return (
            <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
              <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
                m.internal ? "border border-yellow-300 bg-yellow-50 text-yellow-950" : mine ? "bg-primary text-primary-foreground" : "border bg-card")}>
                {m.internal && <span className="mb-0.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide"><Lock className="h-3 w-3" />Private note</span>}
                {m.body}
              </div>
              <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">{m.name ?? (mine ? "Our team" : "Customer")} · {fmtDateTime(m.at)}</span>
            </div>
          )
        })}
        <div ref={end} />
      </div>
      {canReply && (
        <div className={cn("space-y-2 rounded-lg border p-2", priv && "border-yellow-300 bg-yellow-50/50")}>
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            placeholder={priv ? "Private note — the customer will NOT see this" : closed ? "This chat is closed. Replying will reopen it." : "Write a message to the customer…"}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) send.mutate({ body: text.trim(), internal: priv }, { onSuccess: () => setText("") }) }} />
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} />Private note (customer can’t see)</label>
            <Button size="sm" disabled={!text.trim() || send.isPending} onClick={() => send.mutate({ body: text.trim(), internal: priv }, { onSuccess: () => setText("") })}><Send className="mr-1.5 h-3.5 w-3.5" />{priv ? "Save note" : "Send"}</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ConversationCard({ conv, index, total, canReply }: { conv: CaseConversation; index: number; total: number; canReply: boolean }) {
  const [open, setOpen] = useState(index === 0)
  const last = conv.messages[conv.messages.length - 1]
  const label = total === 1 ? "Chat with the customer" : index === 0 ? "Latest conversation" : index === 1 ? "Earlier conversation" : `Conversation ${total - index}`
  return (
    <Card className="shadow-none">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 text-sm font-semibold"><MessageCircle className="h-4 w-4 text-sky-600" />{label}<Badge variant="outline" className="font-mono text-[10px] font-normal">{conv.number}</Badge><Badge variant="outline" className="text-[10px] font-normal">{conv.status.replaceAll("_", " ").toLowerCase()}</Badge></span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">Started {fmtDateTime(conv.started_at)} · {conv.messages.length} message{conv.messages.length === 1 ? "" : "s"}{!open && last ? ` · last: “${last.body.slice(0, 60)}”` : ""}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && <CardContent className="pt-0"><Thread conv={conv} canReply={canReply} /></CardContent>}
    </Card>
  )
}

function LogColumn({ party, entries }: { party: Party; entries: CaseTimelineEntry[] }) {
  const P = PARTY[party]
  return (
    <section className={cn("rounded-xl border border-t-4 bg-card p-4", P.bar)}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><P.icon className="h-4 w-4" />About {P.label.toLowerCase()}<span className="font-normal text-muted-foreground">({entries.length})</span></h3>
      {entries.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No calls or notes yet.</p> : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="rounded-lg border p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">{e.type === "CALL" ? <PhoneCall className="h-3.5 w-3.5 text-emerald-600" /> : <NotebookPen className="h-3.5 w-3.5 text-yellow-600" />}{e.title}</p>
              {e.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{e.body}</p>}
              <p className="mt-1.5 text-[11px] text-muted-foreground">{e.actor ?? "Our team"} · {fmtDateTime(e.at)}{e.meta?.minutes ? ` · ${e.meta.minutes} min` : ""}</p>
              {e.meta?.recordingUrl && <audio src={e.meta.recordingUrl} controls className="mt-2 h-8 w-full" />}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function TalksTab({ c, onCall, onNote }: { c: RefundCase; onCall: () => void; onNote: () => void }) {
  const qc = useQueryClient()
  const start = useStartConversation()
  const open = c.request.status === "PENDING"
  const convs = [...c.conversations].reverse()
  const log = c.timeline.filter((t) => t.type === "CALL" || t.type === "NOTE").reverse()

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-base font-semibold">Chat with the customer</h2><p className="text-sm text-muted-foreground">Everything you and the customer wrote to each other.</p></div>
          {open && convs.length > 0 && <Button size="sm" variant="outline" disabled={start.isPending} onClick={() => start.mutate({ refundRequestId: c.request.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: ["refund-requests", "case"] }) })}><MessageCircle className="mr-1.5 h-3.5 w-3.5" />Open chat again</Button>}
        </div>
        {convs.length === 0 ? (
          <Card className="shadow-none"><CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
            <div><p className="font-medium">You haven’t chatted with the customer yet</p><p className="text-sm text-muted-foreground">Start a chat to ask for photos or to explain what happens next.</p></div>
            {open && <Button disabled={start.isPending} onClick={() => start.mutate({ refundRequestId: c.request.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: ["refund-requests", "case"] }) })}>Start a chat</Button>}
          </CardContent></Card>
        ) : convs.map((cv, i) => <ConversationCard key={cv.id} conv={cv} index={i} total={convs.length} canReply={open} />)}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="flex items-center gap-2 text-base font-semibold">Calls and notes <PrivateBadge /></h2><p className="text-sm text-muted-foreground">What each side told us on the phone, and what we wrote down.</p></div>
          {open && <div className="flex gap-2"><Button size="sm" onClick={() => onCall()}><PhoneCall className="mr-1.5 h-3.5 w-3.5" />Write down a call</Button><Button size="sm" variant="outline" onClick={() => onNote()}><NotebookPen className="mr-1.5 h-3.5 w-3.5" />Add note</Button></div>}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <LogColumn party="CUSTOMER" entries={log.filter((e) => e.party === "CUSTOMER")} />
          <LogColumn party="SELLER" entries={log.filter((e) => e.party === "SELLER")} />
        </div>
        {log.some((e) => e.party !== "CUSTOMER" && e.party !== "SELLER") && (
          <div className="grid gap-5 lg:grid-cols-2">
            <LogColumn party="COURIER" entries={log.filter((e) => e.party === "COURIER")} />
            <LogColumn party="TEAM" entries={log.filter((e) => e.party === "TEAM" || !e.party)} />
          </div>
        )}
      </section>

    </div>
  )
}
