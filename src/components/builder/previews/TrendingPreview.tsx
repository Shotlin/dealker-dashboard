/* eslint-disable @next/next/no-img-element */

import { memo } from "react"
import { cn } from "@/lib/utils"
import type { Product } from "@/types"
import { DEFAULT_HOME_LOOK } from "@/types/theme.types"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"

function TrendingPreview({
  section,
  isSelected,
  onClick,
  products,
  themeData,
  onChromeRegionClick,
}: PreviewProps) {
  const config = section.config as Record<string, unknown>
  const title =
    typeof config.title === "string" && config.title.trim()
      ? config.title.trim()
      : section.section_type === "product_carousel"
        ? "Fresh picks"
        : "Trending Near You"
  const isBox = config.product_card_style === "DEALKER_MARKETPLACE_BOX"
  const look = { ...DEFAULT_HOME_LOOK, ...(themeData?.sections.homeLook ?? {}) }

  const items = (products ?? []).slice(0, 8)

  // Flutter: last word of title is green accent
  const words = title.split(" ")
  const hasAccent = words.length >= 2

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
      {/* Section header — Flutter style with colored last word */}
      <div style={{ padding: "12px 18px 0", position: "relative" }}>
        {isBox ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#131313", textTransform: "uppercase" }}>{title}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#131313" }}>View All →</span>
          </div>
        ) : hasAccent ? (
          <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>
            <span style={{ color: "#131313" }}>
              {words.slice(0, -1).join(" ")}{" "}
            </span>
            <span style={{ color: "#0D8320", fontWeight: 900 }}>
              {words[words.length - 1]}
            </span>
          </div>
        ) : (
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#131313",
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
        )}
      </div>

      {/* Horizontal product scroll */}
      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          scrollbarWidth: "none",
          padding: "10px 14px 8px",
        }}
      >
        {isBox && items.length > 0
          ? items.map((product) => (
            <BoxCard key={product.id} product={product} look={look} />
          ))
          : items.length > 0
          ? items.map((product) => (
            <TrendingCard key={product.id} product={product} />
          ))
          : Array.from({ length: 4 }, (_, i) => (
            <TrendingPlaceholder key={`ph-${i}`} index={i} />
          ))}
      </div>
      {isBox && onChromeRegionClick && (
        <span
          role="button"
          onClick={(e) => {
            e.stopPropagation()
            onChromeRegionClick("product_box")
          }}
          style={{ position: "absolute", top: 2, right: 90, background: "rgba(59,130,246,0.92)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999, cursor: "pointer" }}
        >
          Box colors
        </span>
      )}
    </button>
  )
}

export default memo(TrendingPreview)

function BoxCard({ product, look }: { product: Product; look: typeof DEFAULT_HOME_LOOK }) {
  const price = product.sale_price ?? product.price
  const onSale = product.sale_price != null && product.sale_price < product.price
  const inStock = (product.stock_quantity ?? 0) > 0
  return (
    <div style={{ minWidth: 130, maxWidth: 140, flexShrink: 0, borderRadius: 12, border: `1px solid ${look.productBoxBorderColor}`, background: look.productBoxColor, padding: 7 }}>
      <div style={{ height: 70, display: "grid", placeItems: "center" }}>
        {product.thumbnail_url && <img src={product.thumbnail_url} alt={product.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />}
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: look.productTextColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 4 }}>{product.name}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: look.productTextColor }}>₹{price}</span>
        {onSale && <span style={{ fontSize: 9, color: look.productTextColor, opacity: 0.4, textDecoration: "line-through" }}>₹{product.price}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3, marginTop: 3, fontSize: 8.5, fontWeight: 700, color: inStock ? look.productStockColor : "#D93025" }}>
        <span style={{ width: 5, height: 5, borderRadius: 99, background: inStock ? look.productStockColor : "#D93025" }} />
        {inStock ? "In Stock" : "Out of stock"}
      </div>
    </div>
  )
}

function TrendingCard({ product }: { product: Product }) {
  const displayPrice = product.sale_price ?? product.price
  const hasDiscount = product.sale_price && product.sale_price < product.price

  return (
    <div
      style={{
        minWidth: 120,
        maxWidth: 130,
        borderRadius: 14,
        border: "1px solid #f0f0f0",
        background: "#ffffff",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: 80,
          background: "#f8fafc",
          display: "grid",
          placeItems: "center",
          borderBottom: "1px solid #f0f0f0",
          overflow: "hidden",
        }}
      >
        {product.thumbnail_url ? (
          <img
            src={product.thumbnail_url}
            alt={product.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              padding: 4,
            }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#e2e8f0",
            }}
          />
        )}
      </div>
      <div style={{ padding: "6px 8px 8px" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#1e293b",
            lineHeight: 1.15,
            height: 25,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {product.name}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 3,
            marginTop: 3,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, color: "#131313" }}>
            ₹{displayPrice}
          </span>
          {hasDiscount ? (
            <span
              style={{
                fontSize: 9,
                color: "#94a3b8",
                textDecoration: "line-through",
              }}
            >
              ₹{product.price}
            </span>
          ) : null}
        </div>
        <div
          style={{
            marginTop: 5,
            height: 24,
            borderRadius: 7,
            background: "#ffffff",
            border: "1.5px solid #16a34a",
            color: "#16a34a",
            fontSize: 11,
            fontWeight: 700,
            display: "grid",
            placeItems: "center",
          }}
        >
          ADD
        </div>
      </div>
    </div>
  )
}

function TrendingPlaceholder({ index }: { index: number }) {
  return (
    <div
      style={{
        minWidth: 120,
        maxWidth: 130,
        borderRadius: 14,
        border: "1px solid #f0f0f0",
        background: "#ffffff",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: 80,
          background: `linear-gradient(135deg, hsl(${140 + index * 30}, 22%, 93%), hsl(${160 + index * 30}, 22%, 88%))`,
        }}
      />
      <div style={{ padding: "8px 8px 10px" }}>
        <div
          style={{
            height: 7,
            width: "80%",
            borderRadius: 3,
            background: "#e2e8f0",
          }}
        />
        <div
          style={{
            height: 5,
            width: "50%",
            borderRadius: 2,
            background: "#e2e8f0",
            marginTop: 5,
          }}
        />
        <div
          style={{
            marginTop: 7,
            height: 22,
            borderRadius: 6,
            background: "#f0fdf4",
            border: "1.5px solid #86efac",
          }}
        />
      </div>
    </div>
  )
}
