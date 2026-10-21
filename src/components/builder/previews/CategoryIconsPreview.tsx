/* eslint-disable @next/next/no-img-element */

import { memo } from "react"
import { cn } from "@/lib/utils"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"

/**
 * Mirrors the app's `_ManifestCategoryRail` (section_registry.dart) in app points
 * (.w = 402/375, .h = 874/812, .r = .w): tile width = clamp(icon + 18, 82, 120),
 * box radius = clamp(icon x 0.34, 16, 26), 1px #F0F0F0 border, picture cover-fit,
 * labels 11sp / 700 / 2 lines, 8.h below the box.
 */
const W = 402 / 375
const H = 874 / 812

interface Item {
  key: string
  label: string
  imageUrl: string | null
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function CategoryIconsPreview({ section, isSelected, onClick, categories }: PreviewProps) {
  const config = section.config as Record<string, unknown>
  const iconSize = clamp(typeof config.icon_size === "number" ? config.icon_size : 64, 40, 96)
  const gap = clamp(typeof config.gap === "number" ? config.gap : 12, 4, 24)
  const showLabels = config.show_labels !== false
  const byId = new Map((categories ?? []).map((c) => [c.id, c]))

  const configured: Item[] = (Array.isArray(config.items) ? config.items : [])
    .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
    .map((i, idx) => {
      const linked = typeof i.category_id === "string" ? byId.get(i.category_id) : undefined
      const label = (typeof i.label === "string" && i.label.trim()) || linked?.name || ""
      const imageUrl = (typeof i.image_url === "string" && i.image_url.trim()) || linked?.image_url || null
      return { key: `c-${idx}`, label, imageUrl }
    })
    .filter((i) => i.label || i.imageUrl)
    .slice(0, 10)

  // No configured tiles: like the app, show the active top-level categories.
  const fallback: Item[] = (categories ?? [])
    .filter((c) => c.is_active && !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 10)
    .map((c) => ({ key: c.id, label: c.name, imageUrl: c.image_url ?? null }))
  const items = configured.length > 0 ? configured : fallback
  if (items.length === 0) return null

  const tileW = clamp(iconSize + 18, 82, 120) * W
  const boxRadius = clamp(iconSize * 0.34, 16, 26) * W
  const artRadius = clamp(clamp(iconSize * 0.34, 16, 26) - 2, 14, 24) * W
  const railH = (showLabels ? iconSize + 40 : iconSize + 12) * H

  return (
    <button
      type="button"
      className={cn(styles.sectionSlot, styles.sectionSlotHover, isSelected && styles.sectionSlotSelected)}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div style={{ padding: `${10 * H}px ${16 * W}px ${2 * H}px` }}>
        <div style={{ display: "flex", gap: gap * W, height: railH, overflow: "hidden", alignItems: "center" }}>
          {items.map((item) => (
            <div key={item.key} style={{ width: tileW, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", alignSelf: "center" }}>
              <div
                style={{
                  width: iconSize * W,
                  height: iconSize * H,
                  boxSizing: "border-box",
                  borderRadius: boxRadius,
                  background: "#fff",
                  border: "1px solid #F0F0F0",
                  boxShadow: "0 1px 0 rgba(0,0,0,0.024)",
                  overflow: "hidden",
                }}
              >
                <div style={{ width: "100%", height: "100%", borderRadius: artRadius, overflow: "hidden", background: item.imageUrl ? "transparent" : "#F3F6E7" }}>
                  {item.imageUrl && <img src={item.imageUrl} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                </div>
              </div>
              {showLabels && (
                <span
                  style={{
                    marginTop: 8 * H,
                    width: "100%",
                    textAlign: "center",
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                    fontSize: 11 * W,
                    fontWeight: 700,
                    lineHeight: 1.05,
                    color: "#131313",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {item.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </button>
  )
}

export default memo(CategoryIconsPreview)
