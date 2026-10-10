"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ThemeImageUploader } from "@/components/themes/ThemeImageUploader"
import { ThemeColorPicker } from "@/components/themes/ThemeColorPicker"
import { cn } from "@/lib/utils"
import type { SectionType } from "@/types/theme.types"
import AnimationPicker from "./AnimationPicker"
import CardShapePicker from "./CardShapePicker"

interface ProductConfigEditorProps {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
  sectionType?: SectionType
}

// 4-up grids are not supported on mobile — keep this in lock-step with the
// columns.clamp(2, 3) in the Flutter app's _buildCategoryProductGrid.
const COLUMN_OPTIONS = [2, 3] as const

/**
 * Product card visual styles offered to admins. Values are the canonical
 * UPPER_SNAKE tokens persisted into `section.config.product_card_style` and
 * read verbatim by the Flutter app (`productCardVariantFromString`). Keep these
 * in lock-step with the Flutter `ProductCardVariant` enum.
 *
 * Default is QUICK_COMMERCE_COMPACT — sections saved without this key (older
 * themes) fall back to it on the app side too.
 */
const PRODUCT_CARD_STYLES = [
  {
    value: "QUICK_COMMERCE_COMPACT",
    label: "Quick Commerce (Compact)",
    description: "Premium reference card — price sticker, discount line, rating & delivery.",
  },
  {
    value: "DEALKER_MARKETPLACE_BOX",
    label: "Dealker Marketplace Box",
    description: "Home design box — badge, name, variant, price + MRP, rating, stock. Colours in Product Box.",
  },
  {
    value: "DEALKER_LEGACY_CLEAN",
    label: "Dealker Legacy (Clean)",
    description: "Classic simpler card — plain price, minimal chrome.",
  },
] as const

const DEFAULT_PRODUCT_CARD_STYLE = "QUICK_COMMERCE_COMPACT"

// Reference phone: 390 pt wide, 3× pixel density. The section sits between 12 pt side
// margins (366 pt wide) and the card row is a fixed height per card style — keep these
// in lock-step with `_ManifestHorizontalProductSection` in the Flutter app.
const SECTION_WIDTH_PT = 366
const PIXEL_DENSITY = 3
const CARD_ROW_HEIGHT_PT: Record<string, number> = {
  DEALKER_MARKETPLACE_BOX: 184,
  QUICK_COMMERCE_COMPACT: 246,
  DEALKER_LEGACY_CLEAN: 246,
}
const DEFAULT_TOP_SPACE = 96
const DEFAULT_BOTTOM_SPACE = 14

/** Size + zones for the carousel background artwork, from the current settings. */
function backgroundGuide(cardStyle: string, topPt: number, bottomPt: number) {
  const cardPt = CARD_ROW_HEIGHT_PT[cardStyle] ?? 246
  const widthPx = Math.round(SECTION_WIDTH_PT * PIXEL_DENSITY)
  const topPx = Math.round(topPt * PIXEL_DENSITY)
  const cardPx = Math.round(cardPt * PIXEL_DENSITY)
  const bottomPx = Math.round(bottomPt * PIXEL_DENSITY)
  const heightPx = topPx + cardPx + bottomPx
  // Simple ratio for AI image tools (they follow ratios, not pixel sizes).
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const d = gcd(widthPx, heightPx)
  const ratio = `${Math.round(widthPx / d)}:${Math.round(heightPx / d)}`
  const ratioNearest =
    [["1:1", 1], ["5:4", 1.25], ["4:3", 1.333], ["3:2", 1.5], ["16:9", 1.778], ["2:1", 2]]
      .reduce((best, r) => (Math.abs((r[1] as number) - widthPx / heightPx) < Math.abs((best[1] as number) - widthPx / heightPx) ? r : best))[0] as string
  return { widthPx, heightPx, topPx, cardPx, bottomPx, ratio, ratioNearest, aspect: widthPx / heightPx }
}

function backgroundPrompt(g: ReturnType<typeof backgroundGuide>) {
  const topPct = Math.round((g.topPx / g.heightPx) * 100)
  const cardPct = Math.round((g.cardPx / g.heightPx) * 100)
  return [
    `Create a background image with aspect ratio ${g.ratioNearest} (width : height, taller than a normal banner — about ${g.aspect.toFixed(2)}:1), for a mobile app product-carousel section. If you can set pixels: ${g.widthPx} x ${g.heightPx}.`,
    `Layout, top to bottom (as % of the height):`,
    `1) TOP ${topPct}%: the hero artwork — headline text, logo/badge and decorative graphics for my sale theme. Keep text at least 4% away from the left and right edges.`,
    `2) NEXT ${cardPct}%: a calm, plain area in the SAME colour as the top, only a very soft gradient or faint pattern. NO text, products or busy graphics here — product cards will sit on top of it.`,
    `3) LAST ${100 - topPct - cardPct}%: the same background colour, continuing the middle.`,
    `One continuous colour scheme top to bottom, flat rectangular image, no border, no rounded corners, no phone mockup (the app adds the rounded corners).`,
  ].join("\n")
}

