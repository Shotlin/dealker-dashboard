"use client"

import { Suspense, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Archive,
  Clock,
  Copy,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  Palette,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { PageHeader } from "@/components/shared/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useActivateTheme,
  useCancelSchedule,
  useCreateTheme,
  useDeleteTheme,
  useScheduleTheme,
  useThemes,
  useUpdateTheme,
} from "@/hooks/useThemes"
import { useThemeTabs } from "@/hooks/useThemeTabs"
import { formatDateTime, formatRelativeTime } from "@/lib/utils"
import type {
  Theme,
  ThemeStatus,
  ThemeStoreKey,
} from "@/types/theme.types"

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
] as const

const statusStyles: Record<ThemeStatus, string> = {
  active: "border-emerald-200 bg-emerald-500/15 text-emerald-700",
  scheduled: "border-amber-200 bg-amber-500/15 text-amber-700",
  draft: "border-slate-200 bg-slate-500/15 text-slate-700",
  archived: "border-red-200 bg-red-500/15 text-red-700",
}

const storeOptions: Array<{ value: "all" | ThemeStoreKey; label: string }> = [
  { value: "all", label: "All storefronts" },
  { value: "mobile", label: "Mobile" },
  { value: "mobile_part", label: "Mobile Part" },
  { value: "accessories", label: "Accessories" },
  { value: "electronics", label: "Electronics" },
]

const storeOrder: Array<ThemeStoreKey> = [
  "mobile",
  "mobile_part",
  "accessories",
  "electronics",
]

const storeLabelMap: Record<ThemeStoreKey, string> = {
  marketplace: "Marketplace",
  deals: "Mega Deals",
  brand_store: "Brand Store",
  new_arrivals: "New Arrivals",
  mobile: "Mobile",
  mobile_part: "Mobile Part",
  accessories: "Accessories",
  electronics: "Electronics",
  repellents: "Repellents & Fresheners",
}

