"use client"

/**
 * Create auction — product → pricing → schedule → review, with a live money preview.
 * Admins may auction their own listings or any vendor's; vendors only their own
 * (the product search endpoint already scopes this).
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, Info, Search, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MoneyPreview } from "@/components/auctions/MoneyPreview"
import { useAuctionProducts, useAuctionRules, useCreateAuction } from "@/hooks/useAuctions"
import { useDebounce } from "@/hooks/useDebounce"
import { usePermissions } from "@/hooks/usePermissions"
import { cn, formatINR } from "@/lib/utils"
import type { AuctionProduct } from "@/services/auctions.service"

const DURATIONS = [
  { label: "6 hours", hours: 6 }, { label: "24 hours", hours: 24 }, { label: "3 days", hours: 72 }, { label: "7 days", hours: 168 },
]

const num = (v: string) => (v === "" ? null : Number(v))
const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error ? <span role="alert" className="block text-xs text-red-600">{error}</span>
        : hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

export default function NewAuctionPage() {
  const router = useRouter()
  const { can } = usePermissions()
  const isPlatform = can("auctions.moderate")
  const rules = useAuctionRules().data
  const create = useCreateAuction()

  const [search, setSearch] = useState("")
  const debounced = useDebounce(search, 300)
  const products = useAuctionProducts(debounced)
  const [product, setProduct] = useState<AuctionProduct | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startPrice, setStartPrice] = useState("")
  const [reserve, setReserve] = useState("")
  const [incMode, setIncMode] = useState<"fixed" | "tiers">("fixed")
  const [increment, setIncrement] = useState("")
  const [fee, setFee] = useState("")
  const [buyNow, setBuyNow] = useState("")
  const [startNow, setStartNow] = useState(true)
  const [startsAt, setStartsAt] = useState(toLocalInput(new Date(Date.now() + 60 * 60_000)))
  const [hours, setHours] = useState(24)
  const [refundPct, setRefundPct] = useState("")
  const [sharePct, setSharePct] = useState("")
  const [showAdv, setShowAdv] = useState(false)

  const sp = num(startPrice) ?? 0
  const feeN = num(fee) ?? 0
  const feeCap = rules ? Math.min(rules.max_registration_fee, Math.floor((sp * rules.fee_max_pct_of_start_price) / 100)) : 0

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (sp <= 0) e.startPrice = "Enter a start price"
    const r = num(reserve)
    if (r != null && r < sp) e.reserve = "Reserve cannot be below the start price"
    if (incMode === "fixed" && !(Number(increment) > 0)) e.increment = "Enter the bid step, or choose smart tiers"
    if (rules && sp > 0) {
      if (feeN < rules.min_registration_fee) e.fee = `Minimum fee is ${formatINR(rules.min_registration_fee)}`
      else if (feeN > feeCap) e.fee = `Maximum for this price is ${formatINR(feeCap)} (${rules.fee_max_pct_of_start_price}% of start, capped at ${formatINR(rules.max_registration_fee)})`
    }
    const b = num(buyNow)
    if (b != null && b <= Math.max(sp, r ?? 0)) e.buyNow = "Buy-now must be above the start and reserve prices"
    return e
  }, [sp, reserve, incMode, increment, rules, feeN, feeCap, buyNow])

  const pick = (p: AuctionProduct) => {
    setProduct(p)
    setTitle(p.name)
    if (!startPrice) setStartPrice(String(Math.round(Number(p.sale_price ?? p.price) * 0.8 / 100) * 100 || ""))
  }

  const submit = (draft: boolean) => {
    if (!product) return toast.error("Choose a product first")
    if (!draft && Object.keys(errors).length) return toast.error(Object.values(errors)[0])
    create.mutate(
      {
        productId: product.id,
        title: title || undefined,
        description: description || undefined,
        startPrice: sp,
        reservePrice: num(reserve),
        bidIncrement: incMode === "fixed" ? num(increment) : null,
        buyNowPrice: num(buyNow),
        registrationFee: feeN,
        startsAt: startNow ? new Date(Date.now() - 1000).toISOString() : new Date(startsAt).toISOString(),
        durationHours: hours,
        ...(isPlatform && refundPct !== "" ? { loserFeeRefundPct: Number(refundPct) } : {}),
        ...(isPlatform && sharePct !== "" ? { feeVendorSharePct: Number(sharePct) } : {}),
        saveAsDraft: draft,
      },
      {
        onSuccess: (a) => {
          toast.success(draft ? "Draft saved" : a.status === "PENDING_APPROVAL" ? "Submitted for approval" : a.status === "LIVE" ? "Auction is live" : "Auction scheduled")
          router.push(`/auctions/${a.id}`)
        },
      }
    )
  }

  const hasVendor = product?.owner_type === "VENDOR"

  return (
    <div className="space-y-6">
      <PageHeader title="Create auction" subtitle="Choose a product, set the rules, and see exactly where the money goes.">
        <Button asChild variant="outline" size="sm"><Link href="/auctions">Cancel</Link></Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* 1 — product */}
          <section className="rounded-xl border bg-card p-4" aria-labelledby="s1">
            <h2 id="s1" className="mb-3 text-sm font-semibold">1 · Product</h2>
            {product ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {product.thumbnail_url && <img src={product.thumbnail_url} alt="" className="h-14 w-14 rounded-md object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {hasVendor ? `Vendor: ${product.vendor_name ?? "—"}` : "Dealker's own listing"} · list price {formatINR(Number(product.sale_price ?? product.price))} · {product.stock_quantity} in stock
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setProduct(null)}>Change</Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products with stock…" className="pl-9" aria-label="Search products" />
                </div>
                <ul className="mt-2 max-h-72 divide-y overflow-auto rounded-lg border">
                  {products.isLoading && <li className="p-3 text-sm text-muted-foreground">Searching…</li>}
                  {products.data?.length === 0 && <li className="p-3 text-sm text-muted-foreground">No eligible products. A product must be active, in stock and not already in an auction.</li>}
                  {products.data?.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => pick(p)} className="flex w-full items-center gap-3 p-2.5 text-left hover:bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.thumbnail_url ? <img src={p.thumbnail_url} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-muted" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          <span className="text-xs text-muted-foreground">{p.owner_type === "VENDOR" ? p.vendor_name : "Dealker own"} · {formatINR(Number(p.sale_price ?? p.price))} · stock {p.stock_quantity}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* 2 — pricing */}
          <section className={cn("rounded-xl border bg-card p-4", !product && "pointer-events-none opacity-50")} aria-labelledby="s2">
            <h2 id="s2" className="mb-3 text-sm font-semibold">2 · Pricing</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Auction title" hint="Shown to customers"><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></Field>
              <Field label="Start price (₹)" error={errors.startPrice}><Input type="number" min={1} value={startPrice} onChange={(e) => setStartPrice(e.target.value)} placeholder="20000" /></Field>
              <Field label="Registration fee (₹)" error={errors.fee} hint={rules && sp > 0 ? `Allowed: ${formatINR(rules.min_registration_fee)} – ${formatINR(feeCap)}` : "Charged to a bidder's wallet when they join"}>
                <Input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} placeholder="500" />
              </Field>
              <Field label="Reserve price (₹) — optional" error={errors.reserve} hint="Hidden. If bidding ends below it, nothing sells and every fee is refunded.">
                <Input type="number" min={0} value={reserve} onChange={(e) => setReserve(e.target.value)} />
              </Field>
              <div className="space-y-1 sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground">Bid step</span>
                <div className="flex flex-wrap items-center gap-2">
                  {(["fixed", "tiers"] as const).map((m) => (
                    <button key={m} type="button" aria-pressed={incMode === m} onClick={() => setIncMode(m)}
                      className={cn("rounded-md border px-3 py-1.5 text-xs font-medium", incMode === m ? "border-brand-500 bg-brand-50 text-brand-700" : "text-muted-foreground hover:bg-muted")}>
                      {m === "fixed" ? "Fixed amount" : "Smart tiers (by price)"}
                    </button>
                  ))}
                  {incMode === "fixed" && <Input type="number" min={1} value={increment} onChange={(e) => setIncrement(e.target.value)} placeholder="1000" className="h-9 w-32" aria-label="Fixed bid step" />}
                </div>
                {errors.increment && <span role="alert" className="block text-xs text-red-600">{errors.increment}</span>}
                <span className="block text-xs text-muted-foreground">
                  {incMode === "fixed" ? "Every bid must beat the price by at least this much." : "Steps grow with the price, as set in Rules & risk."}
                </span>
              </div>
              <Field label="Buy-now price (₹) — optional" error={errors.buyNow} hint="Lets one buyer end the auction instantly — only until the first bid.">
                <Input type="number" min={0} value={buyNow} onChange={(e) => setBuyNow(e.target.value)} />
              </Field>
              <Field label="Description — optional"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></Field>
            </div>
          </section>

          {/* 3 — schedule */}
          <section className={cn("rounded-xl border bg-card p-4", !product && "pointer-events-none opacity-50")} aria-labelledby="s3">
            <h2 id="s3" className="mb-3 text-sm font-semibold">3 · Schedule</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Starts</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} /> Start immediately</label>
                </div>
                {!startNow && <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} aria-label="Start time" />}
                {!startNow && <span className="block text-xs text-muted-foreground">Customers can pre-register once it is scheduled.</span>}
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Runs for</span>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button key={d.hours} type="button" aria-pressed={hours === d.hours} onClick={() => setHours(d.hours)}
                      className={cn("rounded-md border px-3 py-1.5 text-xs font-medium", hours === d.hours ? "border-brand-500 bg-brand-50 text-brand-700" : "text-muted-foreground hover:bg-muted")}>
                      {d.label}
                    </button>
                  ))}
                </div>
                {rules && <span className="block text-xs text-muted-foreground">A bid in the last {rules.anti_snipe_window_sec / 60} min extends the end by {rules.anti_snipe_extend_sec / 60} min (max {rules.max_extensions} times).</span>}
              </div>
            </div>
          </section>

          {isPlatform && (
            <section className="rounded-xl border bg-card p-4">
              <button type="button" onClick={() => setShowAdv((v) => !v)} aria-expanded={showAdv} className="flex w-full items-center justify-between text-sm font-semibold">
                Fee rules for this auction <ChevronDown className={cn("h-4 w-4 transition-transform", showAdv && "rotate-180")} />
              </button>
              {showAdv && (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="Refund to losers (%)" hint={`Platform default: ${rules?.loser_fee_refund_pct ?? 0}%. 100 = fully refundable deposit.`}>
                    <Input type="number" min={0} max={100} value={refundPct} onChange={(e) => setRefundPct(e.target.value)} placeholder={String(rules?.loser_fee_refund_pct ?? 0)} />
                  </Field>
                  <Field label="Vendor share of forfeited fees (%)" hint={hasVendor ? `Platform default: ${rules?.vendor_fee_share_pct ?? 50}%` : "Not used — this is a platform-owned listing"}>
                    <Input type="number" min={0} max={100} value={sharePct} disabled={!hasVendor} onChange={(e) => setSharePct(e.target.value)} placeholder={String(rules?.vendor_fee_share_pct ?? 50)} />
                  </Field>
                </div>
              )}
            </section>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => submit(false)} disabled={create.isPending || !product}>
              {isPlatform ? (startNow ? "Publish & go live" : "Publish & schedule") : rules?.vendor_auctions_require_approval ? "Submit for approval" : "Publish"}
            </Button>
            <Button variant="outline" onClick={() => submit(true)} disabled={create.isPending || !product}>Save as draft</Button>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <MoneyPreview
            startPrice={sp} fee={feeN} increment={incMode === "fixed" ? num(increment) : null} tiers={rules?.increment_tiers}
            vendorSharePct={sharePct !== "" ? Number(sharePct) : rules?.vendor_fee_share_pct ?? 50}
            refundPct={refundPct !== "" ? Number(refundPct) : rules?.loser_fee_refund_pct ?? 0}
            hasVendor={hasVendor}
          />
          <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground">
            <p className="mb-2 flex items-center gap-1.5 font-semibold text-foreground"><ShieldCheck className="h-4 w-4 text-green-600" /> Built-in protections</p>
            <ul className="space-y-1.5">
              <li>Winner has {rules?.payment_window_hours ?? 24}h to pay; if not, the next-highest bidder gets a second chance.</li>
              <li>If the reserve isn&apos;t met or the auction is cancelled, every fee is refunded.</li>
              <li>The unit is held out of normal sale while the auction runs.</li>
              {rules?.vendor_auctions_require_approval && !isPlatform && <li>Your auction goes live after platform approval.</li>}
            </ul>
            <p className="mt-3 flex gap-1.5"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Customers see the fee and refund policy before they join, and must accept it.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
