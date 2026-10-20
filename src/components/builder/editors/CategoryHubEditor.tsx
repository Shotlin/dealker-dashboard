"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
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
import { hubString, hubTabs, type HubTab, type HubTile } from "../categoryHub";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

const COLORS: Array<[string, string]> = [
  ["bg_color", "Section background"],
  ["text_color", "Text"],
  ["indicator_color", "Selected tab underline / text"],
  ["tile_color", "Tile & grid box colour"],
  ["tile_border_color", "Tile border"],
  ["accent_color", "See All button"],
  ["muted_color", "Divider line"],
];

type Cat = { id: string; name: string; image_url: string | null };

function TileList({
  heading,
  hint,
  items,
  titleKey,
  categories,
  onChange,
}: {
  heading: string;
  hint: string;
  items: HubTile[];
  titleKey: "title" | "label";
  categories: Cat[];
  onChange: (items: HubTile[]) => void;
}) {
  const update = (i: number, p: Partial<HubTile>) =>
    onChange(items.map((t, idx) => (idx === i ? { ...t, ...p } : t)));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">{heading}</div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...items,
              { [titleKey]: "", image_url: "", category_id: "" },
            ])
          }
        >
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>
      <p className="text-xs text-slate-500">{hint}</p>
      {items.map((t, i) => {
        const cat = categories.find((c) => c.id === t.category_id);
        return (
          <div
            key={i}
            className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
          >
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={t.category_id || "__none__"}
                  onValueChange={(v) =>
                    update(i, { category_id: v === "__none__" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opens category…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      Opens the Categories screen
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
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              >
                <X className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
            <Input
              value={(titleKey === "title" ? t.title : t.label) ?? ""}
              placeholder={cat?.name ?? "Text on the tile"}
              onChange={(e) => update(i, { [titleKey]: e.target.value })}
            />
            <ThemeImageUploader
              label="Image"
              kind="banner"
              hint={
                cat?.image_url
                  ? undefined
                  : "Square-ish product / category photo with a clean background."
              }
              value={t.image_url || null}
              onChange={(url) => update(i, { image_url: url ?? "" })}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function CategoryHubEditor({ config, onChange }: Props) {
  const tabs = hubTabs(config);
  const { data: categories } = useCategories();
  const cats = useMemo<Cat[]>(
    () =>
      (categories ?? [])
        .filter((c) => c.is_active)
        .sort((a, b) => a.sort_order - b.sort_order),
    [categories],
  );
  const [open, setOpen] = useState(0);
  const patch = (k: string, v: unknown) => onChange({ ...config, [k]: v });
  const setTabs = (next: HubTab[]) => patch("tabs", next);
  const update = (i: number, p: Partial<HubTab>) =>
    setTabs(tabs.map((t, idx) => (idx === i ? { ...t, ...p } : t)));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-slate-600">
          See All button label (empty = hide)
        </Label>
        <Input
          value={hubString(config, "see_all_label")}
          onChange={(e) => patch("see_all_label", e.target.value)}
        />
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Tabs</div>
            <p className="mt-1 text-xs text-slate-500">
              Each tab has tile cards (the row of cards) and a category grid
              with its own heading.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={tabs.length >= 8}
            onClick={() => {
              setTabs([
                ...tabs,
                { label: "New tab", tiles: [], grid_title: "", grid: [] },
              ]);
              setOpen(tabs.length);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add tab
          </Button>
        </div>

        {tabs.map((tab, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 px-4 py-3">
              <button
                type="button"
                className="flex-1 text-left"
                onClick={() => setOpen(open === i ? -1 : i)}
              >
                <div className="text-sm font-medium text-slate-900">
                  {tab.label || `Tab ${i + 1}`}
                </div>
                <div className="text-xs text-slate-500">
                  {tab.tiles.length} tile{tab.tiles.length === 1 ? "" : "s"} ·{" "}
                  {tab.grid.length} grid categor
                  {tab.grid.length === 1 ? "y" : "ies"}
                </div>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setTabs(tabs.filter((_, idx) => idx !== i));
                  setOpen(-1);
                }}
              >
                <Trash2 className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
            {open === i && (
              <div className="space-y-5 border-t border-slate-100 px-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">
                    Tab label
                  </Label>
                  <Input
                    value={tab.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                  />
                </div>
                <TileList
                  heading="Tile cards"
                  hint="The row of cards under the tabs, e.g. “Under ₹199 Store”."
                  items={tab.tiles}
                  titleKey="title"
                  categories={cats}
                  onChange={(tiles) => update(i, { tiles })}
                />
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">
                    Grid heading (e.g. “Home Essentials”)
                  </Label>
                  <Input
                    value={tab.grid_title}
                    onChange={(e) => update(i, { grid_title: e.target.value })}
                  />
                </div>
                <TileList
                  heading="Category grid"
                  hint="Four per row: image with the name underneath."
                  items={tab.grid}
                  titleKey="label"
                  categories={cats}
                  onChange={(grid) => update(i, { grid })}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="text-sm font-semibold text-slate-900">Colours</div>
        {COLORS.map(([k, label]) => (
          <ThemeColorPicker
            key={k}
            label={label}
            value={hubString(config, k) || "#FFFFFF"}
            onChange={(hex) => patch(k, hex)}
          />
        ))}
      </div>
    </div>
  );
}
