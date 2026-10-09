/* eslint-disable @next/next/no-img-element */

import { memo, type CSSProperties } from "react"
import { cn } from "@/lib/utils"
import type { PreviewProps } from "./index"
import { DEFAULT_HOME_LOOK } from "@/types/theme.types"
import styles from "../MobilePreviewFrame.module.css"
import {
  DEFAULT_CONTAINER_COLOR,
  normalizeLayout,
  readMosaicTiles,
  type MosaicLayout,
  type MosaicTile,
} from "../editors/mosaic-model"

function MosaicPreview({ section, isSelected, onClick, themeData, onChromeRegionClick }: PreviewProps) {
  const config = section.config as Record<string, unknown>
  const layout = normalizeLayout(config.layout_variant)
  const containerColor =
    typeof config.container_color === "string"
      ? config.container_color
      : DEFAULT_CONTAINER_COLOR

  const { hero, mini } = readMosaicTiles(config, layout)
  const look = { ...DEFAULT_HOME_LOOK, ...(themeData?.sections.homeLook ?? {}) }

  // Dealker layout (matches the app's DealMosaicBoard): no container, cream tiles, caption bars.
  if (layout === "hero_plus_four") {
    return (
      <button
        type="button"
        className={cn(styles.sectionSlot, styles.sectionSlotHover, isSelected && styles.sectionSlotSelected)}
        onClick={onClick}
        aria-pressed={isSelected}
        style={{ position: "relative" }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "0.3fr 0.7fr", gap: 6, height: 176, padding: "6px 8px" }}>
          {hero && dealerHero(hero, look)}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 6 }}>
            {mini.slice(0, 4).map((tile, i) => dealerMini(tile, i, look))}
          </div>
        </div>
        {onChromeRegionClick && (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation()
              onChromeRegionClick("mosaic")
            }}
            style={{ position: "absolute", top: 0, right: 12, background: "rgba(59,130,246,0.92)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999, cursor: "pointer" }}
          >
            Tile colors
          </span>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      className={cn(
        styles.sectionSlot,
        styles.sectionSlotHover,
        isSelected && styles.sectionSlotSelected
      )}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div
        style={{
          backgroundColor: containerColor,
          borderRadius: 24,
          overflow: "hidden",
          padding: "4px 0 5px",
        }}
      >
        <div style={{ padding: "0 5px 2px" }}>
          {renderLayout(layout, hero, mini)}
        </div>
      </div>
    </button>
  )
}

export default memo(MosaicPreview)

function renderLayout(
  layout: MosaicLayout,
  hero: MosaicTile | null,
  mini: MosaicTile[]
) {
  switch (layout) {
    case "two_by_three":
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 6,
          }}
        >
          {mini.map((tile, i) =>
            renderTile(tile, i, "mini", { aspectRatio: "0.78" })
          )}
        </div>
      )

    case "single_hero":
      return (
        <div style={{ aspectRatio: "1.95" }}>
          {hero && renderTile(hero, 0, "hero", { height: "100%" })}
        </div>
      )

    case "two_by_two":
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 6,
          }}
        >
          {mini.map((tile, i) =>
            renderTile(tile, i, "mini", { aspectRatio: "1.05" })
          )}
        </div>
      )

    case "stacked_banners":
      return (
        <div style={{ display: "grid", gap: 6 }}>
          {mini.map((tile, i) =>
            renderTile(tile, i, "full", { aspectRatio: "2.35" })
          )}
        </div>
      )

    case "hero_plus_four":
    default:
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.36fr 0.64fr",
            gap: 6,
            aspectRatio: "1.44",
          }}
        >
          {hero && renderTile(hero, 0, "hero", { height: "100%" })}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gridTemplateRows: "repeat(2, minmax(0, 1fr))",
              gap: 6,
            }}
          >
            {mini.map((tile, i) =>
              renderTile(tile, i, "mini", { height: "100%" })
            )}
          </div>
        </div>
      )
  }
}

