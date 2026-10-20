export interface StealChip {
  category_id: string
  label?: string
  image_url?: string
}

export interface StealTab {
  label: string
  sub_label?: string
  icon_url?: string
  /** Only products priced at or below this show in the tab (the "₹99 Store" rule). */
  max_price?: number | null
  chips: StealChip[]
  product_ids: string[]
}

/** Same keys and defaults as `kStealDealsDefaults` in the Flutter app. */
export const STEAL_DEALS_DEFAULTS: Record<string, unknown> = {
  title: "Steal Deals",
  subtitle: "Add Any 10 Items",
  all_label: "ALL",
  empty_text: "No deals here yet",
  bg_color: "#FFFFFF",
  accent_color: "#E8175D",
  accent_soft_color: "#FDE9F0",
  text_color: "#111111",
  muted_color: "#6F6F6F",
  price_badge_color: "#2E8B2E",
  price_badge_shadow_color: "#1B5E20",
  off_text_color: "#2E8B2E",
  tabs: [
    { label: "Trending", chips: [], product_ids: [] },
    { label: "₹99", sub_label: "Store", max_price: 99, chips: [], product_ids: [] },
    { label: "₹199", sub_label: "Store", max_price: 199, chips: [], product_ids: [] },
    { label: "₹299", sub_label: "Store", max_price: 299, chips: [], product_ids: [] },
  ] satisfies StealTab[],
}

export const STEAL_MAX_TABS = 6
export const STEAL_MAX_CHIPS = 8

export function stealString(config: Record<string, unknown>, key: string): string {
  const v = config[key]
  if (typeof v === "string") return v
  const d = STEAL_DEALS_DEFAULTS[key]
  return typeof d === "string" ? d : ""
}

export function stealTabs(config: Record<string, unknown>): StealTab[] {
  const raw = Array.isArray(config.tabs) ? config.tabs : []
  return raw
    .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
    .map((t) => ({
      label: typeof t.label === "string" ? t.label : "",
      sub_label: typeof t.sub_label === "string" ? t.sub_label : "",
      icon_url: typeof t.icon_url === "string" ? t.icon_url : "",
      max_price:
        typeof t.max_price === "number" && t.max_price > 0 ? t.max_price : null,
      chips: (Array.isArray(t.chips) ? t.chips : [])
        .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
        .map((c) => ({
          category_id: typeof c.category_id === "string" ? c.category_id : "",
          label: typeof c.label === "string" ? c.label : "",
          image_url: typeof c.image_url === "string" ? c.image_url : "",
        })),
      product_ids: (Array.isArray(t.product_ids) ? t.product_ids : []).filter(
        (id): id is string => typeof id === "string",
      ),
    }))
}
