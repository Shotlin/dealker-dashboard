import type { SectionType } from "@/types/theme.types";

/**
 * Home-design blocks of `05-home-below-fold.jpg`. Their content lives in the
 * section `config` (snake_case); the app reads the same keys. Missing keys
 * fall back to these defaults on both sides.
 */
export type DealerBlockType =
  | "live_auction"
  | "deal_of_day"
  | "recent_recommended"
  | "brand_spotlight"
  | "banner_rail";

export const DEALER_BLOCK_TYPES: DealerBlockType[] = [
  "live_auction",
  "deal_of_day",
  "recent_recommended",
  "brand_spotlight",
  "banner_rail",
];

export function isDealerBlock(
  type: SectionType | string,
): type is DealerBlockType {
  return (DEALER_BLOCK_TYPES as string[]).includes(type);
}

export interface BlockField {
  key: string;
  label: string;
  kind: "text" | "color" | "datetime" | "image" | "number";
  hint?: string;
  placeholder?: string;
}

export const DEALER_BLOCK_DEFAULTS: Record<
  DealerBlockType,
  Record<string, unknown>
> = {
  live_auction: {
    title: "LIVE AUCTION",
    subtitle: "Real Bids · Genuine Buyers · Best Deals",
    view_all_label: "View All →",
    button_label: "Bid Now →",
    bg_color: "#FFFFFF",
    header_bg_color: "#EEE9FB",
    max_auctions: 4,
    text_color: "#1B1B4B",
    live_color: "#E0262F",
    button_color: "#4F3FE0",
    winning_color: "#1FB454",
  },
  deal_of_day: {
    title: "DEAL OF THE DAY",
    subtitle: "",
    ends_at: "",
    ends_label: "Ends in",
    view_all_label: "View All →",
    button_label: "Grab Deal →",
    bg_image_url: "",
    header_bg_color: "#2B2FD6",
    header_text_color: "#FFFFFF",
    timer_bg_color: "#14146B",
    timer_border_color: "#FFFFFF",
    timer_text_color: "#FFFFFF",
    view_all_bg_color: "#FFFFFF",
    view_all_text_color: "#1F4FE0",
    panel_color: "#FFFFFF",
    grab_button_color: "#1B5BF2",
  },
  banner_rail: {
    header_image_url: "",
    title: "",
    title_color: "#111111",
    panel_color: "#DCE9F8",
    see_all_label: "See All",
  },
  brand_spotlight: {
    brand_name: "",
    brand_logo_url: "",
    tagline: "Limited Time Deals",
    more_title: "More Items From the Brand",
    add_label: "ADD",
    bg_color: "#E6EEFB",
    panel_color: "#FFFFFF",
    featured_start_color: "#F3F7FF",
    featured_end_color: "#D5E3FA",
    accent_color: "#E8175D",
    text_color: "#111111",
    muted_color: "#6B7280",
    price_badge_color: "#FFE53B",
    price_badge_text_color: "#111111",
    off_text_color: "#2E8B2E",
  },
  recent_recommended: {
    left_title: "Recently Viewed",
    right_title: "Recommended for You",
    view_all_label: "View All →",
    bg_color: "#FFFFFF",
    text_color: "#111111",
  },
};

const col = (key: string, label: string): BlockField => ({
  key,
  label,
  kind: "color",
});
const txt = (key: string, label: string, placeholder?: string): BlockField => ({
  key,
  label,
  kind: "text",
  placeholder,
});

export const DEALER_BLOCK_FIELDS: Record<DealerBlockType, BlockField[]> = {
  live_auction: [
    {
      key: "max_auctions",
      label: "Auctions shown on Home (1–12)",
      kind: "number",
      hint: "The nearest-ending live auctions up to this number, swiped sideways, then a “View all” tile that opens the full Auctions screen.",
    },
    txt("title", "Title"),
    txt("subtitle", "Subtitle"),
    txt("view_all_label", "“View all” label"),
    txt("button_label", "Bid button label"),
    col("bg_color", "Card background"),
    col("header_bg_color", "Header strip / image box color"),
    col("text_color", "Text color"),
    col("live_color", "LIVE badge / timer color"),
    col("button_color", "Bid button color"),
    col("winning_color", "“You are winning” color"),
  ],
  deal_of_day: [
    {
      key: "bg_image_url",
      label: "Background image",
      kind: "image",
      hint: "Recommended: 1448 × 1086 px (4:3). The top 26% is the header (put the title / artwork there, keep the top-right free for the timer and View All); the cards sit on top of the rest. PNG, WebP or JPG, under 5 MB. Without an image the header uses the colour below and the title text.",
    },
    txt("title", "Title (only used when there is no background image)"),
    txt("subtitle", "Subtitle (only used when there is no background image)"),
    col("header_bg_color", "Header colour (no background image)"),
    col("header_text_color", "Title colour (no background image)"),
    {
      key: "ends_at",
      label: "Deal ends at (countdown; empty = end of today)",
      kind: "datetime",
    },
    txt("ends_label", "Timer label"),
    col("timer_bg_color", "Timer background"),
    col("timer_border_color", "Timer border"),
    col("timer_text_color", "Timer text / icon"),
    txt("view_all_label", "“View all” label"),
    col("view_all_bg_color", "View all button"),
    col("view_all_text_color", "View all text"),
    col("panel_color", "Card panel background"),
    txt("button_label", "Card button label"),
    col("grab_button_color", "Card button colour"),
  ],
  banner_rail: [
    {
      key: "header_image_url",
      label: "Header image",
      kind: "image",
      hint: "Wide artwork, about 1148 × 360 px (e.g. the brand name over its products). It fades into the panel colour below it.",
    },
    txt("title", "Title (only used when there is no header image)"),
    col("title_color", "Title colour"),
    col("panel_color", "Panel colour (behind the products)"),
    txt("see_all_label", "See All button label (empty = hide)"),
  ],
  brand_spotlight: [
    {
      key: "brand_logo_url",
      label: "Brand logo",
      kind: "image",
      hint: "Square logo on a white tile, about 300 × 300 px (PNG with transparent background works best).",
    },
    txt("brand_name", "Brand name (empty = the first product's brand)"),
    txt("tagline", "Line under the brand name"),
    txt("more_title", "Heading above the product row"),
    txt("add_label", "Add button label"),
    col("bg_color", "Section background (the tint around the card)"),
    col("panel_color", "White panel"),
    col("featured_start_color", "Featured product gradient — start"),
    col("featured_end_color", "Featured product gradient — end"),
    col("accent_color", "Add button / accent"),
    col("text_color", "Text"),
    col("muted_color", "Secondary text"),
    col("price_badge_color", "Price badge"),
    col("price_badge_text_color", "Price badge text"),
    col("off_text_color", "“₹N OFF” text"),
  ],
  recent_recommended: [
    txt("left_title", "Left card title"),
    txt("right_title", "Right card title"),
    txt("view_all_label", "“View all” label"),
    col("bg_color", "Card background"),
    col("text_color", "Text color"),
  ],
};

export function blockValue(
  config: Record<string, unknown>,
  type: DealerBlockType,
  key: string,
): string {
  const v = config[key];
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  const d = DEALER_BLOCK_DEFAULTS[type][key];
  if (typeof d === "number") return String(d);
  return typeof d === "string" ? d : "";
}
