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
  /** Collection Showcase tabs: categories whose products fill the tab. */
  category_ids?: string[]
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
  title_image_url: "",
  see_all_label: "See All",
  tabs: [
    { label: "Trending", chips: [], product_ids: [] },
    { label: "₹99", sub_label: "Store", max_price: 99, chips: [], product_ids: [] },
    { label: "₹199", sub_label: "Store", max_price: 199, chips: [], product_ids: [] },
    { label: "₹299", sub_label: "Store", max_price: 299, chips: [], product_ids: [] },
  ] satisfies StealTab[],
}

/** Same keys and defaults as `kCollectionShowcaseDefaults` in the Flutter app. */
export const COLLECTION_DEFAULTS: Record<string, unknown> = {
  title: "Collection",
  title_image_url: "",
  subtitle: "Celebrate the special bond",
  see_all_label: "See All",
  empty_text: "Nothing here yet",
  bg_color: "#FFFFFF",
  accent_color: "#B8863B",
  accent_soft_color: "#FBEBCB",
  text_color: "#2B2E4E",
  muted_color: "#6F6F6F",
  tabs: [
    { label: "Tab one", chips: [], category_ids: [], product_ids: [] },
    { label: "Tab two", chips: [], category_ids: [], product_ids: [] },
    { label: "Tab three", chips: [], category_ids: [], product_ids: [] },
  ] satisfies StealTab[],
}

/** Same keys and defaults as `kPriceShopDefaults` in the Flutter app. */
export const PRICE_SHOP_DEFAULTS: Record<string, unknown> = {
  title: "Shop by price",
  badge_text: "50% OFF",
  see_all_label: "See all",
  empty_text: "No products in this range yet",
  bg_color: "#FFFFFF",
  text_color: "#1F2937",
  accent_color: "#2B2FD6",
  pill_color: "#F0F0F0",
  pill_selected_color: "#DDE6FF",
  badge_bg_color: "#DDE6FF",
  badge_text_color: "#2B2FD6",
  indicator_color: "#1F1B3A",
  tabs: [
    { label: "Under", sub_label: "₹499", max_price: 499, chips: [], category_ids: [], product_ids: [] },
    { label: "Under", sub_label: "₹999", max_price: 999, chips: [], category_ids: [], product_ids: [] },
    { label: "Under", sub_label: "₹1,999", max_price: 1999, chips: [], category_ids: [], product_ids: [] },
    { label: "Under", sub_label: "₹4,999", max_price: 4999, chips: [], category_ids: [], product_ids: [] },
  ] satisfies StealTab[],
}

export type TabbedVariant = "steal_deals" | "collection_showcase" | "price_shop"

export function tabbedDefaults(v: TabbedVariant): Record<string, unknown> {
  if (v === "price_shop") return PRICE_SHOP_DEFAULTS
  return v === "steal_deals" ? STEAL_DEALS_DEFAULTS : COLLECTION_DEFAULTS
}

export const STEAL_MAX_TABS = 6
export const STEAL_MAX_CHIPS = 8

export function stealString(
  config: Record<string, unknown>,
  key: string,
  variant: TabbedVariant = "steal_deals",
): string {
  const v = config[key]
  if (typeof v === "string") return v
  const d = tabbedDefaults(variant)[key]
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
      category_ids: (Array.isArray(t.category_ids) ? t.category_ids : []).filter(
        (id): id is string => typeof id === "string",
      ),
      product_ids: (Array.isArray(t.product_ids) ? t.product_ids : []).filter(
        (id): id is string => typeof id === "string",
      ),
    }))
}
