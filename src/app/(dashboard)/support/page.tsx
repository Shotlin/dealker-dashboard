"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Headphones, MessageCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Conversation } from "@/components/support/Conversation"
import { ContextPanel } from "@/components/support/ContextPanel"
import { TicketList } from "@/components/support/TicketList"
import { useSupportStats, useSupportTicket, useSupportTickets } from "@/hooks/useSupport"
import { useDebounce } from "@/hooks/useDebounce"
import { cn } from "@/lib/utils"
import type { SupportFilters } from "@/types/support.types"

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg border bg-white px-3 py-2">
      <p className={cn("text-lg font-semibold tabular-nums leading-tight", tone)}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

const fmtDuration = (s: number) => (s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)}m` : `${(s / 3600).toFixed(1)}h`)

function SupportInbox() {
  const router = useRouter()
  const params = useSearchParams()
  const selectedId = params.get("ticket")
  const [filters, setFilters] = useState<SupportFilters>({ view: "open" })
  const [infoOpen, setInfoOpen] = useState(false)
  const search = useDebounce(filters.search ?? "", 300)
  const effective = { ...filters, search }

  const list = useSupportTickets(effective)
  const stats = useSupportStats()
  const detail = useSupportTicket(selectedId)

  const select = (id: string | null) => {
    const q = new URLSearchParams(params.toString())
    if (id) q.set("ticket", id); else q.delete("ticket")
    router.replace(`/support${q.toString() ? `?${q}` : ""}`, { scroll: false })
  }

  // Desktop: open the first conversation automatically.
  useEffect(() => {
    if (!selectedId && list.data?.data[0] && typeof window !== "undefined" && window.innerWidth >= 1024) {
      select(list.data.data[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.data, selectedId])

  const s = stats.data
  return (
    <div className="mx-auto flex h-[calc(100vh-7.5rem)] min-h-[560px] w-full max-w-[1600px] flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Headphones className="h-6 w-6 text-primary" /> Customer support
          </h1>
          <p className="text-sm text-muted-foreground">Chat with customers about orders, returns and payments — assign and hand over to teammates.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Open" value={s?.open ?? "–"} />
          <Stat label="Unassigned" value={s?.unassigned ?? "–"} tone={s && s.unassigned > 0 ? "text-amber-600" : undefined} />
          <Stat label="Urgent" value={s?.urgent ?? "–"} tone={s && s.urgent > 0 ? "text-red-600" : undefined} />
          <Stat label="Avg first reply" value={s ? fmtDuration(s.avg_first_response_seconds) : "–"} />
        </div>
      </div>

      <Card className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_320px]">
        <div className={cn("min-h-0 border-r", selectedId ? "hidden lg:block" : "block")}>
          <TicketList
            tickets={list.data?.data ?? []}
            isLoading={list.isLoading}
            total={list.data?.pagination.total ?? 0}
            selectedId={selectedId}
            filters={filters}
            stats={s}
            onFilters={setFilters}
            onSelect={(id) => select(id)}
          />
        </div>

        <div className={cn("min-h-0", selectedId ? "block" : "hidden lg:block")}>
          {selectedId ? (
            <Conversation detail={detail.data} isLoading={detail.isLoading} onBack={() => select(null)} onShowInfo={() => setInfoOpen(true)} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-slate-50/60 text-center text-muted-foreground">
              <MessageCircle className="h-10 w-10 opacity-40" />
              <p className="text-sm font-medium">Select a conversation</p>
              <p className="text-xs">Pick a customer from the list to read and reply.</p>
            </div>
          )}
        </div>

        <div className="hidden min-h-0 border-l xl:block">
          {detail.data ? <ContextPanel detail={detail.data} onOpenTicket={(id) => select(id)} /> : null}
        </div>
      </Card>

      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-sm">
          <SheetHeader className="border-b p-4"><SheetTitle>Details</SheetTitle></SheetHeader>
          {detail.data ? <ContextPanel detail={detail.data} onOpenTicket={(id) => { setInfoOpen(false); select(id) }} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default function SupportPage() {
  return (
    <Suspense fallback={null}>
      <SupportInbox />
    </Suspense>
  )
}
