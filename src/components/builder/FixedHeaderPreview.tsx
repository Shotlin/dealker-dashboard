/* eslint-disable @next/next/no-img-element */

"use client"

import { useEffect, useRef, useState } from "react"
import {
  ChevronDown,
  CircleUserRound,
  Search,
  SignalHigh,
  Wifi,
  Zap,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getStorefrontStores } from "@/services/storefront-stores.service"
import { DEFAULT_HOME_LOOK } from "@/types/theme.types"
import type { ThemeData, ThemeTab } from "@/types/theme.types"
import { STORE_CONFIGS } from "@/contexts/StoreContext"
import type { ThemeStoreKey } from "@/types/theme.types"
import type { ChromeRegion } from "./chromeRegions"

interface FixedHeaderPreviewProps {
  themeData: ThemeData | null
  activeTabKey: string
  storeKey: ThemeStoreKey
  /** Live API tab list — used for category tab icons and labels. */
  themeTabs?: ThemeTab[]
  onRegionClick?: (region: ChromeRegion) => void
  selectedRegion?: ChromeRegion | null
  hoveredRegion?: ChromeRegion | null
  onPreviewTabChange?: (tabKey: string) => void
}

const STORE_CHIPS = [
  { key: "mobile", label: "Mobile" },
  { key: "mobile_part", label: "Mobile Part" },
  { key: "accessories", label: "Accessories" },
  { key: "electronics", label: "Electronics" },
]

/**
 * Scrollable category tabs with full mouse-drag + wheel support.
 * Matches Flutter's horizontal ListView with BouncingScrollPhysics.
 */
