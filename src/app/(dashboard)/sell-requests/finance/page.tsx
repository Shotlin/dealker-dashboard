"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Banknote, Check, Eye, Landmark, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { formatMoney } from "@/lib/utils"
import { PageHeader } from "@/components/shared/PageHeader"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SellRequestDetailSheet } from "@/components/sell-requests/SellRequestDetailSheet"
import { useFinanceQueue, useJourneyAction } from "@/hooks/useSellRequests"
import { journeyApi, type FinanceRow } from "@/services/sell-requests.service"

type Kind = "fund" | "payout" | "refund"

function Table({ title, hint, rows, kind, onOpen, onAct, onReveal, empty }: {
  title: string; hint: string; rows: FinanceRow[]; kind: Kind; onOpen: (id: string) => void; onAct: (r: FinanceRow, k: Kind) => void; onReveal?: (r: FinanceRow) => void; empty: string
}) {
  return (
    <section className="space-y-2">
      <div><h2 className="text-sm font-semibold">{title} <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{rows.length}</span></h2><p className="text-xs text-muted-foreground">{hint}</p></div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground"><tr>{["Request", "Phone", "Customer", "Buyer", kind === "payout" ? "Send to customer" : "Amount", kind === "payout" ? "Method" : "", ""].map((h, i) => <th key={i} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-2.5"><button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => onOpen(r.id)}>{r.code}</button></td>
                <td className="px-3 py-2.5">{r.device}</td><td className="px-3 py-2.5">{r.customer}</td><td className="px-3 py-2.5">{r.vendor ?? "—"}</td>
                <td className="px-3 py-2.5 font-semibold tabular-nums">{formatMoney((kind === "payout" ? r.payoutAmount : kind === "refund" ? r.heldAmount : r.amount) ?? 0)}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{kind === "payout" ? r.payoutDisplay : ""}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  {kind === "payout" && onReveal && <Button size="sm" variant="outline" className="mr-1.5 h-7" onClick={() => onReveal(r)}><Eye /> Details</Button>}
                  <Button size="sm" className="h-7" onClick={() => onAct(r, kind)}>{kind === "fund" ? <><ShieldCheck /> Confirm</> : kind === "payout" ? <><Check /> Mark paid</> : <><Landmark /> Mark refunded</>}</Button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function SellFinancePage() {
  const q = useFinanceQueue()
  const act = useJourneyAction()
  const [open, setOpen] = useState<string | null>(null)
  const [dlg, setDlg] = useState<{ row: FinanceRow; kind: Kind } | null>(null)
  const [ref, setRef] = useState("")
  const [reveal, setReveal] = useState<Awaited<ReturnType<typeof journeyApi.payoutDetails>> | null>(null)

  const submit = () => {
    if (!dlg) return
    if (ref.trim().length < 6) return toast.error("Enter the bank / UTR reference (at least 6 characters)")
    const { row, kind } = dlg
    const c = kind === "fund" ? ({ type: "fundingConfirm", id: row.id, method: "BANK", reference: ref.trim() } as const)
      : kind === "payout" ? ({ type: "payoutPaid", id: row.id, reference: ref.trim() } as const) : ({ type: "refundPaid", id: row.id, reference: ref.trim() } as const)
    act.mutate(c, { onSuccess: () => { setDlg(null); setRef(""); setReveal(null) } })
  }
  const TITLE: Record<Kind, [string, string, string]> = {
    fund: ["Confirm the buyer's payment", "Enter the bank / UPI reference of the money you received. The pickup is unlocked once confirmed.", "Confirm received"],
    payout: ["Mark the customer payout as sent", "After transferring the money, enter the bank's UTR. The customer is notified.", "Mark paid"],
    refund: ["Mark the buyer refunded", "Enter the reference of the refund sent back to the buyer.", "Mark refunded"],
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sell payouts" subtitle="Money moving in the sell-your-phone journey: buyers paying in, customers being paid out, and refunds.">
        <Button asChild variant="outline"><Link href="/sell-requests"><ArrowLeft /> Sell requests</Link></Button>
      </PageHeader>
      {q.isLoading && <Skeleton className="h-64 w-full" />}
      {q.isError && <QueryErrorBlock error={q.error} onRetry={() => q.refetch()} />}
      {q.data && <>
        <Table title="Buyer payments to confirm" hint="A buyer says it paid. Confirm the money arrived — only then is the pickup arranged." rows={q.data.fundingToConfirm} kind="fund" onOpen={setOpen} onAct={(row, kind) => setDlg({ row, kind })} empty="No payments waiting." />
        <Table title="Customer payouts to send" hint="The customer chose UPI or bank transfer. Send the money, then mark it paid with the bank reference." rows={q.data.payoutsToSend} kind="payout" onOpen={setOpen} onAct={(row, kind) => setDlg({ row, kind })}
          onReveal={async (r) => { try { setReveal(await journeyApi.payoutDetails(r.id)) } catch { toast.error("Could not load the payout details") } }} empty="No payouts waiting." />
        <Table title="Buyer refunds to send" hint="A sale fell through or the price dropped. Return the buyer's money." rows={q.data.refundsToSend} kind="refund" onOpen={setOpen} onAct={(row, kind) => setDlg({ row, kind })} empty="No refunds waiting." />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Banknote className="h-3.5 w-3.5" aria-hidden />Instant automatic payouts need RazorpayX enabled on your Razorpay account; until then payouts are sent from your bank and recorded here.</p>
      </>}

      <Dialog open={!!dlg} onOpenChange={(o) => { if (!o) { setDlg(null); setRef("") } }}>
        <DialogContent>
          {dlg && <>
            <DialogHeader><DialogTitle>{TITLE[dlg.kind][0]}</DialogTitle><DialogDescription>{dlg.row.code} · {TITLE[dlg.kind][1]}</DialogDescription></DialogHeader>
            <div className="space-y-1.5"><Label htmlFor="fin-ref">Reference</Label><Input id="fin-ref" value={ref} onChange={(e) => setRef(e.target.value)} /></div>
            <DialogFooter><Button variant="outline" onClick={() => setDlg(null)}>Cancel</Button><Button disabled={act.isPending} onClick={submit}>{TITLE[dlg.kind][2]}</Button></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
      <Dialog open={!!reveal} onOpenChange={(o) => { if (!o) setReveal(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send the money to</DialogTitle><DialogDescription>Shown to finance only. Viewing is logged.</DialogDescription></DialogHeader>
          {reveal && (
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Method</dt><dd className="font-medium">{reveal.method}</dd></div>
              {reveal.upiId && <div className="flex justify-between"><dt className="text-muted-foreground">UPI ID</dt><dd className="font-mono">{reveal.upiId}</dd></div>}
              {reveal.holderName && <div className="flex justify-between"><dt className="text-muted-foreground">Account holder</dt><dd className="font-medium">{reveal.holderName}</dd></div>}
              {reveal.accountNumber && <div className="flex justify-between"><dt className="text-muted-foreground">Account number</dt><dd className="font-mono">{reveal.accountNumber}</dd></div>}
              {reveal.ifsc && <div className="flex justify-between"><dt className="text-muted-foreground">IFSC</dt><dd className="font-mono">{reveal.ifsc}</dd></div>}
            </dl>
          )}
          <DialogFooter><Button onClick={() => setReveal(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <SellRequestDetailSheet id={open} onClose={() => setOpen(null)} />
    </div>
  )
}
