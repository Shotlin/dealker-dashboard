"use client"

import { useState } from "react"
import Link from "next/link"
import { ExternalLink, Plus } from "lucide-react"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDeals } from "@/hooks/useMerchSections"
import { getSectionTypeMeta } from "@/components/builder/sectionTypesMeta"
import type { SectionType } from "@/types/theme.types"
import { VendorDealDialog } from "./VendorDealDialog"
import { DealEntriesDialog } from "./DealEntriesDialog"
import type { DealRow } from "@/services/merch-sections.service"
import { DealStatusChip, dealTiming, dealWindow, discountLabel } from "./dealUi"

/** Every deal (promo campaign) with its window, discount, product count and where it is shown. */
export function DealsView() {
  const q = useDeals()
  const deals = q.data ?? []
  const [creating, setCreating] = useState(false)
  const [reviewing, setReviewing] = useState<DealRow | null>(null)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">Deals run as campaigns: they change prices for a set time, then put them back. Attach a deal to a section from that section&apos;s Deal tab.</p>
        <Button size="sm" className="ml-auto" onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" />New vendor deal</Button>
        <Button size="sm" variant="outline" asChild><Link href="/campaigns">Manage in Campaigns <ExternalLink className="ml-1 h-3.5 w-3.5" /></Link></Button>
      </div>
      {q.isError ? <QueryErrorBlock error={q.error} onRetry={() => q.refetch()} /> : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Deal</TableHead><TableHead>Status</TableHead><TableHead>When</TableHead><TableHead>Discount</TableHead><TableHead className="text-right">Products</TableHead><TableHead>Vendor entries</TableHead><TableHead>Shown in</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading && Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-9 w-full" /></TableCell></TableRow>)}
              {!q.isLoading && deals.length === 0 && <TableRow><TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">No deals yet. Create one in Campaigns.</TableCell></TableRow>}
              {deals.map((d) => (
                <TableRow key={d.id}>
                  <TableCell><p className="max-w-[240px] truncate text-sm font-medium">{d.name}</p><p className="text-xs capitalize text-muted-foreground">{d.type.replace(/_/g, " ").toLowerCase()}</p></TableCell>
                  <TableCell><DealStatusChip status={d.status} />{dealTiming(d) && <p className="mt-0.5 text-[11px] text-muted-foreground">{dealTiming(d)}</p>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{dealWindow(d)}</TableCell>
                  <TableCell className="text-sm">{discountLabel(d)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{d.listing_count}</TableCell>
                  <TableCell>
                    {d.open_to_vendors || d.pending_entries + d.approved_entries > 0 ? (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setReviewing(d)}>
                        {d.pending_entries > 0 ? `${d.pending_entries} to review` : `${d.approved_entries} approved`}
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">Not open</span>}
                  </TableCell>
                  <TableCell>
                    {d.used_in.length === 0 ? <span className="text-xs text-muted-foreground">Not shown anywhere</span> : (
                      <div className="flex flex-wrap gap-1">
                        {d.used_in.map((u, i) => (
                          <span key={`${u.section_id}-${i}`} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{getSectionTypeMeta(u.section_type as SectionType)?.label ?? u.section_type}{u.tab ? ` · ${u.tab}` : ""} <span className="text-muted-foreground">({u.screen})</span></span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <VendorDealDialog open={creating} onOpenChange={setCreating} />
      <DealEntriesDialog deal={reviewing} onClose={() => setReviewing(null)} />
    </div>
  )
}
