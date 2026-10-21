"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeColorPicker } from "@/components/themes/ThemeColorPicker";
import { ThemeImageUploader } from "@/components/themes/ThemeImageUploader";
import { useCategories } from "@/hooks/useCategories";
import { useDebounce } from "@/hooks/useDebounce";
import { getProducts } from "@/services/products.service";
import type { Product } from "@/types";
import {
  STEAL_MAX_CHIPS,
  STEAL_MAX_TABS,
  stealString,
  stealTabs,
  type StealChip,
  type StealTab,
  type TabbedVariant,
} from "../stealDeals";

interface StealDealsEditorProps {
  variant?: TabbedVariant;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

const TEXT_FIELDS: Record<TabbedVariant, Array<[string, string]>> = {
  steal_deals: [
    ["title", "Title (used when there is no title image)"],
    ["subtitle", "Sub-title (e.g. “Add Any 10 Items”)"],
    ["all_label", "“All” chip label"],
    ["see_all_label", "See All button label (empty = hide)"],
    ["empty_text", "Text when a tab has no products"],
  ],
  price_sale: [
    ["title", "Banner title"],
    ["subtitle", "Line before the price (e.g. “Best brands at flat”)"],
    ["see_all_label", "See all button label (empty = hide)"],
    ["empty_text", "Text when a price range has no products"],
  ],
  price_shop: [
    ["title", "Title"],
    ["badge_text", "Badge next to the title (e.g. “50% OFF”, empty = hide)"],
    ["see_all_label", "See all button label (empty = hide)"],
    ["empty_text", "Text when a price range has no products"],
  ],
  collection_showcase: [
    ["title", "Title (used when there is no title image)"],
    ["subtitle", "Line under the title (e.g. “Celebrate the special bond”)"],
    ["see_all_label", "See All button label (empty = hide)"],
    ["empty_text", "Text when a tab has no products"],
  ],
};

const COLOR_FIELDS: Record<TabbedVariant, Array<[string, string]>> = {
  steal_deals: [
    ["bg_color", "Section background"],
    ["accent_color", "Accent (selected tab, chips)"],
    ["accent_soft_color", "Accent tint (selected tab / chip fill)"],
    ["text_color", "Text"],
    ["muted_color", "Secondary text"],
  ],
  price_sale: [
    ["bg_color", "Section background"],
    ["title_color", "Banner title"],
    ["subtitle_color", "Line before the price"],
    ["price_color", "Animated price"],
    ["pill_color", "Price box fill"],
    ["pill_border_color", "Price box border"],
    ["pill_selected_color", "Selected price box fill"],
    ["pill_selected_border_color", "Selected price box border"],
    ["pill_halo_color", "Glow box around the selected price"],
    ["pill_text_color", "Price box text"],
    ["indicator_color", "Underline under the selected box"],
  ],
  price_shop: [
    ["bg_color", "Section background"],
    ["text_color", "Text"],
    ["accent_color", "Selected price text"],
    ["pill_color", "Price box"],
    ["pill_selected_color", "Selected price box"],
    ["indicator_color", "Underline under the selected box"],
    ["badge_bg_color", "Badge background"],
    ["badge_text_color", "Badge text"],
  ],
  collection_showcase: [
    ["bg_color", "Section background"],
    ["accent_color", "Accent (title text, selected tab, line)"],
    ["accent_soft_color", "Selected tab tint"],
    ["text_color", "Tab & sub-title text"],
    ["muted_color", "Empty-state text"],
  ],
};

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function StealDealsEditor({
  variant = "steal_deals",
  config,
  onChange,
}: StealDealsEditorProps) {
  const collection = variant !== "steal_deals";
  const priceShop = variant === "price_shop" || variant === "price_sale";
  const priceSale = variant === "price_sale";
  const tabs = stealTabs(config);
  const { data: categories } = useCategories();
  const available = useMemo(
    () =>
      (categories ?? [])
        .filter((c) => c.is_active)
        .sort((a, b) => a.sort_order - b.sort_order),
    [categories],
  );
  const [open, setOpen] = useState(0);

  const patch = (key: string, value: unknown) =>
    onChange({ ...config, [key]: value });
  const setTabs = (next: StealTab[]) => patch("tabs", next);
  const updateTab = (i: number, p: Partial<StealTab>) =>
    setTabs(tabs.map((t, idx) => (idx === i ? { ...t, ...p } : t)));

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {!priceShop && (
          <ThemeImageUploader
            label="Title image (optional)"
            kind="banner"
            hint="Artwork for the heading, e.g. “Rakhi Picks” with its decoration (transparent PNG, about 900 × 200 px). When set it replaces the title text."
            value={stealString(config, "title_image_url", variant) || null}
            onChange={(url) => patch("title_image_url", url ?? "")}
          />
        )}
        {TEXT_FIELDS[variant].map(([key, label]) => (
          <div key={key} className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">
              {label}
            </Label>
            <Input
              value={stealString(config, key, variant)}
              onChange={(e) => patch(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Tabs</div>
            <p className="mt-1 text-xs text-slate-500">
              {collection
                ? "Each tab is filled by the categories you add and any pinned products. A tab with nothing set shows the live trending products."
                : "Each tab has its own category chips and products. A tab with a “max price” only shows products at or below it (the “₹99 Store” rule). A tab with nothing set shows the live trending products."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={tabs.length >= STEAL_MAX_TABS}
            onClick={() => {
              setTabs([
                ...tabs,
                {
                  label: "New tab",
                  chips: [],
                  category_ids: [],
                  product_ids: [],
                },
              ]);
              setOpen(tabs.length);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add tab
          </Button>
        </div>

        {tabs.map((tab, i) => (
          <TabCard
            key={i}
            index={i}
            tab={tab}
            collection={collection}
            priceShop={priceShop}
            priceSale={priceSale}
            total={tabs.length}
            expanded={open === i}
            categories={available}
            onToggle={() => setOpen(open === i ? -1 : i)}
            onChange={(p) => updateTab(i, p)}
            onMove={(dir) => {
              setTabs(move(tabs, i, i + dir));
              setOpen(i + dir);
            }}
            onRemove={() => {
              setTabs(tabs.filter((_, idx) => idx !== i));
              setOpen(-1);
            }}
          />
        ))}
        {tabs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
            No tabs yet — the section stays hidden in the app until you add one.
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="text-sm font-semibold text-slate-900">Colours</div>
        {COLOR_FIELDS[variant].map(([key, label]) => (
          <ThemeColorPicker
            key={key}
            label={label}
            value={stealString(config, key, variant) || "#FFFFFF"}
            onChange={(hex) => patch(key, hex)}
          />
        ))}
      </div>
    </div>
  );
}

interface TabCardProps {
  index: number;
  collection: boolean;
  priceShop: boolean;
  priceSale: boolean;
  tab: StealTab;
  total: number;
  expanded: boolean;
  categories: Array<{ id: string; name: string; image_url: string | null }>;
  onToggle: () => void;
  onChange: (patch: Partial<StealTab>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

function TabCard({
  index,
  collection,
  priceShop,
  priceSale,
  tab,
  total,
  expanded,
  categories,
  onToggle,
  onChange,
  onMove,
  onRemove,
}: TabCardProps) {
  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const setChips = (chips: StealChip[]) => onChange({ chips });
  const updateChip = (i: number, p: Partial<StealChip>) =>
    setChips(tab.chips.map((c, idx) => (idx === i ? { ...c, ...p } : c)));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" className="flex-1 text-left" onClick={onToggle}>
          <div className="text-sm font-medium text-slate-900">
            {tab.label || `Tab ${index + 1}`}
            {tab.sub_label ? ` · ${tab.sub_label}` : ""}
          </div>
          <div className="text-xs text-slate-500">
            {collection
              ? `${(tab.category_ids ?? []).length} categor${(tab.category_ids ?? []).length === 1 ? "y" : "ies"}`
              : `${tab.chips.length} chip${tab.chips.length === 1 ? "" : "s"}`}{" "}
            · {tab.product_ids.length} pinned product
            {tab.product_ids.length === 1 ? "" : "s"}
            {tab.max_price ? ` · up to ₹${tab.max_price}` : ""}
          </div>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={index === total - 1}
          onClick={() => onMove(1)}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="h-4 w-4 text-slate-500" />
        </Button>
      </div>

      {expanded && (
        <div className="space-y-5 border-t border-slate-100 px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">
                Label
              </Label>
              <Input
                value={tab.label}
                placeholder={priceShop ? "Under" : "Trending, ₹99 …"}
                onChange={(e) => onChange({ label: e.target.value })}
              />
            </div>
            {(!collection || priceShop) && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600">
                  {priceShop
                    ? "Price shown big (e.g. ₹499)"
                    : "Small text under it"}
                </Label>
                <Input
                  value={tab.sub_label ?? ""}
                  placeholder={priceShop ? "₹499" : "Store"}
                  onChange={(e) => onChange({ sub_label: e.target.value })}
                />
              </div>
            )}
          </div>

          {priceSale && (
            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600">
                  Price in the banner line (slides when this box is picked)
                </Label>
                <Input
                  value={tab.price_text ?? ""}
                  placeholder={tab.sub_label || "₹199"}
                  onChange={(e) => onChange({ price_text: e.target.value })}
                />
              </div>
              <ThemeImageUploader
                label="Banner artwork — left"
                kind="banner"
                hint="Combo pack photo (transparent PNG, about 400 × 360 px). Cross-fades when this box is picked."
                value={tab.header_left_url || null}
                onChange={(url) => onChange({ header_left_url: url ?? "" })}
              />
              <ThemeImageUploader
                label="Banner artwork — right"
                kind="banner"
                hint="Second combo pack photo (transparent PNG)."
                value={tab.header_right_url || null}
                onChange={(url) => onChange({ header_right_url: url ?? "" })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">
              Max price ₹ (optional — only products up to this price show)
            </Label>
            <Input
              type="number"
              min={1}
              value={tab.max_price ?? ""}
              placeholder="e.g. 99"
              onChange={(e) => {
                const n = Math.round(Number(e.target.value));
                onChange({ max_price: Number.isFinite(n) && n > 0 ? n : null });
              }}
            />
          </div>

          {!collection && (
            <ThemeImageUploader
              label="Tab icon (optional)"
              kind="banner"
              hint="With an icon the tab shows icon + label (like “Trending”). Without it the tab shows the big label and the small text."
              value={tab.icon_url || null}
              onChange={(url) => onChange({ icon_url: url ?? "" })}
            />
          )}

          {collection ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">
                  Categories
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={(tab.category_ids ?? []).length >= STEAL_MAX_CHIPS}
                  onClick={() =>
                    onChange({
                      category_ids: [...(tab.category_ids ?? []), ""],
                    })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add category
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Products of these categories fill the tab. “See All” opens the
                first one.
              </p>
              {(tab.category_ids ?? []).map((id, ci) => (
                <div key={ci} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={id || "__none__"}
                      onValueChange={(value) =>
                        onChange({
                          category_ids: (tab.category_ids ?? []).map(
                            (x, idx) =>
                              idx === ci
                                ? value === "__none__"
                                  ? ""
                                  : value
                                : x,
                          ),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          Choose a category
                        </SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      onChange({
                        category_ids: (tab.category_ids ?? []).filter(
                          (_, idx) => idx !== ci,
                        ),
                      })
                    }
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">
                  Category chips
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={tab.chips.length >= STEAL_MAX_CHIPS}
                  onClick={() =>
                    setChips([
                      ...tab.chips,
                      { category_id: "", label: "", image_url: "" },
                    ])
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add chip
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Products of the chosen categories fill this tab; tapping a chip
                shows only that category.
              </p>
              {tab.chips.map((chip, ci) => {
                const cat = catMap.get(chip.category_id);
                return (
                  <div
                    key={ci}
                    className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Select
                          value={chip.category_id || "__none__"}
                          onValueChange={(value) =>
                            updateChip(ci, {
                              category_id: value === "__none__" ? "" : value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              Choose a category
                            </SelectItem>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setChips(tab.chips.filter((_, idx) => idx !== ci))
                        }
                      >
                        <X className="h-4 w-4 text-slate-500" />
                      </Button>
                    </div>
                    <Input
                      value={chip.label ?? ""}
                      placeholder={
                        cat?.name ?? "Chip label (default: category name)"
                      }
                      onChange={(e) =>
                        updateChip(ci, { label: e.target.value })
                      }
                    />
                    <ThemeImageUploader
                      label="Chip image"
                      kind="banner"
                      hint={
                        cat?.image_url
                          ? "Empty = the category's own image."
                          : undefined
                      }
                      value={chip.image_url || null}
                      onChange={(url) =>
                        updateChip(ci, { image_url: url ?? "" })
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}

          <PinnedProducts
            ids={tab.product_ids}
            onChange={(product_ids) => onChange({ product_ids })}
          />
        </div>
      )}
    </div>
  );
}

function PinnedProducts({
  ids,
  onChange,
}: {
  ids: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 250);
  const [known, setKnown] = useState<Record<string, Product>>({});
  const { data, isFetching } = useQuery({
    queryKey: ["builder", "steal-product-search", debounced],
    queryFn: () =>
      getProducts({ page: 1, limit: 8, search: debounced, status: "active" }),
    enabled: debounced.trim().length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!data?.products?.length) return;
    setKnown((cur) => {
      const next = { ...cur };
      data.products.forEach((p) => {
        next[p.id] = p;
      });
      return next;
    });
  }, [data?.products]);

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-slate-900">
        Pinned products (optional)
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          className="pl-9"
          value={search}
          placeholder="Search a product to pin…"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {debounced.trim().length >= 2 && (
        <div className="max-h-44 space-y-1 overflow-auto rounded-xl border border-slate-200 bg-white p-1">
          {isFetching && (
            <div className="px-3 py-2 text-xs text-slate-500">Searching…</div>
          )}
          {(data?.products ?? []).map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={ids.includes(p.id)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-40"
              onClick={() => {
                onChange([...ids, p.id]);
                setSearch("");
              }}
            >
              <span className="truncate">{p.name}</span>
              <span className="ml-2 shrink-0 text-xs text-slate-500">
                ₹{p.sale_price ?? p.price}
              </span>
            </button>
          ))}
          {!isFetching && (data?.products ?? []).length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-500">
              No products found.
            </div>
          )}
        </div>
      )}
      {ids.map((id) => (
        <div
          key={id}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <span className="truncate">{known[id]?.name ?? id}</span>
          <button
            type="button"
            onClick={() => onChange(ids.filter((x) => x !== id))}
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      ))}
    </div>
  );
}
