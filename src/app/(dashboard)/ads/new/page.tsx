"use client"

/** New campaign — setup, products, keywords, and a plain-language cost summary. */

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Info, Search, Sparkles, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, VendorPicker, rupees, selectClass, useAdsRole } from "@/components/ads/ads-ui"
import { useAdProducts, useAdRules, useAdWallet, useCreateCampaign, useKeywordEstimate } from "@/hooks/useAds"
import { cn } from "@/lib/utils"
import type { MatchType, Targeting } from "@/services/ads.service"

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean)

export default function NewCampaignPage() {
  const router = useRouter()
  const { isPlatform } = useAdsRole()
  const rules = useAdRules()
  const create = useCreateCampaign()

  const [vendorId, setVendorId] = useState("")
  const [name, setName] = useState("")
  const [targeting, setTargeting] = useState<Targeting>("AUTO")
  const [bid, setBid] = useState("")
  const [daily, setDaily] = useState("")
  const [total, setTotal] = useState("")
  const [startsOn, setStartsOn] = useState("")
  const [endsOn, setEndsOn] = useState("")
  const [picked, setPicked] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [kwText, setKwText] = useState("")
  const [matchType, setMatchType] = useState<MatchType>("BROAD")
  const [negText, setNegText] = useState("")

  const r = rules.data
  const vendorReady = !isPlatform || !!vendorId
  const products = useAdProducts(search, isPlatform ? vendorId : undefined, vendorReady)
  const wallet = useAdWallet(isPlatform ? vendorId : undefined, vendorReady)
  const firstKw = lines(kwText)[0] ?? ""
  const estimate = useKeywordEstimate(targeting === "MANUAL" ? firstKw : "", matchType)

  const bidN = Number(bid)
  const dailyN = Number(daily)
  const gross = r ? dailyN * (1 + r.gst_pct / 100) : 0
  const keywords = useMemo(() => lines(kwText), [kwText])

  const problems: string[] = []
  if (isPlatform && !vendorId) problems.push("Choose a vendor")
  if (name.trim().length < 3) problems.push("Give the campaign a name")
  if (!picked.length) problems.push("Pick at least one product")
  if (r && (!bidN || bidN < r.min_cpc || bidN > r.max_cpc)) problems.push(`Bid must be ${rupees(r.min_cpc)}–${rupees(r.max_cpc)}`)
  if (r && (!dailyN || dailyN < r.min_daily_budget)) problems.push(`Daily budget must be at least ${rupees(r.min_daily_budget, 0)}`)
  if (targeting === "MANUAL" && !keywords.length) problems.push("Add at least one keyword")
  if (total && Number(total) < dailyN) problems.push("Total budget can't be lower than the daily budget")

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const submit = (send: boolean) => {
    if (problems.length) { toast.error(problems[0]); return }
    create.mutate(
      {
        vendorId: isPlatform ? vendorId : undefined, name: name.trim(), targeting, defaultBid: bidN, dailyBudget: dailyN,
        totalBudget: total ? Number(total) : null, startsOn: startsOn || undefined, endsOn: endsOn || null, productIds: picked,
        keywords: targeting === "MANUAL"
          ? [
              ...keywords.map((keyword) => ({ keyword, matchType })),
              ...lines(negText).map((keyword) => ({ keyword, matchType: "BROAD" as MatchType, negative: true })),
            ]
          : lines(negText).map((keyword) => ({ keyword, matchType: "BROAD" as MatchType, negative: true })),
        submit: send,
      },
      {
        onSuccess: (c) => {
          toast.success(send ? (c.status === "PENDING_REVIEW" ? "Submitted — we'll review it shortly" : "Campaign is live") : "Draft saved")
          router.push(`/ads/${c.id}`)
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New campaign" subtitle="Choose what to promote, how much to bid, and your daily limit.">
        <Button asChild variant="outline" size="sm"><Link href="/ads">Cancel</Link></Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="space-y-4 rounded-xl border bg-card p-4" aria-labelledby="s1">
            <h2 id="s1" className="text-sm font-semibold">1 · Campaign settings</h2>
            {isPlatform && <VendorPicker value={vendorId} onChange={(v) => { setVendorId(v); setPicked([]) }} />}
            <Field label="Campaign name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Festive sale — headphones" maxLength={120} /></Field>

            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-muted-foreground">Targeting</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  ["AUTO", "Automatic", "We show your products on searches that match them. Best way to start — no keywords to manage."],
                  ["MANUAL", "Keyword targeting", "You pick the search terms and match types. More control over where you appear and what you pay."],
                ] as const).map(([id, title, desc]) => (
                  <label key={id} className={cn("cursor-pointer rounded-lg border p-3 transition-colors", targeting === id ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30" : "hover:bg-muted")}>
                    <input type="radio" name="targeting" className="sr-only" checked={targeting === id} onChange={() => setTargeting(id)} />
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Default bid per click (₹)" hint={r && `Allowed ${rupees(r.min_cpc)} – ${rupees(r.max_cpc)}. This is the most you'll pay — usually you pay less.`}>
                <Input type="number" min={r?.min_cpc} step="0.5" value={bid} onChange={(e) => setBid(e.target.value)} placeholder="e.g. 8" />
              </Field>
              <Field label="Daily budget (₹)" hint={r && `At least ${rupees(r.min_daily_budget, 0)}. We never spend more than this in a day.`}>
                <Input type="number" min={r?.min_daily_budget} step="10" value={daily} onChange={(e) => setDaily(e.target.value)} placeholder="e.g. 500" />
              </Field>
              <Field label="Total budget (₹, optional)" hint="Campaign stops once this is spent.">
                <Input type="number" step="100" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="No limit" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date"><Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></Field>
                <Field label="End date"><Input type="date" value={endsOn} min={startsOn || undefined} onChange={(e) => setEndsOn(e.target.value)} /></Field>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border bg-card p-4" aria-labelledby="s2">
            <h2 id="s2" className="text-sm font-semibold">2 · Products to promote <span className="font-normal text-muted-foreground">({picked.length} selected)</span></h2>
            {!vendorReady ? (
              <p className="text-sm text-muted-foreground">Choose a vendor first to see their products.</p>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, brand or SKU" className="pl-9" aria-label="Search products" />
                </div>
                <ul className="max-h-72 divide-y overflow-auto rounded-lg border">
                  {products.isLoading && <li className="p-4 text-sm text-muted-foreground">Loading…</li>}
                  {products.data?.length === 0 && <li className="p-4 text-sm text-muted-foreground">No eligible products. Only active, approved, in-stock listings can be advertised.</li>}
                  {products.data?.map((p) => (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-center gap-3 p-2.5 hover:bg-muted">
                        <input type="checkbox" checked={picked.includes(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.thumbnail ? <img src={p.thumbnail} alt="" className="h-10 w-10 rounded-md object-cover" /> : <div className="h-10 w-10 rounded-md bg-muted" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          <span className="text-xs text-muted-foreground">{rupees(p.price, 0)} · {p.stock_quantity} in stock{p.seller_sku ? ` · ${p.seller_sku}` : ""}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="space-y-3 rounded-xl border bg-card p-4" aria-labelledby="s3">
            <h2 id="s3" className="text-sm font-semibold">3 · {targeting === "MANUAL" ? "Keywords" : "Keywords to avoid (optional)"}</h2>
            {targeting === "MANUAL" && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <Field label="Keywords — one per line" hint={`${keywords.length} keyword${keywords.length === 1 ? "" : "s"}${r ? ` · up to ${r.max_keywords_per_campaign}` : ""}`}>
                      <Textarea rows={5} value={kwText} onChange={(e) => setKwText(e.target.value)} placeholder={"wireless headphones\nbluetooth earbuds"} />
                    </Field>
                  </div>
                  <Field label="Match type">
                    <select className={selectClass} value={matchType} onChange={(e) => setMatchType(e.target.value as MatchType)}>
                      <option value="BROAD">Broad</option><option value="PHRASE">Phrase</option><option value="EXACT">Exact</option>
                    </select>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {matchType === "BROAD" && "Shows when a search has all your words, in any order."}
                      {matchType === "PHRASE" && "Shows when a search contains your words together, in order."}
                      {matchType === "EXACT" && "Shows only when the search is exactly your keyword."}
                    </span>
                  </Field>
                </div>
                {firstKw && estimate.data && (
                  <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm sm:flex-row sm:items-center sm:justify-between" role="status">
                    <p className="flex items-start gap-2">
                      <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      <span>
                        <strong>“{estimate.data.keyword}”</strong> — {estimate.data.competition.toLowerCase()} competition
                        ({estimate.data.competing_campaigns} advertiser{estimate.data.competing_campaigns === 1 ? "" : "s"}
                        {estimate.data.avg_cpc_30d != null && <>, recent avg. click {rupees(estimate.data.avg_cpc_30d)}</>}).
                        Suggested bid <strong>{rupees(estimate.data.suggested_bid)}</strong>.
                      </span>
                    </p>
                    <Button type="button" size="sm" variant="outline" onClick={() => setBid(String(estimate.data!.suggested_bid))}><Sparkles /> Use suggested bid</Button>
                  </div>
                )}
              </>
            )}
            <Field label="Negative keywords — one per line" hint="Never show your ad for searches containing these words (e.g. “cheap”, “used”).">
              <Textarea rows={3} value={negText} onChange={(e) => setNegText(e.target.value)} placeholder="cheap" />
            </Field>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <section className="space-y-3 rounded-xl border bg-card p-4" aria-labelledby="sum">
            <h2 id="sum" className="text-sm font-semibold">What you&apos;ll pay</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0" /> Pay per click only. Seeing your ad costs nothing.</li>
              <li className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0" /> Ads are ranked by <em>bid × quality</em>. A relevant, well-rated product can outrank a higher bid.</li>
              <li className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0" /> You pay just enough to beat the next advertiser — never more than your bid.</li>
            </ul>
            <dl className="space-y-1.5 border-t pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Max bid per click</dt><dd className="tabular-nums">{bidN ? rupees(bidN) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Max spend per day</dt><dd className="tabular-nums">{dailyN ? rupees(dailyN) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">GST {r ? `(${r.gst_pct}%)` : ""}</dt><dd className="tabular-nums">{dailyN && r ? rupees(dailyN * r.gst_pct / 100) : "—"}</dd></div>
              <div className="flex justify-between border-t pt-1.5 font-semibold"><dt>Max daily charge</dt><dd className="tabular-nums">{dailyN ? rupees(gross) : "—"}</dd></div>
              {bidN > 0 && dailyN > 0 && <p className="pt-1 text-xs text-muted-foreground">About {Math.floor(dailyN / bidN)}+ clicks a day at your max bid, more if you pay less.</p>}
            </dl>
            {wallet.data && (
              <p className={cn("rounded-md p-2 text-xs", wallet.data.balance >= gross && gross > 0 ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100")}>
                Ad wallet: <strong>{rupees(wallet.data.balance)}</strong>.{" "}
                {wallet.data.balance >= gross && gross > 0 ? "Enough for a full day." : <>Not enough for a full day — <Link href="/ads/wallet" className="underline">add money</Link> so it doesn&apos;t pause.</>}
              </p>
            )}
            {r?.campaigns_require_approval && <p className="text-xs text-muted-foreground">New campaigns are reviewed before going live.</p>}
            {problems.length > 0 && <ul className="list-disc space-y-0.5 pl-4 text-xs text-amber-700 dark:text-amber-300">{problems.slice(0, 3).map((p) => <li key={p}>{p}</li>)}</ul>}
            <div className="flex flex-col gap-2 pt-1">
              <Button onClick={() => submit(true)} disabled={create.isPending || problems.length > 0}>{r?.campaigns_require_approval && !isPlatform ? "Submit for review" : "Launch campaign"}</Button>
              <Button variant="outline" onClick={() => submit(false)} disabled={create.isPending || problems.length > 0}>Save as draft</Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
