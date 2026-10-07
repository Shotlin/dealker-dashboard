"use client"

import { useMemo, useState } from "react"
import { formatINR } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface Props {
  startPrice: number
  fee: number
  increment: number | null
  /** Rules tiers, used to pick a sensible step when no fixed increment is set. */
  tiers?: Array<{ from: number; inc: number }>
  vendorSharePct: number
  refundPct: number
  hasVendor: boolean
}

const paise = (n: number) => Math.round(n * 100)
const rupees = (p: number) => p / 100

/** Same integer split the server uses (auction-engine.splitForfeitedFee). */
function split(feeP: number, refundPct: number, sharePct: number, hasVendor: boolean) {
  const refund = Math.floor((feeP * Math.min(100, Math.max(0, refundPct))) / 100)
  const forfeited = feeP - refund
  const vendor = hasVendor ? Math.floor((forfeited * Math.min(100, Math.max(0, sharePct))) / 100) : 0
  return { refund, forfeited, vendor, platform: forfeited - vendor }
}

/**
 * "What happens to the money?" — reproduces the worked example for the numbers entered,
 * so an operator sees the real consequences of a fee/refund/split choice before publishing.
 */
export function MoneyPreview({ startPrice, fee, increment, tiers, vendorSharePct, refundPct, hasVendor }: Props) {
  const [bidders, setBidders] = useState(4)
  const step = useMemo(() => {
    if (increment && increment > 0) return increment
    const t = [...(tiers ?? [])].sort((a, b) => a.from - b.from).filter((x) => x.from <= startPrice).pop()
    return t?.inc ?? 100
  }, [increment, tiers, startPrice])
  const [override, setOverride] = useState<number | null>(null)

  const n = Math.max(1, Math.min(200, bidders))
  const finalBid = override ?? startPrice + step * Math.max(0, n - 1)
  const feeP = paise(fee)
  const winnerPays = Math.max(0, paise(finalBid) - feeP)
  const losers = n - 1
  const one = split(feeP, refundPct, vendorSharePct, hasVendor)
  const valid = startPrice > 0 && fee >= 0

  const Row = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className={strong ? "text-sm font-semibold tabular-nums" : "text-sm tabular-nums"}>{v}</dd>
    </div>
  )

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold">Money preview</h3>
      <p className="mb-3 text-xs text-muted-foreground">What happens at the end, for the numbers you entered.</p>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Bidders who join</span>
          <Input type="number" min={1} max={200} value={bidders} className="h-8 text-sm"
            onChange={(e) => { setBidders(Number(e.target.value) || 1); setOverride(null) }} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Final bid (₹)</span>
          <Input type="number" value={Math.round(finalBid)} className="h-8 text-sm"
            onChange={(e) => setOverride(Number(e.target.value) || startPrice)} />
        </label>
      </div>

      {!valid ? (
        <p className="text-xs text-muted-foreground">Enter a start price and fee to see the breakdown.</p>
      ) : (
        <dl className="divide-y">
          <div className="pb-2">
            <Row k="Winner pays now" v={formatINR(rupees(winnerPays))} strong />
            <Row k={`= final bid − their ₹${fee} fee`} v={`${formatINR(finalBid)} − ${formatINR(fee)}`} />
          </div>
          <div className="py-2">
            <Row k={`Fees collected (${n} × ${formatINR(fee)})`} v={formatINR(rupees(feeP * n))} />
            <Row k="Applied to winner's price" v={formatINR(fee)} />
            <Row k={`Forfeited by ${losers} ${losers === 1 ? "loser" : "losers"}`} v={formatINR(rupees(one.forfeited * losers))} strong />
            {refundPct > 0 && <Row k={`Refunded to losers (${refundPct}%)`} v={formatINR(rupees(one.refund * losers))} />}
          </div>
          <div className="pt-2">
            <Row k="Platform keeps (fees)" v={formatINR(rupees(one.platform * losers))} />
            <Row k={hasVendor ? "Vendor receives (fees)" : "Vendor (platform-owned)"} v={formatINR(rupees(one.vendor * losers))} />
            <Row k="Seller is paid on" v={`${formatINR(finalBid)} less commission`} />
          </div>
        </dl>
      )}
    </div>
  )
}
