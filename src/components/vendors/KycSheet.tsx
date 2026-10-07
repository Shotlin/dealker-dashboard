"use client"

import { useEffect, useState } from "react"
import { Building2, CheckCircle2, ExternalLink, FileText, Mail, MapPin, Phone, ShieldAlert, ShieldCheck, Store, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useKycActions, useKycDetail } from "@/hooks/useKyc"
import { cn, formatINR } from "@/lib/utils"
import type { KycAction, KycDocument, VendorStatus } from "@/types/kyc.types"

export const STATUS_META: Record<VendorStatus, { label: string; cls: string }> = {
  PENDING_ONBOARDING: { label: "Onboarding", cls: "bg-slate-100 text-slate-700" },
  KYC_SUBMITTED: { label: "KYC submitted", cls: "bg-blue-50 text-blue-700" },
  UNDER_REVIEW: { label: "Under review", cls: "bg-indigo-50 text-indigo-700" },
  CORRECTION_REQUIRED: { label: "Correction required", cls: "bg-orange-50 text-orange-700" },
  VERIFIED: { label: "Verified", cls: "bg-teal-50 text-teal-700" },
  ACTIVE: { label: "Active", cls: "bg-emerald-50 text-emerald-700" },
  SUSPENDED: { label: "Suspended", cls: "bg-red-50 text-red-700" },
  DEACTIVATED: { label: "Deactivated", cls: "bg-slate-100 text-slate-600" },
  REJECTED: { label: "Rejected", cls: "bg-red-50 text-red-700" },
}
export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  const m = STATUS_META[status]
  return <Badge variant="outline" className={cn("border-0 text-[11px] font-medium", m.cls)}>{m.label}</Badge>
}

const DOC_LABEL: Record<string, string> = {
  GSTIN_CERTIFICATE: "GST certificate", PAN_CARD: "PAN card", BANK_CANCELLED_CHEQUE: "Cancelled cheque", TRADE_LICENSE: "Trade licence", FSSAI_LICENSE: "FSSAI licence", OTHER: "Other",
}
const DOC_STATUS: Record<string, string> = { PENDING: "bg-amber-50 text-amber-700", VERIFIED: "bg-emerald-50 text-emerald-700", REJECTED: "bg-red-50 text-red-700", EXPIRED: "bg-slate-100 text-slate-600" }

const ACTIONS: Record<KycAction, { label: string; variant: "default" | "outline" | "destructive"; prompt: string; hint: string; noteLabel: string }> = {
  START_REVIEW: { label: "Start review", variant: "outline", prompt: "Start reviewing this application?", hint: "The vendor is told their documents are being checked.", noteLabel: "Note (optional)" },
  APPROVE: { label: "Approve KYC", variant: "default", prompt: "Approve this vendor's KYC?", hint: "Marks the business as verified. You can make the store live right after.", noteLabel: "Note (optional)" },
  ACTIVATE: { label: "Make store live", variant: "default", prompt: "Make this vendor's store live?", hint: "They can start listing products and receiving orders.", noteLabel: "Note (optional)" },
  REQUEST_CORRECTION: { label: "Request correction", variant: "outline", prompt: "What does the vendor need to fix?", hint: "They see this message in the app and can resubmit.", noteLabel: "Message to the vendor *" },
  REJECT: { label: "Reject", variant: "destructive", prompt: "Reject this application?", hint: "Use for fraudulent or ineligible businesses. The vendor sees your reason.", noteLabel: "Reason *" },
  SUSPEND: { label: "Suspend", variant: "destructive", prompt: "Suspend this vendor?", hint: "Their store goes offline and active listings are paused immediately.", noteLabel: "Reason *" },
  REINSTATE: { label: "Reinstate", variant: "default", prompt: "Reinstate this vendor?", hint: "The store goes live again. Paused listings stay paused until the vendor resumes them.", noteLabel: "Note (optional)" },
}

function Info({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return <p className="flex items-start gap-2 text-sm"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span>{children}</span></p>
}
function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || <span className="font-normal text-muted-foreground">Not provided</span>}</p>
    </div>
  )
}

