"use client"

/**
 * Header bell — the latest alerts from the notification centre (orders,
 * payments, refunds, stock, QC, auctions, …) with per-admin read state.
 */

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useAlertActions, useAlertUnread, useAlerts } from "@/hooks/useAlerts"
import { cn, formatRelativeTime } from "@/lib/utils"

export const SEVERITY_DOT: Record<string, string> = { CRITICAL: "bg-red-500", WARNING: "bg-amber-500", INFO: "bg-sky-500" }

export function NotificationPanel({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const unread = useAlertUnread()
  const feed = useAlerts({ limit: 10 })
  const { markRead, markAllRead } = useAlertActions()
  const count = unread.data?.total ?? 0
  const rows = feed.data?.data ?? []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="text-sm font-semibold text-foreground">Notifications {count > 0 && `(${count})`}</h3>
          {count > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-brand-500 hover:text-brand-600" disabled={markAllRead.isPending} onClick={() => markAllRead.mutate(undefined)}>
              Mark all read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="max-h-[380px]">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Nothing needs your attention</div>
          ) : rows.map((a) => (
            <button key={a.id} type="button" data-testid="bell-alert"
              onClick={() => { if (!a.is_read) markRead.mutate([a.id]); setOpen(false); if (a.link) router.push(a.link) }}
              className={cn("flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted", !a.is_read && "bg-brand-50/30")}>
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", SEVERITY_DOT[a.severity])} />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm text-foreground", !a.is_read && "font-medium")}>{a.title}</p>
                {a.body && <p className="truncate text-xs text-muted-foreground">{a.body}</p>}
                <p className="mt-1 text-[10px] text-muted-foreground">{a.type_label ?? a.type} · {formatRelativeTime(a.created_at)}</p>
              </div>
            </button>
          ))}
        </ScrollArea>
        <Separator />
        <div className="p-2 text-center">
          <Button variant="ghost" size="sm" className="h-8 w-full text-xs" asChild><Link href="/alerts" onClick={() => setOpen(false)}>Open notification centre</Link></Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
