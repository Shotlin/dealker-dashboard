"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronRight, ChevronsUpDown, LogOut, Lock, ShoppingBag } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { usePendingActions } from "@/hooks/useDashboard"
import { useSupportStats } from "@/hooks/useSupport"
import { useListingStats } from "@/hooks/useListings"
import { featureForPath, useFeatures } from "@/hooks/useFeatures"
import { useMenuVisibility } from "@/hooks/useRBAC"
import { useAuthStore } from "@/store/auth.store"
import { NAV_SECTIONS, type NavItem, type NavSection } from "./nav-config"

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavEntry({ item, badge }: { item: NavItem; badge: number }) {
  const pathname = usePathname()
  const features = useFeatures().data
  const featureKey = featureForPath(item.href)
  const locked = Boolean(featureKey && features && !features.features?.[featureKey]?.canAccess)
  const Icon = item.icon

  if (item.children) {
    const active = item.children.some((c) => isPathActive(pathname, c.href))
    return (
      <Collapsible asChild defaultOpen={active} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.label} isActive={active}>
              <Icon />
              <span>{item.label}</span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children.map((child) => (
                <SidebarMenuSubItem key={child.href}>
                  <SidebarMenuSubButton asChild isActive={isPathActive(pathname, child.href)}>
                    <Link href={child.href}>
                      <span>{child.label}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.label} isActive={isPathActive(pathname, item.href)}>
        <Link href={item.href}>
          <Icon />
          <span>{item.label}</span>
          {locked && <Lock aria-label="In development" className="ml-auto !size-3.5 opacity-60" />}
        </Link>
      </SidebarMenuButton>
      {badge > 0 && <SidebarMenuBadge>{badge > 99 ? "99+" : badge}</SidebarMenuBadge>}
    </SidebarMenuItem>
  )
}

function NavGroup({ section, badges }: { section: NavSection; badges: Record<string, number> }) {
  // One hook call per section keeps hook order stable; items without an id
  // resolve to the empty string, which `useMenuVisibility` treats as allowed.
  const visibility = useMenuVisibility(section.items.map((i) => i.id ?? ""))
  const items = section.items.filter((i) => visibility[i.id ?? ""])
  if (items.length === 0) return null
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{section.section}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <NavEntry
              key={item.id ?? item.href}
              item={item}
              badge={item.badgeKey ? badges[item.badgeKey] ?? 0 : 0}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function UserMenu() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const initial = user?.name?.charAt(0)?.toUpperCase() || "A"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-brand-100 text-xs font-semibold text-brand-700">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user?.name || "Admin"}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-medium">{user?.name || "Admin"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.role_name || user?.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/team")}>Team & Roles</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings/app-branding")}>
              Branding
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { data: pending } = usePendingActions()
  const { data: support } = useSupportStats()
  const { data: listingStats } = useListingStats()
  const badges = {
    supportUnread: support?.unread ?? 0,
    pendingOrders: pending?.pendingOrders ?? 0,
    pendingListings: listingStats?.pending ?? 0,
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
                  <ShoppingBag className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate text-base font-semibold tracking-tight">Dealker</span>
                  <span className="truncate text-xs text-muted-foreground">Marketplace Admin</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {NAV_SECTIONS.map((section) => (
          <NavGroup key={section.section} section={section} badges={badges} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
