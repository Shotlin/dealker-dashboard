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
  Megaphone,
  Gift,
  History,
  Image,
  LayoutDashboard,
  MapPinned,
  Package,
  Repeat,
  Palette,
  ScrollText,
  Settings,
  Shield,
  Smartphone,
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
  Percent,
  Crown,
  LayoutGrid,
  SlidersHorizontal,
  ReceiptText,
  ShieldCheck,
  PiggyBank,
  PackageSearch,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react"

export type NavBadgeKey = "pendingOrders" | "pendingListings" | "supportUnread" | "alerts"

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
      { label: "Notifications & Alerts", href: "/alerts", icon: BellRing, badgeKey: "alerts" },
    ],
  },
  {
    section: "Orders",
    items: [
      { label: "B2C Orders", href: "/orders", icon: ClipboardList, badgeKey: "pendingOrders" },
      { label: "B2B Orders", href: "/vendors-marketplace", icon: Boxes },
      { label: "Auction Orders", href: "/orders/auction", icon: Gavel },
      { label: "Exchange Orders", href: "/exchange-requests", icon: Repeat },
      { label: "Seller Orders", href: "/seller-orders", icon: Package },
      { label: "Returns & Refunds", href: "/refund-requests", icon: Undo2 },
    ],
  },
  {
    section: "Sell on Phone",
    items: [
      { label: "Sell Requests", href: "/sell-requests", icon: Smartphone },
    ],
  },
  {
    section: "Auctions",
    items: [
      { label: "B2C & B2B Auctions", href: "/auctions", icon: Gavel },
      { label: "Auction Orders", href: "/orders/auction", icon: ClipboardList },
    ],
  },
  {
    section: "Advertising",
    items: [
      { label: "Sponsored Ads", href: "/ads", icon: Megaphone },
      { label: "Ad Wallet & Billing", href: "/ads/wallet", icon: CreditCard },
      { label: "Ad Pricing Rules", href: "/ads/settings", icon: Settings },
    ],
  },
  {
    section: "Vendors",
    items: [
      { label: "Vendors & KYC", href: "/vendors", icon: Store },
      { label: "Subscriptions", href: "/subscriptions", icon: Crown },
      { label: "B2B Marketplace", href: "/vendors-marketplace", icon: Boxes },
      { label: "Demand / Bulk Requirements", href: "/vendors-marketplace", icon: PackageSearch },
    ],
  },
  {
    section: "Catalog",
    items: [
      { label: "Products", href: "/products", icon: Package, badgeKey: "pendingListings" },
      { label: "Categories", href: "/categories", icon: Tags },
      { label: "Product Sections", href: "/product-sections", icon: LayoutGrid },
      { label: "Price & Stock Control", href: "/price-control", icon: SlidersHorizontal },
      { label: "QC Management", href: "/qc", icon: ShieldCheck },
      { label: "Invoices", href: "/invoices", icon: ReceiptText },
      { label: "Bulk Imports", href: "/catalog-bulk", icon: FileSpreadsheet },
      { label: "Reviews", href: "/reviews", icon: Star },
    ],
  },
  {
    section: "Customers",
    items: [
      { label: "Support Chat", href: "/support", icon: Headset, badgeKey: "supportUnread" },
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Abandoned Cart · B2C", href: "/abandoned-carts", icon: ShoppingCart },
      { label: "Abandoned Cart · B2B", href: "/abandoned-carts/b2b", icon: ShoppingCart },
      { label: "Activity", href: "/customer-activity", icon: History },
      { label: "Segments", href: "/customer-segments", icon: Users2 },
    ],
  },
  {
    section: "Marketing",
    items: [
      { label: "Campaigns", href: "/campaigns", icon: Megaphone },
      { label: "Coupons", href: "/coupons", icon: Ticket },
      { label: "Cart Milestones", href: "/cart-milestones", icon: TrendingUp },
      { label: "Loyalty & Points", href: "/loyalty", icon: Sparkles },
      { label: "Referral Program", href: "/referrals", icon: Gift },
      { label: "Push Notifications", href: "/notifications", icon: Bell },
    ],
  },
  {
    section: "Finance",
    items: [
      { label: "Customer Wallet", href: "/wallet", icon: Wallet },
      { label: "Vendor Wallet", href: "/vendor-wallet", icon: PiggyBank },
      { label: "Commission & Charges", href: "/commission", icon: Percent },
      { label: "Vendor Settlements", href: "/settlements", icon: Landmark },
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
  "sell-requests": "Sell Requests",
  "exchange-requests": "Exchange Requests",
  ads: "Sponsored Ads",
  "seller-orders": "Seller Orders",
  "seller-listings": "Seller Listings",
  products: "Products",
  "refund-requests": "Returns & Refunds",
  "b2b-supply": "Vendors Marketplace",
  "vendors-marketplace": "B2B Marketplace",
  "catalog-bulk": "Bulk Imports",
  "customer-activity": "Customer Activity",
  "customer-segments": "Customer Segments",
  "abandoned-carts": "Abandoned Carts",
  b2b: "B2B",
  "cart-milestones": "Cart Milestones",
  "theme-tabs": "Theme Tabs",
  "activity-log": "Activity Log",
  "app-branding": "Branding",
  "legal-pages": "Legal Pages",
  "order-notifications": "Order Alerts",
  support: "Customer Support",
  settlements: "Vendor Settlements",
  shipping: "Providers & Rules",
  "vendor-wallet": "Vendor Wallet",
  qc: "QC Management",
  subscriptions: "Subscriptions",
  alerts: "Notifications & Alerts",
  campaigns: "Campaigns",
  "price-control": "Price & Stock Control",
  "product-sections": "Product Sections",
  invoices: "Invoices",
  commission: "Commission & Charges",
  wallet: "Customer Wallet",
}
