import type { SectionType } from "@/types/theme.types";

/**
 * Home-design blocks of `05-home-below-fold.jpg`. Their content lives in the
 * section `config` (snake_case); the app reads the same keys. Missing keys
 * fall back to these defaults on both sides.
 */
export type DealerBlockType =
  | "live_auction"
  | "deal_of_day"
  | "mega_sale"
  | "exchange_sell"
  | "recent_recommended";

export const DEALER_BLOCK_TYPES: DealerBlockType[] = [
  "live_auction",
  "deal_of_day",
  "mega_sale",
  "exchange_sell",
  "recent_recommended",
];

export function isDealerBlock(
  type: SectionType | string,
): type is DealerBlockType {
  return (DEALER_BLOCK_TYPES as string[]).includes(type);
}

export interface BlockField {
  key: string;
  label: string;
  kind: "text" | "color" | "datetime" | "image";
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
  mega_sale: {
    title: "MEGA SALE",
    subtitle: "UP TO 80% OFF",
    view_all_label: "View All →",
    bg_color: "#FBE36B",
    text_color: "#111111",
    chip_color: "#FFFFFF",
    items: [],
  },
  exchange_sell: {
    title: "EXCHANGE & SELL YOUR DEVICE",
    subtitle: "Get the best value for your old phone",
    button_label: "Get Estimate →",
    bg_color: "#FBE36B",
    text_color: "#111111",
    button_color: "#0F2340",
    button_text_color: "#FFFFFF",
    trust_bg_color: "#FFFFFF",
    trust_1_title: "Quality Checked",
    trust_1_sub: "Thoroughly Inspected",
    trust_2_title: "Battery Tested",
    trust_2_sub: "Longer Life",
    trust_3_title: "Secure Payments",
    trust_3_sub: "100% Safe",
    trust_4_title: "Warranty Options",
    trust_4_sub: "Up to 12 Months",
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
  mega_sale: [
    txt("title", "Title"),
    txt("subtitle", "Subtitle"),
    txt("view_all_label", "“View all” label"),
    col("bg_color", "Strip background"),
    col("text_color", "Text color"),
    col("chip_color", "Chip background"),
  ],
  exchange_sell: [
    txt("title", "Title"),
    txt("subtitle", "Subtitle"),
    txt("button_label", "Button label"),
    col("bg_color", "Strip background"),
    col("text_color", "Text color"),
    col("button_color", "Button color"),
    col("button_text_color", "Button text color"),
    col("trust_bg_color", "Trust row background"),
    txt("trust_1_title", "Trust 1 — title"),
    txt("trust_1_sub", "Trust 1 — subtitle"),
    txt("trust_2_title", "Trust 2 — title"),
    txt("trust_2_sub", "Trust 2 — subtitle"),
    txt("trust_3_title", "Trust 3 — title"),
    txt("trust_3_sub", "Trust 3 — subtitle"),
    txt("trust_4_title", "Trust 4 — title"),
    txt("trust_4_sub", "Trust 4 — subtitle"),
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
  const d = DEALER_BLOCK_DEFAULTS[type][key];
  return typeof d === "string" ? d : "";
}