export default function ProductConfigEditor({
  config,
  onChange,
  sectionType,
}: ProductConfigEditorProps) {
  const title = typeof config.title === "string" ? config.title : "Products"
  const columns = typeof config.columns === "number" ? config.columns : 3
  const cardShape =
    typeof config.card_shape === "string" ? config.card_shape : "rounded"
  const autoScroll = Boolean(config.auto_scroll)
  const productCardStyle =
    typeof config.product_card_style === "string"
      ? config.product_card_style
      : DEFAULT_PRODUCT_CARD_STYLE
  const isCarousel = sectionType === "product_carousel"
  const backgroundUrl =
    typeof config.background_image_url === "string" ? config.background_image_url : ""
  const hasBackground = backgroundUrl.trim().length > 0
  const showTitle = config.show_title !== false
  const showViewAllButton =
    typeof config.show_view_all_button === "boolean" ? config.show_view_all_button : hasBackground
  const topSpace =
    typeof config.top_space === "number" ? config.top_space : hasBackground ? DEFAULT_TOP_SPACE : 0
  const bottomSpace =
    typeof config.bottom_space === "number" ? config.bottom_space : hasBackground ? DEFAULT_BOTTOM_SPACE : 0
  const backgroundRadius = typeof config.border_radius === "number" ? config.border_radius : 16
  const guide = backgroundGuide(productCardStyle, topSpace, bottomSpace)
  const showColumns = sectionType === "category_product_grid"
  const showAutoScroll = sectionType === "product_carousel"

  const patchConfig = (patch: Partial<Record<string, unknown>>) => {
    onChange({
      ...config,
      ...patch,
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="product-editor-title">Title</Label>
        <Input
          id="product-editor-title"
          value={title}
          onChange={(event) => patchConfig({ title: event.target.value })}
          placeholder="Products"
        />
        {isCarousel ? (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div>
              <div className="text-sm font-medium text-slate-900">Show title</div>
              <div className="text-xs text-slate-500">
                Turn off to hide the heading and "View All" — e.g. when your background image already has the text.
              </div>
            </div>
            <Switch
              checked={showTitle}
              onCheckedChange={(checked) => patchConfig({ show_title: checked })}
            />
          </div>
        ) : null}
        {isCarousel && showTitle ? (
          <div className="mt-2">
            <ThemeColorPicker
              label="Title colour (optional)"
              value={typeof config.title_color === "string" && config.title_color ? config.title_color : hasBackground ? "#FFFFFF" : "#131313"}
              onChange={(value) => patchConfig({ title_color: value })}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Applies to the title and "View All". With a background image it defaults to white.
            </p>
          </div>
        ) : null}
      </div>

      {showColumns ? (
        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-900">Columns</div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {COLUMN_OPTIONS.map((option) => {
              const isActive = option === columns
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => patchConfig({ columns: option })}
                  className={cn(
                    "rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200 sm:py-3",
                    isActive
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  )}
                  aria-pressed={isActive}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <CardShapePicker
        value={cardShape}
        onChange={(value) => patchConfig({ card_shape: value })}
      />

      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium text-slate-900">
            Product Card Style
          </div>
          <p className="text-xs text-slate-500">
            Controls how product cards look in the mobile app for this section.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {PRODUCT_CARD_STYLES.map((option) => {
            const isActive = option.value === productCardStyle
            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  patchConfig({ product_card_style: option.value })
                }
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition-all duration-200",
                  isActive
                    ? "border-blue-500 bg-blue-50 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
                aria-pressed={isActive}
              >
                <div
                  className={cn(
                    "text-sm font-semibold",
                    isActive ? "text-blue-700" : "text-slate-800"
                  )}
                >
                  {option.label}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {option.description}
                </div>
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-slate-400">
          Default is Quick Commerce (Compact). Existing sections without a style
          keep this default.
        </p>
      </div>

      {showAutoScroll ? (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <div className="text-sm font-medium text-slate-900">Auto Scroll</div>
            <div className="text-xs text-slate-500">
              Keep the carousel moving automatically in preview.
            </div>
          </div>
          <Switch
            checked={autoScroll}
            onCheckedChange={(checked) => patchConfig({ auto_scroll: checked })}
          />
        </div>
      ) : null}

      {isCarousel ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-900">"View all" button</div>
              <div className="text-xs text-slate-500">
                A white full-width button under the cards. Opens this section's category.
              </div>
            </div>
            <Switch
              checked={showViewAllButton}
              onCheckedChange={(checked) => patchConfig({ show_view_all_button: checked })}
            />
          </div>
          {showViewAllButton ? (
            <div className="space-y-1">
              <Label htmlFor="carousel-view-all-label" className="text-xs text-slate-500">
                Button text
              </Label>
              <Input
                id="carousel-view-all-label"
                value={typeof config.view_all_label === "string" ? config.view_all_label : "View all"}
                onChange={(event) => patchConfig({ view_all_label: event.target.value })}
                maxLength={24}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {isCarousel ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <div className="text-sm font-medium text-slate-900">Section background</div>
            <p className="text-xs text-slate-500">
              One image behind the whole carousel — artwork on top, the product cards in the
              middle, the same colour below. The section is exactly as tall as your image, so
              the whole picture always shows (never cropped).
            </p>
          </div>

          <ThemeImageUploader
            label="Background image"
            kind="banner"
            value={backgroundUrl || null}
            onChange={(url) => patchConfig({ background_image_url: url ?? "" })}
            hint={`Best shape: about ${guide.ratioNearest} (${guide.widthPx} × ${guide.heightPx} px). Any size works — the whole image always shows; if it is shorter than the cards need, the section extends below it in the image's bottom colour. PNG, WebP or JPG, under 5 MB.`}
          />

          <SpaceSlider
            id="carousel-top-space"
            label="Space above the cards"
            help="Room for your top artwork (and the heading) before the cards start."
            value={topSpace}
            min={0}
            max={300}
            onChange={(value) => patchConfig({ top_space: value })}
          />
          <SpaceSlider
            id="carousel-bottom-space"
            label="Minimum space below the cards"
            help="With an image, whatever your image has below the cards is used; this is the minimum."
            value={bottomSpace}
            min={0}
            max={120}
            onChange={(value) => patchConfig({ bottom_space: value })}
          />
          <SpaceSlider
            id="carousel-radius"
            label="Corner radius"
            help="Rounded corners of the whole section."
            value={backgroundRadius}
            min={0}
            max={32}
            onChange={(value) => patchConfig({ border_radius: value })}
          />

          <ThemeColorPicker
            label="Background colour (optional)"
            value={typeof config.background_color === "string" && config.background_color ? config.background_color : "#FFFFFF"}
            onChange={(value) => patchConfig({ background_color: value })}
          />

          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs font-semibold text-amber-800">
              Background image size guide
            </div>
            <ul className="space-y-0.5 text-[11px] text-amber-800">
              <li>
                <strong>Best shape:</strong> {guide.ratioNearest} — e.g. {guide.widthPx} × {guide.heightPx} px (taller than a normal banner)
              </li>
              <li>
                <strong>Top artwork zone:</strong> first {Math.round((guide.topPx / guide.heightPx) * 100)}% of the height (headline, graphics)
              </li>
              <li>
                <strong>Cards zone:</strong> next {Math.round((guide.cardPx / guide.heightPx) * 100)}%
                (keep plain — cards cover it)
              </li>
              <li>
                <strong>Bottom zone:</strong> the rest (same colour). AI tools often ignore pixel sizes, so ask for
                the ratio above; a wider/shorter image still works.
              </li>
            </ul>
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-amber-700">
                Copy-ready prompt for an AI image tool:
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(backgroundPrompt(guide))
                    toast.success("Prompt copied")
                  } catch {
                    toast.error("Could not copy — select the text below instead")
                  }
                }}
              >
                Copy prompt
              </Button>
            </div>
            <textarea
              readOnly
              value={backgroundPrompt(guide)}
              rows={7}
              className="w-full resize-none rounded-md border border-amber-200 bg-white p-2 text-[11px] text-slate-700"
            />
          </div>
        </div>
      ) : null}

      <AnimationPicker
        value={typeof config.animation === "string" ? config.animation : "none"}
        onChange={(value) => patchConfig({ animation: value })}
      />
    </div>
  )
}

function SpaceSlider({
  id,
  label,
  help,
  value,
  min,
  max,
  onChange,
}: {
  id: string
  label: string
  help: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-sm font-medium text-slate-600">{value} pt</span>
      </div>
      <Input
        id={id}
        type="range"
        min={min}
        max={max}
        step={2}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-3 cursor-pointer rounded-full border-0 bg-transparent px-0 shadow-none"
      />
      <p className="text-[11px] text-slate-500">{help}</p>
    </div>
  )
}
