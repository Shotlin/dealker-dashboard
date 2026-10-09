"use client"

/**
 * Reviews — moderation queue. Submitted → Approved → Published (or Rejected /
 * Hidden / Removed). Product reviews and vendor (shop) reviews are separate
 * lists; customers only ever see PUBLISHED ones, and ratings count only those.
 */

import { useState } from "react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CheckCircle2, EyeOff, Flag, MessageSquare, ShieldAlert, Star, Trash2, Undo2, XCircle } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { StatCard } from "@/components/dashboard/StatCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useDebounce } from "@/hooks/useDebounce"
import { usePermissions } from "@/hooks/usePermissions"
import { cn, formatDateTime } from "@/lib/utils"
import { reviewsApi } from "@/services/reviews.service"
import type { ReviewAction, ReviewKind, ReviewRow, ReviewStatus } from "@/types/review.types"
import { ACTION_RULES, STATUS_META, actionsFor } from "./review-actions"

const errMsg = (e: unknown, fallback: string) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("h-3.5 w-3.5", i < rating ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted-foreground/30")} />
      ))}
    </span>
  )
}

const ACTION_ICON: Record<ReviewAction, React.ReactNode> = {
  APPROVE: <CheckCircle2 className="h-3.5 w-3.5" />,
  PUBLISH: <CheckCircle2 className="h-3.5 w-3.5" />,
  REJECT: <XCircle className="h-3.5 w-3.5" />,
  HIDE: <EyeOff className="h-3.5 w-3.5" />,
  REMOVE: <Trash2 className="h-3.5 w-3.5" />,
  RESTORE: <Undo2 className="h-3.5 w-3.5" />,
}

