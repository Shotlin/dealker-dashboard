"use client"

/**
 * Abandoned carts — B2B. Vendor-to-vendor orders left unpaid: buyer, products,
 * quantity, wholesale value, last activity, and a follow-up log.
 */

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, IndianRupee, PhoneCall, XCircle } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { StatCard } from "@/components/dashboard/StatCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useDebounce } from "@/hooks/useDebounce"
import { cn, formatDateTime } from "@/lib/utils"
import { abandonedB2bApi } from "@/services/abandoned-b2b.service"
import type { B2bAbandonedRow, B2bFollowUp, B2bState } from "@/services/abandoned-b2b.service"

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
const STATE: Record<B2bState, { label: string; cls: string }> = {
  OPEN: { label: "Not contacted", cls: "bg-amber-50 text-amber-700" },
  CONTACTED: { label: "Contacted", cls: "bg-sky-50 text-sky-700" },
  WILL_PAY: { label: "Will pay", cls: "bg-violet-50 text-violet-700" },
  LOST: { label: "Lost", cls: "bg-slate-100 text-slate-600" },
  RECOVERED: { label: "Recovered", cls: "bg-emerald-50 text-emerald-700" },
}

function FollowUpSheet({ row, onClose }: { row: B2bAbandonedRow | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [status, setStatus] = useState<B2bFollowUp["status"]>("CONTACTED")
  const [note, setNote] = useState("")
  const history = useQuery({ queryKey: ["abandoned-b2b", "history", row?.id], queryFn: () => abandonedB2bApi.history(row!.id), enabled: !!row })
  const save = useMutation({
    mutationFn: () => abandonedB2bApi.followUp(row!.id, { status, note: note.trim() }),
    onSuccess: () => { toast.success("Follow-up saved"); setNote(""); qc.invalidateQueries({ queryKey: ["abandoned-b2b"] }) },
    onError: (e) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not save"),
  })
  const closed = row?.state === "RECOVERED"
  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="text-base">{row?.order_number} · {row?.buyer_name}</SheetTitle>
          {row && <p className="text-xs text-muted-foreground">{row.product_name} × {row.quantity} · {inr(row.subtotal)} wholesale</p>}
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          {row && (
            <div className="space-y-5 p-5">
              <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Buyer</dt><dd>{row.buyer_name}{row.buyer_city ? ` · ${row.buyer_city}` : ""}</dd>
                <dt className="text-muted-foreground">Phone</dt><dd>{row.buyer_phone ?? "—"}</dd>
                <dt className="text-muted-foreground">Email</dt><dd>{row.buyer_email ?? "—"}</dd>
                <dt className="text-muted-foreground">Seller</dt><dd>{row.seller_name}</dd>
                <dt className="text-muted-foreground">Started</dt><dd>{formatDateTime(row.created_at)}</dd>
                <dt className="text-muted-foreground">Last activity</dt><dd>{formatDateTime(row.updated_at)} ({row.idle_hours} h ago)</dd>
              </dl>
              {!closed && row.state !== "LOST" && (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Log a follow-up</p>
                  <Select value={status} onValueChange={(v) => setStatus(v as B2bFollowUp["status"])}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONTACTED">I contacted the buyer</SelectItem>
                      <SelectItem value="WILL_PAY">Buyer said they will pay</SelectItem>
                      <SelectItem value="LOST">Buyer will not buy (lost)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was said?" />
                  <Button size="sm" disabled={note.trim().length < 3 || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save follow-up"}</Button>
                </div>
              )}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
                <ul className="divide-y rounded-lg border text-sm">
                  {history.isLoading && <li className="p-3"><Skeleton className="h-8 w-full" /></li>}
                  {history.data?.length === 0 && <li className="p-3 text-muted-foreground">Nobody has followed up yet.</li>}
                  {history.data?.map((h) => (
                    <li key={h.id} className="px-3 py-2">
                      <p className="flex items-center gap-2"><Badge variant="outline" className="text-[10px]">{h.status.replace("_", " ").toLowerCase()}</Badge><span className="text-xs text-muted-foreground">{h.by_name ?? "Admin"} · {formatDateTime(h.created_at)}</span></p>
                      <p className="mt-0.5">{h.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <Button variant="outline" size="sm" asChild><Link href="/vendors-marketplace">Open in B2B marketplace</Link></Button>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

export default function AbandonedB2bPage() {
  const [state, setState] = useState("")
  const [hours, setHours] = useState(24)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<B2bAbandonedRow | null>(null)
  const debounced = useDebounce(search, 300)
  const summary = useQuery({ queryKey: ["abandoned-b2b", "summary", hours], queryFn: () => abandonedB2bApi.summary(hours), refetchInterval: 60_000 })
  const list = useQuery({ queryKey: ["abandoned-b2b", "list", state, hours, debounced, page], queryFn: () => abandonedB2bApi.list({ state, hours, search: debounced, page, limit: 25 }), placeholderData: keepPreviousData })
  const s = summary.data
  const rows = list.data?.data ?? []
  const meta = list.data?.meta

  return (
    <div className="space-y-6">
      <PageHeader title="Abandoned carts · B2B" subtitle="Vendor orders that were started but never paid — chase the buyer and track what you recover.">
        <Button size="sm" variant="outline" asChild><Link href="/abandoned-carts">B2C carts</Link></Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Not contacted" value={s ? String(s.open) : "—"} icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} />
        <StatCard label="Wholesale value at risk" value={s ? inr(s.atRiskValue) : "—"} icon={<IndianRupee className="h-4 w-4 text-red-500" />} />
        <StatCard label="In follow-up" value={s ? String(s.contacted + s.willPay) : "—"} icon={<PhoneCall className="h-4 w-4 text-sky-500" />} />
        <StatCard label="Recovered" value={s ? `${s.recovered} · ${inr(s.recoveredValue)}` : "—"} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap rounded-lg border p-0.5">
          {[["", "All"], ["OPEN", "Not contacted"], ["CONTACTED", "Contacted"], ["WILL_PAY", "Will pay"], ["RECOVERED", "Recovered"], ["LOST", "Lost"]].map(([v, l]) => (
            <button key={v || "all"} type="button" onClick={() => { setState(v); setPage(1) }}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium", state === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>
        <Select value={String(hours)} onValueChange={(v) => { setHours(Number(v)); setPage(1) }}>
          <SelectTrigger className="h-9 w-[190px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[[6, "Unpaid for 6 h+"], [24, "Unpaid for 24 h+"], [72, "Unpaid for 3 days+"], [168, "Unpaid for 7 days+"]].map(([h, l]) => <SelectItem key={h} value={String(h)}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="h-9 w-[240px] text-xs" placeholder="Search buyer, seller, product…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      {list.isError ? <QueryErrorBlock error={list.error} onRetry={() => list.refetch()} /> : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Buyer vendor</TableHead><TableHead>Products</TableHead><TableHead className="text-right">Wholesale value</TableHead><TableHead>Last activity</TableHead><TableHead>Follow-up</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-11 w-full" /></TableCell></TableRow>)
                : rows.length === 0 ? <TableRow><TableCell colSpan={5} className="h-36 text-center text-muted-foreground"><XCircle className="mx-auto mb-1 h-6 w-6 opacity-40" />No abandoned B2B carts for these filters.</TableCell></TableRow>
                : rows.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" data-testid="b2b-abandoned-row" onClick={() => setOpen(r)}>
                    <TableCell><p className="text-sm font-medium">{r.buyer_name}</p><p className="text-xs text-muted-foreground">{r.buyer_phone ?? r.buyer_email ?? ""}{r.buyer_city ? ` · ${r.buyer_city}` : ""}</p></TableCell>
                    <TableCell><p className="max-w-[240px] truncate text-sm">{r.product_name}</p><p className="text-xs text-muted-foreground">{r.quantity} units · from {r.seller_name}</p></TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">{inr(r.subtotal)}<span className="block text-xs font-normal text-muted-foreground">{inr(r.unit_price)} / unit</span></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.updated_at)}<br />{r.idle_hours} h idle</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-0 text-[11px]", STATE[r.state].cls)}>{STATE[r.state].label}</Badge>
                      {r.follow_up_note && <p className="mt-0.5 max-w-[200px] truncate text-xs text-muted-foreground">{r.follow_up_note}</p>}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          Page {meta.page} of {meta.totalPages}
          <Button variant="ghost" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
      <FollowUpSheet row={open ? rows.find((r) => r.id === open.id) ?? open : null} onClose={() => setOpen(null)} />
    </div>
  )
}
