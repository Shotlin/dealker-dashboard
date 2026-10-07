"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatINR } from "@/lib/utils"

/** Price over bids, as a step line — every bid is a step up. */
export function PriceChart({ series, startPrice }: { series: Array<{ seq: number; amount: number; at: string }>; startPrice: number }) {
  const data = [
    { seq: 0, amount: startPrice, label: "Start" },
    ...series.map((s) => ({ seq: s.seq, amount: s.amount, label: new Date(s.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) })),
  ]
  return (
    <div className="h-56 w-full text-brand-500" role="img" aria-label="Auction price over time">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="auc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={32} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} domain={["dataMin", "auto"]}
            tickFormatter={(v: number) => (v >= 1000 ? `₹${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : `₹${v}`)} />
          <Tooltip formatter={(v) => [formatINR(Number(v ?? 0)), "Price"]} labelFormatter={(l) => String(l)} />
          <Area type="stepAfter" dataKey="amount" stroke="currentColor" strokeWidth={2} fill="url(#auc-fill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
