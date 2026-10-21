/* eslint-disable @next/next/no-img-element */

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import type { PreviewProps } from "./index";
import styles from "../MobilePreviewFrame.module.css";
import { DealkerProductCardPreview, cardMetrics, cardSlots } from "./DealkerProductCardPreview";

/**
 * Previews of the three plain product sections, mirroring `section_registry.dart`:
 * `product_carousel` / `trending_products` (`_ManifestHorizontalProductSection`) and
 * `category_product_grid` (`_ManifestProductGridSection`). Sizes are app points
 * (.w = 402/375, .h = 874/812, .sp = .w).
 */
const W = 402 / 375;
const H = 874 / 812;
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif";
const INK = "#1A1A1A";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);

function Header({ title, accent, color }: { title: string; accent?: string; color?: string }) {
  const words = title.split(" ");
  const base: React.CSSProperties = { fontFamily: JAKARTA, fontSize: 18 * W, fontWeight: 800, color: color ?? INK, lineHeight: 1.25 };
  return (
    <div style={{ padding: `${12 * H}px ${18 * W}px 0`, textAlign: "left" }}>
      {accent && !color && words.length > 1 ? (
        <div style={base}>
          {words.slice(0, -1).join(" ")} <span style={{ color: accent }}>{words[words.length - 1]}</span>
        </div>
      ) : (
        <div style={base}>{title}</div>
      )}
    </div>
  );
}

function ViewAll({ label }: { label: string }) {
  return (
    <div style={{ padding: `0 ${14 * W}px` }}>
      <div style={{ height: 44 * H, borderRadius: 12 * W, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 * W, fontFamily: JAKARTA, fontSize: 14 * W, fontWeight: 800, color: INK }}>
        {label}
        <svg width={18 * W} height={18 * W} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </div>
    </div>
  );
}

function ProductSectionsPreview({ section, isSelected, onClick, products }: PreviewProps) {
  const config = section.config as Record<string, unknown>;
  const type = section.section_type;
  const list = products ?? [];
  const [imgAspect, setImgAspect] = useState<number | null>(null);
  // The app extends a short artwork downwards in the artwork's own bottom colour.
  const [bottomColor, setBottomColor] = useState<string | null>(null);
  const shell = (children: React.ReactNode) => (
    <button
      type="button"
      className={cn(styles.sectionSlot, styles.sectionSlotHover, isSelected && styles.sectionSlotSelected)}
      onClick={onClick}
      aria-pressed={isSelected}
      style={{ textAlign: "left" }}
    >
      {children}
    </button>
  );

  if (list.length === 0) return null;

  if (type === "category_product_grid") {
    const title = str(config.title) ?? "Products for you";
    const itemW = (402 - 2 * 14 * W - 12) / 2;
    const slots = cardSlots(list, itemW);
    const showViewAll = bool(config.show_view_all_button) ?? true;
    return shell(
      <div>
        <Header title={title} />
        <div style={{ height: 10 * H }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 12px", padding: `0 ${14 * W}px` }}>
          {list.map((p) => (
            <DealkerProductCardPreview key={p.id} product={p} width={itemW} slots={slots} />
          ))}
        </div>
        {showViewAll && (
          <>
            <div style={{ height: 14 * H }} />
            <ViewAll label={str(config.view_all_label) ?? "View All"} />
            <div style={{ height: 8 * H }} />
          </>
        )}
      </div>,
    );
  }

  const trending = type === "trending_products";
  const title = str(config.title) ?? (trending ? "Trending Near You" : "Top picks");
  const bgUrl = str(config.background_image_url);
  const bgColor = str(config.background_color);
  const showTitle = bool(config.show_title) ?? true;
  const showViewAll = bool(config.show_view_all_button) ?? (trending ? true : !!bgUrl);
  const viewAllLabel = str(config.view_all_label) ?? (trending ? "View All" : "View all");
  const titleColor = str(config.title_color) ?? (bgUrl ? "#FFFFFF" : undefined);
  const topSpace = num(config.top_space);
  const bottomSpace = num(config.bottom_space);
  const radius = num(config.border_radius) ?? 16;
  const cardW = Math.min(280, Math.max(220, 402 * 0.6));
  const slots = cardSlots(list, cardW);
  const listH = cardMetrics(cardW, slots).height + 28;
  const rail = (
    <div style={{ display: "flex", gap: 12, padding: `0 ${14 * W}px`, height: listH, alignItems: "center", overflow: "hidden" }}>
      {list.map((p) => (
        <DealkerProductCardPreview key={p.id} product={p} width={cardW} slots={slots} />
      ))}
    </div>
  );
  const heading = showTitle ? (
    <>
      <div style={{ padding: `${12 * H}px ${18 * W}px 0`, display: "flex", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <Header title={title} accent={trending ? "#0D8320" : undefined} color={titleColor} />
        </div>
      </div>
    </>
  ) : null;

  if (!bgUrl && !bgColor) {
    return shell(
      <div>
        {showTitle ? (
          <>
            <Header title={title} accent={trending ? "#0D8320" : undefined} color={titleColor} />
            <div style={{ height: 10 * H }} />
          </>
        ) : (
          <div style={{ height: 4 * H }} />
        )}
        {topSpace ? <div style={{ height: topSpace * H }} /> : null}
        {rail}
        {showViewAll && (
          <>
            <div style={{ height: 12 * H }} />
            <ViewAll label={viewAllLabel} />
          </>
        )}
        {bottomSpace ? <div style={{ height: bottomSpace * H }} /> : null}
      </div>,
    );
  }

  // Background mode: artwork shown whole at its own shape; cards start `topSpace` down (30% if unset).
  const needed = listH + (showViewAll ? 12 * H + 44 * H : 0) + (bottomSpace ?? 14) * H;
  const imageH = imgAspect ? 402 / imgAspect : null;
  const wantedTop = topSpace != null ? Math.min(400, Math.max(0, topSpace)) * H : imageH == null ? 96 * H : Math.min(160 * H, Math.max(40 * H, imageH * 0.3));
  const height = imageH != null && imageH >= wantedTop + needed ? imageH : wantedTop + needed;
  void radius;
  void heading;
  return shell(
    <div style={{ position: "relative", height, background: bgColor ?? bottomColor ?? "transparent", overflow: "hidden" }}>
      {bgUrl && (
        <img
          src={bgUrl}
          alt=""
          draggable={false}
          crossOrigin="anonymous"
          onLoad={(e) => {
            const img = e.currentTarget
            setImgAspect(img.naturalWidth / (img.naturalHeight || 1))
            try {
              const c = document.createElement("canvas")
              c.width = 1
              c.height = 1
              const ctx = c.getContext("2d")
              ctx?.drawImage(img, img.naturalWidth / 2, img.naturalHeight - 2, 1, 1, 0, 0, 1, 1)
              const d = ctx?.getImageData(0, 0, 1, 1).data
              if (d) setBottomColor(`rgb(${d[0]},${d[1]},${d[2]})`)
            } catch {
              /* cross-origin pixels unavailable: keep the section background */
            }
          }}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: imageH ?? "auto", display: "block" }}
        />
      )}
      <div style={{ position: "absolute", top: wantedTop, left: 0, right: 0, height: listH }}>{rail}</div>
      {showViewAll && (
        <div style={{ position: "absolute", top: wantedTop + listH + 12 * H, left: 0, right: 0 }}>
          <ViewAll label={viewAllLabel} />
        </div>
      )}
    </div>,
  );
}

export default memo(ProductSectionsPreview);
