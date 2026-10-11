"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Search, ShieldBan, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useDebounce } from "@/hooks/useDebounce"
import { useBlockImei, useBlocklist, useUnblockImei } from "@/hooks/useSellRequests"
import { isValidImei } from "@/services/sell-requests.service"

const SOURCES: Array<[string, string]> = [["MANUAL", "Added by us"], ["POLICE", "Police / FIR"], ["CEIR", "CEIR blocked"], ["CUSTOMER_DISPUTE", "Customer dispute"], ["PROVIDER", "IMEI check provider"]]

export default function ImeiBlocklistPage() {
  const [q, setQ] = useState("")
  const search = useDebounce(q, 300)
  const list = useBlocklist(search)
  const block = useBlockImei()
  const unblock = useUnblockImei()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ imei: "", reason: "", source: "MANUAL" })
  const [removing, setRemoving] = useState<string | null>(null)

  const submit = () => {
    if (!isValidImei(f.imei)) return toast.error("IMEI must be 15 digits and pass the checksum")
    if (!f.reason.trim()) return toast.error("A reason is required")
    block.mutate({ ...f, reason: f.reason.trim() }, { onSuccess: () => { setOpen(false); setF({ imei: "", reason: "", source: "MANUAL" }) } })
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Blocked IMEIs" subtitle="Devices that can never be listed for sale — stolen, police-reported or in dispute. Customers see only “this device cannot be sold”.">
        <Button asChild variant="outline"><Link href="/sell-requests"><ArrowLeft /> Sell requests</Link></Button>
        <Button onClick={() => setOpen(true)}><Plus /> Block an IMEI</Button>
      </PageHeader>
      <div className="relative w-72"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
        <Input aria-label="Search IMEI" className="pl-8" placeholder="IMEI…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {list.isError ? <QueryErrorBlock error={list.error} onRetry={() => list.refetch()} /> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground"><tr>{["IMEI", "Reason", "Source", "Added by", "Added", ""].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {list.isLoading && Array.from({ length: 4 }, (_, i) => <tr key={i}><td colSpan={6} className="p-2"><Skeleton className="h-9 w-full" /></td></tr>)}
              {list.data?.items.map((b) => (
                <tr key={b.imei} className="border-b last:border-0">
                  <td className="px-3 py-2.5 font-mono text-xs">{b.imei}</td><td className="px-3 py-2.5">{b.reason}</td>
                  <td className="px-3 py-2.5">{SOURCES.find(([k]) => k === b.source)?.[1] ?? b.source}</td><td className="px-3 py-2.5 text-muted-foreground">{b.createdBy ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{new Date(b.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="px-3 py-2.5 text-right"><Button variant="ghost" size="icon" aria-label={`Unblock ${b.imei}`} onClick={() => setRemoving(b.imei)}><Trash2 className="text-red-600" /></Button></td>
                </tr>
              ))}
              {list.data && !list.data.items.length && <tr><td colSpan={6} className="px-3 py-14 text-center text-muted-foreground"><ShieldBan className="mx-auto mb-2 h-6 w-6" aria-hidden /><p className="font-medium text-foreground">No blocked devices</p></td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">The government CEIR database has no public lookup API. Buyers check each phone against it when they inspect it; add any device you learn is blocked here.</p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Block an IMEI</DialogTitle><DialogDescription>Any new request with this IMEI is refused immediately.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="bl-imei">IMEI</Label><Input id="bl-imei" inputMode="numeric" maxLength={15} value={f.imei} onChange={(e) => setF({ ...f, imei: e.target.value.replace(/\D/g, "") })} className="font-mono" /></div>
            <div className="space-y-1.5"><Label>Source</Label>
              <Select value={f.source} onValueChange={(v) => setF({ ...f, source: v })}><SelectTrigger aria-label="Source"><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="bl-reason">Reason</Label><Input id="bl-reason" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="FIR no. / dispute reference" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="destructive" disabled={block.isPending} onClick={submit}>Block</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!removing} onOpenChange={(o) => { if (!o) setRemoving(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Unblock this IMEI?</DialogTitle><DialogDescription>{removing} can be listed for sale again.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setRemoving(null)}>Keep blocked</Button><Button disabled={unblock.isPending} onClick={() => removing && unblock.mutate(removing, { onSuccess: () => setRemoving(null) })}>Unblock</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
