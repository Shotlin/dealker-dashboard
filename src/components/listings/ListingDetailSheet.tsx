"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Battery, CheckCircle2, Pencil, ShieldCheck, Truck, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useListing, useListingActions } from "@/hooks/useListings"
import { formatINR } from "@/lib/utils"
import { QcBadge } from "@/components/qc/QcBadge"
import { QcPanel } from "@/components/qc/QcPanel"
import { InvoicePanel } from "@/components/invoices/InvoicePanel"
import { ApprovalBadge, CONDITION_META, ConditionBadge, OwnerBadge } from "./badges"

function Fact({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

export function ListingDetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: l, isLoading } = useListing(id)
  const actions = useListingActions()
  const [active, setActive] = useState(0)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")

  useEffect(() => { setActive(0); setRejecting(false); setReason("") }, [id])

  return (
    <Sheet open={Boolean(id)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="pr-6 text-base leading-snug">{l?.name ?? "Listing"}</SheetTitle>
          {l && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <ConditionBadge condition={l.condition} />
              <ApprovalBadge status={l.approval_status} />
              <QcBadge status={l.qc_status} score={l.qc_score} />
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                Listed by <OwnerBadge type={l.owner_type} name={l.owner_name} />
              </span>
            </div>
          )}
        </SheetHeader>

        {isLoading || !l ? (
          <div className="space-y-3 p-5"><Skeleton className="aspect-square w-full" /><Skeleton className="h-6 w-2/3" /></div>
        ) : (
          <>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-5 p-5">
                <div className="space-y-2">
                  <div className="aspect-square overflow-hidden rounded-xl border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.images[active]} alt={l.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex gap-2 overflow-x-auto">
                    {l.images.map((src, i) => (
                      <button key={src} type="button" onClick={() => setActive(i)}
                        className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === active ? "border-primary" : "border-transparent"}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">{formatINR(l.selling_price)}</p>
                    {l.mrp && l.mrp > l.selling_price && (
                      <p className="text-sm text-muted-foreground">
                        <span className="line-through">{formatINR(l.mrp)}</span>{" "}
                        <span className="font-medium text-emerald-600">{Math.round((1 - l.selling_price / l.mrp) * 100)}% off</span>
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{l.stock_quantity} in stock · {l.sold_count} sold</p>
                </div>

                {l.rejection_reason && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <p className="font-medium">Changes requested</p>
                    <p>{l.rejection_reason}</p>
                  </div>
                )}

                <section>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Condition</h3>
                  <p className="text-sm text-muted-foreground">{CONDITION_META[l.condition].hint}</p>
                  <dl className="mt-1 divide-y">
                    <Fact label="Seller's notes" value={l.condition_notes} />
                    <Fact label="Used for" value={l.usage_duration} />
                    <Fact label="Battery health" value={l.battery_health ? <span className="flex items-center gap-1"><Battery className="h-3.5 w-3.5" />{l.battery_health}%</span> : null} />
                    <Fact label="Warranty" value={l.warranty_info && <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />{l.warranty_info}</span>} />
                    <Fact label="In the box" value={l.accessories_included} />
                    <Fact label="Serial number (private)" value={l.serial_number} />
                    <Fact label="IMEI (private)" value={l.imei} />
                  </dl>
                </section>

                <Separator />
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quality check</h3>
                  <QcPanel listingId={l.id} />
                </section>

                <Separator />
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Purchase invoice</h3>
                  <InvoicePanel listingId={l.id} defaultImei={l.imei ?? l.serial_number} />
                </section>

                <Separator />
                <section>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</h3>
                  <dl className="divide-y">
                    <Fact label="Brand" value={l.brand} />
                    <Fact label="Category" value={l.category_name} />
                    <Fact label="SKU" value={l.seller_sku} />
                    <Fact label="Delivery" value={<span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" />Ships in {l.handling_time_days ?? 2} days{l.cod_eligible ? " · COD" : ""}</span>} />
                    {Object.entries(l.specifications).map(([k, v]) => <Fact key={k} label={k} value={v} />)}
                  </dl>
                  {l.description && <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{l.description}</p>}
                </section>
              </div>
            </ScrollArea>

            <div className="space-y-3 border-t bg-white p-4">
              {rejecting ? (
                <>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                    placeholder="Tell the seller what to fix (e.g. photos are blurry, condition not described)…" />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
                    <Button variant="destructive" disabled={!reason.trim() || actions.reject.isPending}
                      onClick={() => actions.reject.mutate({ id: l.id, reason }, { onSuccess: () => { setRejecting(false); onClose() } })}>
                      Send back to seller
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" asChild><Link href={`/products/${l.id}/edit`}><Pencil className="mr-1.5 h-4 w-4" />Edit</Link></Button>
                  <div className="ml-auto flex gap-2">
                    {l.approval_status !== "REJECTED" && (
                      <Button variant="outline" className="text-red-600" onClick={() => setRejecting(true)}><XCircle className="mr-1.5 h-4 w-4" />Request changes</Button>
                    )}
                    {l.approval_status !== "APPROVED" && (
                      <Button disabled={actions.approve.isPending} onClick={() => actions.approve.mutate(l.id, { onSuccess: onClose })}>
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />Approve
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
