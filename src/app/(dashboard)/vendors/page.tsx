"use client"

import { useState } from "react"
import Link from "next/link"
import { Building2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KycSheet, VendorStatusBadge } from "@/components/vendors/KycSheet"
import { useDebounce } from "@/hooks/useDebounce"
import { useKycList, useKycSummary } from "@/hooks/useKyc"
import { cn } from "@/lib/utils"

const GROUPS: { key: string; label: string; params: Record<string, string>; count: (b: Record<string, number>) => number }[] = [
  { key: "all", label: "All", params: {}, count: (b) => Object.values(b).reduce((s, n) => s + n, 0) },
  { key: "review", label: "Needs review", params: { group: "review" }, count: (b) => (b.KYC_SUBMITTED ?? 0) + (b.UNDER_REVIEW ?? 0) },
  { key: "correction", label: "Correction required", params: { status: "CORRECTION_REQUIRED" }, count: (b) => b.CORRECTION_REQUIRED ?? 0 },
  { key: "verified", label: "Verified", params: { status: "VERIFIED" }, count: (b) => b.VERIFIED ?? 0 },
  { key: "active", label: "Active", params: { status: "ACTIVE" }, count: (b) => b.ACTIVE ?? 0 },
  { key: "blocked", label: "Suspended / rejected", params: { group: "blocked" }, count: (b) => (b.SUSPENDED ?? 0) + (b.REJECTED ?? 0) + (b.DEACTIVATED ?? 0) },
  { key: "onboarding", label: "Onboarding", params: { status: "PENDING_ONBOARDING" }, count: (b) => b.PENDING_ONBOARDING ?? 0 },
]

export default function VendorsPage() {
  const [group, setGroup] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  const q = useDebounce(search, 300)
  const summary = useKycSummary()
  const g = GROUPS.find((x) => x.key === group)!
  const list = useKycList({ ...g.params, search: q, page })
  const rows = list.data?.data ?? []
  const total = list.data?.pagination.total ?? 0
  const by = summary.data?.byStatus ?? {}

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vendors & KYC</h1>
        <p className="text-sm text-muted-foreground">Review every vendor’s documents, approve or send back applications, and control who can sell on Dealker.</p>
      </div>

      <Card className="shadow-none">
        <div className="space-y-3 border-b p-3">
          <Tabs value={group} onValueChange={(v) => { setGroup(v); setPage(1) }}>
            <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/60 p-1">
              {GROUPS.map((x) => {
                const n = summary.data ? x.count(by) : null
                return (
                  <TabsTrigger key={x.key} value={x.key} className="gap-1.5 px-3 py-1.5 text-sm">
                    {x.label}
                    {n !== null && <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", x.key === "review" && n > 0 ? "bg-amber-100 font-medium text-amber-800" : "bg-background text-muted-foreground")}>{n}</span>}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
          <div className="relative sm:w-96">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search name, GSTIN, city, phone or email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>
        </div>

        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Vendor</TableHead><TableHead>Location</TableHead><TableHead>GSTIN</TableHead><TableHead>Documents</TableHead>
            <TableHead className="text-right">Listings</TableHead><TableHead>Applied</TableHead><TableHead>Status</TableHead><TableHead />
          </TableRow></TableHeader>
          <TableBody>
            {list.isLoading ? Array.from({ length: 6 }).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-11" /></TableCell></TableRow>)
              : rows.length === 0 ? <TableRow><TableCell colSpan={8} className="h-44 text-center text-muted-foreground"><Building2 className="mx-auto mb-2 h-8 w-8 opacity-40" />No vendors in this view.</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                  <TableCell>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.email} · {r.phone}</p>
                  </TableCell>
                  <TableCell className="text-sm">{[r.city, r.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.gstin ?? "—"}</TableCell>
                  <TableCell>
                    {r.docs_total === 0 ? <span className="text-xs text-muted-foreground">None uploaded</span> : (
                      <span className="text-xs">
                        <span className={cn("font-medium", r.docs_verified === r.docs_total ? "text-emerald-600" : "")}>{r.docs_verified}/{r.docs_total} verified</span>
                        {r.docs_rejected > 0 && <span className="ml-1.5 text-red-600">· {r.docs_rejected} rejected</span>}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{r.listings}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.submitted_at ?? r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</TableCell>
                  <TableCell><VendorStatusBadge status={r.status} /></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" asChild><Link href={`/subscriptions?vendor=${r.id}&name=${encodeURIComponent(r.name)}`}>Timeline</Link></Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>{total} vendor{total === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="tabular-nums">Page {page} of {Math.max(1, Math.ceil(total / 20))}</span>
            <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </Card>

      <KycSheet id={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
