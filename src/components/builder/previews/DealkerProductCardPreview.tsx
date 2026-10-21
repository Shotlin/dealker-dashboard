/* eslint-disable @next/next/no-img-element */

import type { Product } from "@/types"

/**
 * TypeScript twin of the app's `DealkerProductCard` (shared/widgets/dealker_product_card.dart):
 * every size is a proportion of the card width (design 680px wide) with the same
 * readable minimums, so the card looks like the phone's at any width.
 * Rows only show when the product has that data.
 */
const INK = "#101114"
const GREY = "#6C6E78"
const GREY_LIGHT = "#8C8E98"
const META_LABEL = "#55575F"
const DIVIDER = "#D7D9E0"
const BLUE = "#1B5BF2"
const GREEN = "#14A241"
const GREEN_BADGE = "#12B047"
const PINK = "#E5224F"
const PINK_SOFT = "#FDE3E9"
const TEAL = "#0E9F8E"
const STAR = "#F7A81B"
const DANGER = "#D93025"
const HEART_BORDER = "#E3E5EB"
const HEART_OFF = "#2A2B33"
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif"
const DM = "'DM Sans', system-ui, sans-serif"

export function money(v: number): string {
  const s = String(Math.round(v))
  if (s.length <= 3) return `₹${s}`
  let rest = s.slice(0, -3)
  const groups = [s.slice(-3)]
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2))
    rest = rest.slice(0, -2)
  }
  if (rest) groups.unshift(rest)
  return `₹${groups.join(",")}`
}

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`)

type P = Product & Record<string, unknown>

function sellerOf(p: P): string | null {
  const v = (p.soldBy ?? p.sold_by ?? p.vendorName ?? p.vendor_name) as string | undefined | null
  return v && String(v).trim() ? String(v).trim() : null
}
function ratingOf(p: P): { avg: number; count: number } {
  const avg = Number(p.avgRating ?? p.avg_rating ?? 0) || 0
  const count = Number(p.ratingCount ?? p.rating_count ?? 0) || 0
  return { avg, count }
}

/** Metrics (see `_CardMetrics`). */
export function cardMetrics(width: number, opts: { nameLines?: number; showSold?: boolean; showRating?: boolean } = {}) {
  const nameLines = opts.nameLines ?? 2
  const showSold = opts.showSold ?? true
  const showRating = opts.showRating ?? true
  const u = width / 680
  const px = (v: number, min = 0) => Math.max(v * u, min)
  const m = {
    width, u, px, nameLines, showSold, showRating,
    padSide: px(33, 10), padTop: px(26, 9), padBottom: px(34, 11),
    imageZone: width * 0.86,
    nameFs: px(40, 12.5), soldFs: px(30, 10.5), priceFs: px(62, 16), mrpFs: px(36, 10.5),
    pillH: px(54, 18), starFs: px(46, 13), ratingFs: px(34, 11.5), metaFs: px(27, 9.5), metaIcon: px(44, 12),
    gapName: px(16, 7), gapSold: px(10, 3), gapPrice: px(14, 6), gapRating: px(12, 4), gapMeta: px(18, 8),
    btnH: px(108, 38), btnW: 0, plusW: 0, btnFs: px(42, 14), plusIcon: 0,
    nameH: 0, soldH: 0, priceH: 0, metaH: 0, height: 0,
  }
  m.btnW = Math.min(px(250, 90), width * 0.56)
  m.plusW = m.btnH * 1.15
  m.plusIcon = Math.max(m.btnH * 0.62, 22)
  m.nameH = m.nameFs * 1.22 * nameLines
  m.soldH = m.soldFs * 1.3
  m.priceH = Math.max(m.priceFs, m.pillH)
  m.metaH = m.metaIcon + 2
  const textBlock =
    m.gapName + m.nameH + (showSold ? m.gapSold + m.soldH : 0) + m.gapPrice + m.priceH + (showRating ? m.gapRating + m.starFs : 0) + m.gapMeta + m.metaH
  m.height = m.padTop + m.imageZone + textBlock + m.padBottom
  return m
}

/** Rows the list needs (see `DealkerCardSlots`). Name lines are estimated from the text length. */
export function cardSlots(productsIn: Product[], width: number) {
  const products = productsIn as P[]
  const m = cardMetrics(width)
  const perLine = Math.floor((width - 2 * m.padSide) / (m.nameFs * 0.52))
  const nameLines = products.length === 0 ? 2 : Math.max(...products.map((p) => (String(p.name).length <= perLine ? 1 : 2)))
  return {
    nameLines,
    showSold: products.some((p) => sellerOf(p) !== null),
    showRating: products.some((p) => { const r = ratingOf(p); return r.avg > 0 && r.count > 0 }),
  }
}

export function DealkerProductCardPreview({
  product,
  width,
  slots,
  buttonLabel,
  buttonColor,
}: {
  product: Product
  width: number
  slots: { nameLines: number; showSold: boolean; showRating: boolean }
  buttonLabel?: string
  buttonColor?: string
}) {
  const p = product as P
  const m = cardMetrics(width, slots)
  const { u, px } = m
  const seller = sellerOf(p)
  const price = Number(p.price) || 0
  const sale = p.sale_price != null ? Number(p.sale_price) : null
  const onSale = sale != null && sale > 0 && sale < price
  const eff = onSale ? (sale as number) : price
  const discount = onSale && price > 0 ? Math.round(((price - (sale as number)) / price) * 100) : null
  const imgs = ((p.images as string[] | undefined) ?? []).filter((i) => i && i.trim())
  const imageUrl = p.thumbnail_url || imgs[0] || null
  const badges = (p.custom_badges as string[] | null | undefined) ?? []
  const badge = badges[0]?.trim() ? badges[0].trim().toUpperCase() : p.is_new_arrival ? "NEW" : null
  const { avg, count } = ratingOf(p)
  const hasRating = avg > 0 && count > 0
  const inStock = Number(p.stock_quantity) > 0 && p.is_active !== false
  const accent = inStock ? buttonColor ?? BLUE : "#B9BDC9"
  const plusOnly = !buttonLabel && inStock
  const authentic = p.isAuthentic ?? p.is_authentic ?? true
  const photoDot = Math.max(18 * u, 6)

  const label: React.CSSProperties = { fontFamily: DM, fontSize: m.metaFs, fontWeight: 500, color: META_LABEL, lineHeight: 1, whiteSpace: "nowrap" }
  const sep = <span style={{ width: 2.5 * u, height: m.metaIcon * 0.8, background: DIVIDER, flexShrink: 0 }} />

  return (
    <div
      style={{
        width, height: m.height, flexShrink: 0, boxSizing: "border-box",
        background: "#fff", borderRadius: px(40, 14),
        boxShadow: `0 ${px(14, 4)}px ${px(46, 12)}px rgba(27,37,64,0.08)`,
        padding: `${m.padTop}px ${m.padSide}px ${m.padBottom}px`,
        display: "flex", flexDirection: "column", textAlign: "left", overflow: "hidden",
      }}
    >
      {/* image zone */}
      <div style={{ position: "relative", height: m.imageZone, flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: 0, padding: `${px(26)}px ${px(12)}px ${m.btnH * 0.55 + (imgs.length > 1 ? 8 : 0)}px` }}>
          {imageUrl && <img src={imageUrl as string} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
        </div>
        {badge && (
          <div style={{
            position: "absolute", left: 0, top: px(4), height: px(62, 22), padding: `0 ${px(32, 10)}px`,
            background: GREEN_BADGE, borderRadius: px(31, 11), display: "grid", placeItems: "center",
            boxShadow: `0 ${px(6, 2)}px ${px(16, 5)}px rgba(18,176,71,0.3)`,
            fontFamily: JAKARTA, fontSize: px(33, 10), fontWeight: 800, color: "#fff", letterSpacing: 0.4, lineHeight: 1,
          }}>{badge}</div>
        )}
        <div style={{
          position: "absolute", right: 0, top: 0, width: px(84, 32), height: px(84, 32), borderRadius: 999, background: "#fff",
          border: `${px(84, 32) * 0.014 + 0.6}px solid ${HEART_BORDER}`, boxSizing: "border-box", display: "grid", placeItems: "center",
        }}>
          <svg width={px(84, 32) * 0.5} height={px(84, 32) * 0.5} viewBox="0 0 24 24" fill="none" stroke={HEART_OFF} strokeWidth="2" strokeLinejoin="round">
            <path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.5 3 5 6.4 5c2 0 3.5 1.1 4.3 2.4.4.6 1.2.6 1.6 0C13.1 6.1 14.6 5 16.6 5 20 5 21.800 8.500 21.500 11.700 19.500 16.400 12 21 12 21z" />
          </svg>
        </div>
        {imgs.length > 1 && (
          <div style={{ position: "absolute", left: 0, right: m.plusW + px(14, 6), bottom: 0, height: m.btnH, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {Array.from({ length: Math.min(imgs.length, 3) }).map((_, i) => (
              <span key={i} style={{ width: photoDot, height: photoDot, margin: `0 ${photoDot * 0.6}px`, borderRadius: 999, background: i === 0 ? INK : DIVIDER }} />
            ))}
          </div>
        )}
        <div style={{
          position: "absolute", right: 0, bottom: 0, height: m.btnH, minWidth: plusOnly ? m.plusW : m.btnW, boxSizing: "border-box",
          borderRadius: px(26, 11), background: "#fff", border: `${Math.max(3 * u, 1.4)}px solid ${accent}`,
          boxShadow: `0 ${px(4, 1.5)}px ${px(14, 5)}px rgba(27,91,242,0.07)`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: px(12, 3), padding: plusOnly ? 0 : `0 ${px(22, 8)}px`, color: accent,
        }}>
          {plusOnly ? (
            <svg width={m.plusIcon} height={m.plusIcon} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          ) : (
            <>
              {inStock && !buttonLabel && (
                <svg width={m.btnFs * 1.5} height={m.btnFs * 1.5} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              )}
              <span style={{ fontFamily: JAKARTA, fontSize: m.btnFs, fontWeight: 800, lineHeight: 1, whiteSpace: "nowrap" }}>{inStock ? buttonLabel ?? "Add" : "Sold out"}</span>
            </>
          )}
        </div>
      </div>

      <div style={{ height: m.gapName, flexShrink: 0 }} />
      <div style={{
        height: m.nameH, flexShrink: 0, overflow: "hidden", fontFamily: JAKARTA, fontSize: m.nameFs, fontWeight: 800, color: INK,
        letterSpacing: -0.2, lineHeight: 1.22, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
      }}>{p.name}</div>

      {m.showSold && (
        <>
          <div style={{ height: m.gapSold, flexShrink: 0 }} />
          <div style={{ height: m.soldH, flexShrink: 0, display: "flex", alignItems: "center", whiteSpace: "nowrap", overflow: "hidden" }}>
            {seller && (
              <>
                <span style={{ fontFamily: DM, fontSize: m.soldFs, fontWeight: 500, color: GREY, lineHeight: 1.1 }}>Sold by:&nbsp;</span>
                <span style={{ fontFamily: DM, fontSize: m.soldFs, fontWeight: 700, color: BLUE, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis" }}>{seller}</span>
                <svg width={m.soldFs * 1.35} height={m.soldFs * 1.35} viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </>
            )}
          </div>
        </>
      )}

      <div style={{ height: m.gapPrice, flexShrink: 0 }} />
      <div style={{ height: m.priceH, flexShrink: 0, display: "flex", alignItems: "center", whiteSpace: "nowrap", overflow: "hidden" }}>
        <span style={{ fontFamily: JAKARTA, fontSize: m.priceFs, fontWeight: 800, color: INK, letterSpacing: -0.5, lineHeight: 1 }}>{money(eff)}</span>
        {onSale && (
          <span style={{ marginLeft: px(24, 6), fontFamily: JAKARTA, fontSize: m.mrpFs, fontWeight: 700, color: GREY_LIGHT, textDecoration: "line-through", lineHeight: 1 }}>{money(price)}</span>
        )}
        {discount != null && discount > 0 && (
          <span style={{
            marginLeft: px(22, 6), height: m.pillH, padding: `0 ${px(22, 7)}px`, borderRadius: m.pillH / 2, background: PINK_SOFT,
            display: "grid", placeItems: "center", fontFamily: JAKARTA, fontSize: px(28, 9.5), fontWeight: 800, color: PINK, lineHeight: 1,
          }}>{discount}% OFF</span>
        )}
      </div>

      {m.showRating && (
        <>
          <div style={{ height: m.gapRating, flexShrink: 0 }} />
          <div style={{ height: m.starFs, flexShrink: 0, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
            {hasRating && (
              <>
                <svg width={m.starFs} height={m.starFs} viewBox="0 0 24 24" fill={STAR}><path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.7L12 17.5l-5.9 3.3 1.3-6.7L2.500 9.500l6.600-.8z" /></svg>
                <span style={{ marginLeft: px(8, 2), fontFamily: JAKARTA, fontSize: m.ratingFs, fontWeight: 800, color: INK, lineHeight: 1 }}>{avg.toFixed(1)}</span>
                {count > 10 && (
                  <>
                    <span style={{ margin: `0 ${px(18, 6)}px`, width: Math.max(2 * u, 1), height: m.starFs * 0.7, background: DIVIDER }} />
                    <span style={{ fontFamily: DM, fontSize: m.soldFs, fontWeight: 500, color: GREY, lineHeight: 1 }}>({compact(count)} reviews)</span>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}

      <div style={{ height: m.gapMeta, flexShrink: 0 }} />
      <div style={{ height: m.metaH, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 30 * u, whiteSpace: "nowrap", overflow: "hidden" }}>
        {inStock && (
          <span style={{ display: "flex", alignItems: "center", gap: 14 * u }}>
            <svg width={m.metaIcon} height={m.metaIcon} viewBox="0 0 256 256" fill={TEAL}><path d="M247.4 126.800l-20.100-45.100a16 16 0 0 0-14.600-9.700H184V64a8 8 0 0 0-8-8H24A16 16 0 0 0 8 72v104a16 16 0 0 0 16 16h17a32 32 0 0 0 62 0h50a32 32 0 0 0 62 0h9a16 16 0 0 0 16-16v-45a16.500 16.500 0 0 0-1.600-4.200zM73 208a16 16 0 1 1 16-16 16 16 0 0 1-16 16zm96-96V88h44.700l10.700 24zm32 96a16 16 0 1 1 16-16 16 16 0 0 1-16 16z" /></svg>
            <span style={label}>Fast delivery</span>
          </span>
        )}
        {inStock && authentic && sep}
        {authentic && (
          <span style={{ display: "flex", alignItems: "center", gap: 12 * u }}>
            <svg width={m.metaIcon} height={m.metaIcon} viewBox="0 0 24 24" fill={GREEN}><path d="M12 2l2.4 1.900 3-.2 1.300 2.700 2.700 1.300-.2 3L23 12l-1.900 2.400.2 3-2.700 1.300-1.300 2.700-3-.2L12 23l-2.400-1.900-3 .2-1.300-2.700-2.700-1.300.2-3L1 12l1.900-2.400-.2-3 2.700-1.300 1.300-2.700 3 .2zM10.600 15.800l5.800-5.800-1.300-1.300-4.500 4.500-1.900-1.900-1.300 1.300z" /></svg>
            <span style={label}>Assured</span>
          </span>
        )}
        {sep}
        <span style={{ display: "flex", alignItems: "center", gap: 14 * u }}>
          <span style={{ width: 28 * u, height: 28 * u, borderRadius: 999, background: inStock ? GREEN : DANGER }} />
          <span style={{ ...label, fontWeight: 700, color: inStock ? GREEN : DANGER }}>{inStock ? "In Stock" : "Out of stock"}</span>
        </span>
      </div>
    </div>
  )
}

/** `DealerProductRail`: horizontal rail of cards, 44% of the screen wide (150..190), 12pt apart. */
export function DealerProductRailPreview({
  products,
  padding = 14,
  buttonLabel,
  buttonColor,
  seeAllLabel = "",
}: {
  products: Product[]
  padding?: number
  buttonLabel?: string
  buttonColor?: string
  /** "See all" button under the rail (empty hides it). */
  seeAllLabel?: string
}) {
  const cardW = Math.min(190, Math.max(150, 402 * 0.44))
  const slots = cardSlots(products, cardW)
  const h = cardMetrics(cardW, slots).height
  return (
    <div>
      <div style={{ display: "flex", gap: 12, padding: `0 ${padding}px`, height: h + 6, overflow: "hidden" }}>
        {products.map((p) => (
          <DealkerProductCardPreview key={p.id} product={p} width={cardW} slots={slots} buttonLabel={buttonLabel} buttonColor={buttonColor} />
        ))}
      </div>
      {seeAllLabel && (
        <div style={{ padding: "12px 14px 0" }}>
          <div style={{
            height: 46, boxSizing: "border-box", borderRadius: 12, background: "#F3F4F6", border: "1px solid #E2E4E8",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontFamily: JAKARTA, fontSize: 14, fontWeight: 800, color: "#111111",
          }}>
            {seeAllLabel}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#111111"><path d="M9 7l6 5-6 5z" /></svg>
          </div>
        </div>
      )}
    </div>
  )
}