function formatDateTimeLocalValue(value: string | null) {
  const date = value ? new Date(value) : new Date(Date.now() + 30 * 60 * 1000)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  date.setSeconds(0, 0)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function StatusBadge({
  status,
  scheduledAt,
}: {
  status: ThemeStatus
  scheduledAt: string | null
}) {
  return (
    <div className="flex flex-col gap-1">
      <Badge
        variant="outline"
        className={`w-fit capitalize ${statusStyles[status] || statusStyles.draft}`}
      >
        {status}
      </Badge>
      {status === "scheduled" && scheduledAt && (
        <span className="text-xs text-muted-foreground">
          {new Date(scheduledAt).toLocaleDateString()} at{" "}
          {new Date(scheduledAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
    </div>
  )
}

function ThemeListContent() {
  const router = useRouter()
  const { data: themes, isLoading } = useThemes()
  const { data: themeTabs } = useThemeTabs({ status: "active" })
  const activateThemeMutation = useActivateTheme()
  const createThemeMutation = useCreateTheme()
  const updateThemeMutation = useUpdateTheme()
  const scheduleThemeMutation = useScheduleTheme()
  const cancelScheduleMutation = useCancelSchedule()
  const deleteThemeMutation = useDeleteTheme()

  const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null)
  const [scheduleDialogTheme, setScheduleDialogTheme] = useState<Theme | null>(
    null
  )
  const [scheduleAt, setScheduleAt] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [storeFilter, setStoreFilter] = useState<"all" | ThemeStoreKey>("all")
  const [tabFilter, setTabFilter] = useState("all")
  const [search, setSearch] = useState("")

  const tabOptions = useMemo(() => {
    const visibleTabs = (themeTabs ?? [])
      .filter((tab) => storeFilter === "all" || tab.store_key === storeFilter)
      .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label))
    return [
      { value: "all", label: "All tabs" },
      ...visibleTabs.map((tab) => ({ value: tab.id, label: tab.label })),
    ]
  }, [storeFilter, themeTabs])

  const storeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: themes?.length ?? 0 }
    for (const t of themes ?? []) if (t.store_key) counts[t.store_key] = (counts[t.store_key] ?? 0) + 1
    return counts
  }, [themes])

  const summary = useMemo(() => {
    const all = themes ?? []
    return {
      live: all.filter((t) => t.is_active).length,
      scheduled: all.filter((t) => t.status === "scheduled").length,
      drafts: all.filter((t) => t.status === "draft").length,
    }
  }, [themes])

  const filteredThemes = useMemo(() => {
    return [...(themes ?? [])]
      .filter((theme) => {
        if (storeFilter !== "all" && theme.store_key !== storeFilter) return false
        if (statusFilter !== "all" && theme.status !== statusFilter) return false
        if (tabFilter !== "all" && theme.tab_id !== tabFilter) return false
        if (search && !theme.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        const aStoreIndex = a.store_key ? storeOrder.indexOf(a.store_key) : -1
        const bStoreIndex = b.store_key ? storeOrder.indexOf(b.store_key) : -1
        const aStore = aStoreIndex >= 0 ? aStoreIndex : 999
        const bStore = bStoreIndex >= 0 ? bStoreIndex : 999
        if (aStore !== bStore) return aStore - bStore

        const aOrder = a.tab_order ?? Number.MAX_SAFE_INTEGER
        const bOrder = b.tab_order ?? Number.MAX_SAFE_INTEGER

        if (aOrder !== bOrder) return aOrder - bOrder

        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
      })
  }, [storeFilter, statusFilter, tabFilter, search, themes])

  const hasFilters =
    statusFilter !== "all" ||
    tabFilter !== "all" ||
    storeFilter !== "all" ||
    search !== ""

  const handleActivate = (theme: Theme) => {
    if (theme.is_active) return
    activateThemeMutation.mutate(theme.id)
  }

  const handleOpenScheduleDialog = (theme: Theme) => {
    setScheduleDialogTheme(theme)
    setScheduleAt(formatDateTimeLocalValue(theme.scheduled_at))
  }

  const handleScheduleTheme = () => {
    if (!scheduleDialogTheme || !scheduleAt) return

    scheduleThemeMutation.mutate(
      {
        id: scheduleDialogTheme.id,
        payload: {
          scheduled_at: new Date(scheduleAt).toISOString(),
        },
      },
      {
        onSuccess: () => {
          setScheduleDialogTheme(null)
          setScheduleAt("")
        },
      }
    )
  }

  const handleDuplicateAsVariantB = (theme: Theme) => {
    createThemeMutation.mutate(
      {
        name: `${theme.name} Variant B`,
        theme_data: theme.theme_data,
        tab_id: theme.tab_id ?? undefined,
        status: "draft",
        ab_variant: "B",
        ab_split_percent:
          theme.ab_split_percent >= 100 ? 50 : theme.ab_split_percent,
      },
      {
        onSuccess: (createdTheme) => router.push(`/themes/${createdTheme.id}`),
      }
    )
  }

  const handleArchiveTheme = (theme: Theme) => {
    if (theme.is_active || theme.status === "scheduled") return

    updateThemeMutation.mutate({
      id: theme.id,
      payload: { status: "archived" },
    })
  }

  const handleConfirmDelete = () => {
    if (!themeToDelete || themeToDelete.is_active) return
    deleteThemeMutation.mutate(themeToDelete.id, {
      onSettled: () => setThemeToDelete(null),
    })
  }

  const clearFilters = () => {
    setStatusFilter("all")
    setStoreFilter("all")
    setTabFilter("all")
    setSearch("")
  }

  const handleStoreFilterChange = (value: "all" | ThemeStoreKey) => {
    setStoreFilter(value)
    setTabFilter("all")
  }

  const renderThemeActions = (theme: Theme) => {
    const isActivating =
      activateThemeMutation.isPending &&
      activateThemeMutation.variables === theme.id
    const isCancellingSchedule =
      cancelScheduleMutation.isPending &&
      cancelScheduleMutation.variables === theme.id
    const isDeleting =
      deleteThemeMutation.isPending &&
      deleteThemeMutation.variables === theme.id
    const isArchiving =
      updateThemeMutation.isPending &&
      updateThemeMutation.variables?.id === theme.id &&
      updateThemeMutation.variables?.payload?.status === "archived"
    const isDuplicating =
      createThemeMutation.isPending &&
      createThemeMutation.variables?.tab_id === theme.tab_id &&
      createThemeMutation.variables?.ab_variant === "B"

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/themes/${theme.id}`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>

          {!theme.is_active && (
            <DropdownMenuItem
              disabled={activateThemeMutation.isPending}
              onClick={() => handleActivate(theme)}
            >
              {isActivating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Activate
            </DropdownMenuItem>
          )}

          {theme.status === "active" && (
            <DropdownMenuItem onClick={() => handleOpenScheduleDialog(theme)}>
              <Clock className="mr-2 h-4 w-4" />
              Schedule
            </DropdownMenuItem>
          )}

          {theme.status === "scheduled" && (
            <DropdownMenuItem
              disabled={cancelScheduleMutation.isPending}
              onClick={() => cancelScheduleMutation.mutate(theme.id)}
            >
              {isCancellingSchedule ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Cancel Schedule
            </DropdownMenuItem>
          )}

          {theme.ab_variant !== "B" && (
            <DropdownMenuItem
              disabled={createThemeMutation.isPending}
              onClick={() => handleDuplicateAsVariantB(theme)}
            >
              {isDuplicating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Duplicate as Variant B
            </DropdownMenuItem>
          )}

          {theme.status !== "archived" && (
            <DropdownMenuItem
              disabled={theme.is_active || theme.status === "scheduled"}
              onClick={() => handleArchiveTheme(theme)}
            >
              {isArchiving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Archive className="mr-2 h-4 w-4" />
              )}
              Archive
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-destructive"
            disabled={theme.is_active || deleteThemeMutation.isPending}
            onClick={() => setThemeToDelete(theme)}
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Storefront themes</h1>
          <p className="text-sm text-muted-foreground">
            Design how Dealker looks in the app. Activate a theme to publish it to every customer instantly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push("/themes/builder")}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            Section builder
          </Button>
          <Button onClick={() => router.push("/themes/new")}>
            <Plus className="mr-1 h-4 w-4" />
            New theme
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton variant="table" count={6} />
      ) : (themes?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icon={<Palette className="h-6 w-6 text-muted-foreground" />}
            title="No themes yet"
            description="Create your first theme to start managing how the storefront looks."
            actionLabel="New theme"
            onAction={() => router.push("/themes/new")}
            className="py-16"
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Live now", value: summary.live, tone: "text-emerald-600", dot: "bg-emerald-500" },
              { label: "Scheduled", value: summary.scheduled, tone: "text-amber-600", dot: "bg-amber-500" },
              { label: "Drafts", value: summary.drafts, tone: "text-slate-700", dot: "bg-slate-400" },
            ].map((k) => (
              <Card key={k.label} className="shadow-none">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{k.label}</p>
                    <p className={`text-2xl font-semibold tabular-nums ${k.tone}`}>{k.value}</p>
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full ${k.dot}`} />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-none">
            <CardHeader className="space-y-4 pb-3">
              <div>
                <CardTitle className="text-base">Theme library</CardTitle>
                <CardDescription>Pick a storefront section, then manage its themes, schedules and A/B variants.</CardDescription>
              </div>
              <Tabs value={storeFilter} onValueChange={(v) => handleStoreFilterChange(v as "all" | ThemeStoreKey)}>
                <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/60 p-1">
                  {storeOptions.map((option) => (
                    <TabsTrigger key={option.value} value={option.value} className="gap-2 px-3 py-1.5 text-sm">
                      {option.label}
                      <span className="rounded-full bg-background px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                        {storeCounts[option.value] ?? 0}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search themes…" className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tabFilter} onValueChange={setTabFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="All tabs" /></SelectTrigger>
                  <SelectContent>
                    {tabOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasFilters && (
                  <Button variant="ghost" onClick={clearFilters}>Clear</Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {filteredThemes.length === 0 ? (
                <EmptyState
                  icon={<Palette className="h-6 w-6 text-muted-foreground" />}
                  title="No matching themes"
                  description="Try a different storefront section, status or search."
                  actionLabel={hasFilters ? "Clear filters" : undefined}
                  onAction={hasFilters ? clearFilters : undefined}
                  className="rounded-lg border border-dashed py-14"
                />
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-lg border md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Theme</TableHead>
                          <TableHead>Storefront</TableHead>
                          <TableHead>Tab</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Version</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredThemes.map((theme) => (
                          <TableRow key={theme.id}>
                            <TableCell>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">{theme.name}</span>
                                  {theme.ab_variant === "B" && <Badge variant="secondary" className="text-[10px]">A/B</Badge>}
                                  {theme.is_active && (
                                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">Live</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">Updated {formatDateTime(theme.updated_at)}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {theme.store_key ? (
                                <Badge variant="secondary">{storeLabelMap[theme.store_key]}</Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {theme.tab_key ? (
                                <span className="text-sm">{theme.tab_label ?? theme.tab_key}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={theme.status} scheduledAt={theme.scheduled_at} />
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm text-muted-foreground">v{theme.version}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end">{renderThemeActions(theme)}</div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid gap-3 md:hidden">
                    {filteredThemes.map((theme) => (
                      <Card key={theme.id} className="shadow-none">
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-foreground">{theme.name}</p>
                                {theme.ab_variant === "B" && <Badge variant="secondary" className="text-[10px]">A/B</Badge>}
                                {theme.is_active && (
                                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">Live</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{formatRelativeTime(theme.updated_at)}</p>
                            </div>
                            {renderThemeActions(theme)}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {theme.store_key && <Badge variant="secondary">{storeLabelMap[theme.store_key]}</Badge>}
                            {theme.tab_key && <Badge variant="outline">{theme.tab_label ?? theme.tab_key}</Badge>}
                            <Badge variant="outline" className="font-mono">v{theme.version}</Badge>
                          </div>
                          <StatusBadge status={theme.status} scheduledAt={theme.scheduled_at} />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog
        open={!!scheduleDialogTheme}
        onOpenChange={(open) => {
          if (!open) {
            setScheduleDialogTheme(null)
            setScheduleAt("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule theme</DialogTitle>
            <DialogDescription>
              Choose when {scheduleDialogTheme?.name} should go live again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="theme-schedule-at">Activation time</Label>
            <Input
              id="theme-schedule-at"
              type="datetime-local"
              value={scheduleAt}
              onChange={(event) => setScheduleAt(event.target.value)}
              min={formatDateTimeLocalValue(new Date().toISOString())}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setScheduleDialogTheme(null)
                setScheduleAt("")
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!scheduleDialogTheme || !scheduleAt || scheduleThemeMutation.isPending}
              onClick={handleScheduleTheme}
            >
              {scheduleThemeMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!themeToDelete}
        onOpenChange={(open) => {
          if (!open) setThemeToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete theme?</DialogTitle>
            <DialogDescription>
              {themeToDelete?.is_active
                ? "Active themes cannot be deleted. Activate another theme first."
                : `This will permanently delete "${themeToDelete?.name}".`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setThemeToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                !themeToDelete ||
                themeToDelete.is_active ||
                deleteThemeMutation.isPending
              }
              onClick={handleConfirmDelete}
            >
              {deleteThemeMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ThemesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" count={6} />}>
      <ThemeListContent />
    </Suspense>
  )
}
