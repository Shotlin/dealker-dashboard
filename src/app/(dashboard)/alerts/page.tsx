"use client"

/**
 * Notification centre — every alert the system raises (orders, payments,
 * auctions, catalogue, wallets, shipping, support…), read per admin, plus
 * Notification Control to switch alert types on or off.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, BellOff, CheckCheck, Settings2 } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { SEVERITY_DOT } from "@/components/layout/NotificationPanel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAlertActions, useAlertSettings, useAlertUnread, useAlerts } from "@/hooks/useAlerts"
import { useDebounce } from "@/hooks/useDebounce"
import { usePermissions } from "@/hooks/usePermissions"
import { cn, formatDateTime } from "@/lib/utils"
import type { AlertSetting, Severity } from "@/services/alerts.service"

const GROUPS = ["Orders & payments", "Auctions", "Marketing", "Catalogue", "People", "Wallets", "Shipping & support"]

function Feed() {
  const [group, setGroup] = useState("")
  const [severity, setSeverity] = useState("")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const debounced = useDebounce(search, 300)
  const unread = useAlertUnread()
  const list = useAlerts({ group, severity, unread: unreadOnly, search: debounced, page, limit: 30 })
  const { markRead, markAllRead } = useAlertActions()
  const rows = list.data?.data ?? []
  const meta = list.data?.meta

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border p-0.5">
          {["", ...GROUPS].map((g) => (
            <button key={g || "all"} type="button" onClick={() => { setGroup(g); setPage(1) }}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium", group === g ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {g || "All"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input className="h-9 w-[220px] text-xs" placeholder="Search notifications…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <Select value={severity || "all"} onValueChange={(v) => { setSeverity(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any severity</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="WARNING">Warning</SelectItem>
            <SelectItem value="INFO">Info</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs"><Switch checked={unreadOnly} onCheckedChange={(v) => { setUnreadOnly(v); setPage(1) }} />Unread only</label>
        <Button size="sm" variant="outline" className="ml-auto" disabled={markAllRead.isPending || (unread.data?.total ?? 0) === 0}
          onClick={() => markAllRead.mutate(undefined)}>
          <CheckCheck className="mr-1.5 h-4 w-4" />Mark all read{unread.data?.total ? ` (${unread.data.total})` : ""}
        </Button>
      </div>

      {list.isError ? <QueryErrorBlock error={list.error} onRetry={() => list.refetch()} /> : (
        <ul className="divide-y rounded-xl border bg-white" data-testid="alert-feed">
          {list.isLoading ? Array.from({ length: 6 }).map((_, i) => <li key={i} className="p-4"><Skeleton className="h-10 w-full" /></li>)
            : rows.length === 0 ? (
              <li className="flex flex-col items-center gap-2 p-12 text-sm text-muted-foreground"><BellOff className="h-8 w-8 opacity-40" />No notifications here.</li>
            ) : rows.map((a) => (
              <li key={a.id} data-read={a.is_read} className={cn("flex items-start gap-3 px-4 py-3", !a.is_read && "bg-brand-50/30")}>
                <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", SEVERITY_DOT[a.severity])} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", !a.is_read && "font-medium")}>
                    {a.link ? <Link href={a.link} onClick={() => !a.is_read && markRead.mutate([a.id])} className="hover:underline">{a.title}</Link> : a.title}
                  </p>
                  {a.body && <p className="text-xs text-muted-foreground">{a.body}</p>}
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">{a.type_label ?? a.type}</Badge>
                    {formatDateTime(a.created_at)}
                  </p>
                </div>
                {!a.is_read && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markRead.mutate([a.id])}>Mark read</Button>}
              </li>
            ))}
        </ul>
      )}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          Page {meta.page} of {meta.totalPages}
          <Button variant="ghost" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}

function Control() {
  const settings = useAlertSettings()
  const { saveSettings } = useAlertActions()
  const [draft, setDraft] = useState<AlertSetting[]>([])
  const { can } = usePermissions()
  const editable = can("alerts.manage")
  useEffect(() => { if (settings.data) setDraft(settings.data) }, [settings.data])
  if (settings.isLoading) return <Skeleton className="h-64 w-full" />
  if (settings.isError) return <QueryErrorBlock error={settings.error} onRetry={() => settings.refetch()} />

  const patch = (type: string, p: Partial<AlertSetting>) => setDraft((d) => d.map((s) => (s.type === type ? { ...s, ...p } : s)))
  const dirty = draft.filter((s) => { const o = settings.data?.find((x) => x.type === s.type); return o && (o.enabled !== s.enabled || o.severity !== s.severity || o.min_amount !== s.min_amount) })
  const groups = Array.from(new Set(draft.map((s) => s.grp)))

  return (
    <div className="space-y-5" data-testid="alert-control">
      {!editable && <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">You can see these settings but not change them.</p>}
      {groups.map((g) => (
        <section key={g} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g}</h3>
          <div className="divide-y rounded-xl border bg-white">
            {draft.filter((s) => s.grp === g).map((s) => (
              <div key={s.type} className="flex flex-wrap items-center gap-4 px-4 py-3" data-testid={`ctl-${s.type}`}>
                <div className="min-w-[200px] flex-1 text-sm font-medium">{s.label}</div>
                {s.min_amount !== null && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">Only above ₹
                    <Input className="h-8 w-24" inputMode="decimal" disabled={!editable} value={s.min_amount} onChange={(e) => patch(s.type, { min_amount: Number(e.target.value) })} />
                  </label>
                )}
                <Select value={s.severity} disabled={!editable} onValueChange={(v) => patch(s.type, { severity: v as Severity })}>
                  <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="INFO">Info</SelectItem><SelectItem value="WARNING">Warning</SelectItem><SelectItem value="CRITICAL">Critical</SelectItem></SelectContent>
                </Select>
                <Switch checked={s.enabled} disabled={!editable} onCheckedChange={(v) => patch(s.type, { enabled: v })} aria-label={`${s.label} on or off`} />
              </div>
            ))}
          </div>
        </section>
      ))}
      {editable && (
        <div className="flex justify-end">
          <Button disabled={dirty.length === 0 || saveSettings.isPending}
            onClick={() => saveSettings.mutate(dirty.map((s) => ({ type: s.type, enabled: s.enabled, severity: s.severity, minAmount: s.min_amount })))}>
            {saveSettings.isPending ? "Saving…" : `Save${dirty.length ? ` (${dirty.length})` : ""}`}
          </Button>
        </div>
      )}
    </div>
  )
}

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Notifications & Alerts" subtitle="Everything that needs your attention, in one place. Choose which events notify you." />
      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed"><Bell className="mr-1.5 h-4 w-4" />Notifications</TabsTrigger>
          <TabsTrigger value="control"><Settings2 className="mr-1.5 h-4 w-4" />Notification control</TabsTrigger>
        </TabsList>
        <TabsContent value="feed" className="mt-4"><Feed /></TabsContent>
        <TabsContent value="control" className="mt-4"><Control /></TabsContent>
      </Tabs>
    </div>
  )
}