function renderTile(
  tile: MosaicTile,
  index: number,
  tone: "hero" | "mini" | "full",
  extraStyle: CSSProperties
) {
  const [colorStart, colorEnd] = tile.gradient

  return (
    <div
      key={`tile-${tone}-${index}`}
      style={{
        borderRadius: tone === "hero" ? 22 : 18,
        overflow: "hidden",
        position: "relative",
        background: `linear-gradient(180deg, ${colorStart}, ${colorEnd})`,
        boxShadow: "0 8px 18px rgba(0,0,0,0.07)",
        ...extraStyle,
      }}
    >
      {tile.imageUrl && (
        <img
          src={tile.imageUrl}
          alt={tile.title}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: tile.imageFit,
            objectPosition: "bottom center",
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          top: tone === "hero" ? 12 : 8,
          left: tone === "hero" ? 14 : 10,
          right: 18,
          fontSize: tone === "hero" ? 16 : 12,
          fontWeight: 700,
          color: "#ffffff",
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
          textShadow: "0 2px 4px rgba(0,0,0,0.22)",
          whiteSpace: "pre-line",
        }}
      >
        {tile.title}
      </div>

      {tone === "hero" && tile.badgeText && (
        <div
          style={{
            position: "absolute",
            right: 8,
            bottom: 8,
            padding: "3px 7px",
            borderRadius: 999,
            fontSize: 9,
            fontWeight: 800,
            color: "#ffffff",
            background: `linear-gradient(180deg, ${
              tile.badgeGradient?.[0] ?? "#FF4CB7"
            }, ${tile.badgeGradient?.[1] ?? "#D91B83"})`,
            whiteSpace: "pre-line",
            textAlign: "center",
            lineHeight: 1,
          }}
        >
          {tile.badgeText}
        </div>
      )}
    </div>
  )
}

type Look = typeof DEFAULT_HOME_LOOK

function dealerHero(tile: MosaicTile, look: Look) {
  return (
    <div
      style={{
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        background: `linear-gradient(180deg, ${tile.gradient[0]}, ${tile.gradient[1]})`,
      }}
    >
      {tile.imageUrl && (
        <img
          src={tile.imageUrl}
          alt={tile.title}
          style={{ position: "absolute", left: 4, right: 4, bottom: 0, height: "62%", width: "calc(100% - 8px)", objectFit: "contain", objectPosition: "bottom center" }}
        />
      )}
      <div style={{ position: "relative", textAlign: "center", paddingTop: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: look.mosaicHeroTitleColor, lineHeight: 1 }}>{tile.title}</div>
        {tile.badgeText && (
          <div
            style={{
              display: "inline-block",
              marginTop: 5,
              padding: "3px 9px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.05,
              whiteSpace: "pre-line",
              background: `linear-gradient(180deg, ${tile.badgeGradient?.[0] ?? "#111"}, ${tile.badgeGradient?.[1] ?? "#111"})`,
            }}
          >
            {tile.badgeText}
          </div>
        )}
      </div>
    </div>
  )
}

function dealerMini(tile: MosaicTile, index: number, look: Look) {
  const caption = tile.caption?.trim()
  return (
    <div
      key={`mini-${index}`}
      style={{
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(180deg, ${tile.gradient[0]}, ${tile.gradient[1]})`,
      }}
    >
      <div style={{ textAlign: "center", fontSize: 9.5, fontWeight: 700, color: look.mosaicTitleColor, padding: "4px 4px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {tile.title.replace(/\n/g, " ")}
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: "1px 6px 3px", display: "flex", justifyContent: "center" }}>
        {tile.imageUrl && <img src={tile.imageUrl} alt={tile.title} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />}
      </div>
      {caption && (
        <div
          style={{
            margin: "0 2px 2px",
            padding: "3px 4px",
            textAlign: "center",
            fontSize: 8.5,
            fontWeight: 600,
            color: look.mosaicBarTextColor,
            background: look.mosaicBarColor,
            borderRadius: "4px 4px 9px 9px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {caption}
        </div>
      )}
    </div>
  )
}
