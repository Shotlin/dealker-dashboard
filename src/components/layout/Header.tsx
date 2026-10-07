"use client"

import { Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useConnectionStatus } from "@/hooks/useSocket"
import { useNotificationStore } from "@/store/notifications.store"
import { GlobalSearch } from "./GlobalSearch"
import { NotificationPanel } from "./NotificationPanel"
import { ReconnectingIndicator } from "./reconnecting-indicator"
import { ThemeToggle } from "./ThemeToggle"
import { ROUTE_LABELS } from "./nav-config"

const UUID_RE = /^[0-9a-f]{8}-|^\d+$/i

function labelFor(segment: string) {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment]
  if (UUID_RE.test(segment)) return "Details"
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

const STATUS = {
  connected: { dot: "bg-emerald-500", label: "Live — real-time updates active" },
  disconnected: { dot: "bg-muted-foreground", label: "Disconnected — reconnecting…" },
  reconnecting: { dot: "bg-amber-500 animate-pulse", label: "Reconnecting…" },
} as const

export function Header() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const unread = useNotificationStore((s) => s.unreadCount)
  const conn = STATUS[useConnectionStatus()]

  return (
    <header
      aria-label="Top navigation bar"
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-white px-4"
    >
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-2 h-4" />
      <Breadcrumb className="hidden md:block">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dealker</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {segments.map((seg, i) => {
            const isLast = i === segments.length - 1
            const href = "/" + segments.slice(0, i + 1).join("/")
            return (
              <Fragment key={href}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{labelFor(seg)}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={href}>{labelFor(seg)}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1.5">
        <div className="mr-1 hidden w-56 sm:block lg:w-80">
          <GlobalSearch />
        </div>
        <ReconnectingIndicator />
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div role="status" aria-label={conn.label} className="flex h-9 w-9 items-center justify-center">
                <span className={`h-2 w-2 rounded-full ${conn.dot}`} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{conn.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <ThemeToggle />
        <NotificationPanel>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
            className="relative h-9 w-9"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            {unread > 0 && (
              <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center px-1 text-[10px]">
                {unread > 99 ? "99+" : unread}
              </Badge>
            )}
          </Button>
        </NotificationPanel>
      </div>
    </header>
  )
}
