export interface BrandCard {
  brand_name: string;
  logo_url: string;
  image_url: string;
  category_id: string;
  search_query: string;
}

/** Same keys and defaults as `kTopBrandsDefaults` in the Flutter app. */
export const TOP_BRANDS_DEFAULTS: Record<string, unknown> = {
  title: "Top Brands",
  bg_color: "#FFFFFF",
  text_color: "#111111",
  border_top_color: "#8FCB8A",
  border_bottom_color: "#3E86A6",
  fill_top_color: "#FBFFE8",
  fill_bottom_color: "#DDF7D9",
  band_color: "#D1F5BD",
  ornament_color: "#CFE9B8",
  cards: [
    {
      brand_name: "Apple",
      logo_url: "",
      image_url: "",
      category_id: "",
      search_query: "",
    },
    {
      brand_name: "Samsung",
      logo_url: "",
      image_url: "",
      category_id: "",
      search_query: "",
    },
  ] satisfies BrandCard[],
};

export function brandString(
  config: Record<string, unknown>,
  key: string,
): string {
  const v = config[key];
  if (typeof v === "string") return v;
  const d = TOP_BRANDS_DEFAULTS[key];
  return typeof d === "string" ? d : "";
}

export function brandCards(config: Record<string, unknown>): BrandCard[] {
  return (Array.isArray(config.cards) ? config.cards : [])
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
    .map((c) => ({
      brand_name: typeof c.brand_name === "string" ? c.brand_name : "",
      logo_url: typeof c.logo_url === "string" ? c.logo_url : "",
      image_url: typeof c.image_url === "string" ? c.image_url : "",
      category_id: typeof c.category_id === "string" ? c.category_id : "",
      search_query: typeof c.search_query === "string" ? c.search_query : "",
    }));
}
