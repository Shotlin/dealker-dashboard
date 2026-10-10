/* eslint-disable @next/next/no-img-element */

import { memo } from "react"
import { cn } from "@/lib/utils"
import type { Product } from "@/types"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"

function ProductGridPreview({
  section,
  isSelected,
  onClick,
  products,
}: PreviewProps) {
  const config = section.config as Record<string, unknown>
  // Always two columns (the Dealker card is a tall card), like the app.
  const columns = 2
  const showViewAll = config.show_view_all_button !== false
  const viewAllLabel =
    typeof config.view_all_label === "string" && config.view_all_label.trim()
      ? config.view_all_label.trim()
      : "View All"
  const title =
    typeof config.title === "string" && config.title.trim()
      ? config.title.trim()
      : "Best Sellers"

  const items = (products ?? []).slice(0, columns * 2)

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
      {/* Section header — Flutter style */}
      <div style={{ padding: "12px 18px 0" }}>
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
      </div>

      {/* Product grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: 10,
          padding: "10px 14px 8px",
        }}
      >
        {items.length > 0
          ? items.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))
          : Array.from({ length: columns * 2 }, (_, i) => (
            <PlaceholderCard key={`ph-${i}`} index={i} />
          ))}
      </div>

      {/* "View All" button under the grid */}
      {showViewAll ? (
        <div style={{ padding: "2px 14px 12px" }}>
          <div
            style={{
              height: 40,
              borderRadius: 12,
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              color: "#131313",
              fontSize: 14,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {viewAllLabel} <span aria-hidden>→</span>
          </div>
        </div>
      ) : null}
    </button>
  )
}

export default memo(ProductGridPreview)

function ProductCard({ product, index }: { product: Product; index: number }) {
  const displayPrice = product.sale_price ?? product.price
  const hasDiscount = product.sale_price && product.sale_price < product.price

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid #f0f0f0",
        background: "#ffffff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Image */}
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
              background: `hsl(${120 + index * 40}, 35%, 90%)`,
            }}
          />
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "6px 8px 8px" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#1e293b",
            lineHeight: 1.2,
            height: 26,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {product.name}
        </div>

        {product.net_weight ? (
          <div
            style={{
              fontSize: 9,
              color: "#94a3b8",
              fontWeight: 500,
              marginTop: 2,
            }}
          >
            {product.net_weight}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 4,
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#131313",
            }}
          >
            ₹{displayPrice}
          </span>
          {hasDiscount ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "#94a3b8",
                textDecoration: "line-through",
              }}
            >
              ₹{product.price}
            </span>
          ) : null}
        </div>

        {/* Add button */}
        <div
          style={{
            marginTop: 6,
            height: 26,
            borderRadius: 8,
            background: "#ffffff",
            border: "1.5px solid #16a34a",
            color: "#16a34a",
            fontSize: 12,
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

function PlaceholderCard({ index }: { index: number }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid #f0f0f0",
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 80,
          background: `linear-gradient(135deg, hsl(${140 + index * 35}, 25%, 94%), hsl(${160 + index * 35}, 25%, 90%))`,
        }}
      />
      <div style={{ padding: "8px 8px 10px" }}>
        <div
          style={{
            height: 8,
            width: "80%",
            borderRadius: 4,
            background: "#e2e8f0",
          }}
        />
        <div
          style={{
            height: 6,
            width: "50%",
            borderRadius: 3,
            background: "#e2e8f0",
            marginTop: 6,
          }}
        />
        <div
          style={{
            marginTop: 8,
            height: 24,
            borderRadius: 6,
            background: "#f0fdf4",
            border: "1.5px solid #86efac",
          }}
        />
      </div>
    </div>
  )
}
