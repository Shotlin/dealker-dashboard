"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, RotateCcw, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ThemeColorPicker } from "@/components/themes/ThemeColorPicker"
import { ThemeImageUploader } from "@/components/themes/ThemeImageUploader"
import { useUpdateTheme } from "@/hooks/useThemes"
import {
  DEFAULT_HOME_LOOK,
  SEARCH_BOX_IMAGE_SPEC,
  type HomeLookTheme,
} from "@/types/theme.types"
import type {
  Theme,
  ThemeData,
  ThemeSections,
  UpdateThemePayload,
} from "@/types/theme.types"
import {
  CHROME_REGION_META,
  getChromeRegionMeta,
  type ChromeRegion,
} from "./chromeRegions"

interface ChromeRegionEditorProps {
  region: ChromeRegion
  theme: Theme | null
  onClose: () => void
  /** Called whenever the local draft changes — lets the parent feed live preview */
  onDraftChange?: (draft: ThemeData) => void
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function defaultThemeSections(): ThemeSections {
  // Mirror server-side defaults; safe additive shape so missing fields fall back.
  return {
    topBar: { backgroundColor: "#88D4FE", textColor: "#111827" },
    storeSelector: { backgroundColor: "#88D4FE", activeChipColor: "#B1EAFF" },
    categoryTabs: {
      visible: true,
      textColor: "#111827",
      indicatorColor: "#111827",
    },
    searchZone: {
      backgroundColor: "#FFFFFF",
      waveColor: "#88D4FE",
      searchHints: [],
      promoBoxImageUrl: null,
    },
    bannerAnimation: {
      lottieUrl: null,
      backgroundGradient: ["#E8F5E9", "#C8E6C9"],
      containerColor: "#FFFFFF",
    },
    feeStrip: { imageUrl: null, visible: true },
    seasonalMosaic: {
      containerColor: "#FFF8E1",
      heroTile: {
        title: "Hero",
        gradient: ["#FFF8E1", "#FFE082"],
        badgeText: "",
        badgeGradient: ["#FFB300", "#F57C00"],
      },
      miniTiles: [],
    },
    bankOffers: { visible: true, bannerImageUrls: [] },
  }
}

export default function ChromeRegionEditor({
  region,
  theme,
  onClose,
  onDraftChange,
}: ChromeRegionEditorProps) {
  const meta = getChromeRegionMeta(region)
  const updateThemeMutation = useUpdateTheme()

  // Local theme_data draft (mirrors the server theme until Apply).
  const [draft, setDraft] = useState<ThemeData>(() => {
    if (theme?.theme_data) return deepClone(theme.theme_data)
    return {
      sections: defaultThemeSections(),
      meta: { seasonLabel: "default", statusBarBrightness: "dark" },
    }
  })

  useEffect(() => {
    if (theme?.theme_data) {
      setDraft(deepClone(theme.theme_data))
    }
  }, [theme?.id, theme?.updated_at, theme?.theme_data])

  const isDirty = useMemo(() => {
    if (!theme?.theme_data) return false
    return JSON.stringify(theme.theme_data) !== JSON.stringify(draft)
  }, [theme?.theme_data, draft])

  const patchSections = (patch: Partial<ThemeSections>) => {
    setDraft((prev) => {
      const next = {
        ...prev,
        sections: { ...prev.sections, ...patch },
      }
      // Notify parent immediately so live preview updates without a server round-trip
      onDraftChange?.(next)
      return next
    })
  }

  const handleApply = async () => {
    if (!theme || !isDirty) return
    const payload: UpdateThemePayload = { theme_data: draft }
    await updateThemeMutation.mutateAsync({ id: theme.id, payload })
  }

  const handleReset = () => {
    if (!theme?.theme_data) return
    const reset = deepClone(theme.theme_data)
    setDraft(reset)
    onDraftChange?.(reset)
  }

  const isBusy = updateThemeMutation.isPending

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-[24px] border border-slate-200/80 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:rounded-[28px]">
      <div
        className="border-b border-slate-200/80 px-4 py-4"
        style={{
          borderBottomColor: "var(--store-accent, inherit)",
          borderBottomWidth: 2,
          transition: "border-bottom-color 200ms ease",
        }}
      >
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            aria-label="Close chrome editor"
          >
            <RotateCcw className="h-4 w-4 rotate-180" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Editing Theme Region
            </div>
            <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">
              {meta.label}
            </div>
            <div className="mt-1 truncate text-xs text-slate-500">
              {meta.description}
            </div>
          </div>
          <Badge
            variant="secondary"
            className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700"
          >
            Theme
          </Badge>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {!theme ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No active theme is bound to this tab yet. Create or assign a theme
            to this tab from the Themes page first.
          </div>
        ) : (
          <RegionFields
            region={region}
            sections={draft.sections}
            patchSections={patchSections}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-3 py-3 sm:px-4">
        <Button
          type="button"
          variant="ghost"
          disabled={!isDirty || isBusy || !theme}
          onClick={handleReset}
        >
          Reset
        </Button>
        <Button
          type="button"
          disabled={!isDirty || isBusy || !theme}
          onClick={handleApply}
        >
          {isBusy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Apply Theme Changes
        </Button>
      </div>
    </div>
  )
}

function LookColor({
  label,
  field,
  fallback,
  look,
  patchLook,
}: {
  label: string
  field: Exclude<keyof HomeLookTheme, "headerShine" | "panelRadius" | "repairLabel">
  fallback?: string
  look: HomeLookTheme
  patchLook: (patch: Partial<HomeLookTheme>) => void
}) {
  const defaults = DEFAULT_HOME_LOOK as unknown as Record<string, string | number>
  const fromDefaults = typeof defaults[field] === "string" ? (defaults[field] as string) : undefined
  return (
    <ThemeColorPicker
      label={label}
      value={look[field] ?? fromDefaults ?? fallback ?? "#FFFFFF"}
      onChange={(hex) => patchLook({ [field]: hex })}
    />
  )
}

function LookNumber({
  label,
  field,
  scale,
  min,
  max,
  fallback,
  look,
  patchLook,
}: {
  label: string
  field: "headerShine" | "panelRadius"
  /** Display value = stored value × scale (e.g. 0.3 shown as 30). */
  scale: number
  min: number
  max: number
  fallback: number
  look: HomeLookTheme
  patchLook: (patch: Partial<HomeLookTheme>) => void
}) {
  const stored = look[field]
  const shown = Math.round((typeof stored === "number" ? stored : fallback) * scale)
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-slate-600">
        {label}: <span className="font-semibold text-slate-900">{shown}</span>
      </Label>
      <input
        type="range"
        min={min}
        max={max}
        value={shown}
        onChange={(e) => patchLook({ [field]: Number(e.target.value) / scale })}
        className="w-full"
      />
    </div>
  )
}

function RegionFields({
  region,
  sections,
  patchSections,
}: {
  region: ChromeRegion
  sections: ThemeSections
  patchSections: (patch: Partial<ThemeSections>) => void
}) {
  const look: HomeLookTheme = sections.homeLook ?? {}
  const patchLook = (patch: Partial<HomeLookTheme>) =>
    patchSections({ homeLook: { ...look, ...patch } })
  switch (region) {
    case "top_bar":
      return (
        <div className="space-y-4">
          <ThemeColorPicker
            label="Top bar background"
            value={sections.topBar.backgroundColor}
            onChange={(hex) =>
              patchSections({
                topBar: { ...sections.topBar, backgroundColor: hex },
              })
            }
          />
          <ThemeColorPicker
            label="Top bar text color"
            value={sections.topBar.textColor}
            onChange={(hex) =>
              patchSections({
                topBar: { ...sections.topBar, textColor: hex },
              })
            }
          />
          <LookColor label="Header gradient — top" field="headerStartColor" fallback={sections.topBar.backgroundColor} look={look} patchLook={patchLook} />
          <LookColor label="Header gradient — bottom" field="headerEndColor" fallback={sections.topBar.backgroundColor} look={look} patchLook={patchLook} />
          <LookNumber label="Shine strength (0–100)" field="headerShine" scale={100} min={0} max={100} fallback={DEFAULT_HOME_LOOK.headerShine} look={look} patchLook={patchLook} />
          <LookColor label="Page background (below the header)" field="canvasColor" fallback={sections.topBar.backgroundColor} look={look} patchLook={patchLook} />
          <LookColor label="Profile button color" field="avatarColor" look={look} patchLook={patchLook} />
        </div>
      )
    case "search_bar":
      return (
        <div className="space-y-4">
          <ThemeColorPicker
            label="Search zone background"
            value={sections.searchZone.backgroundColor}
            onChange={(hex) =>
              patchSections({
                searchZone: {
                  ...sections.searchZone,
                  backgroundColor: hex,
                },
              })
            }
          />
          <ThemeColorPicker
            label="Wave divider color"
            value={sections.searchZone.waveColor}
            onChange={(hex) =>
              patchSections({
                searchZone: { ...sections.searchZone, waveColor: hex },
              })
            }
          />
          <LookNumber label="Panel bottom corner radius (px)" field="panelRadius" scale={1} min={0} max={60} fallback={DEFAULT_HOME_LOOK.panelRadius} look={look} patchLook={patchLook} />
          <LookColor label="Search pill background" field="searchPillColor" look={look} patchLook={patchLook} />
          <LookColor label="Search pill text / icon" field="searchPillTextColor" look={look} patchLook={patchLook} />
          <LookColor label="Search bar border" field="searchPillBorderColor" fallback="#222222" look={look} patchLook={patchLook} />
          <ThemeImageUploader
            label="Mobile Sell box image"
            hint={`Image only — no text is added by the app. Upload exactly ${SEARCH_BOX_IMAGE_SPEC.sell.label} (PNG/JPG/WebP). Shown at 167 × 84 design px, right of the search bar. Leave empty to hide the box.`}
            value={sections.searchZone.sellBoxImageUrl ?? null}
            onChange={(sellBoxImageUrl) =>
              patchSections({
                searchZone: { ...sections.searchZone, sellBoxImageUrl },
              })
            }
          />
          <ThemeImageUploader
            label="Promo box image"
            hint={`Image only. Upload exactly ${SEARCH_BOX_IMAGE_SPEC.promo.label} (PNG/JPG/WebP). Shown at 240 × 84 design px, at the far right. Leave empty to hide the box.`}
            value={sections.searchZone.promoBoxImageUrl}
            onChange={(promoBoxImageUrl) =>
              patchSections({
                searchZone: { ...sections.searchZone, promoBoxImageUrl },
              })
            }
          />
        </div>
      )
    case "hero_frame":
      return (
        <div className="space-y-4">
          <LookColor label="Frame (bezel) color" field="heroFrameColor" look={look} patchLook={patchLook} />
          <LookColor label="Page dots color" field="heroDotColor" look={look} patchLook={patchLook} />
          <p className="text-xs text-slate-500">
            Banner images are set on the Hero / Promo carousel section; the text on a banner is part of its image.
          </p>
        </div>
      )
    case "fee_card":
      return (
        <div className="space-y-4">
          <LookColor label="Card background" field="feeCardColor" look={look} patchLook={patchLook} />
          <LookColor label="Text color" field="feeCardTextColor" look={look} patchLook={patchLook} />
          <LookColor label="Check mark color" field="feeCardCheckColor" look={look} patchLook={patchLook} />
        </div>
      )
    case "product_box":
      return (
        <div className="space-y-4">
          <LookColor label="Box background" field="productBoxColor" look={look} patchLook={patchLook} />
          <LookColor label="Box border" field="productBoxBorderColor" look={look} patchLook={patchLook} />
          <LookColor label="Name / price text" field="productTextColor" look={look} patchLook={patchLook} />
          <LookColor label="Badge color (NEW…)" field="productBadgeColor" look={look} patchLook={patchLook} />
          <LookColor label="In-stock color" field="productStockColor" look={look} patchLook={patchLook} />
          <p className="text-xs text-slate-500">
            Applies to sections whose Card style is “Dealker Marketplace Box”.
          </p>
        </div>
      )
    case "category_tabs":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <Label className="text-sm font-medium text-slate-900">
              Show category tabs
            </Label>
            <Switch
              checked={sections.categoryTabs.visible}
              onCheckedChange={(visible) =>
                patchSections({
                  categoryTabs: { ...sections.categoryTabs, visible },
                })
              }
            />
          </div>
          <ThemeColorPicker
            label="Category tabs background"
            value={
              sections.categoryTabs.backgroundColor ??
              sections.searchZone.backgroundColor
            }
            onChange={(hex) =>
              patchSections({
                categoryTabs: {
                  ...sections.categoryTabs,
                  backgroundColor: hex,
                },
              })
            }
          />
          <p className="text-xs text-slate-400">
            Defaults to the Search zone background when not set independently.
          </p>
          <ThemeColorPicker
            label="Tab text color"
            value={sections.categoryTabs.textColor}
            onChange={(hex) =>
              patchSections({
                categoryTabs: { ...sections.categoryTabs, textColor: hex },
              })
            }
          />
          <ThemeColorPicker
            label="Active indicator color"
            value={sections.categoryTabs.indicatorColor}
            onChange={(hex) =>
              patchSections({
                categoryTabs: {
                  ...sections.categoryTabs,
                  indicatorColor: hex,
                },
              })
            }
          />
        </div>
      )
    case "store_chips":
      return (
        <div className="space-y-4">
          <LookColor label="Unselected tab color" field="storeTabColor" fallback={sections.topBar.backgroundColor} look={look} patchLook={patchLook} />
          <LookColor label="Tab label color" field="storeTileLabelColor" look={look} patchLook={patchLook} />
          <p className="text-xs text-slate-500">
            The selected tab always takes the Search Bar panel colour, so it looks carved into the panel.
          </p>
          <p className="text-xs text-slate-500">
            Store names and icons are edited under Storefront → Stores.
          </p>
        </div>
      )
    case "bottom_nav":
      return (
        <div className="space-y-4">
          <LookColor label="Nav background" field="navBackgroundColor" look={look} patchLook={patchLook} />
          <LookColor label="Active tab color" field="navActiveColor" look={look} patchLook={patchLook} />
          <LookColor label="Inactive icon / label color" field="navLabelColor" look={look} patchLook={patchLook} />
          <LookColor label="Repair pill background" field="repairPillColor" look={look} patchLook={patchLook} />
          <LookColor label="Repair pill text / icon" field="repairPillTextColor" look={look} patchLook={patchLook} />
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">Repair pill text</Label>
            <Input
              value={look.repairLabel ?? DEFAULT_HOME_LOOK.repairLabel}
              onChange={(e) => patchLook({ repairLabel: e.target.value })}
              placeholder="Repair Mobile etc. (empty hides the pill)"
            />
          </div>
          <p className="text-xs text-slate-500">
            The footer tabs are Home, Categories, Auction and Order; the pill opens the repair flow.
          </p>
        </div>
      )
    default:
      return null
  }
}

export { CHROME_REGION_META }
