import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const money = (n: number) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
export const dayTime = (s: string | null | undefined) => (s ? new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—")
export const day = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—")

export const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Waiting for confirmation", cls: "bg-amber-50 text-amber-700" },
  ORDER_PLACED: { label: "Order placed", cls: "bg-amber-50 text-amber-700" },
  CONFIRMED: { label: "Confirmed", cls: "bg-blue-50 text-blue-700" },
  PACKED: { label: "Packed", cls: "bg-indigo-50 text-indigo-700" },
  READY_TO_SHIP: { label: "Ready to ship", cls: "bg-indigo-50 text-indigo-700" },
  SHIPPED: { label: "On the way", cls: "bg-sky-50 text-sky-700" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", cls: "bg-orange-50 text-orange-700" },
  DELIVERED: { label: "Delivered", cls: "bg-emerald-50 text-emerald-700" },
  CANCELLED: { label: "Cancelled", cls: "bg-slate-100 text-slate-600" },
  REFUNDED: { label: "Refunded", cls: "bg-violet-50 text-violet-700" },
  RETURN_REQUESTED: { label: "Return requested", cls: "bg-red-50 text-red-700" },
  RETURNED: { label: "Returned", cls: "bg-violet-50 text-violet-700" },
}
export function StatusPill({ status, className }: { status: string; className?: string }) {
  const m = ORDER_STATUS[status] ?? { label: status, cls: "bg-slate-100 text-slate-700" }
  return <Badge variant="outline" className={cn("border-0 text-xs font-medium", m.cls, className)}>{m.label}</Badge>
}

export const CONDITION: Record<string, string> = { NEW: "New", OPEN_BOX: "Open box", REFURBISHED: "Refurbished", USED_LIKE_NEW: "Used · Like new", USED_GOOD: "Used · Good", USED_FAIR: "Used · Fair" }

export function payMethodText(method: string, gatewayMethod?: string | null, plan?: string) {
  if (plan === "PARTIAL") return "Partial payment — an advance was paid online, the rest is collected on delivery"
  if (method === "COD") return "Cash on delivery — the customer pays the courier when the parcel arrives"
  if (method === "WALLET") return "Paid from the customer’s Dealker wallet"
  const via = gatewayMethod ? { upi: "UPI", card: "debit / credit card", netbanking: "net banking", wallet: "a mobile wallet" }[gatewayMethod] ?? gatewayMethod : null
  return `Paid online${via ? ` by ${via}` : ""}`
}

/** Six plain steps a parcel goes through. */
export const STEPS = [
  { key: "placed", label: "Order placed", hint: "Customer placed the order" },
  { key: "confirmed", label: "Confirmed", hint: "Seller accepted it" },
  { key: "packed", label: "Packed", hint: "Seller packed the item" },
  { key: "shipped", label: "Shipped", hint: "Handed to the delivery partner" },
  { key: "out", label: "Out for delivery", hint: "Delivery person is on the way" },
  { key: "delivered", label: "Delivered", hint: "Customer received it" },
]
export function stepIndex(status: string) {
  return ({ PENDING: 0, ORDER_PLACED: 0, CONFIRMED: 1, PACKED: 2, READY_TO_SHIP: 2, SHIPPED: 3, OUT_FOR_DELIVERY: 4, DELIVERED: 5, RETURN_REQUESTED: 5, RETURNED: 5 } as Record<string, number>)[status] ?? 0
}
