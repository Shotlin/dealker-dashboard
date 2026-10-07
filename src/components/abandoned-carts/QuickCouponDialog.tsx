"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Check, Copy, Gift, Loader2, Percent, Truck, IndianRupee } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useQuickCouponMeta, useSendQuickCoupon } from "@/hooks/useAbandonedCarts"
import { formatINR, cn } from "@/lib/utils"
import type { QuickCouponPreset, QuickCouponResult } from "@/types/abandoned-cart.types"

const VALIDITY_OPTIONS = [
  { hours: 24, label: "24 hours" },
  { hours: 48, label: "48 hours" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
]

function presetIcon(p: QuickCouponPreset) {
  if (p.discountType === "PERCENTAGE") return <Percent className="h-4 w-4" />
  if (p.discountType === "FLAT") return <IndianRupee className="h-4 w-4" />
  return <Truck className="h-4 w-4" />
}

function presetCaption(p: QuickCouponPreset) {
  const parts: string[] = []
  if (p.minOrderAmount > 0) parts.push(`min ${formatINR(p.minOrderAmount)}`)
  if (p.maxDiscount) parts.push(`up to ${formatINR(p.maxDiscount)}`)
  return parts.length ? parts.join(" · ") : "no minimum"
}

interface QuickCouponDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** One abandoned-cart episode (row action) or many (bulk). Each customer gets their own single-use code. */
  cartIds: string[]
}

/**
 * One-click recovery offer. Each selected customer gets a freshly generated,
 * single-use coupon locked to them (so codes can't be shared or leaked),
 * optionally announced by push + in-app notification in the same step.
 */
export function QuickCouponDialog({ open, onOpenChange, cartIds }: QuickCouponDialogProps) {
  const { data: meta } = useQuickCouponMeta()
  const send = useSendQuickCoupon()
  const [preset, setPreset] = useState("PERCENT_10")
  const [validHours, setValidHours] = useState(48)
  const [notify, setNotify] = useState(true)
  const [results, setResults] = useState<QuickCouponResult[] | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const count = cartIds.length

  function close(v: boolean) {
    if (!v) {
      setResults(null)
      setCopied(null)
    }
    onOpenChange(v)
  }

  async function handleSend() {
    setBusy(true)
    const done: QuickCouponResult[] = []
    let failed = 0
    let firstError = ""
    // Sequential: each call mints a unique code and writes to the same
    // coupon tables; one-by-one keeps load predictable and errors attributable.
    for (const id of cartIds) {
      try {
        done.push(await send.mutateAsync({ id, payload: { preset, validHours, notify } }))
      } catch (err) {
        failed++
        if (!firstError) {
          firstError =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ""
        }
      }
    }
    setBusy(false)
    if (done.length > 0) {
      setResults(done)
      toast.success(
        done.length === 1
          ? `Coupon ${done[0].code} sent`
          : `Quick coupon sent to ${done.length} customers`,
      )
    }
    if (failed > 0) {
      toast.error(
        `${failed} could not be sent${firstError ? `: ${firstError}` : " (cart may no longer be open)"}`,
      )
    }
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      /* clipboard unavailable — code is still visible */
    }
  }

  const selected = meta?.presets.find((p) => p.key === preset)

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-brand-500" />
            Quick Coupon {count > 1 ? `· ${count} customers` : ""}
          </DialogTitle>
          <DialogDescription>
            A single-use coupon is created just for {count > 1 ? "each customer" : "this customer"} and can&apos;t be
            used by anyone else.
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-green-700">
              {results.length === 1 ? "Coupon created" : `${results.length} coupons created`}
              {notify ? " and customers notified." : "."}
            </p>
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {results.map((r) => (
                <div key={r.couponId} className="flex items-center justify-between rounded-lg border bg-muted/40 p-2.5">
                  <div>
                    <p className="font-mono text-sm font-semibold">{r.code}</p>
                    <p className="text-[11px] text-muted-foreground">
                      valid until {new Date(r.validUntil).toLocaleString("en-IN")}
                      {notify && !r.notificationId && r.notifyNote ? ` · not notified: ${r.notifyNote}` : ""}
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => copy(r.code)}>
                    {copied === r.code ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => close(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Offer</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(meta?.presets ?? []).map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPreset(p.key)}
                    className={cn(
                      "rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/50",
                      preset === p.key && "border-brand-500 bg-brand-50 ring-1 ring-brand-500",
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      {presetIcon(p)}
                      {p.label}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{presetCaption(p)}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Valid for</Label>
              <Select value={String(validHours)} onValueChange={(v) => setValidHours(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALIDITY_OPTIONS.map((o) => (
                    <SelectItem key={o.hours} value={String(o.hours)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="qc-notify" checked={notify} onCheckedChange={(v) => setNotify(v === true)} />
              <Label htmlFor="qc-notify" className="text-sm font-normal leading-snug">
                Notify the customer now (push + in-app) with the code, their cart value and the expiry
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSend} disabled={busy || count === 0 || !selected}>
                {busy ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Sending…
                  </>
                ) : (
                  `Send ${selected?.label ?? "coupon"}${count > 1 ? ` to ${count}` : ""}`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
