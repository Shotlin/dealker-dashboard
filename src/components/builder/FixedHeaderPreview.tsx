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


// ── Store-tab geometry & colours: a TypeScript twin of the app's
//    `_TabShapePainter` / `StoreTabPalette.derive`, so this preview and the
//    phone draw the same shapes from the same numbers. 1 unit = 1 app point
//    (the whole header is rendered at the iPhone's 402pt width and zoomed). ──
const APP_WIDTH = 402
const TAB_BAR_H = 77
const TAB_TOP = 4
const TAB_MARGIN = 8
const TAB_LEAN = 0.21
const TAB_RADIUS = 14
const TAB_FOOT = 7
const TAB_HALF = 0.57

type Rgb = [number, number, number]
const toRgb = (hex: string): Rgb => {
  const h = hex.replace("#", "")
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6)
  return [parseInt(v.slice(0, 2), 16) || 0, parseInt(v.slice(2, 4), 16) || 0, parseInt(v.slice(4, 6), 16) || 0]
}
const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0")
const toHex = ([r, g, b]: Rgb) => `#${hex2(r)}${hex2(g)}${hex2(b)}`
const over = (top: string, a: number, base: string) => {
  const t = toRgb(top), b = toRgb(base)
  return toHex([t[0] * a + b[0] * (1 - a), t[1] * a + b[1] * (1 - a), t[2] * a + b[2] * (1 - a)])
}
const lerpHex = (a: string, b: string, t: number) => over(b, t, a)
const luminance = (hex: string) => {
  const c = toRgb(hex).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const withAlpha = (hex: string, a: number) => `rgba(${toRgb(hex).join(",")},${a})`

interface StorePal {
  dark: boolean
  bg: string
  fill: string
  edge: string
  text: string
  muted: string
  restTop: string
  restBottom: string
  baseLine: string
  bloom: string
}

function derivePal(bg: string, fill: string, edge: string, text: string): StorePal {
  const dark = luminance(bg) < 0.35
  return {
    dark, bg, fill, edge, text,
    muted: withAlpha(text, dark ? 0.7 : 0.75),
    restTop: dark ? over("#FFFFFF", 0.065, bg) : over(edge, 0.05, bg),
    restBottom: dark ? over("#FFFFFF", 0.02, bg) : lerpHex(fill, "#FFFFFF", 0.4),
    baseLine: dark ? over("#FFFFFF", 0.17, bg) : over("#000000", 0.12, bg),
    bloom: dark ? withAlpha(edge, 0.3) : "rgba(0,0,0,0)",
  }
}

/** Open outline (no bottom edge) of the tab centred at [cx]. */
function tabOutline(cx: number, half: number, bottom: number, foot: number): string {
  const h = bottom - TAB_TOP, s = h * TAB_LEAN, r = TAB_RADIUS
  const x0 = cx - half, x1 = cx + half
  let d = foot > 0
    ? `M${x0 - foot} ${bottom} Q${x0 + foot * 0.1} ${bottom} ${x0 + (s * foot) / h} ${bottom - foot}`
    : `M${x0} ${bottom}`
  d += ` L${x0 + (s * (h - r)) / h} ${TAB_TOP + r} Q${x0 + s} ${TAB_TOP} ${x0 + s + r} ${TAB_TOP}`
  d += ` L${x1 - s - r} ${TAB_TOP} Q${x1 - s} ${TAB_TOP} ${x1 - (s * (h - r)) / h} ${TAB_TOP + r}`
  d += foot > 0
    ? ` L${x1 - (s * foot) / h} ${bottom - foot} Q${x1 - foot * 0.1} ${bottom} ${x1 + foot} ${bottom}`
    : ` L${x1} ${bottom}`
  return d
}

/** Top edge + far side of a resting tab. */
function farEdge(cx: number, half: number, bottom: number, right: boolean): string {
  const h = bottom - TAB_TOP, s = h * TAB_LEAN, r = TAB_RADIUS
  const dir = right ? 1 : -1
  const near = cx - dir * (half - s - r), far = cx + dir * half
  return `M${near} ${TAB_TOP} L${far - dir * (s + r)} ${TAB_TOP} Q${far - dir * s} ${TAB_TOP} ${far - (dir * s * (h - r)) / h} ${TAB_TOP + r} L${far} ${bottom}`
}

const TAPER_STOPS: Array<[number, number]> = [[0, 1], [0.1, 0.85], [0.45, 0.75], [0.7, 0.5], [0.85, 0.25], [0.95, 0.1], [1, 0]]

function StoreTabBarPreview({
  tiles, selectedIdx, pal,
}: {
  tiles: Array<{ key: string; label: string; iconUrl: string | null }>
  selectedIdx: number
  pal: StorePal
}) {
  const n = Math.max(1, tiles.length)
  const pitch = (APP_WIDTH - 2 * TAB_MARGIN) / n
  const half = pitch * TAB_HALF
  const centre = (i: number) => TAB_MARGIN + pitch * (i + 0.5)
  const bottom = TAB_BAR_H
  const restBottom = bottom - 1.2
  const sel = Math.min(selectedIdx, n - 1)
  const ease = "460ms cubic-bezier(0.25, 1, 0.5, 1)"
  return (
    <div style={{ position: "relative", width: APP_WIDTH, height: TAB_BAR_H }}>
      <svg width={APP_WIDTH} height={TAB_BAR_H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id="rest-fill" x1="0" y1={TAB_TOP} x2="0" y2={restBottom} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={pal.restTop} />
            <stop offset={pal.dark ? 0.8 : 0.1} stopColor={pal.restTop} />
            <stop offset="1" stopColor={pal.restBottom} />
          </linearGradient>
          <linearGradient id="taper" x1="0" y1={TAB_TOP} x2="0" y2={bottom} gradientUnits="userSpaceOnUse">
            {TAPER_STOPS.map(([o, a]) => <stop key={o} offset={o} stopColor={pal.edge} stopOpacity={a} />)}
          </linearGradient>
          <linearGradient id="taper-rest" x1="0" y1={TAB_TOP} x2="0" y2={restBottom} gradientUnits="userSpaceOnUse">
            {TAPER_STOPS.map(([o, a]) => <stop key={o} offset={o} stopColor={pal.edge} stopOpacity={a * (pal.dark ? 0.4 : 0.32)} />)}
          </linearGradient>
          <radialGradient id="bloom" cx="0.5" cy="0" r="0.9">
            <stop offset="0" stopColor={pal.bloom} />
            <stop offset="1" stopColor={pal.bloom} stopOpacity="0" />
          </radialGradient>
          {tiles.map((_, i) => {
            const right = i > sel
            return (
              <linearGradient key={i} id={`fade-${i}`} gradientUnits="userSpaceOnUse"
                x1={right ? centre(i) - half : centre(i) + half} x2={right ? centre(i) + half : centre(i) - half} y1="0" y2="0">
                <stop offset="0.2" stopColor="#fff" stopOpacity="0" />
                <stop offset="0.5" stopColor="#fff" stopOpacity="0.33" />
                <stop offset="0.8" stopColor="#fff" stopOpacity="1" />
              </linearGradient>
            )
          })}
          {tiles.map((_, i) => (
            <mask key={i} id={`mask-${i}`} maskUnits="userSpaceOnUse" x="-20" y="0" width={APP_WIDTH + 40} height={TAB_BAR_H}>
              <rect x="-20" y="0" width={APP_WIDTH + 40} height={TAB_BAR_H} fill={`url(#fade-${i})`} />
            </mask>
          ))}
        </defs>
        <line x1="0" x2={APP_WIDTH} y1={bottom - 0.6} y2={bottom - 0.6} stroke={pal.baseLine} strokeWidth="1.2" />
        {tiles.map((t, i) => i === sel ? null : (
          <g key={t.key}>
            <path d={tabOutline(centre(i), half, restBottom, 0) + " Z"} fill="url(#rest-fill)" />
            <g mask={`url(#mask-${i})`}>
              <path d={farEdge(centre(i), half, restBottom, i > sel)} fill="none" stroke="url(#taper-rest)" strokeWidth="1" strokeLinejoin="round" />
            </g>
          </g>
        ))}
        {/* Raised tab — slides between tabs */}
        <g style={{ transform: `translateX(${centre(sel) - centre(0)}px)`, transition: `transform ${ease}` }}>
          <path d={tabOutline(centre(0), half, bottom, TAB_FOOT) + " Z"} fill={pal.fill} />
          <path d={tabOutline(centre(0), half, bottom, TAB_FOOT) + " Z"} fill="url(#bloom)" opacity="1"
            style={{ transformOrigin: `${centre(0)}px ${TAB_TOP}px` }} />
          <path d={tabOutline(centre(0), half, bottom, TAB_FOOT)} fill="none" stroke="url(#taper)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      </svg>
      {tiles.map((t, i) => {
        const active = i === sel
        return (
          <div key={t.key} style={{
            position: "absolute", left: TAB_MARGIN + i * pitch, width: pitch, top: 0, bottom: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            paddingTop: 8, paddingBottom: 6, boxSizing: "border-box",
          }}>
            <div style={{
              width: 34, height: 34, display: "grid", placeItems: "center",
              transform: `translateY(${active ? -4 : 0}px) scale(${active ? 1.2 : 1})`,
              transition: "transform 460ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}>
              {t.iconUrl ? <img src={t.iconUrl} alt={t.label} draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 22 }}>🛍️</span>}
            </div>
            <div style={{
              marginTop: 3, fontSize: 12, lineHeight: 1.1, whiteSpace: "nowrap", maxWidth: pitch - 4,
              overflow: "hidden", textOverflow: "ellipsis",
              fontWeight: active ? 700 : 500, color: active ? pal.text : pal.muted,
              transition: "color 300ms ease",
            }}>{t.label}</div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Scrollable category tabs with full mouse-drag + wheel support.
 * Matches Flutter's horizontal ListView with BouncingScrollPhysics.
 */
function CategoryTabsScrollRow({
  tabs,
  activeTabKey,
  background,
  onRegionClick,
  regionStyle,
  onPreviewTabChange,
  textColor,
}: {
  textColor: string
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
          padding: "4.3px 0 0 0",
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
                width: 77,
                height: 53.8,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                paddingBottom: 0,
                cursor: isInteractiveTab && !isDragging ? "pointer" : "inherit",
              }}
            >
              {/* Tab icon */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  marginTop: 3,
                  display: "grid",
                  placeItems: "center",
                  opacity: 1,
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
                  />
                ) : (
                  /* Same Material "category" glyph the app shows when a tab has no icon */
                  <svg width="30" height="30" viewBox="0 0 24 24" fill={textColor} style={{ opacity: 0.92 }}>
                    <path d="M12 2l-5.5 9h11L12 2zm5.5 11c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zM3 21.5h8v-8H3v8z" />
                  </svg>
                )}
              </div>

              {/* Tab label */}
              <div
                style={{
                  marginTop: 1,
                  fontSize: 11.6,
                  fontWeight: active ? 700 : 600,
                  color: textColor,
                  opacity: active ? 1 : 0.92,
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
                  marginTop: "auto",
                  width: active ? Math.round(77 * 0.78) : 0,
                  height: 5.4,
                  borderRadius: "999px 999px 0 0",
                  background: active ? textColor : "transparent",
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

  // Category tabs: uses own backgroundColor if set, else falls back to searchZoneBg
  const categoryTabsTheme = themeData?.sections.categoryTabs
  const showCategoryTabs = categoryTabsTheme?.visible ?? true

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
  const promoUrl = themeData?.sections.searchZone.promoBoxImageUrl ?? null
  const sellUrl = themeData?.sections.searchZone.sellBoxImageUrl ?? null
  const hints = themeData?.sections.searchZone.searchHints ?? []
  const hint = hints[0] ?? "products"
  const tiles = (stores ?? [])
    .filter((st) => st.is_active)
    .map((st) => ({ key: st.store_key, label: st.label, iconUrl: st.icon_url }))
  const tileList = tiles.length > 0 ? tiles : STORE_CHIPS.slice(0, 5).map((c) => ({ key: c.key, label: c.label, iconUrl: null as string | null }))

  const storeIdx = Math.max(0, tileList.findIndex((t) => t.key === storeKey)) % 4
  const pn = storeIdx + 1
  const lk = look as Record<string, string | undefined>
  const dl = DEFAULT_HOME_LOOK as Record<string, string>
  const pick = (f: string) => lk[`storePalette${pn}${f}`] ?? dl[`storePalette${pn}${f}`]
  const storePal = { bg: pick("Background"), fill: pick("TabFill"), edge: pick("TabEdge"), text: pick("Text") }

  const outerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const update = () => setZoom(el.clientWidth > 0 ? el.clientWidth / APP_WIDTH : 1)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pal = derivePal(storePal.bg, storePal.fill, storePal.edge, storePal.text)
  const dsc = 402 / 914 // the app sizes the header in 914px design units

  return (
    <div ref={outerRef} style={{ color: pal.text }}>
      <div style={{ width: APP_WIDTH, zoom, fontFamily: "Poppins, system-ui, sans-serif" }}>
        {/* ── Header band: status + ETA/address + profile ─────────── */}
        <div style={{ background: pal.bg, transition: "background 420ms ease", paddingTop: 48 / zoom }}>
          <div
            data-region="top_bar"
            onClick={handleRegionClick("top_bar")}
            style={{
              ...regionStyle("top_bar"),
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "4px 22px 2px", fontSize: 12, fontWeight: 700, color: pal.text,
            }}
          >
            <span>9:41</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <SignalHigh size={13} strokeWidth={2.1} />
              <Wifi size={13} strokeWidth={2.1} />
              <div style={{ width: 20, height: 10, borderRadius: 999, border: "1.5px solid currentColor" }} />
            </div>
          </div>
          <div
            data-region="top_bar"
            onClick={handleRegionClick("top_bar")}
            style={{
              ...regionStyle("top_bar"),
              display: "flex", alignItems: "center", gap: 12 * dsc,
              padding: `${6 * dsc}px ${38 * dsc}px ${14 * dsc}px`, color: pal.text,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 * dsc, fontSize: 44 * dsc, fontWeight: 700, lineHeight: 1.1, letterSpacing: -0.5 * dsc }}>
                <Zap size={46 * dsc} strokeWidth={0} fill="currentColor" />
                <span>30 minutes</span>
              </div>
              <div style={{ marginTop: 2 * dsc, display: "flex", alignItems: "center", gap: 14 * dsc, fontSize: 25 * dsc, fontWeight: 500 }}>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Log in to add your delivery address</span>
                <ChevronDown size={34 * dsc} strokeWidth={2.4} />
              </div>
            </div>
            <div style={{ display: "grid", placeItems: "center", width: 68 * dsc, height: 68 * dsc, borderRadius: 999, border: `${4 * dsc}px solid ${pal.text}`, color: pal.text }}>
              <CircleUserRound size={44 * dsc} strokeWidth={2.2} />
            </div>
          </div>

          {/* ── Folder tabs (store switcher) ─────────────────────── */}
          <div
            data-region="store_chips"
            onClick={handleRegionClick("store_chips")}
            style={{ ...regionStyle("store_chips"), paddingTop: 0 }}
          >
            <StoreTabBarPreview tiles={tileList} selectedIdx={storeIdx} pal={pal} />
          </div>
        </div>

        {/* ── Glass panel: search row + category tabs ──────────────── */}
        <div style={{ paddingBottom: 8 }}>
          <div style={{ background: pal.fill, borderRadius: "0 0 22px 22px", transition: "background 420ms ease", paddingTop: 12.9 }}>
            <div
              data-region="search_bar"
              onClick={handleRegionClick("search_bar")}
              style={{
                ...regionStyle("search_bar"),
                display: "flex", alignItems: "center", overflow: "hidden",
                padding: `${14 * dsc}px ${22 * dsc}px ${10 * dsc}px`,
              }}
            >
              <div
                style={{
                  flex: `0 0 ${458 * dsc}px`, display: "flex", alignItems: "center", gap: 20 * dsc,
                  height: 35, padding: `0 ${22 * dsc}px`, borderRadius: 22 * dsc,
                  background: look.searchPillColor, color: look.searchPillTextColor,
                  border: `${3.2 * dsc}px solid ${look.searchPillBorderColor}`, boxSizing: "border-box",
                }}
              >
                <Search size={44 * dsc} strokeWidth={2.4} color="#111111" />
                <span style={{ fontSize: 27 * dsc, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Search for “{hint}”
                </span>
              </div>
              {sellUrl && (
                <img src={sellUrl} alt="Mobile Sell" draggable={false} style={{ flex: `0 0 ${167 * dsc}px`, width: 167 * dsc, height: 35, marginLeft: 16 * dsc, borderRadius: 22 * dsc, objectFit: "cover" }} />
              )}
              {promoUrl && (
                <img src={promoUrl} alt="Promo" draggable={false} style={{ flex: `0 0 ${240 * dsc}px`, width: 240 * dsc, height: 35, marginLeft: 10 * dsc, borderRadius: 22 * dsc, objectFit: "cover" }} />
              )}
            </div>

            {showCategoryTabs ? (
              <div style={{ paddingBottom: 4.3 }}>
                <CategoryTabsScrollRow
                  tabs={realTabs}
                  activeTabKey={activeTabKey}
                  categoryTabsTheme={categoryTabsTheme}
                  background="transparent"
                  textColor={pal.text}
                  onRegionClick={onRegionClick}
                  selectedRegion={selectedRegion}
                  regionStyle={regionStyle}
                  onPreviewTabChange={onPreviewTabChange}
                />
              </div>
            ) : (
              <div style={{ height: 10 }} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
