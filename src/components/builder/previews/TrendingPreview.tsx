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

  // Optional carousel background (mirrors the Flutter `_ManifestHorizontalProductSection`).
  const isCarousel = section.section_type === "product_carousel"
  const bgUrl = isCarousel && typeof config.background_image_url === "string" ? config.background_image_url.trim() : ""
  const bgColor = isCarousel && typeof config.background_color === "string" ? config.background_color : ""
  const hasBg = Boolean(bgUrl || bgColor)
  const showTitle = config.show_title !== false
  const num = (v: unknown) => (typeof v === "number" ? v : undefined)
  const topSpace = num(config.top_space) ?? (hasBg ? 96 : 0)
  const bottomSpace = num(config.bottom_space) ?? (hasBg ? 14 : 0)
  const radius = Math.min(Math.max(num(config.border_radius) ?? 16, 0), 32)
  const titleColor = typeof config.title_color === "string" && config.title_color ? config.title_color : bgUrl ? "#FFFFFF" : "#131313"
  const showViewAll =
    isCarousel && (typeof config.show_view_all_button === "boolean" ? config.show_view_all_button : hasBg)
  const viewAllLabel = typeof config.view_all_label === "string" && config.view_all_label.trim() ? config.view_all_label : "View all"

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
      <div
        style={
          hasBg
            ? { margin: "6px 12px", borderRadius: radius, overflow: "hidden", position: "relative", background: bgColor || undefined, minHeight: topSpace + 190 + bottomSpace }
            : undefined
        }
      >
        {bgUrl ? (
          <img
            src={bgUrl}
            alt=""
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        ) : null}
      {/* Section header — Flutter style with colored last word */}
      {showTitle ? (
      <div style={hasBg ? { padding: "12px 18px 0", position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 } : { padding: "12px 18px 0", position: "relative" }}>
        {isBox ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: titleColor, textTransform: "uppercase" }}>{title}</span>
            {!showViewAll ? <span style={{ fontSize: 11, fontWeight: 700, color: hasBg ? "#fff" : "#131313" }}>View All →</span> : null}
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
      ) : null}

      {/* Horizontal product scroll */}
      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          scrollbarWidth: "none",
          padding: "10px 14px 8px",
          ...(bgUrl
            ? { position: "absolute", left: 0, right: 0, top: topSpace - 10 }
            : { position: "relative", marginTop: hasBg ? topSpace - 10 : topSpace, marginBottom: bottomSpace }),
        }}
      >
        {items.length > 0
          ? items.map((product) => (
            <DealkerCard key={product.id} product={product} />
          ))
          : Array.from({ length: 4 }, (_, i) => (
            <TrendingPlaceholder key={`ph-${i}`} index={i} />
          ))}
      </div>
      {showViewAll ? (
        <div
          style={{
            margin: bgUrl ? 0 : "0 14px 8px",
            ...(bgUrl ? { position: "absolute", left: 14, right: 14, bottom: 12 } : {}),
            background: "#fff",
            borderRadius: 12,
            height: 40,
            display: "grid",
            placeItems: "center",
            fontSize: 13,
            fontWeight: 800,
            color: "#131313",
          }}
        >
          {viewAllLabel} →
        </div>
      ) : null}
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


/** Builder-preview replica of the app's Dealker product card (sizes are proportions of the card width). */
function DealkerCard({ product }: { product: Product }) {
  const W = 190
  const u = W / 968
  const px = (v: number) => v * u
  const p = product as Product & { sold_by?: string | null; avg_rating?: number; rating_count?: number }
  const price = product.sale_price ?? product.price
  const onSale = product.sale_price != null && product.sale_price < product.price
  const discount = onSale ? Math.round(((product.price - (product.sale_price as number)) / product.price) * 100) : 0
  const inStock = (product.stock_quantity ?? 0) > 0
  const money = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN")
  const rating = Number(p.avg_rating ?? 0)
  const count = Number(p.rating_count ?? 0)
  return (
    <div
      style={{
        width: W,
        minWidth: W,
        height: W * (1300 / 968),
        flexShrink: 0,
        background: "#fff",
        borderRadius: px(40),
        boxShadow: "0 6px 18px rgba(27,37,64,0.10)",
        padding: `${px(33)}px ${px(33)}px ${px(30)}px`,
        display: "flex",
        flexDirection: "column",
        fontFamily: "inherit",
      }}
    >
      <div style={{ flex: 1, position: "relative", display: "grid", placeItems: "center", minHeight: 0 }}>
        {product.thumbnail_url ? (
          <img src={product.thumbnail_url} alt="" style={{ maxWidth: "78%", maxHeight: "92%", objectFit: "contain" }} />
        ) : null}
        <span style={{ position: "absolute", left: 0, top: 2, background: "#12B047", color: "#fff", fontSize: px(38), fontWeight: 800, borderRadius: 99, padding: `${px(22)}px ${px(36)}px`, display: product.is_featured ? "block" : "none" }}>NEW</span>
        <span style={{ position: "absolute", right: 2, top: 0, width: px(112), height: px(112), borderRadius: 99, border: "1px solid #E3E5EB", background: "#fff", display: "grid", placeItems: "center", fontSize: px(56), color: "#2A2B33" }}>♡</span>
      </div>
      <div style={{ fontSize: px(62), fontWeight: 800, color: "#101114", marginTop: px(14), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: -0.3 }}>{product.name}</div>
      {p.sold_by ? (
        <div style={{ fontSize: px(33), color: "#6C6E78", marginTop: px(16) }}>
          Sold by: <b style={{ color: "#1B5BF2", fontWeight: 600 }}>{p.sold_by}</b> ›
        </div>
      ) : null}
      <div style={{ display: "flex", alignItems: "center", gap: px(40), marginTop: px(22) }}>
        <span style={{ fontSize: px(78), fontWeight: 800, color: "#101114" }}>{money(price)}</span>
        {onSale ? <span style={{ fontSize: px(42), fontWeight: 700, color: "#8C8E98", textDecoration: "line-through" }}>{money(product.price)}</span> : null}
        {discount > 0 ? <span style={{ fontSize: px(34), fontWeight: 800, color: "#14A241", background: "#E5F6EA", borderRadius: 99, padding: `${px(28)}px ${px(26)}px` }}>{discount}% OFF</span> : null}
      </div>
      {rating > 0 ? (
        <div style={{ fontSize: px(45), fontWeight: 800, color: "#101114", marginTop: px(12) }}>
          <span style={{ color: "#F7A81B" }}>★</span> {rating.toFixed(1)}
          {count > 10 ? <span style={{ fontSize: px(34), fontWeight: 500, color: "#6C6E78" }}> | ({count >= 1000 ? (count / 1000).toFixed(1) + "K" : count} reviews)</span> : null}
        </div>
      ) : null}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: px(32), color: "#55575F", marginTop: px(22) }}>
        {inStock ? <span>🚚 Fast delivery</span> : null}
        <span style={{ color: "#14A241" }}>✓ Assured</span>
        <span style={{ color: inStock ? "#14A241" : "#D93025", fontWeight: 700 }}>● {inStock ? "In Stock" : "Out of stock"}</span>
      </div>
      <div style={{ marginTop: px(20), height: px(96), borderRadius: px(22), background: "#1B5BF2", color: "#fff", display: "grid", placeItems: "center", fontSize: px(36.5), fontWeight: 700 }}>🛒 Add to Cart</div>
    </div>
  )
}
