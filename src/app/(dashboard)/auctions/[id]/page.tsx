"use client"

/**
 * Auction control room — live price, controls, bids, registrations, fee escrow,
 * fraud flags and the audit trail for one auction.
 */

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Ban, CircleDot, Flag, Pause, Play, Plus, Power, RotateCcw, Send, ShieldAlert, Square, ThumbsDown, ThumbsUp } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataList } from "@/components/shared/data-list"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AuctionStatusBadge, Countdown, dt } from "@/components/auctions/auction-ui"
import { PriceChart } from "@/components/auctions/PriceChart"
import { useAuctionAction, useAuctionDetail, useAuctionLive, useBidderBlock } from "@/hooks/useAuctions"
import { usePermissions } from "@/hooks/usePermissions"
import { cn, formatINR } from "@/lib/utils"

function Confirm({ label, icon, title, description, onConfirm, variant = "outline", disabled, withReason }: {
  label: string; icon?: React.ReactNode; title: string; description: string
  onConfirm: (reason: string) => void; variant?: "outline" | "destructive"; disabled?: boolean; withReason?: boolean
}) {
  const [reason, setReason] = useState("")
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button size="sm" variant={variant} disabled={disabled}>{icon}{label}</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
        {withReason && <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (shown in the audit trail)" aria-label="Reason" />}
        <AlertDialogFooter>
          <AlertDialogCancel>Back</AlertDialogCancel>
          <AlertDialogAction disabled={withReason && !reason.trim()} onClick={() => onConfirm(reason.trim())}>{label}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const Kv = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium tabular-nums">{v}</dd></div>
)

export default function AuctionControlRoom() {
  const { id } = useParams<{ id: string }>()
  const { can } = usePermissions()
  const q = useAuctionDetail(id)
  const { live, connected } = useAuctionLive(id)
  const act = useAuctionAction()
  const block = useBidderBlock()
  const run = (name: string, body?: Record<string, unknown>) => act.mutate({ id, name, body })

  if (q.isLoading) return <LoadingSkeleton variant="stat-card" count={4} />
  if (q.isError || !q.data) return <QueryErrorBlock error={q.error} onRetry={() => q.refetch()} />

  const { auction: a, registrations, bids, price_series, fees, events, flags } = q.data
  const platform = can("auctions.moderate")
  const manage = can("auctions.manage")
  const price = live?.current_price ?? (a.bid_count > 0 ? a.current_price : a.start_price)
  const endsAt = live?.ends_at ?? a.ends_at
  const status = (live?.status as typeof a.status) ?? a.status
  const reserve = live?.reserve_status ?? (a.reserve_price == null ? "NONE" : a.bid_count > 0 && a.current_price >= a.reserve_price ? "MET" : "NOT_MET")
  const held = registrations.filter((r) => r.status === "ACTIVE").reduce((n, r) => n + r.fee_amount, 0)
  const settled = (fees.FEE_APPLIED_TO_ORDER ?? 0) + (fees.FEE_REFUNDED ?? 0) + (fees.FEE_FORFEIT_PLATFORM ?? 0) + (fees.FEE_FORFEIT_VENDOR ?? 0)
  const balanced = Math.abs((fees.FEE_CHARGED ?? 0) - settled - held) < 0.01
  const winner = registrations.find((r) => r.user_id && r.user_id === a.winner_id)

  return (
    <div className="space-y-6">
      <Link href="/auctions" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> All auctions</Link>
      <PageHeader title={a.title} subtitle={`${a.auction_number} · ${a.owner_type === "ADMIN" ? "Dealker listing" : a.seller_name ?? "Vendor"} · created ${dt(a.created_at)}`}>
        <div className="flex flex-wrap items-center gap-2">
          <AuctionStatusBadge status={status} />
          {["LIVE", "PAUSED"].includes(status) && (
            <span className={cn("inline-flex items-center gap-1 text-xs", connected ? "text-green-600" : "text-muted-foreground")}>
              <CircleDot className="h-3 w-3" /> {connected ? "Live feed" : "Polling"}
            </span>
          )}
        </div>
      </PageHeader>

      {a.rejected_reason && status === "REJECTED" && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">Rejected: {a.rejected_reason}</p>}

      {/* action bar */}
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Auction actions">
        {status === "PENDING_APPROVAL" && platform && <>
          <Button size="sm" disabled={act.isPending} onClick={() => run("approve")}><ThumbsUp /> Approve</Button>
          <Confirm label="Reject" icon={<ThumbsDown />} title="Reject this auction?" description="The vendor sees your reason and can edit and resubmit." withReason onConfirm={(reason) => run("reject", { reason })} />
        </>}
        {["DRAFT", "REJECTED"].includes(status) && manage && <Button size="sm" disabled={act.isPending} onClick={() => run("submit")}><Send /> {platform ? "Publish" : "Submit"}</Button>}
        {status === "SCHEDULED" && platform && <Button size="sm" disabled={act.isPending} onClick={() => run("start-now")}><Play /> Start now</Button>}
        {status === "LIVE" && platform && <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => run("pause")}><Pause /> Pause</Button>}
        {status === "PAUSED" && platform && <Button size="sm" disabled={act.isPending} onClick={() => run("resume")}><Play /> Resume</Button>}
        {["LIVE", "PAUSED", "SCHEDULED"].includes(status) && platform && [15, 60].map((m) => (
          <Button key={m} size="sm" variant="outline" disabled={act.isPending} onClick={() => run("extend", { minutes: m })}><Plus /> {m === 60 ? "1 hour" : `${m} min`}</Button>
        ))}
        {["LIVE", "PAUSED"].includes(status) && platform && (
          <Confirm label="End now" icon={<Square />} title="End this auction now?" description="Bidding closes immediately and the current leader wins (if the reserve is met)." onConfirm={() => run("end-now")} />
        )}
        {!["SOLD", "UNSOLD", "CANCELLED", "DEFAULTED"].includes(status) && manage && !(status === "AWAITING_PAYMENT" && a.order_id) && (
          <Confirm label="Cancel auction" icon={<Ban />} variant="destructive" withReason title="Cancel this auction?"
            description={`Every registration fee (${formatINR(held)} held) is refunded to bidders' wallets and the unit goes back on sale.`} onConfirm={(reason) => run("cancel", { reason })} />
        )}
        {["UNSOLD", "DEFAULTED", "CANCELLED", "REJECTED"].includes(status) && manage && <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => run("relist")}><RotateCcw /> Relist as draft</Button>}
      </div>

      {/* live status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-5 lg:col-span-2" aria-label="Live status">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Current price</p>
              <p className="text-3xl font-bold tabular-nums" aria-live="polite">{formatINR(price)}</p>
              <p className="text-xs text-muted-foreground">{live?.min_next_bid ? `Next bid ≥ ${formatINR(live.min_next_bid)}` : `Started at ${formatINR(a.start_price)}`}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{["LIVE", "PAUSED", "SCHEDULED"].includes(status) ? "Ends in" : "Ended"}</p>
              <p className="text-2xl font-semibold"><Countdown endsAt={endsAt} serverTime={live?.server_time ?? a.server_time} /></p>
              <p className="text-xs text-muted-foreground">{dt(endsAt)}{a.extension_count > 0 && ` · extended ${live?.extension_count ?? a.extension_count}×`}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Leader</p>
              <p className="text-lg font-semibold">{live?.leader_alias ?? (a.leader_id ? "Hidden" : "No bids yet")}</p>
              <p className="text-xs">
                <span className={cn("rounded px-1.5 py-0.5", reserve === "MET" ? "bg-green-100 text-green-800" : reserve === "NOT_MET" ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground")}>
                  {reserve === "NONE" ? "No reserve" : reserve === "MET" ? "Reserve met" : "Reserve not met"}
                </span>
              </p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 border-t pt-3 sm:grid-cols-4">
            <Kv k="Bids" v={live?.bid_count ?? a.bid_count} />
            <Kv k="Bidders" v={live?.bidder_count ?? a.bidder_count} />
            <Kv k="Registered" v={live?.registration_count ?? a.registration_count} />
            <Kv k="Fees in escrow" v={formatINR(held)} />
          </dl>
          {platform && a.leader_max != null && a.bid_count > 0 && <p className="mt-2 text-xs text-muted-foreground"><ShieldAlert className="mr-1 inline h-3.5 w-3.5" />Leader&apos;s private ceiling: {formatINR(a.leader_max)} (admin only)</p>}
        </section>

        <section className="rounded-xl border bg-card p-5" aria-label="Rules">
          <h2 className="mb-1 text-sm font-semibold">Rules</h2>
          <dl className="divide-y">
            <Kv k="Start price" v={formatINR(a.start_price)} />
            {platform && <Kv k="Reserve" v={a.reserve_price ? formatINR(a.reserve_price) : "—"} />}
            <Kv k="Bid step" v={a.bid_increment ? formatINR(a.bid_increment) : "Smart tiers"} />
            <Kv k="Registration fee" v={formatINR(a.registration_fee)} />
            <Kv k="Losers refunded" v={`${a.loser_fee_refund_pct}%`} />
            {a.vendor_id && <Kv k="Vendor fee share" v={`${a.fee_vendor_share_pct}%`} />}
            {a.buy_now_price && <Kv k="Buy now" v={formatINR(a.buy_now_price)} />}
            <Kv k="Anti-snipe" v={`${a.anti_snipe_window_sec / 60}m → +${a.anti_snipe_extend_sec / 60}m (×${a.max_extensions})`} />
          </dl>
        </section>
      </div>

      {["AWAITING_PAYMENT", "SOLD"].includes(status) && a.winning_bid != null && (
        <section className="rounded-xl border border-violet-300 bg-violet-50/50 p-5 dark:bg-violet-950/20" aria-label="Winner and payment">
          <h2 className="mb-1 text-sm font-semibold">{status === "SOLD" ? "Sold" : "Waiting for the winner to pay"}{a.offer_round > 1 && " · second-chance offer"}</h2>
          <dl className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
            <Kv k="Winner" v={winner ? (winner.name ?? winner.alias) : "—"} />
            <Kv k="Winning bid" v={formatINR(a.winning_bid)} />
            <Kv k="Fee credited" v={`− ${formatINR(a.fee_credit ?? 0)}`} />
            <Kv k="Winner pays" v={formatINR(a.amount_due ?? 0)} />
          </dl>
          {status === "AWAITING_PAYMENT" && <p className="mt-1 text-xs text-muted-foreground">Pay-by <Countdown endsAt={a.payment_deadline} endedLabel="overdue — will default shortly" /> · {a.order_id ? "online payment pending" : "no order yet"}</p>}
          {a.order_id && <Link className="mt-1 inline-block text-xs underline" href={`/orders/${a.order_id}`}>View order</Link>}
        </section>
      )}

      {platform && flags.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 dark:bg-amber-950/20" aria-label="Risk flags">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Flag className="h-4 w-4 text-amber-600" /> Risk flags ({flags.length})</h2>
          <ul className="space-y-1 text-sm">{flags.map((f, i) => <li key={i}><span className="mr-2 rounded bg-amber-200 px-1.5 text-xs font-semibold text-amber-900">{f.severity}</span>{f.detail}</li>)}</ul>
        </section>
      )}

      <section className="rounded-xl border bg-card p-4"><h2 className="mb-1 text-sm font-semibold">Price over bids</h2><PriceChart series={price_series} startPrice={a.start_price} /></section>

      <Tabs defaultValue="bids">
        <TabsList>
          <TabsTrigger value="bids">Bids ({bids.length})</TabsTrigger>
          <TabsTrigger value="regs">Registrations ({registrations.length})</TabsTrigger>
          <TabsTrigger value="fees">Fee ledger</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>

        <TabsContent value="bids">
          <DataList rows={bids} rowKey={(b) => String(b.seq)} emptyMessage="No bids yet." columns={[
            { id: "n", header: "#", cell: (b) => <span className="tabular-nums text-muted-foreground">{b.seq}</span> },
            { id: "w", header: "Bidder", cell: (b) => <span className="text-sm">{b.alias}</span> },
            { id: "a", header: "Price", cell: (b) => <span className="font-medium tabular-nums">{formatINR(b.amount)}</span> },
            { id: "t", header: "Type", cell: (b) => <span className="text-xs text-muted-foreground">{b.type === "AUTO" ? "Auto (proxy)" : b.type === "BUY_NOW" ? "Buy now" : "Manual"}</span> },
            ...(platform ? [
              { id: "m", header: "Private max", cell: (b: typeof bids[number]) => <span className="text-xs tabular-nums">{b.max_amount ? formatINR(b.max_amount) : "—"}</span> },
              { id: "ip", header: "IP", cell: (b: typeof bids[number]) => <span className="text-xs text-muted-foreground">{b.ip ?? "—"}</span> },
            ] : []),
            { id: "at", header: "Time", cell: (b) => <span className="text-xs text-muted-foreground">{new Date(b.at).toLocaleTimeString("en-IN")}</span> },
          ]} />
        </TabsContent>

        <TabsContent value="regs">
          <DataList rows={registrations} rowKey={(r) => r.id} emptyMessage="Nobody has registered yet." columns={[
            { id: "n", header: "Bidder", cell: (r) => <span className="text-sm"><b>{r.alias}</b>{platform && r.name && <span className="block text-xs text-muted-foreground">{r.name} · {r.phone}</span>}</span> },
            { id: "f", header: "Fee", cell: (r) => <span className="tabular-nums">{formatINR(r.fee_amount)}</span> },
            { id: "s", header: "Escrow status", cell: (r) => <span className="text-xs font-medium">{r.status === "ACTIVE" ? "Held" : r.status === "APPLIED" ? "Applied to order" : r.status === "REFUNDED" ? `Refunded ${formatINR(r.refund_amount)}` : `Forfeited ${formatINR(r.forfeited_amount)}`}</span> },
            { id: "h", header: "Highest bid", cell: (r) => <span className="tabular-nums">{r.highest_bid ? formatINR(r.highest_bid) : "—"}</span> },
            { id: "b", header: "Bids", cell: (r) => r.bid_count },
            ...(platform ? [{ id: "x", header: "", cell: (r: typeof registrations[number]) => r.user_id ? (
              <Button size="sm" variant="ghost" disabled={block.isPending}
                onClick={() => block.mutate({ userId: r.user_id!, block: !r.is_blocked, reason: `From ${a.auction_number}` })}>
                {r.is_blocked ? <><Power /> Unblock</> : <><Ban /> Block</>}{(r.strikes ?? 0) > 0 && <span className="ml-1 text-amber-600">({r.strikes} strikes)</span>}
              </Button>) : null }] : []),
          ]} />
        </TabsContent>

        <TabsContent value="fees">
          <div className="grid gap-4 sm:grid-cols-2">
            <dl className="rounded-xl border bg-card p-4 divide-y">
              <Kv k="Collected from bidders" v={formatINR(fees.FEE_CHARGED ?? 0)} />
              <Kv k="Applied to winner's order" v={formatINR(fees.FEE_APPLIED_TO_ORDER ?? 0)} />
              <Kv k="Refunded to bidders" v={formatINR(fees.FEE_REFUNDED ?? 0)} />
              <Kv k="Kept by platform" v={formatINR(fees.FEE_FORFEIT_PLATFORM ?? 0)} />
              <Kv k="Paid to vendor" v={formatINR(fees.FEE_FORFEIT_VENDOR ?? 0)} />
              <Kv k="Still in escrow" v={formatINR(held)} />
            </dl>
            <p className={cn("self-start rounded-xl border p-4 text-sm", balanced ? "border-green-300 bg-green-50 text-green-900" : "border-red-300 bg-red-50 text-red-900")}>
              {balanced ? "Books balance: collected = applied + refunded + kept + paid out + escrow." : "Books do NOT balance — investigate before releasing funds."}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <ol className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="rounded-lg border bg-card p-3 text-sm">
                <span className="font-medium">{e.event_type.replaceAll("_", " ").toLowerCase()}</span>
                <span className="ml-2 text-xs text-muted-foreground">{dt(e.created_at)}{e.actor_role && ` · ${e.actor_role.toLowerCase()}`}</span>
                {Object.keys(e.payload ?? {}).length > 0 && <pre className="mt-1 overflow-x-auto text-xs text-muted-foreground">{JSON.stringify(e.payload)}</pre>}
              </li>
            ))}
          </ol>
        </TabsContent>
      </Tabs>
    </div>
  )
}
