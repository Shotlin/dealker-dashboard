"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
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
import { brandCards, brandString, type BrandCard } from "../topBrands";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

const COLORS: Array<[string, string]> = [
  ["bg_color", "Section background"],
  ["text_color", "Title & brand-name text"],
  ["border_top_color", "Card border — top"],
  ["border_bottom_color", "Card border — bottom"],
  ["fill_top_color", "Card fill — top"],
  ["fill_bottom_color", "Card fill — bottom"],
  ["band_color", "Logo band at the bottom"],
  ["ornament_color", "Decoration in the arch"],
];

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function TopBrandsEditor({ config, onChange }: Props) {
  const cards = brandCards(config);
  const { data: categories } = useCategories();
  const cats = useMemo(
    () =>
      (categories ?? [])
        .filter((c) => c.is_active)
        .sort((a, b) => a.sort_order - b.sort_order),
    [categories],
  );
  const [open, setOpen] = useState(0);
  const patch = (k: string, v: unknown) => onChange({ ...config, [k]: v });
  const setCards = (next: BrandCard[]) => patch("cards", next);
  const update = (i: number, p: Partial<BrandCard>) =>
    setCards(cards.map((c, idx) => (idx === i ? { ...c, ...p } : c)));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-slate-600">Title</Label>
        <Input
          value={brandString(config, "title")}
          onChange={(e) => patch("title", e.target.value)}
        />
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Brand cards
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Each card shows a product photo on top and the brand logo at the
              bottom. Tapping it opens the category you pick, or a search for
              the brand.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={cards.length >= 12}
            onClick={() => {
              setCards([
                ...cards,
                {
                  brand_name: "",
                  logo_url: "",
                  image_url: "",
                  category_id: "",
                  search_query: "",
                },
              ]);
              setOpen(cards.length);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add brand
          </Button>
        </div>

        {cards.map((card, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 px-4 py-3">
              <button
                type="button"
                className="flex-1 text-left"
                onClick={() => setOpen(open === i ? -1 : i)}
              >
                <div className="text-sm font-medium text-slate-900">
                  {card.brand_name || `Brand ${i + 1}`}
                </div>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={i === 0}
                onClick={() => setCards(move(cards, i, i - 1))}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={i === cards.length - 1}
                onClick={() => setCards(move(cards, i, i + 1))}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setCards(cards.filter((_, idx) => idx !== i));
                  setOpen(-1);
                }}
              >
                <Trash2 className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
            {open === i && (
              <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">
                    Brand name (shown if there is no logo)
                  </Label>
                  <Input
                    value={card.brand_name}
                    placeholder="Apple"
                    onChange={(e) => update(i, { brand_name: e.target.value })}
                  />
                </div>
                <ThemeImageUploader
                  label="Product photo"
                  kind="banner"
                  hint="Clean photo on a transparent or white background, e.g. the brand's best-selling phone."
                  value={card.image_url || null}
                  onChange={(url) => update(i, { image_url: url ?? "" })}
                />
                <ThemeImageUploader
                  label="Brand logo"
                  kind="banner"
                  hint="Wide logo with a transparent background (about 400 × 150 px)."
                  value={card.logo_url || null}
                  onChange={(url) => update(i, { logo_url: url ?? "" })}
                />
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">
                    Opens category
                  </Label>
                  <Select
                    value={card.category_id || "__none__"}
                    onValueChange={(v) =>
                      update(i, { category_id: v === "__none__" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Search for the brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        No category — search for the brand
                      </SelectItem>
                      {cats.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!card.category_id && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-600">
                      Search text (empty = the brand name)
                    </Label>
                    <Input
                      value={card.search_query}
                      placeholder={card.brand_name || "Apple"}
                      onChange={(e) =>
                        update(i, { search_query: e.target.value })
                      }
                    />
                  </div>
                )}
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
            value={brandString(config, k) || "#FFFFFF"}
            onChange={(hex) => patch(k, hex)}
          />
        ))}
      </div>
    </div>
  );
}