export function KycSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading } = useKycDetail(id)
  const { review, reviewDoc } = useKycActions(id ?? "")
  const [pending, setPending] = useState<KycAction | null>(null)
  const [note, setNote] = useState("")
  const [override, setOverride] = useState(false)
  const [rejectDoc, setRejectDoc] = useState<KycDocument | null>(null)
  const [docReason, setDocReason] = useState("")
  const [tab, setTab] = useState("documents")

  useEffect(() => { setPending(null); setNote(""); setOverride(false); setTab("documents") }, [id])

  const v = data?.vendor
  const p = data?.profile
  const docs = data?.documents ?? []
  const verified = docs.filter((d) => d.status === "VERIFIED").length
  const allowed = data?.allowedActions ?? []
  const reviewable = v && ["KYC_SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUIRED"].includes(v.status)
  const meta = pending ? ACTIONS[pending] : null
  const needsNote = pending ? data?.allowedActions.find((a) => a.action === pending)?.needsNote || override : false
  const approveBlocked = pending === "APPROVE" && (docs.length === 0 || verified < docs.length)

  const run = () => {
    if (!pending) return
    review.mutate({ action: pending, comments: note.trim() || undefined, override: pending === "APPROVE" && override ? true : undefined }, { onSuccess: () => { setPending(null); setNote(""); setOverride(false) } })
  }

  return (
    <>
      <Sheet open={Boolean(id)} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="space-y-2 border-b px-5 py-4 text-left">
            <SheetTitle className="flex items-center gap-2 pr-6 text-lg">{v?.name ?? "Vendor"}{v && <VendorStatusBadge status={v.status} />}</SheetTitle>
            {v && p?.legal_name && <p className="text-sm text-muted-foreground">{p.legal_name}</p>}
          </SheetHeader>

          {isLoading || !data || !v ? (
            <div className="space-y-3 p-5"><Skeleton className="h-24" /><Skeleton className="h-48" /></div>
          ) : (
            <>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-5 p-5">
                  {reviewable && (
                    <div className={cn("flex items-center gap-3 rounded-xl border p-3 text-sm", verified === docs.length && docs.length > 0 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
                      {verified === docs.length && docs.length > 0 ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-amber-600" />}
                      <div>
                        <p className="font-medium">{verified} of {docs.length} documents verified</p>
                        <p className="text-xs text-muted-foreground">{verified === docs.length && docs.length > 0 ? "All documents check out — you can approve this vendor." : "Review each document in the Documents tab before approving."}</p>
                      </div>
                    </div>
                  )}

                  <Tabs value={tab} onValueChange={setTab}>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="documents">Documents</TabsTrigger>
                      <TabsTrigger value="business">Business</TabsTrigger>
                      <TabsTrigger value="activity">Activity</TabsTrigger>
                      <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="documents" className="mt-4 space-y-3">
                      {docs.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">The vendor hasn’t uploaded any documents yet.</p>}
                      {docs.map((d) => (
                        <div key={d.id} className="rounded-xl border p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><FileText className="h-4 w-4" /></span>
                              <div>
                                <p className="text-sm font-medium">{DOC_LABEL[d.document_type] ?? d.document_type}</p>
                                <p className="text-xs text-muted-foreground">{d.document_number ? `No. ${d.document_number} · ` : ""}Uploaded {new Date(d.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                                {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" />Open document</a>}
                              </div>
                            </div>
                            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", DOC_STATUS[d.status])}>{d.status === "REJECTED" ? "Rejected" : d.status === "VERIFIED" ? "Verified" : d.status === "PENDING" ? "Awaiting review" : "Expired"}</span>
                          </div>
                          {d.rejection_reason && <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">Rejected: {d.rejection_reason}</p>}
                          {d.reviewed_by_name && <p className="mt-1 text-[11px] text-muted-foreground">Reviewed by {d.reviewed_by_name}{d.reviewed_at ? ` · ${new Date(d.reviewed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}</p>}
                          <div className="mt-2 flex gap-2">
                            {d.status !== "VERIFIED" && <Button size="sm" variant="outline" className="text-emerald-700" disabled={reviewDoc.isPending} onClick={() => reviewDoc.mutate({ docId: d.id, status: "VERIFIED" })}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Verify</Button>}
                            {d.status !== "REJECTED" && <Button size="sm" variant="outline" className="text-red-600" onClick={() => { setRejectDoc(d); setDocReason("") }}><XCircle className="mr-1 h-3.5 w-3.5" />Reject</Button>}
                            {d.status !== "PENDING" && <Button size="sm" variant="ghost" disabled={reviewDoc.isPending} onClick={() => reviewDoc.mutate({ docId: d.id, status: "PENDING" })}>Reset</Button>}
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="business" className="mt-4 space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Legal name" value={p?.legal_name} />
                        <Field label="GSTIN" value={p?.gstin} />
                        <Field label="PAN" value={p?.pan_number} />
                        <Field label="Trade licence" value={p?.trade_license_number} />
                      </div>
                      <div className="space-y-2 rounded-xl border p-3">
                        <Info icon={MapPin}>{[p?.address_line1, p?.city, p?.state, p?.pincode].filter(Boolean).join(", ") || "No address provided"}</Info>
                        <Info icon={Mail}>{v.email}</Info>
                        <Info icon={Phone}>{v.phone}</Info>
                      </div>
                      {data.team.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team</p>
                          {data.team.map((t, i) => <p key={i} className="text-sm">{t.name || "Unnamed"} · {t.phone} · <span className="text-muted-foreground">{t.role.replace("VENDOR_", "").toLowerCase()}</span></p>)}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="activity" className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[["Listings", String(data.stats.listings)], ["Orders", String(data.stats.orders)], ["Delivered GMV", formatINR(data.stats.gmv)], ["B2B orders", String(data.stats.b2b_orders)]].map(([k, val]) => (
                          <div key={k} className="rounded-xl border p-3"><p className="text-lg font-semibold tabular-nums">{val}</p><p className="text-xs text-muted-foreground">{k}</p></div>
                        ))}
                      </div>
                      {data.shops.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                          <span className="flex items-center gap-2"><Store className="h-4 w-4 text-muted-foreground" /><span><span className="font-medium">{s.name}</span><br /><span className="text-xs text-muted-foreground">{s.city}, {s.state} {s.pincode}</span></span></span>
                          <span className="text-right text-xs text-muted-foreground">Commission {Number(s.commission_rate)}%<br />{s.is_active ? "Store live" : "Store offline"}</span>
                        </div>
                      ))}
                      {data.shops.length === 0 && <p className="text-sm text-muted-foreground">No store set up yet.</p>}
                    </TabsContent>

                    <TabsContent value="history" className="mt-4">
                      {data.history.length === 0 ? <p className="text-sm text-muted-foreground">No review activity yet.</p> : (
                        <ol className="space-y-4 border-l pl-4">
                          {data.history.map((h) => (
                            <li key={h.id} className="relative text-sm">
                              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                              <p className="font-medium">{h.action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                                <span className="font-normal text-muted-foreground"> · {h.previous_status.replace(/_/g, " ").toLowerCase()} → {h.new_status.replace(/_/g, " ").toLowerCase()}</span></p>
                              {h.comments && <p className="text-xs text-muted-foreground">“{h.comments}”</p>}
                              <p className="text-[11px] text-muted-foreground">{h.reviewer_name ?? "Vendor"} · {new Date(h.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
                            </li>
                          ))}
                        </ol>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </ScrollArea>

              {allowed.length > 0 && (
                <div className="flex flex-wrap justify-end gap-2 border-t bg-white p-4">
                  {allowed.map((a) => (
                    <Button key={a.action} variant={ACTIONS[a.action].variant} onClick={() => { setPending(a.action); setNote("") }}>{ACTIONS[a.action].label}</Button>
                  ))}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(pending)} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="sm:max-w-md">
          {meta && (
            <>
              <DialogHeader><DialogTitle>{meta.prompt}</DialogTitle><DialogDescription>{meta.hint}</DialogDescription></DialogHeader>
              {approveBlocked && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p>{docs.length === 0 ? "No documents have been uploaded." : `${docs.length - verified} document(s) are not verified yet.`}</p>
                  <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="h-4 w-4" />Approve anyway — I verified this vendor another way (note required)</label>
                </div>
              )}
              <div className="space-y-1.5">
                <p className="text-sm font-medium">{override ? "Override note *" : meta.noteLabel}</p>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={needsNote ? "This is shown to the vendor…" : "Optional"} />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
                <Button variant={meta.variant} disabled={review.isPending || (approveBlocked && !override) || (Boolean(needsNote) && !note.trim())} onClick={run}>{meta.label}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectDoc)} onOpenChange={(o) => !o && setRejectDoc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reject {rejectDoc ? DOC_LABEL[rejectDoc.document_type] : "document"}</DialogTitle><DialogDescription>The vendor sees this reason and can upload a new file.</DialogDescription></DialogHeader>
          <Textarea rows={3} value={docReason} onChange={(e) => setDocReason(e.target.value)} placeholder="e.g. Image is blurry — please upload a clear scan" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDoc(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!docReason.trim() || reviewDoc.isPending} onClick={() => rejectDoc && reviewDoc.mutate({ docId: rejectDoc.id, status: "REJECTED", reason: docReason }, { onSuccess: () => setRejectDoc(null) })}>Reject document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
