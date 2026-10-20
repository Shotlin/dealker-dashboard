export interface HubTile {
  title?: string;
  label?: string;
  image_url?: string;
  category_id?: string;
}

export interface HubTab {
  label: string;
  tiles: HubTile[];
  grid_title: string;
  grid: HubTile[];
}

/** Same keys and defaults as `kCategoryHubDefaults` in the Flutter app. */
export const CATEGORY_HUB_DEFAULTS: Record<string, unknown> = {
  bg_color: "#FFFFFF",
  text_color: "#1B1740",
  muted_color: "#6B7280",
  indicator_color: "#1B1740",
  tile_color: "#F4F4F6",
  tile_border_color: "#DADAE6",
  accent_color: "#0E7C66",
  see_all_label: "See All",
  tabs: [
    { label: "Top Deals", tiles: [], grid_title: "Shop by category", grid: [] },
    { label: "Mobiles", tiles: [], grid_title: "Mobiles & Tablets", grid: [] },
  ] satisfies HubTab[],
};

export function hubString(
  config: Record<string, unknown>,
  key: string,
): string {
  const v = config[key];
  if (typeof v === "string") return v;
  const d = CATEGORY_HUB_DEFAULTS[key];
  return typeof d === "string" ? d : "";
}

function tiles(raw: unknown): HubTile[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
    .map((t) => ({
      title: typeof t.title === "string" ? t.title : "",
      label: typeof t.label === "string" ? t.label : "",
      image_url: typeof t.image_url === "string" ? t.image_url : "",
      category_id: typeof t.category_id === "string" ? t.category_id : "",
    }));
}

export function hubTabs(config: Record<string, unknown>): HubTab[] {
  return (Array.isArray(config.tabs) ? config.tabs : [])
    .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
    .map((t) => ({
      label: typeof t.label === "string" ? t.label : "",
      tiles: tiles(t.tiles),
      grid_title: typeof t.grid_title === "string" ? t.grid_title : "",
      grid: tiles(t.grid),
    }));
}