function CategoryTabsScrollRow({
  tabs,
  activeTabKey,
  categoryTabsTheme,
  background,
  onRegionClick,
  selectedRegion,
  regionStyle,
  onPreviewTabChange,
}: {
  tabs: Array<{ key: string; label: string; iconUrl: string | null; fallbackEmoji: string }>
  activeTabKey: string
  categoryTabsTheme: ThemeData["sections"]["categoryTabs"] | undefined
  background: string
  onRegionClick?: (region: ChromeRegion) => void
  selectedRegion?: ChromeRegion | null
  regionStyle: (region: ChromeRegion) => React.CSSProperties
  onPreviewTabChange?: (tabKey: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // Track drag state in a ref to avoid stale closures and prevent click events
  // firing when the user was actually scrolling
  const dragStateRef = useRef({ dragging: false, startX: 0, scrollLeft: 0, moved: false })
  const [isDragging, setIsDragging] = useState(false)

  // Auto-scroll active tab into view whenever activeTabKey changes
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const activeEl = el.querySelector<HTMLElement>(`[data-tab-key="${activeTabKey.replace(/"/g, '\\"')}"]`)
    if (!activeEl) return
    const elLeft = activeEl.offsetLeft
    const elRight = elLeft + activeEl.offsetWidth
    const containerLeft = el.scrollLeft
    const containerRight = containerLeft + el.offsetWidth
    if (elLeft < containerLeft) {
      el.scrollTo({ left: Math.max(0, elLeft - 8), behavior: "smooth" })
    } else if (elRight > containerRight) {
      el.scrollTo({ left: elRight - el.offsetWidth + 8, behavior: "smooth" })
    }
  }, [activeTabKey])

  // Mouse-wheel horizontal scroll (shift+wheel or natural horizontal scroll)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return // natural horizontal — handled by browser
      if (e.deltaY !== 0) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }
    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) return
    dragStateRef.current = {
      dragging: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    }
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.dragging) return
    const el = scrollRef.current
    if (!el) return
    const dx = e.clientX - dragStateRef.current.startX
    if (Math.abs(dx) > 4) {
      dragStateRef.current.moved = true
    }
    el.scrollLeft = dragStateRef.current.scrollLeft - dx
  }

  const handleMouseUp = () => {
    dragStateRef.current.dragging = false
    setIsDragging(false)
  }

  return (
    <div
      data-region="category_tabs"
      onClick={(e) => {
        if (!onRegionClick) return
        // Don't fire region click if user was dragging
        if (dragStateRef.current.moved) return
        e.stopPropagation()
        onRegionClick("category_tabs")
      }}
      style={{
        ...regionStyle("category_tabs"),
        background,
        borderBottom: "1px solid rgba(15,23,42,0.06)",
        transition: "background 200ms ease",
      }}
    >
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          display: "flex",
          gap: 0,
          overflowX: "auto",
          overflowY: "hidden",
          padding: "4px 0 0 0",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
      >
        {tabs.map((tab) => {
          const active = tab.key === activeTabKey
          const isInteractiveTab = Boolean(onPreviewTabChange)
          return (
            <div
              key={tab.key}
              data-tab-key={tab.key}
              role={isInteractiveTab ? "tab" : undefined}
              aria-selected={isInteractiveTab ? active : undefined}
              onClick={(e) => {
                // Block tab switch if user was dragging
                if (dragStateRef.current.moved) {
                  e.stopPropagation()
                  dragStateRef.current.moved = false
                  return
                }
                if (!onPreviewTabChange) return
                e.stopPropagation()
                onPreviewTabChange(tab.key)
              }}
              style={{
                width: 78,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingBottom: 4,
                cursor: isInteractiveTab && !isDragging ? "pointer" : "inherit",
              }}
            >
              {/* Tab icon */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  display: "grid",
                  placeItems: "center",
                  opacity: active ? 1 : 0.6,
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
              >
                {tab.iconUrl ? (
                  <img
                    src={tab.iconUrl}
                    alt={tab.label}
                    draggable={false}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    onError={(e) => {
                      const target = e.currentTarget
                      target.style.display = "none"
                      const parent = target.parentElement
                      if (parent && !parent.querySelector("span")) {
                        const span = document.createElement("span")
                        span.style.fontSize = "26px"
                        span.style.lineHeight = "1"
                        span.textContent = tab.fallbackEmoji
                        parent.appendChild(span)
                      }
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 26, lineHeight: 1, userSelect: "none" }}>
                    {tab.fallbackEmoji}
                  </span>
                )}
              </div>

              {/* Tab label */}
              <div
                style={{
                  marginTop: 1,
                  fontSize: 10.8,
                  fontWeight: active ? 700 : 500,
                  color: active
                    ? (categoryTabsTheme?.textColor ?? "#111827")
                    : categoryTabsTheme?.textColor
                    ? `${categoryTabsTheme.textColor}B8`
                    : "#111827",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  maxWidth: 74,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              >
                {tab.label}
              </div>

              {/* Active indicator */}
              <div
                style={{
                  marginTop: 4,
                  width: active ? Math.round(78 * 0.78) : 0,
                  height: 5,
                  borderRadius: "999px 999px 0 0",
                  background: active
                    ? (categoryTabsTheme?.indicatorColor ?? "#111827")
                    : "transparent",
                  transition: "width 200ms ease",
                  pointerEvents: "none",
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ── Header colour helpers (mirror the app: shade / tint between header and panel) ──
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0")
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)]
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")
  return `#${c(r)}${c(g)}${c(b)}`
}
function shadeHex(hex: string, delta: number): string {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h /= 6
  }
  const nl = Math.max(0, Math.min(1, l + delta))
  const hue = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  if (s === 0) return rgbToHex(nl * 255, nl * 255, nl * 255)
  const q = nl < 0.5 ? nl * (1 + s) : nl + s - nl * s
  const pp = 2 * nl - q
  return rgbToHex(hue(pp, q, h + 1 / 3) * 255, hue(pp, q, h) * 255, hue(pp, q, h - 1 / 3) * 255)
}
function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t)
}

// Folder-tab outlines in a 100×100 box; the selected tab flares into the panel below.
const TAB_SELECTED_PATH =
  "M -14 101.5 L -14 100 Q 0 100 0 86 L 11 17 Q 11 0 28 0 L 72 0 Q 89 0 89 17 L 100 86 Q 100 100 114 100 L 114 101.5 Z"
const TAB_PLAIN_PATH =
  "M 0 101.5 L 0 100 L 11 17 Q 11 0 28 0 L 72 0 Q 89 0 89 17 L 100 100 L 100 101.5 Z"

export function FixedHeaderPreview({
  themeData,
  activeTabKey,
  storeKey,
  themeTabs,
  onRegionClick,
  selectedRegion,
  hoveredRegion,
  onPreviewTabChange,
}: FixedHeaderPreviewProps) {
  const config = STORE_CONFIGS[storeKey]
  const { data: stores } = useQuery({ queryKey: ["storefront-stores"], queryFn: getStorefrontStores, staleTime: 60_000 })

  // ── Resolve theme colors — use saved values, fall back to store config ──
  //
  // FIX: Previously the entire outer wrapper used config.gradient (store hardcode).
  // Now each region reads from themeData directly.

  // Top bar: uses topBar.backgroundColor (set via "Top Bar" region editor)
  const topBarBg =
    themeData?.sections.topBar.backgroundColor ?? config.gradient[0]
  const topBarTextColor =
    themeData?.sections.topBar.textColor ?? config.text

  // Search zone: uses searchZone.backgroundColor (set via "Search Bar" region editor)
  const searchZoneBg =
    themeData?.sections.searchZone.backgroundColor ?? config.gradient[2]

  // Category tabs: uses own backgroundColor if set, else falls back to searchZoneBg
  const categoryTabsTheme = themeData?.sections.categoryTabs
  const showCategoryTabs = categoryTabsTheme?.visible ?? true
  const categoryTabsBg =
    categoryTabsTheme?.backgroundColor ?? searchZoneBg

  const interactive = Boolean(onRegionClick)

  const regionStyle = (region: ChromeRegion): React.CSSProperties => {
    if (!interactive) return {}
    const isSelected = selectedRegion === region
    const isHovered = hoveredRegion === region
    return {
      cursor: "pointer",
      outline: isSelected
        ? "2px solid var(--store-accent, #3B82F6)"
        : isHovered
        ? "2px dashed rgba(59, 130, 246, 0.55)"
        : "2px solid transparent",
      outlineOffset: -2,
      borderRadius: 4,
      transition: "outline-color 150ms ease",
    }
  }

  const handleRegionClick =
    (region: ChromeRegion) => (e: React.MouseEvent) => {
      if (!onRegionClick) return
      e.stopPropagation()
      onRegionClick(region)
    }

  // Build real tab list from API data (matching Flutter's CategoryTabsRow)
  const realTabs = (() => {
    const apiTabs =
      themeTabs
        ?.filter((t) => t.store_key === storeKey && t.status === "active")
        .sort((a, b) => a.sort_order - b.sort_order) ?? []

    if (apiTabs.length > 0) {
      return apiTabs.map((tab, i) => ({
        key: tab.key,
        label: tab.label,
        iconUrl: tab.image_url ?? null,
        fallbackEmoji: config.categoryIcons[i] ?? "📦",
      }))
    }

    return config.categories.map((label, i) => ({
      key: label.toLowerCase().replace(/\s+/g, "_"),
      label,
      iconUrl: null,
      fallbackEmoji: config.categoryIcons[i] ?? "📦",
    }))
  })()

  const look = { ...DEFAULT_HOME_LOOK, ...(themeData?.sections.homeLook ?? {}) }
  const headerStart = look.headerStartColor ?? topBarBg
  const headerEnd = look.headerEndColor ?? shadeHex(headerStart, -0.08)
  const inactiveTab = look.storeTabColor ?? shadeHex(mixHex(headerEnd, searchZoneBg, 0.55), -0.05)
  const shine = look.headerShine
  const promoUrl = themeData?.sections.searchZone.promoBoxImageUrl ?? null
  const sellUrl = themeData?.sections.searchZone.sellBoxImageUrl ?? null
  const hints = themeData?.sections.searchZone.searchHints ?? []
  const hint = hints[0] ?? "products"
  const tiles = (stores ?? [])
    .filter((st) => st.is_active)
    .map((st) => ({ key: st.store_key, label: st.label, iconUrl: st.icon_url }))
  const tileList = tiles.length > 0 ? tiles : STORE_CHIPS.slice(0, 5).map((c) => ({ key: c.key, label: c.label, iconUrl: null as string | null }))

  return (
    <div style={{ color: topBarTextColor }}>
      {/* ── Top bar: status + delivery line + profile button ───────── */}
      <div style={{ position: "relative", background: `linear-gradient(180deg, ${headerStart}, ${headerEnd})`, transition: "background 200ms ease" }}>
        {shine > 0 && (
          <>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `linear-gradient(135deg, rgba(255,255,255,0) 18%, rgba(255,255,255,${shine * 0.55}) 40%, rgba(255,255,255,0) 62%)` }} />
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(circle at 95% -15%, rgba(255,255,255,${shine * 0.7}), rgba(255,255,255,0) 60%)` }} />
          </>
        )}
        <div
          data-region="top_bar"
          onClick={handleRegionClick("top_bar")}
          style={{
            ...regionStyle("top_bar"),
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 18px 4px",
            fontSize: 11,
            fontWeight: 700,
            color: topBarTextColor,
          }}
        >
          <span>9:41</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <SignalHigh size={12} strokeWidth={2.1} />
            <Wifi size={12} strokeWidth={2.1} />
            <div style={{ width: 18, height: 9, borderRadius: 999, border: "1.5px solid currentColor" }} />
          </div>
        </div>

        <div
          data-region="top_bar"
          onClick={handleRegionClick("top_bar")}
          style={{
            ...regionStyle("top_bar"),
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "2px 16px 8px",
            color: topBarTextColor,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 19, fontWeight: 800, letterSpacing: "-0.03em" }}>
              <Zap size={19} strokeWidth={2.4} fill="currentColor" />
              <span>30 minutes</span>
            </div>
            <div style={{ marginTop: 1, display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 500 }}>
              <span>Home - your delivery address</span>
              <ChevronDown size={13} strokeWidth={2.2} />
            </div>
          </div>
          <div
            style={{
              display: "grid",
              placeItems: "center",
              width: 32,
              height: 32,
              borderRadius: 999,
              border: `2px solid ${look.avatarColor}`,
              color: look.avatarColor,
            }}
          >
            <CircleUserRound size={20} strokeWidth={2.1} />
          </div>
        </div>
      {/* ── Store tabs (folder tabs: selected one is carved into the panel) ── */}
      <div
        data-region="store_chips"
        onClick={handleRegionClick("store_chips")}
        style={{
          ...regionStyle("store_chips"),
          position: "relative",
          display: "flex",
          padding: "0 7px",
          height: 72,
        }}
      >
        {tileList.map((tile) => {
          const isActive = tile.key === storeKey
          return (
            <div key={tile.key} style={{ flex: 1, position: "relative", zIndex: isActive ? 2 : 1 }}>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                <defs>
                  <linearGradient id={`tabsel-${tile.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={shadeHex(searchZoneBg, 0.07)} />
                    <stop offset="0.45" stopColor={searchZoneBg} />
                  </linearGradient>
                </defs>
                <path d={isActive ? TAB_SELECTED_PATH : TAB_PLAIN_PATH} fill={isActive ? `url(#tabsel-${tile.key})` : inactiveTab} />
              </svg>
              <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: "6px 2px 4px" }}>
                <div style={{ width: 30, height: 30, display: "grid", placeItems: "center", opacity: isActive ? 1 : 0.85 }}>
                  {tile.iconUrl ? (
                    <img src={tile.iconUrl} alt={tile.label} draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  ) : (
                    <span style={{ fontSize: 20 }}>🛍️</span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 8.5,
                    fontWeight: isActive ? 800 : 600,
                    lineHeight: 1.05,
                    textAlign: "center",
                    color: look.storeTileLabelColor,
                    opacity: isActive ? 1 : 0.62,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {tile.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      </div>

      {/* ── Panel: search row + category tabs, rounded bottom ───────── */}
      <div style={{ borderRadius: `0 0 ${look.panelRadius}px ${look.panelRadius}px`, overflow: "hidden" }}>

      {/* ── Search row: pill + Mobile Sell chip + promo card ───────── */}
      <div
        data-region="search_bar"
        onClick={handleRegionClick("search_bar")}
        style={{
          ...regionStyle("search_bar"),
          display: "flex",
          gap: 7,
          overflow: "hidden",
          padding: "6px 10px 6px",
          background: searchZoneBg,
          transition: "background 200ms ease",
        }}
      >
        <div
          style={{
            flex: "0 0 52%",
            display: "flex",
            alignItems: "center",
            gap: 7,
            height: 38,
            padding: "0 10px",
            borderRadius: 11,
            background: look.searchPillColor,
            color: look.searchPillTextColor,
            border: `1.5px solid ${look.searchPillBorderColor}`,
          }}
        >
          <Search size={15} strokeWidth={2.4} />
          <span style={{ fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Search for “{hint}”
          </span>
        </div>
        {sellUrl && (
          <img src={sellUrl} alt="Mobile Sell" draggable={false} style={{ flex: "0 0 19%", height: 38, borderRadius: 11, objectFit: "cover" }} />
        )}
        {promoUrl && (
          <img src={promoUrl} alt="Promo" draggable={false} style={{ flex: "0 0 28%", height: 38, borderRadius: 11, objectFit: "cover" }} />
        )}
      </div>

      {/* ── Category tabs — scrollable with mouse drag ────────────── */}
      {showCategoryTabs ? (
        <CategoryTabsScrollRow
          tabs={realTabs}
          activeTabKey={activeTabKey}
          categoryTabsTheme={categoryTabsTheme}
          background={categoryTabsBg}
          onRegionClick={onRegionClick}
          selectedRegion={selectedRegion}
          regionStyle={regionStyle}
          onPreviewTabChange={onPreviewTabChange}
        />
      ) : null}
      </div>
    </div>
  )
}
