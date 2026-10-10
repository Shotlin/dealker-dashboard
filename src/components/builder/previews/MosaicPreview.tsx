/* eslint-disable @next/next/no-img-element */

import { memo, type CSSProperties } from "react"
import { cn } from "@/lib/utils"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"
import {
  DEFAULT_CONTAINER_COLOR,
  normalizeLayout,
  readMosaicTiles,
  type MosaicLayout,
  type MosaicTile,
} from "../editors/mosaic-model"

function MosaicPreview({ section, isSelected, onClick }: PreviewProps) {
  const config = section.config as Record<string, unknown>
  const layout = normalizeLayout(config.layout_variant)
  const containerColor =
    typeof config.container_color === "string"
      ? config.container_color
      : DEFAULT_CONTAINER_COLOR

  const { hero, mini } = readMosaicTiles(config, layout)

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
          padding: layout === "hero_plus_four" ? "3px 0 4px" : "4px 0 5px",
        }}
      >
        <div style={{ padding: layout === "hero_plus_four" ? "0 5px" : "0 5px 2px" }}>
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
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      )}

    </div>
  )
}
