"use client"

import { Check, CheckCircle2, Clock, Hourglass, ThumbsDown, ThumbsUp, Truck, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CaseTimelineEntry } from "@/types/refund-case.types"
import type { ReturnJourney } from "@/types/return-journey.types"
import { dayTime, money } from "./helpers"

type Props = {
  status: string
  createdAt: string
  resolvedAt?: string | null
  refundedAt?: string | null
  amount: number
  toWallet: boolean
  declineNote?: string | null
  journey?: ReturnJourney | null
  timeline?: CaseTimelineEntry[]
}

type SellerAnswer = { yes: boolean; seller: string | null; reason: string | null; at: string }

function sellerAnswers(timeline: CaseTimelineEntry[] = []): SellerAnswer[] {
  return timeline
    .filter((e) => e.party === "SELLER" && /^Seller (approved|rejected) the return/i.test(e.title))
    .map((e) => ({ yes: /approved/i.test(e.title), seller: e.actor, reason: e.body, at: e.at }))
}

function analyse(p: Props) {
  const pk = p.journey?.pickup ?? null
  const qc = p.journey?.qc ?? null
  const answers = sellerAnswers(p.timeline)
  const sellerYes = answers.some((a) => a.yes)
  const sellerNo = answers.some((a) => !a.yes)
  const refunded = p.status === "APPROVED"
  const closed = p.status === "REJECTED" || p.status === "CANCELLED"
  const pickupBad = pk?.status === "FAILED" || pk?.status === "CANCELLED"
  const pickupBooked = !!pk && !pickupBad
  const pickedUp = !!pk?.picked_up_at || ["PICKED_UP", "IN_TRANSIT", "RECEIVED"].includes(pk?.status ?? "")
  const received = !!pk?.received_at || pk?.status === "RECEIVED"
  const priceWaiting = qc?.price_status === "PROPOSED" || qc?.price_status === "CLARIFICATION"
  return { pk, qc, answers, sellerYes, sellerNo, refunded, closed, pickupBad, pickupBooked, pickedUp, received, priceWaiting }
}

/** One box that says, in plain words, where this return is and what to do next. */
function Banner(p: Props) {
  const a = analyse(p)
  let tone: "green" | "amber" | "blue" | "grey" | "red" = "amber"
  let title = ""
  let text = ""
  let Icon = Hourglass

  if (a.closed) {
    tone = "grey"; Icon = X
    title = p.status === "REJECTED" ? "This return was declined" : "The customer cancelled this return"
    text = p.status === "REJECTED" ? (p.declineNote ? `Reason: ${p.declineNote}` : "No money was returned.") : "No money was returned."
  } else if (a.refunded) {
    tone = "green"; Icon = CheckCircle2
    title = "Done — the customer got the money back"
    text = `${money(p.amount)} went ${p.toWallet ? "to their Dealkr wallet" : "back to their original payment method"}${p.refundedAt ? ` on ${dayTime(p.refundedAt)}` : ""}.`
  } else if (a.priceWaiting) {
    tone = "amber"; Icon = Hourglass
    title = "Waiting for the customer"
    text = "You changed the price after checking the item. The customer must say OK to the new price before you can refund."
  } else if (a.received && a.qc) {
    tone = "blue"; Icon = ThumbsUp
    title = "Item checked — now refund the customer"
    text = "Press “Approve & refund” at the bottom to send the money back."
  } else if (a.received) {
    tone = "blue"; Icon = Check
    title = "Item reached our warehouse"
    text = "Next: check the item in the “Check the item” box below, then refund."
  } else if (a.pickedUp) {
    tone = "blue"; Icon = Truck
    title = "Item is on the way to our warehouse"
    text = "The courier has collected it from the customer. Nothing to do now."
  } else if (a.pickupBad) {
    tone = "red"; Icon = X
    title = "The pickup did not work"
    text = "Book the pickup again in the “Pickup” box below."
  } else if (a.pickupBooked) {
    tone = "blue"; Icon = Truck
    title = "Pickup is booked"
    text = "Waiting for the courier to collect the item from the customer."
  } else if (a.sellerYes) {
    tone = "blue"; Icon = ThumbsUp
    title = "Seller said YES"
    text = "Next: book the pickup in the “Pickup” box below."
  } else if (a.sellerNo) {
    tone = "red"; Icon = ThumbsDown
    title = "Seller said NO — you decide"
    text = "Read the seller’s reason below. Then book the pickup (if the customer is right) or decline the return."
  } else {
    tone = "amber"; Icon = Clock
    title = "Waiting for the seller to say yes or no"
    text = "The seller has not answered yet. You can also decide yourself below."
  }

  const toneCls = { green: "border-emerald-200 bg-emerald-50 text-emerald-900", amber: "border-amber-200 bg-amber-50 text-amber-900", blue: "border-sky-200 bg-sky-50 text-sky-900", grey: "border-slate-200 bg-slate-100 text-slate-800", red: "border-red-200 bg-red-50 text-red-900" }[tone]
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-4", toneCls)}>
      <Icon className="mt-0.5 h-6 w-6 shrink-0" />
      <div>
        <p className="text-base font-semibold">{title}</p>
        <p className="mt-0.5 text-sm opacity-90">{text}</p>
      </div>
    </div>
  )
}