/** Asks for the written reason that reject / remove require (and allows one for the rest). */
function ReasonDialog({ action, count, busy, onCancel, onConfirm }: {
  action: ReviewAction | null; count: number; busy: boolean; onCancel: () => void; onConfirm: (note: string) => void
}) {
  const [note, setNote] = useState("")
  const rule = action ? ACTION_RULES[action] : null
  const need = !!rule?.reason
  return (
    <Dialog open={!!action} onOpenChange={(o) => { if (!o) { setNote(""); onCancel() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rule?.label} {count > 1 ? `${count} reviews` : "this review"}?</DialogTitle>
          <DialogDescription>{rule?.hint}</DialogDescription>
        </DialogHeader>
        <Textarea rows={3} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={need ? "Reason (required)" : "Note (optional)"} />
        <DialogFooter>
          <Button variant="outline" onClick={() => { setNote(""); onCancel() }}>Cancel</Button>
          <Button variant={rule?.danger ? "destructive" : "default"} disabled={busy || (need && note.trim().length < 3)}
            onClick={() => { onConfirm(note.trim()); setNote("") }}>
            {busy ? "Working…" : rule?.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReviewSheet({ kind, id, canModerate, onClose, onAction }: {
  kind: ReviewKind; id: string | null; canModerate: boolean; onClose: () => void; onAction: (ids: string[], a: ReviewAction) => void
}) {
  const qc = useQueryClient()
  const [reply, setReply] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState("")
  const q = useQuery({ queryKey: ["reviews", "detail", kind, id], queryFn: () => reviewsApi.get(kind, id!), enabled: !!id })
  const r = q.data
  const refresh = () => { qc.invalidateQueries({ queryKey: ["reviews"] }) }
  const replyM = useMutation({
    mutationFn: (text: string) => reviewsApi.reply(kind, id!, text),
    onSuccess: () => { toast.success("Reply saved"); setReply(null); refresh() },
    onError: (e) => toast.error(errMsg(e, "Could not save the reply")),
  })
  const flagM = useMutation({
    mutationFn: (v: { flagged: boolean; reason?: string }) => reviewsApi.flag(kind, id!, v.flagged, v.reason),
    onSuccess: () => { setFlagReason(""); refresh() },
    onError: (e) => toast.error(errMsg(e, "Could not update the flag")),
  })
  const replyText = reply ?? r?.admin_reply ?? ""
  return (
    <Sheet open={!!id} onOpenChange={(o) => { if (!o) { setReply(null); onClose() } }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="text-base">{r ? `${r.rating}★ review of ${r.subject_name}` : "Review"}</SheetTitle>
          {r && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className={cn("border-0 text-[11px]", STATUS_META[r.status].cls)}>{STATUS_META[r.status].label}</Badge>
              {formatDateTime(r.created_at)}
            </p>
          )}
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          {!r ? <div className="p-5"><Skeleton className="h-40 w-full" /></div> : (
            <div className="space-y-5 p-5">
              <div className="rounded-lg border p-3">
                <Stars rating={r.rating} />
                <p className="mt-2 whitespace-pre-wrap text-sm">{r.comment || <span className="text-muted-foreground">No written comment.</span>}</p>
              </div>
              <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Customer</dt><dd>{r.user_name}{r.user_phone ? ` · ${r.user_phone}` : ""}</dd>
                <dt className="text-muted-foreground">{kind === "PRODUCT" ? "Product" : "Vendor"}</dt><dd>{r.subject_name}</dd>
                {kind === "PRODUCT" && <><dt className="text-muted-foreground">Vendor</dt><dd>{r.vendor_name ?? "—"}</dd></>}
                <dt className="text-muted-foreground">Verified buy</dt><dd>{r.is_verified_purchase ? "Yes" : "No"}</dd>
                {r.moderated_at && <><dt className="text-muted-foreground">Last decision</dt><dd>{formatDateTime(r.moderated_at)}{r.moderation_note ? ` — ${r.moderation_note}` : ""}</dd></>}
              </dl>

              {canModerate && actionsFor(r.status).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {actionsFor(r.status).map((a) => (
                    <Button key={a} size="sm" variant={ACTION_RULES[a].danger ? "outline" : a === "PUBLISH" ? "default" : "outline"}
                      className={cn(ACTION_RULES[a].danger && "text-red-600")} onClick={() => onAction([r.id], a)}>
                      {ACTION_ICON[a]}<span className="ml-1">{ACTION_RULES[a].label}</span>
                    </Button>
                  ))}
                </div>
              )}

              {(r.flagged || r.reports.length > 0) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p className="flex items-center gap-1.5 font-medium text-amber-800"><ShieldAlert className="h-4 w-4" />Flagged{r.flag_reason ? ` — ${r.flag_reason}` : ""}</p>
                  {r.reports.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-amber-900">
                      {r.reports.map((p) => <li key={p.id}>“{p.reason}” — {p.reporter_name}, {formatDateTime(p.created_at)}</li>)}
                    </ul>
                  )}
                  {canModerate && r.flagged && <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" disabled={flagM.isPending} onClick={() => flagM.mutate({ flagged: false })}>Dismiss flag</Button>}
                </div>
              )}
              {canModerate && !r.flagged && r.status !== "REMOVED" && (
                <div className="flex gap-2">
                  <Input className="h-8 text-xs" value={flagReason} onChange={(e) => setFlagReason(e.target.value)} placeholder="Flag for a second look — why?" />
                  <Button size="sm" variant="outline" className="h-8" disabled={flagReason.trim().length < 3 || flagM.isPending}
                    onClick={() => flagM.mutate({ flagged: true, reason: flagReason.trim() })}><Flag className="mr-1 h-3.5 w-3.5" />Flag</Button>
                </div>
              )}

              {r.status !== "REMOVED" && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Public reply</p>
                  {canModerate ? (
                    <>
                      <Textarea rows={3} maxLength={1000} value={replyText} onChange={(e) => setReply(e.target.value)}
                        placeholder="Shown under the review once it is published" />
                      <Button size="sm" disabled={replyM.isPending || replyText.trim() === (r.admin_reply ?? "")} onClick={() => replyM.mutate(replyText)}>
                        <MessageSquare className="mr-1 h-3.5 w-3.5" />{replyM.isPending ? "Saving…" : replyText.trim() ? "Save reply" : "Clear reply"}
                      </Button>
                    </>
                  ) : <p className="text-sm">{r.admin_reply ?? <span className="text-muted-foreground">No reply.</span>}</p>}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

const FILTERS: [string, string][] = [
  ["SUBMITTED", "Awaiting"], ["APPROVED", "Approved"], ["PUBLISHED", "Published"],
  ["REJECTED", "Rejected"], ["HIDDEN", "Hidden"], ["REMOVED", "Removed"], ["ALL", "All"],
]

export default function ReviewsPage() {
  const qc = useQueryClient()
  const { can } = usePermissions()
  const canModerate = can("reviews.moderate")
  const [kind, setKind] = useState<ReviewKind>("PRODUCT")
  const [status, setStatus] = useState("SUBMITTED")
  const [rating, setRating] = useState("all")
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [pending, setPending] = useState<{ ids: string[]; action: ReviewAction } | null>(null)
  const debounced = useDebounce(search, 300)

  const summary = useQuery({ queryKey: ["reviews", "summary"], queryFn: reviewsApi.summary, refetchInterval: 60_000 })
  const list = useQuery({
    queryKey: ["reviews", "list", kind, status, rating, flaggedOnly, debounced, page],
    queryFn: () => reviewsApi.list(kind, { status, rating: rating === "all" ? "" : rating, flagged: flaggedOnly, search: debounced, page, limit: 25 }),
    placeholderData: keepPreviousData,
  })
  const rows = list.data?.data ?? []
  const meta = list.data?.pagination
  const s = summary.data
  const k = s ? (kind === "PRODUCT" ? s.product : s.vendor) : null

  const reset = () => { setPage(1); setSelected([]) }
  const done = () => { setPending(null); setSelected([]); qc.invalidateQueries({ queryKey: ["reviews"] }) }
  const act = useMutation({
    mutationFn: ({ ids, action, note }: { ids: string[]; action: ReviewAction; note: string }) =>
      ids.length === 1 ? reviewsApi.moderate(kind, ids[0], action, note).then(() => ({ done: ids, failed: [] as { id: string; reason: string }[] }))
        : reviewsApi.bulk(kind, ids, action, note),
    onSuccess: (res, v) => {
      if (res.failed.length) toast.warning(`${res.done.length} done, ${res.failed.length} skipped — ${res.failed[0].reason}`)
      else toast.success(`${ACTION_RULES[v.action].label}: ${res.done.length} review${res.done.length === 1 ? "" : "s"}`)
      done()
    },
    onError: (e) => { toast.error(errMsg(e, "Could not update the review")); setPending(null) },
  })
  const auto = useMutation({
    mutationFn: (v: boolean) => reviewsApi.setAutoPublish(v),
    onSuccess: (r) => { toast.success(r.auto_publish ? "New reviews now publish automatically" : "New reviews now wait for moderation"); qc.invalidateQueries({ queryKey: ["reviews", "summary"] }) },
    onError: (e) => toast.error(errMsg(e, "Could not change the setting")),
  })

  // run an action now, or ask for a reason first
  const request = (ids: string[], action: ReviewAction) => {
    if (ACTION_RULES[action].reason || ACTION_RULES[action].confirm) setPending({ ids, action })
    else act.mutate({ ids, action, note: "" })
  }
  const allOnPage = rows.length > 0 && rows.every((r) => selected.includes(r.id))
  const selectedRows = rows.filter((r) => selected.includes(r.id))
  const bulkActions = (["PUBLISH", "REJECT", "HIDE", "REMOVE"] as ReviewAction[]).filter((a) => selectedRows.length > 0 && selectedRows.every((r) => actionsFor(r.status).includes(a)))

  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" subtitle="Moderate customer reviews — only published ones are shown to customers and counted in ratings.">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Publish new reviews automatically
          <Switch checked={!!s?.settings.auto_publish} disabled={!canModerate || !s || auto.isPending} onCheckedChange={(v) => auto.mutate(v)} aria-label="Auto-publish new reviews" />
        </label>
      </PageHeader>

      <div className="flex rounded-lg border p-0.5 w-fit">
        {([["PRODUCT", "Product reviews", s?.product.pending], ["VENDOR", "Vendor reviews", s?.vendor.pending]] as const).map(([v, l, n]) => (
          <button key={v} type="button" onClick={() => { setKind(v); reset() }}
            className={cn("rounded-md px-4 py-1.5 text-sm font-medium", kind === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {l}{n ? <span className={cn("ml-2 rounded-full px-1.5 text-[11px]", kind === v ? "bg-white/20" : "bg-amber-100 text-amber-700")}>{n}</span> : null}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Awaiting moderation" value={k ? String(k.pending) : "—"} icon={<MessageSquare className="h-4 w-4 text-amber-500" />} />
        <StatCard label="1–2★ waiting" value={k ? String(k.lowPending) : "—"} icon={<ShieldAlert className="h-4 w-4 text-red-500" />} />
        <StatCard label="Flagged / reported" value={k ? `${k.flagged} / ${k.reported}` : "—"} icon={<Flag className="h-4 w-4 text-orange-500" />} />
        <StatCard label="Published · avg rating" value={k ? `${k.byStatus.PUBLISHED} · ${k.avgPublished.toFixed(2)}★` : "—"} icon={<Star className="h-4 w-4 text-yellow-500" />} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap rounded-lg border p-0.5">
          {FILTERS.map(([v, l]) => (
            <button key={v} type="button" onClick={() => { setStatus(v); reset() }}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium", status === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {l}{k && v !== "ALL" ? <span className="ml-1 opacity-70">{k.byStatus[v as ReviewStatus]}</span> : null}
            </button>
          ))}
        </div>
        <Select value={rating} onValueChange={(v) => { setRating(v); reset() }}>
          <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any rating</SelectItem>
            {[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n} star{n > 1 ? "s" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 text-xs">
          <Checkbox checked={flaggedOnly} onCheckedChange={(v) => { setFlaggedOnly(v === true); reset() }} aria-label="Flagged only" />Flagged only
        </label>
        <Input className="h-9 w-[240px] text-xs" placeholder={kind === "PRODUCT" ? "Search comment, customer, product…" : "Search comment, customer, vendor…"}
          value={search} onChange={(e) => { setSearch(e.target.value); reset() }} />
      </div>

      {selected.length > 0 && canModerate && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm" data-testid="review-bulk-bar">
          <span className="font-medium">{selected.length} selected</span>
          {bulkActions.length === 0 && <span className="text-xs text-muted-foreground">These reviews have no action in common.</span>}
          {bulkActions.map((a) => (
            <Button key={a} size="sm" variant={a === "PUBLISH" ? "default" : "outline"} className={cn("h-8", ACTION_RULES[a].danger && "text-red-600")} onClick={() => request(selected, a)}>
              {ACTION_ICON[a]}<span className="ml-1">{ACTION_RULES[a].label}</span>
            </Button>
          ))}
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelected([])}>Clear</Button>
        </div>
      )}

      {list.isError ? <QueryErrorBlock error={list.error} onRetry={() => list.refetch()} /> : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">{canModerate && <Checkbox checked={allOnPage} aria-label="Select all on this page" onCheckedChange={(v) => setSelected(v === true ? rows.map((r) => r.id) : [])} />}</TableHead>
                <TableHead>Review</TableHead><TableHead>Customer</TableHead><TableHead>{kind === "PRODUCT" ? "Product" : "Vendor"}</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-11 w-full" /></TableCell></TableRow>)
                : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="h-36 text-center text-muted-foreground"><CheckCircle2 className="mx-auto mb-1 h-6 w-6 opacity-40" />{status === "SUBMITTED" ? "Nothing waiting — the queue is clear." : "No reviews for these filters."}</TableCell></TableRow>
                : rows.map((r: ReviewRow) => (
                  <TableRow key={r.id} className="cursor-pointer" data-testid="review-row" onClick={() => setOpenId(r.id)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {canModerate && <Checkbox checked={selected.includes(r.id)} aria-label="Select review" onCheckedChange={(v) => setSelected((cur) => v === true ? [...cur, r.id] : cur.filter((x) => x !== r.id))} />}
                    </TableCell>
                    <TableCell className="max-w-[360px]">
                      <Stars rating={r.rating} />
                      <p className="mt-1 line-clamp-2 text-sm">{r.comment || <span className="text-muted-foreground">No comment</span>}</p>
                      {r.admin_reply && <p className="mt-0.5 truncate text-xs text-muted-foreground">↳ Replied: {r.admin_reply}</p>}
                    </TableCell>
                    <TableCell className="text-sm">{r.user_name}</TableCell>
                    <TableCell className="max-w-[200px]"><p className="truncate text-sm">{r.subject_name}</p>{kind === "PRODUCT" && r.vendor_name && <p className="truncate text-xs text-muted-foreground">{r.vendor_name}</p>}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(r.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-0 text-[11px]", STATUS_META[r.status].cls)}>{STATUS_META[r.status].label}</Badge>
                      {(r.flagged || r.report_count > 0) && <p className="mt-0.5 flex items-center gap-1 text-[11px] text-orange-600"><Flag className="h-3 w-3" />{r.report_count > 0 ? `${r.report_count} report${r.report_count > 1 ? "s" : ""}` : "flagged"}</p>}
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
          Page {meta.page} of {meta.totalPages} · {meta.total} reviews
          <Button variant="ghost" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <ReviewSheet kind={kind} id={openId} canModerate={canModerate} onClose={() => setOpenId(null)} onAction={(ids, a) => request(ids, a)} />
      <ReasonDialog action={pending?.action ?? null} count={pending?.ids.length ?? 0} busy={act.isPending}
        onCancel={() => setPending(null)} onConfirm={(note) => pending && act.mutate({ ...pending, note })} />
    </div>
  )
}
