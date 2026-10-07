"use client"

import { Inbox, Search } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn, formatRelativeTime } from "@/lib/utils"
import type { SupportFilters, SupportStats, SupportTicket, SupportView } from "@/types/support.types"
import { CATEGORY_LABEL, PriorityDot, StatusBadge, initials } from "./meta"

interface Props {
  tickets: SupportTicket[]
  isLoading: boolean
  total: number
  selectedId: string | null
  filters: SupportFilters
  stats?: SupportStats
  onFilters: (f: SupportFilters) => void
  onSelect: (id: string) => void
}

const TABS: { value: SupportView; label: string; stat?: keyof SupportStats }[] = [
  { value: "open", label: "Open", stat: "open" },
  { value: "mine", label: "Mine", stat: "mine" },
  { value: "unassigned", label: "Unassigned", stat: "unassigned" },
  { value: "resolved", label: "Resolved" },
]

export function TicketList({ tickets, isLoading, total, selectedId, filters, stats, onFilters, onSelect }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="space-y-3 border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search ?? ""}
            onChange={(e) => onFilters({ ...filters, search: e.target.value, page: 1 })}
            placeholder="Search customer, order, ticket…"
            className="h-9 pl-9 text-sm"
          />
        </div>
        <Tabs value={filters.view ?? "open"} onValueChange={(v) => onFilters({ ...filters, view: v as SupportView, page: 1 })}>
          <TabsList className="grid h-9 w-full grid-cols-4 bg-muted/60 p-0.5">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1 px-1 text-xs">
                {t.label}
                {t.stat && stats && stats[t.stat] > 0 && (
                  <span className="rounded-full bg-background px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {stats[t.stat]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="grid grid-cols-2 gap-2">
          <Select value={filters.category ?? "all"} onValueChange={(v) => onFilters({ ...filters, category: v, page: 1 })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.priority ?? "all"} onValueChange={(v) => onFilters({ ...filters, priority: v, page: 1 })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {["URGENT", "HIGH", "NORMAL", "LOW"].map((p) => <SelectItem key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {isLoading ? (
          <div className="space-y-3 p-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[84px] w-full rounded-lg" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-sm text-muted-foreground">
            <Inbox className="h-8 w-8 opacity-50" />
            No conversations here.
          </div>
        ) : (
          <ul className="divide-y">
            {tickets.map((t) => {
              const active = t.id === selectedId
              const unread = t.agent_unread > 0
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(t.id)}
                    className={cn(
                      "flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50",
                      active && "bg-brand-50 hover:bg-brand-50",
                    )}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-muted text-xs font-semibold">{initials(t.customer.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}>
                          {t.customer.name || "Customer"}
                        </span>
                        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                          {formatRelativeTime(t.last_message_at ?? t.created_at)}
                        </span>
                      </div>
                      <p className="truncate text-xs font-medium text-foreground/80">{t.subject}</p>
                      <p className={cn("mt-0.5 truncate text-xs", unread ? "text-foreground" : "text-muted-foreground")}>
                        {t.last_sender_type === "AGENT" && "You: "}
                        {t.last_message_preview}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={t.status} className="h-5 px-1.5" />
                        <PriorityDot priority={t.priority} />
                        <span className="text-[11px] text-muted-foreground">{CATEGORY_LABEL[t.category]}</span>
                        {t.assignee ? (
                          <span className="ml-auto truncate text-[11px] text-muted-foreground">{t.assignee.name?.split(" ")[0]}</span>
                        ) : (
                          <span className="ml-auto text-[11px] font-medium text-amber-600">Unassigned</span>
                        )}
                        {unread && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                            {t.agent_unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </ScrollArea>
      <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">{total} conversation{total === 1 ? "" : "s"}</div>
    </div>
  )
}
