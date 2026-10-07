"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Info, Lock, MessageSquareText, Send, StickyNote } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useCannedReplies, useMarkRead, useSendMessage, useUpdateTicket } from "@/hooks/useSupport"
import type { SupportDetail, SupportEvent, SupportMessage, TicketStatus } from "@/types/support.types"
import { CATEGORY_LABEL, PriorityDot, StatusBadge, initials } from "./meta"

type Item =
  | { kind: "message"; at: string; m: SupportMessage }
  | { kind: "event"; at: string; e: SupportEvent }

const time = (s: string) => new Date(s).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
const dayLabel = (s: string) => {
  const d = new Date(s)
  const today = new Date()
  const y = new Date(); y.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === y.toDateString()) return "Yesterday"
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function eventText(e: SupportEvent) {
  const who = e.actor_name || "Someone"
  switch (e.type) {
    case "CREATED": return "Conversation started"
    case "ASSIGNED":
      return e.to_value
        ? `${who} assigned this to ${e.to_name || "a teammate"}${e.from_name ? ` (from ${e.from_name})` : ""}`
        : `${who} unassigned this conversation`
    case "STATUS": return `${who} changed status to ${e.to_value?.replace("_", " ").toLowerCase()}`
    case "PRIORITY": return `${who} set priority to ${e.to_value?.toLowerCase()}`
    case "CATEGORY": return `${who} set category to ${CATEGORY_LABEL[e.to_value as keyof typeof CATEGORY_LABEL] ?? e.to_value}`
  }
}

function Bubble({ m, customerName }: { m: SupportMessage; customerName: string }) {
  if (m.sender_type === "SYSTEM") {
    return <p className="mx-auto max-w-md rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground">{m.body}</p>
  }
  const mine = m.sender_type === "AGENT"
  const name = mine ? m.sender_name || "Agent" : customerName
  return (
    <div className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className={cn("text-[10px] font-semibold", mine ? "bg-brand-100 text-brand-700" : "bg-muted")}>
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className={cn("max-w-[78%] space-y-1", mine && "items-end text-right")}>
        <div
          className={cn(
            "inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-sm leading-relaxed",
            m.is_internal
              ? "border border-dashed border-amber-300 bg-amber-50 text-amber-950"
              : mine
                ? "rounded-br-sm bg-primary text-primary-foreground"
                : "rounded-bl-sm border bg-white",
          )}
        >
          {m.is_internal && (
            <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              <Lock className="h-3 w-3" /> Internal note
            </span>
          )}
          {m.body}
        </div>
        <p className="px-1 text-[11px] text-muted-foreground">
          {name} · {time(m.created_at)}
        </p>
      </div>
    </div>
  )
}

interface Props {
  detail?: SupportDetail
  isLoading: boolean
  onBack: () => void
  onShowInfo: () => void
}

