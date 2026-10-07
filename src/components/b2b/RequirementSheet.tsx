"use client"

import { useState } from "react"
import { Clock, MapPin, Package, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AddQuoteDialog, DispatchDialog, ReceiveDialog } from "./AdminActions"
import type { B2bOrder } from "@/types/b2b.admin.types"
import { useB2bMutations, useB2bRequirement } from "@/hooks/useB2bAdmin"
import { formatINR } from "@/lib/utils"
import { COND_LABEL, OrderStatusBadge, PayState, ReqStatusBadge, dateShort, dateTime } from "./shared"

const QUOTE_BADGE: Record<string, string> = {
  SUBMITTED: "bg-slate-100 text-slate-700", SELECTED: "bg-emerald-50 text-emerald-700", PARTIALLY_SELECTED: "bg-indigo-50 text-indigo-700",
  NOT_SELECTED: "bg-slate-100 text-slate-500", WITHDRAWN: "bg-slate-100 text-slate-500", EXPIRED: "bg-slate-100 text-slate-500",
}

export function RequirementSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading } = useB2bRequirement(id)
  const { cancel, award, pay, setOrderStatus, withdrawQuote } = useB2bMutations()
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [addingQuote, setAddingQuote] = useState(false)
  const [dispatching, setDispatching] = useState<B2bOrder | null>(null)
  const [receiving, setReceiving] = useState<B2bOrder | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState("")
  const r = data?.requirement

  return (
    <Sheet open={Boolean(id)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="pr-6 text-base">{r ? `${r.quantity_needed} × ${r.product_name}` : "Requirement"}</SheetTitle>
          {r && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{r.requirement_number}</span>
              <ReqStatusBadge status={r.status} />
              <span>Buyer: <span className="font-medium text-foreground">{r.buyer_name}</span></span>
            </div>
          )}
        </SheetHeader>

        {isLoading || !data || !r ? (
          <div className="space-y-3 p-5"><Skeleton className="h-24" /><Skeleton className="h-48" /></div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-6 p-5">
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-xl border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quantity</p>
                  <p className="text-2xl font-semibold tabular-nums">{r.quantity_awarded}<span className="text-base font-normal text-muted-foreground"> / {r.quantity_needed} awarded</span></p>
                  <Progress value={(r.quantity_awarded / r.quantity_needed) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground">{r.quantity_offered_total ?? 0} units offered across {r.quote_count ?? 0} quote(s)</p>
                </div>
                <div className="space-y-1.5 rounded-xl border p-4 text-sm">
                  <p className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />{r.brand ? `${r.brand} · ` : ""}{r.category_name ?? "—"} · {r.condition_pref === "ANY" ? "any condition" : r.condition_pref === "NEW" ? "new only" : "used / refurbished"}</p>
                  <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Quotes until {dateTime(r.response_deadline)}{r.required_by ? ` · needed by ${dateShort(r.required_by)}` : ""}</p>
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />Deliver to {r.delivery_city ?? "—"} {r.delivery_pincode ?? ""}</p>
                  {r.target_price != null && <p>Target price <span className="font-semibold tabular-nums">{formatINR(r.target_price)}</span> / unit</p>}
                  {r.description && <p className="pt-1 text-muted-foreground">{r.description}</p>}
                </div>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Quotes ({data.quotes.length})</h3>
                  {r.status === "OPEN" && <Button size="sm" variant="outline" onClick={() => setAddingQuote(true)}>Add quote for a vendor</Button>}
                </div>
                {data.quotes.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No vendor has quoted yet.</p> : (
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader><TableRow className="hover:bg-transparent">
                        <TableHead>Seller</TableHead><TableHead className="text-right">Offered</TableHead><TableHead className="text-right">Price / unit</TableHead>
                        <TableHead>Condition</TableHead><TableHead>Delivery</TableHead><TableHead>Result</TableHead>{r.status === "OPEN" && <TableHead className="w-28">Award units</TableHead>}
                      </TableRow></TableHeader>
                      <TableBody>
                        {data.quotes.map((q, i) => {
                          const diff = r.target_price ? Math.round(((q.unit_price - r.target_price) / r.target_price) * 100) : null
                          return (
                            <TableRow key={q.id}>
                              <TableCell>
                                <p className="text-sm font-medium">{q.seller_name}{i === 0 && data.quotes.length > 1 && q.status !== "WITHDRAWN" && <Badge className="ml-2 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50">Lowest</Badge>}</p>
                                {q.note && <p className="max-w-[220px] truncate text-xs text-muted-foreground">{q.note}</p>}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{q.quantity_offered}</TableCell>
                              <TableCell className="text-right">
                                <p className="tabular-nums font-medium">{formatINR(q.unit_price)}</p>
                                {diff !== null && <p className={`text-[11px] ${diff <= 0 ? "text-emerald-600" : "text-amber-600"}`}>{diff > 0 ? "+" : ""}{diff}% vs target</p>}
                              </TableCell>
                              <TableCell className="text-xs">{COND_LABEL[q.condition] ?? q.condition}</TableCell>
                              <TableCell className="text-xs">{q.delivery_days} day{q.delivery_days === 1 ? "" : "s"}</TableCell>
                              <TableCell>
                                <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${QUOTE_BADGE[q.status]}`}>
                                  {q.status === "SUBMITTED" ? "Pending" : q.status === "NOT_SELECTED" ? "Not selected" : q.status === "PARTIALLY_SELECTED" ? `Selected ${q.quantity_awarded}/${q.quantity_offered}` : q.status === "SELECTED" ? `Selected ${q.quantity_awarded}` : q.status.toLowerCase()}
                                </span>
                              </TableCell>
                              {r.status === "OPEN" && (
                                <TableCell>
                                  {["SUBMITTED", "PARTIALLY_SELECTED"].includes(q.status) ? (
                                    <div className="flex items-center gap-1">
                                      <Input type="number" min={0} max={q.quantity_offered - q.quantity_awarded} className="h-8 w-16 px-2" value={picks[q.id] ?? ""}
                                        onChange={(e) => setPicks((p) => ({ ...p, [q.id]: e.target.value }))} placeholder="0" />
                                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-600" title="Withdraw quote" disabled={q.quantity_awarded > 0}
                                        onClick={() => withdrawQuote.mutate(q.id)}>×</Button>
                                    </div>
                                  ) : null}
                                </TableCell>
                              )}
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>

              {r.status === "OPEN" && data.quotes.length > 0 && (() => {
                const remaining = r.quantity_needed - r.quantity_awarded
                const chosen = data.quotes.reduce((n, q) => n + (Number(picks[q.id]) || 0), 0)
                const cost = data.quotes.reduce((n, q) => n + (Number(picks[q.id]) || 0) * q.unit_price, 0)
                const bad = chosen > remaining || data.quotes.some((q) => (Number(picks[q.id]) || 0) > q.quantity_offered - q.quantity_awarded)
                return (
                  <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4">
                    <div className="text-sm">
                      <p className="font-medium">Split the order across vendors</p>
                      <p className="text-xs text-muted-foreground">Enter units for each quote above. Still needed: <span className="font-medium text-foreground">{remaining}</span>.
                        Selected: <span className={`font-medium ${bad ? "text-red-600" : "text-foreground"}`}>{chosen}</span> · {formatINR(cost)}</p>
                    </div>
                    <Button disabled={!chosen || bad || award.isPending}
                      onClick={() => award.mutate({ id: r.id, selections: data.quotes.filter((q) => Number(picks[q.id]) > 0).map((q) => ({ quoteId: q.id, quantity: Number(picks[q.id]) })) }, { onSuccess: () => setPicks({}) })}>
                      Award {chosen || ""} unit{chosen === 1 ? "" : "s"}
                    </Button>
                  </section>
                )
              })()}

              {data.orders.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Orders — who is supplying what</h3>
                  <div className="space-y-2">
                    {data.orders.map((o) => (
                      <div key={o.id} className="rounded-lg border p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{o.seller_name} <span className="font-normal text-muted-foreground">· {o.order_number}</span></p>
                            <p className="text-xs text-muted-foreground tabular-nums">{o.quantity} × {formatINR(o.unit_price)} = <span className="font-medium text-foreground">{formatINR(o.subtotal)}</span> · commission {o.commission_percent}% ({formatINR(o.commission_amount)}) · seller gets {formatINR(o.seller_payable)}</p>
                          </div>
                          <div className="flex items-center gap-3"><PayState status={o.payment_status} /><OrderStatusBadge status={o.status} /></div>
                        </div>
                        {["PAID", "PACKED", "DISPATCHED", "DELIVERED"].includes(o.status) && (
                          <div className="mt-2 flex flex-wrap gap-2 border-t pt-2">
                            {o.status === "PAID" && <Button size="sm" variant="outline" disabled={setOrderStatus.isPending} onClick={() => setOrderStatus.mutate({ id: o.id, status: "PACKED" })}>Mark packed</Button>}
                            {["PAID", "PACKED"].includes(o.status) && <Button size="sm" onClick={() => setDispatching(o)}>Dispatch…</Button>}
                            {o.status === "DISPATCHED" && <Button size="sm" variant="outline" disabled={setOrderStatus.isPending} onClick={() => setOrderStatus.mutate({ id: o.id, status: "DELIVERED" })}>Mark delivered</Button>}
                            {["DISPATCHED", "DELIVERED"].includes(o.status) && <Button size="sm" onClick={() => setReceiving(o)}>Confirm receipt…</Button>}
                          </div>
                        )}
                        {(o.awb || o.dispute_reason) && (
                          <div className="mt-2 space-y-1 border-t pt-2 text-xs text-muted-foreground">
                            {o.awb && <p className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" />{o.courier_name} · AWB {o.awb}{o.received_quantity != null && ` · buyer received ${o.received_quantity}/${o.quantity}`}</p>}
                            {o.dispute_reason && <p className="text-red-600">Dispute: {o.dispute_reason}</p>}
                            {o.dispute_resolution && <p>Resolution: {o.dispute_resolution}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {data.orders.some((o) => o.status === "PENDING_PAYMENT") && (() => {
                    const due = data.orders.filter((o) => o.status === "PENDING_PAYMENT").reduce((n, o) => n + o.subtotal, 0)
                    return (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                        <span>Buyer payment due: <span className="font-semibold tabular-nums">{formatINR(due)}</span> — held in escrow until delivery.</span>
                        <Button size="sm" disabled={pay.isPending} onClick={() => pay.mutate({ id: r.id, method: "ONLINE" })}>Record payment</Button>
                      </div>
                    )
                  })()}
                  {data.payment && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Buyer paid <span className="font-medium text-foreground">{formatINR(data.payment.amount)}</span> into escrow on {dateShort(data.payment.paid_at)} (ref {data.payment.reference}).
                    </p>
                  )}
                </section>
              )}

              <Separator />
              <section>
                <h3 className="mb-3 text-sm font-semibold">Timeline</h3>
                <ol className="space-y-3 border-l pl-4">
                  {data.events.map((e, i) => (
                    <li key={i} className="relative text-sm">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                      <p className="font-medium">{e.type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}{e.actor_label ? <span className="font-normal text-muted-foreground"> · {e.actor_label}</span> : null}</p>
                      {e.note && <p className="text-xs text-muted-foreground">{e.note}</p>}
                      <p className="text-[11px] text-muted-foreground">{dateTime(e.created_at)}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </ScrollArea>
        )}

        {r && ["OPEN", "AWARDED"].includes(r.status) && (
          <div className="space-y-2 border-t bg-white p-4">
            {cancelling ? (
              <>
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancelling (visible to the buyer)…" />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setCancelling(false)}>Keep</Button>
                  <Button variant="destructive" disabled={cancel.isPending} onClick={() => cancel.mutate({ id: r.id, reason }, { onSuccess: () => { setCancelling(false); onClose() } })}>Cancel requirement</Button>
                </div>
              </>
            ) : (
              <div className="flex justify-end"><Button variant="outline" className="text-red-600" onClick={() => setCancelling(true)}>Cancel requirement</Button></div>
            )}
          </div>
        )}
      </SheetContent>
      <AddQuoteDialog key={addingQuote ? "q" : "x"} requirement={addingQuote && r ? r : null} onClose={() => setAddingQuote(false)} />
      <DispatchDialog order={dispatching} onClose={() => setDispatching(null)} />
      <ReceiveDialog key={receiving?.id ?? "r"} order={receiving} onClose={() => setReceiving(null)} />
    </Sheet>
  )
}
