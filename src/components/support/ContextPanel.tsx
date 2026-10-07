"use client"

import Link from "next/link"
import { Mail, Package, Phone, Store, UserRound } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useAssignTicket, useSupportAgents, useUpdateTicket } from "@/hooks/useSupport"
import { formatINR } from "@/lib/utils"
import { useAuthStore } from "@/store/auth.store"
import type { SupportDetail, TicketCategory, TicketPriority, TicketStatus } from "@/types/support.types"
import { CATEGORY_LABEL, StatusBadge, initials } from "./meta"

const UNASSIGNED = "__none__"

function Row({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  )
}

export function ContextPanel({ detail, onOpenTicket }: { detail: SupportDetail; onOpenTicket: (id: string) => void }) {
  const t = detail.ticket
  const ctx = detail.context
  const agents = useSupportAgents()
  const assign = useAssignTicket(t.id)
  const update = useUpdateTicket(t.id)
  const me = useAuthStore((s) => s.user)

  return (
    <ScrollArea className="h-full bg-white">
      <div className="space-y-5 p-4">
        {/* Customer */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11">
              <AvatarFallback className="bg-brand-100 text-sm font-semibold text-brand-700">{initials(t.customer.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold">{t.customer.name || "Customer"}</p>
              {ctx && <p className="text-xs text-muted-foreground">Customer since {new Date(ctx.joined_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>}
            </div>
          </div>
          {t.customer.phone && <Row icon={Phone}>{t.customer.phone}</Row>}
          {t.customer.email && <Row icon={Mail}>{t.customer.email}</Row>}
          {ctx && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                ["Orders", String(ctx.orders_count)],
                ["Spent", formatINR(ctx.total_spent)],
                ["Tickets", String(ctx.tickets_count)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border bg-white p-2 text-center">
                  <p className="text-sm font-semibold tabular-nums">{v}</p>
                  <p className="text-[11px] text-muted-foreground">{k}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <Separator />

        {/* Assignment & triage */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assignment</h3>
          <div className="space-y-1.5">
            <Label className="text-xs">Assigned to</Label>
            <Select value={t.assignee?.id ?? UNASSIGNED} onValueChange={(v) => assign.mutate(v === UNASSIGNED ? null : v)} disabled={assign.isPending}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {(agents.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name || a.email}{a.id === me?.id ? " (you)" : ""} · {a.open_tickets} open
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {t.assignee?.id !== me?.id && me?.id && (
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => assign.mutate(me.id)}>Assign to me</Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={t.priority} onValueChange={(v) => update.mutate({ priority: v as TicketPriority })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => <SelectItem key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={t.category} onValueChange={(v) => update.mutate({ category: v as TicketCategory })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5 md:hidden">
            <Label className="text-xs">Status</Label>
            <Select value={t.status} onValueChange={(v) => update.mutate({ status: v as TicketStatus })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </section>

        {t.order && (
          <>
            <Separator />
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked order</h3>
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Link href={`/orders/${t.order.id}`} className="text-sm font-semibold hover:underline">#{t.order.order_number}</Link>
                  <Badge variant="secondary" className="text-[10px]">{t.order.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-0.5 text-sm font-medium tabular-nums">{formatINR(t.order.total)}</p>
                {t.order.sellers && t.order.sellers.length > 0 && <Row icon={Store}>{t.order.sellers.join(", ")}</Row>}
                <ul className="mt-2 space-y-1">
                  {(t.order.items ?? []).map((i, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Package className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="line-clamp-2">{i.quantity} × {i.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {t.refund && (
                <div className="flex items-center justify-between rounded-lg border bg-amber-50/60 p-3 text-sm">
                  <div>
                    <p className="font-medium">Return / refund</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{formatINR(t.refund.amount)}</p>
                  </div>
                  <Badge variant="outline" className="border-0 bg-white text-[11px]">{t.refund.status.toLowerCase()}</Badge>
                </div>
              )}
              {t.refund && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/refund-requests">Open return requests</Link>
                </Button>
              )}
            </section>
          </>
        )}

        {ctx && ctx.other_tickets.length > 0 && (
          <>
            <Separator />
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Previous conversations</h3>
              {ctx.other_tickets.map((o) => (
                <button key={o.id} type="button" onClick={() => onOpenTicket(o.id)}
                  className="flex w-full items-center gap-2 rounded-lg border p-2 text-left hover:bg-muted/50">
                  <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{o.subject}</span>
                    <span className="text-[11px] text-muted-foreground">{o.ticket_number}</span>
                  </span>
                  <StatusBadge status={o.status} className="h-5 px-1.5" />
                </button>
              ))}
            </section>
          </>
        )}
      </div>
    </ScrollArea>
  )
}