export function Conversation({ detail, isLoading, onBack, onShowInfo }: Props) {
  const ticketId = detail?.ticket.id ?? ""
  const send = useSendMessage(ticketId)
  const update = useUpdateTicket(ticketId)
  const markRead = useMarkRead()
  const canned = useCannedReplies()
  const [text, setText] = useState("")
  const [note, setNote] = useState(false)
  const [cannedOpen, setCannedOpen] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)
  const unread = detail?.ticket.agent_unread ?? 0

  useEffect(() => { setText(""); setNote(false) }, [ticketId])
  useEffect(() => { if (ticketId && unread > 0) markRead.mutate(ticketId) }, [ticketId, unread]) // eslint-disable-line react-hooks/exhaustive-deps
  const count = detail ? detail.messages.length + detail.events.length : 0
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }) }, [ticketId, count])

  const items = useMemo<Item[]>(() => {
    if (!detail) return []
    return [
      ...detail.messages.map((m) => ({ kind: "message" as const, at: m.created_at, m })),
      ...detail.events.filter((e) => e.type !== "CREATED").map((e) => ({ kind: "event" as const, at: e.created_at, e })),
    ].sort((a, b) => +new Date(a.at) - +new Date(b.at))
  }, [detail])

  if (isLoading || !detail) {
    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="ml-auto h-16 w-1/2" />
      </div>
    )
  }

  const t = detail.ticket
  const closed = t.status === "CLOSED"
  const firstName = (t.customer.name || "there").split(" ")[0]

  const submit = () => {
    const body = text.trim()
    if (!body || send.isPending) return
    send.mutate({ body, internal: note }, { onSuccess: () => setText("") })
  }

  let lastDay = ""
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onBack} aria-label="Back to inbox">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-muted text-xs font-semibold">{initials(t.customer.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{t.customer.name || "Customer"}</h2>
            <span className="hidden text-xs text-muted-foreground sm:inline">{t.ticket_number}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">{t.subject}</p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <PriorityDot priority={t.priority} withLabel />
          <Select value={t.status} onValueChange={(v) => update.mutate({ status: v as TicketStatus })}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as TicketStatus[]).map((s) => (
                <SelectItem key={s} value={s}><StatusBadge status={s} className="bg-transparent p-0" /></SelectItem>
              ))}
              {["ASSIGNED", "REOPENED"].includes(t.status) && (
                <SelectItem value={t.status} disabled>{t.status === "ASSIGNED" ? "Assigned" : "Reopened"}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 xl:hidden" onClick={onShowInfo} aria-label="Customer and order details">
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {/* Timeline */}
      <ScrollArea className="min-h-0 flex-1 bg-slate-50/60">
        <div className="space-y-4 px-4 py-5">
          {items.map((it) => {
            const label = dayLabel(it.at)
            const sep = label !== lastDay
            lastDay = label
            return (
              <div key={`${it.kind}-${it.kind === "message" ? it.m.id : it.e.id}`} className="space-y-4">
                {sep && (
                  <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />{label}<span className="h-px flex-1 bg-border" />
                  </div>
                )}
                {it.kind === "message" ? (
                  <Bubble m={it.m} customerName={t.customer.name || "Customer"} />
                ) : (
                  <p className="text-center text-[11px] text-muted-foreground">{eventText(it.e)} · {time(it.at)}</p>
                )}
              </div>
            )
          })}
          <div ref={bottom} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className={cn("border-t p-3", note && "bg-amber-50/60")}>
        {closed ? (
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            This conversation is closed.
            <Button size="sm" variant="outline" onClick={() => update.mutate({ status: "REOPENED" })}>Reopen</Button>
          </div>
        ) : (
          <>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit() } }}
              placeholder={note ? "Write an internal note — only your team can see this…" : `Reply to ${firstName}…`}
              rows={3}
              className={cn("resize-none text-sm", note && "border-amber-300 bg-amber-50 focus-visible:ring-amber-400")}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md border bg-white p-0.5 text-xs">
                <button type="button" onClick={() => setNote(false)}
                  className={cn("rounded px-2.5 py-1 font-medium", !note ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                  Reply
                </button>
                <button type="button" onClick={() => setNote(true)}
                  className={cn("flex items-center gap-1 rounded px-2.5 py-1 font-medium", note ? "bg-amber-500 text-white" : "text-muted-foreground")}>
                  <StickyNote className="h-3 w-3" /> Note
                </button>
              </div>
              <Popover open={cannedOpen} onOpenChange={setCannedOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                    <MessageSquareText className="h-3.5 w-3.5" /> Quick replies
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 p-0">
                  <ScrollArea className="max-h-72">
                    <ul className="divide-y">
                      {(canned.data ?? []).map((c) => (
                        <li key={c.id}>
                          <button type="button" className="w-full px-3 py-2 text-left hover:bg-muted"
                            onClick={() => { setText(c.body.replace(/\{\{name\}\}/g, firstName)); setNote(false); setCannedOpen(false) }}>
                            <p className="text-sm font-medium">{c.title}</p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">{c.body}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
              <span className="ml-auto hidden text-[11px] text-muted-foreground sm:inline">⌘/Ctrl + Enter to send</span>
              <Button size="sm" className="h-8 gap-1.5" disabled={!text.trim() || send.isPending} onClick={submit}>
                <Send className="h-3.5 w-3.5" /> {note ? "Add note" : "Send"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