/** Five big steps — easy to see how far the return has come. */
function Progress(p: Props) {
  const a = analyse(p)
  if (a.closed) return null
  const answered = a.sellerYes || a.sellerNo || a.pickupBooked || p.status === "PROCESSING" || a.refunded
  const steps = [
    { label: "Customer asked", sub: dayTime(p.createdAt), done: true },
    { label: "Seller answer", sub: a.sellerNo && !a.sellerYes ? "Said NO" : a.sellerYes ? "Said YES" : answered ? "Skipped" : "Waiting", done: answered, bad: a.sellerNo && !a.sellerYes },
    { label: "Pickup", sub: a.pickedUp ? "Collected" : a.pickupBooked ? "Booked" : a.pickupBad ? "Failed" : "Not booked", done: a.pickedUp, bad: a.pickupBad },
    { label: "Checked at warehouse", sub: a.qc ? "Checked" : a.received ? "Arrived" : "Not yet", done: !!a.qc },
    { label: "Money returned", sub: a.refunded ? "Done" : "Not yet", done: a.refunded },
  ]
  const current = steps.findIndex((s) => !s.done)
  return (
    <ol className="grid grid-cols-5 gap-1">
      {steps.map((s, i) => {
        const active = i === current
        return (
          <li key={s.label} className="flex flex-col items-center text-center">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold",
              s.bad ? "border-red-400 bg-red-50 text-red-600" : s.done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary bg-white text-primary" : "border-border bg-white text-muted-foreground")}>
              {s.bad ? <X className="h-4 w-4" /> : s.done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn("mt-1.5 text-xs leading-tight", s.done || active ? "font-semibold" : "text-muted-foreground")}>{s.label}</span>
            <span className={cn("text-[11px] leading-tight", s.bad ? "text-red-600" : "text-muted-foreground")}>{s.sub}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** Plain list: who did what, and when. */
function History(p: Props) {
  const a = analyse(p)
  type Row = { at: string; who: string; what: string; note?: string | null; tone?: "yes" | "no" }
  const rows: Row[] = [{ at: p.createdAt, who: "Customer", what: "asked to return this order" }]
  for (const s of a.answers) rows.push({ at: s.at, who: s.seller ? `Seller (${s.seller})` : "Seller", what: s.yes ? "said YES — accepted the return" : "said NO — rejected the return", note: s.reason, tone: s.yes ? "yes" : "no" })
  const pk = a.pk
  if (pk?.scheduled_at || pk) rows.push({ at: pk!.events?.[0]?.at ?? pk!.scheduled_at ?? p.createdAt, who: "Dealkr team", what: `booked the pickup${pk!.courier_name || pk!.provider ? ` with ${pk!.courier_name || pk!.provider}` : ""}${pk!.awb ? ` (tracking ${pk!.awb})` : ""}` })
  if (pk?.picked_up_at) rows.push({ at: pk.picked_up_at, who: "Courier", what: "collected the item from the customer" })
  if (pk?.received_at) rows.push({ at: pk.received_at, who: "Warehouse", what: "received the item" })
  if (a.qc) rows.push({ at: a.qc.inspected_at, who: "Dealkr team", what: a.qc.revised_price != null && a.qc.revised_price !== a.qc.original_price ? `checked the item and set a new price of ${money(a.qc.revised_price)}` : "checked the item — no price change" })
  if (a.qc?.responded_at && a.qc.price_status === "ACCEPTED") rows.push({ at: a.qc.responded_at, who: "Customer", what: "accepted the new price" })
  if (a.refunded && p.refundedAt) rows.push({ at: p.refundedAt, who: "Dealkr", what: `returned ${money(p.amount)} to the customer` })
  if (a.closed && p.resolvedAt) rows.push({ at: p.resolvedAt, who: p.status === "REJECTED" ? "Dealkr team" : "Customer", what: p.status === "REJECTED" ? "declined the return" : "cancelled the return", note: p.status === "REJECTED" ? p.declineNote : null })
  rows.sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime())
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Who did what, and when</p>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="rounded-lg border p-2.5 text-sm">
            <p><span className="font-medium">{r.who}</span> <span className={cn(r.tone === "yes" && "font-semibold text-emerald-700", r.tone === "no" && "font-semibold text-red-700")}>{r.what}</span></p>
            <p className="text-xs text-muted-foreground">{dayTime(r.at)}</p>
            {r.note && <p className="mt-1 rounded bg-muted/50 px-2 py-1 text-xs">“{r.note}”</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ReturnStatus(props: Props) {
  return (
    <div className="space-y-4">
      <Banner {...props} />
      <Progress {...props} />
    </div>
  )
}

export function ReturnHistory(props: Props) {
  return <History {...props} />
}
