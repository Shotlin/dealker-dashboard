"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

/** One entry point for every order flow: B2C, B2B, Auction, Exchange, Sell-on-phone. */
const TABS = [
  { href: "/orders", label: "B2C orders", match: (p: string) => p === "/orders" || /^\/orders\/(?!auction)/.test(p) },
  { href: "/vendors-marketplace", label: "B2B orders", match: (p: string) => p.startsWith("/vendors-marketplace") },
  { href: "/orders/auction", label: "Auction orders", match: (p: string) => p.startsWith("/orders/auction") },
  { href: "/exchange-requests", label: "Exchange", match: (p: string) => p.startsWith("/exchange-requests") },
  { href: "/sell-requests", label: "Sell on phone", match: (p: string) => p.startsWith("/sell-requests") },
]

export function OrdersHubTabs() {
  const pathname = usePathname() ?? ""
  return (
    <nav className="flex w-fit max-w-full flex-wrap rounded-lg border p-0.5" aria-label="Order types">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium",
            t.match(pathname) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
