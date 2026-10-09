import type { Batch } from "@/services/pricing.service"

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n)

export function describeBatch(b: Batch): string {
  const p = b.params as { operation?: string; value?: number; target?: string }
  const v = Number(p.value)
  const sign = v > 0 ? "+" : "−"
  const abs = Math.abs(v)
  if (b.kind === "STOCK") return p.operation === "SET" ? `Stock set to ${v}` : `Stock ${p.operation === "ADD" ? "+" : "−"}${abs}`
  switch (p.operation) {
    case "PERCENT": return `Price ${sign}${abs}%`
    case "FIXED": return `Price ${sign}₹${abs}`
    case "SET": return `Price set to ${inr(v)}`
    case "DISCOUNT_FROM_MRP": return `${abs}% off MRP`
    default: return b.operation
  }
}
