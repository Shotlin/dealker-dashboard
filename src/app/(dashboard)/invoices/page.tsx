"use client"

/**
 * Invoices workspace — sales documents (B2B and B2C tax invoices, credit and debit notes) and, in a separate tab,
 * the seller purchase invoices that back each used-device listing.
 */

import { useState } from "react"
import { PageHeader } from "@/components/shared/PageHeader"
import { PurchaseInvoicesPanel } from "@/components/invoices/PurchaseInvoicesPanel"
import { SalesInvoicesPanel } from "@/components/invoices/SalesInvoicesPanel"
import { cn } from "@/lib/utils"

const TABS = [["all", "All"], ["B2B", "B2B"], ["B2C", "B2C"], ["purchase", "Purchase documents"]] as const
type Tab = (typeof TABS)[number][0]

export default function InvoicesPage() {
  const [tab, setTab] = useState<Tab>("all")
  return (
    <div className="space-y-5">
      <PageHeader title="Invoices" subtitle="GST tax invoices, credit and debit notes for B2B and B2C sales, kept permanently and downloadable at any time." />
      <div className="inline-flex rounded-lg border p-0.5" role="tablist" aria-label="Invoice type">
        {TABS.map(([v, l]) => (
          <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
            className={cn("rounded-md px-4 py-1.5 text-sm font-medium transition-colors", tab === v ? "bg-brand-600 text-white" : "text-muted-foreground hover:text-foreground")}>{l}</button>
        ))}
      </div>
      {tab === "purchase" ? <PurchaseInvoicesPanel /> : <SalesInvoicesPanel key={tab} channel={tab} />}
    </div>
  )
}
