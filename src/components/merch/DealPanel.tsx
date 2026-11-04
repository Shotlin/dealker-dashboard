"use client"

import Link from "next/link"
import { ExternalLink, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDeals } from "@/hooks/useMerchSections"
import type { DealInfo } from "@/services/merch-sections.service"
import { DealStatusChip, dealTiming, dealWindow, discountLabel } from "./dealUi"

interface Props {
  campaignId: string | undefined
  /** Resolved deal info from the server for the current binding. */
  deal: DealInfo | undefined
  busy: boolean
  onChange: (campaignId: string | null) => void
}

/** Pick the deal (promo campaign) whose products fill this section while it is live. */
export function DealPanel({ campaignId, deal, busy, onChange }: Props) {
  const { data: deals = [], isLoading } = useDeals()
  return (
    <div className="space-y-3 rounded-xl border bg-white p-4">
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>A deal is a campaign: it cuts prices on its products between its start and end time and puts them back afterwards. While the deal is <b>live</b>, its products show here; before and after, this section shows no deal products.</p>
      </div>

      {deal && campaignId && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <span className="font-medium">{deal.name}</span><DealStatusChip status={deal.status} />
          <span className="text-xs text-muted-foreground">{dealWindow(deal)} {dealTiming(deal) && `· ${dealTiming(deal)}`}</span>
          <Button variant="outline" size="sm" className="ml-auto" disabled={busy} onClick={() => onChange(null)}>Remove deal</Button>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">{campaignId ? "Switch to another deal" : "Choose a deal"}</p>
        {isLoading && <p className="text-xs text-muted-foreground">Loading deals…</p>}
        {!isLoading && deals.length === 0 && <p className="text-sm text-muted-foreground">No deals yet. Create one on the Campaigns page, then pick it here.</p>}
        <ul className="max-h-72 space-y-1.5 overflow-y-auto">
          {deals.filter((d) => d.status !== "ENDED").map((d) => (
            <li key={d.id}>
              <button type="button" disabled={busy || d.id === campaignId} onClick={() => onChange(d.id)}
                className={cn("flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/50", d.id === campaignId && "border-primary bg-primary/5")}>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{d.name}</span><span className="block text-xs text-muted-foreground">{dealWindow(d)} · {discountLabel(d)} · {d.listing_count} product{d.listing_count === 1 ? "" : "s"}</span></span>
                <DealStatusChip status={d.status} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <Link href="/campaigns" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Create or edit deals in Campaigns <ExternalLink className="h-3 w-3" /></Link>
    </div>
  )
}
