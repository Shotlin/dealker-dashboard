import {
  Activity,
  BarChart3,
  Bell,
  BellRing,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Gavel,
  Gift,
  History,
  Image,
  LayoutDashboard,
  MapPinned,
  Package,
  Palette,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  Star,
  Store,
  Tags,
  Ticket,
  TrendingUp,
  Truck,
  Undo2,
  Users,
  Users2,
  Wallet,
  Boxes,
  Headset,
  Landmark,
  PackageSearch,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react"

export type NavBadgeKey = "pendingOrders" | "pendingListings" | "supportUnread"

export interface NavChild {
  label: string
  href: string
  icon: LucideIcon
}

export interface NavItem {
  /** Stable id used for permission gating (looked up in `MENU_PERMISSIONS`). */
  id?: string
  label: string
  href: string
  icon: LucideIcon
  badgeKey?: NavBadgeKey
  children?: NavChild[]
}

export interface NavSection {
  section: string
  items: NavItem[]
}

/** Dealker marketplace navigation — platform-level, vendor-centric. */
export const NAV_SECTIONS: NavSection[] = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    section: "Orders",
    items: [
      { label: "All Orders", href: "/orders", icon: ClipboardList, badgeKey: "pendingOrders" },
      { label: "Seller Orders", href: "/seller-orders", icon: Package },
      { label: "Returns & Refunds", href: "/refund-requests", icon: Undo2 },
    ],
  },
  {
    section: "Auctions",
    items: [
      { label: "Auctions", href: "/auctions", icon: Gavel },
    ],
  },
  {
    section: "Vendors",
    items: [
      { label: "Vendors & KYC", href: "/vendors", icon: Store },
      { label: "Vendor Settlements", href: "/settlements", icon: Landmark },
      { label: "Vendors Marketplace", href: "/vendors-marketplace", icon: Boxes },
    ],
  },
  {
    section: "Catalog",
    items: [
      { label: "Products", href: "/products", icon: Package, badgeKey: "pendingListings" },
      { label: "Categories", href: "/categories", icon: Tags },
      { label: "Bulk Imports", href: "/catalog-bulk", icon: FileSpreadsheet },
      { label: "Reviews", href: "/reviews", icon: Star },
    ],
  },
  {
    section: "Customers",
    items: [
      { label: "Support Chat", href: "/support", icon: Headset, badgeKey: "supportUnread" },
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Abandoned Carts", href: "/abandoned-carts", icon: ShoppingCart },
      { label: "Activity", href: "/customer-activity", icon: History },
      { label: "Segments", href: "/customer-segments", icon: Users2 },
    ],
  },
  {
    section: "Marketing",
    items: [
      { label: "Coupons", href: "/coupons", icon: Ticket },
      { label: "Cart Milestones", href: "/cart-milestones", icon: TrendingUp },
      { label: "Loyalty & Points", href: "/loyalty", icon: Sparkles },
      { label: "Referral Program", href: "/referrals", icon: Gift },
      { label: "Wallet & Cashback", href: "/wallet", icon: Wallet },
      { label: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
  {
    section: "Shipping",
    items: [
      { label: "Shipments", href: "/shipments", icon: Truck },
      { label: "Providers & Rules", href: "/shipping", icon: MapPinned },
    ],
  },
  {
    section: "Storefront",
    items: [
      { label: "Themes", href: "/themes", icon: Palette },
      { label: "Theme Tabs", href: "/theme-tabs", icon: Tags },
      { label: "Banners", href: "/banners", icon: Image },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Activity Log", href: "/activity-log", icon: Activity },
      { label: "Team & Roles", href: "/team", icon: Shield },
      {
        id: "settings",
        label: "Settings",
        href: "/settings/fees",
        icon: Settings,
        children: [
          { label: "Fees & Commission", href: "/settings/fees", icon: FileText },
          { label: "Payments", href: "/settings/payments", icon: CreditCard },
          { label: "Wallet", href: "/settings/wallet", icon: Wallet },
          { label: "Order Alerts", href: "/settings/order-notifications", icon: BellRing },
          { label: "Branding", href: "/settings/app-branding", icon: Image },
          { label: "Legal Pages", href: "/settings/legal-pages", icon: ScrollText },
        ],
      },
    ],
  },
]

/** Human labels for breadcrumb segments that don't title-case cleanly. */
export const ROUTE_LABELS: Record<string, string> = {
  auctions: "Auctions",
  "seller-orders": "Seller Orders",
  "seller-listings": "Seller Listings",
  products: "Products",
  "refund-requests": "Returns & Refunds",
  "b2b-supply": "Vendors Marketplace",
  "vendors-marketplace": "Vendors Marketplace",
  "catalog-bulk": "Bulk Imports",
  "customer-activity": "Customer Activity",
  "customer-segments": "Customer Segments",
  "abandoned-carts": "Abandoned Carts",
  "cart-milestones": "Cart Milestones",
  "theme-tabs": "Theme Tabs",
  "activity-log": "Activity Log",
  "app-branding": "Branding",
  "legal-pages": "Legal Pages",
  "order-notifications": "Order Alerts",
  support: "Customer Support",
  settlements: "Vendor Settlements",
  shipping: "Providers & Rules",
}
