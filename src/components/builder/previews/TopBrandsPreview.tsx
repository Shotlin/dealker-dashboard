/* eslint-disable @next/next/no-img-element */

import { memo, useId } from "react";
import { cn } from "@/lib/utils";
import type { PreviewProps } from "./index";
import styles from "../MobilePreviewFrame.module.css";
import { brandCards, brandString } from "../topBrands";

/**
 * Mirrors the app's `TopBrandsSection` / `_ArchPainter` (top_brands_section.dart)
 * number for number, in app points on a 402pt screen: card width
 * clamp(0.4 x screen, 140, 190), height 1.35 x width, white 18pt panel, 20pt
 * title + dashed divider, arched card path with a gradient outline, band, scroll
 * ornament and star.
 */
const SCREEN = 402;
const CARD_W = Math.min(190, Math.max(140, SCREEN * 0.4));
const CARD_H = CARD_W * 1.35;

function archPath(w: number, h: number): string {
  const sw = 2.4;
  const top = h * 0.185;
  const r = w * 0.14;
  const x1 = w * 0.17;
  const x2 = w * 0.83;
  const f = w * 0.05;
  const m = sw / 2;
  return [
    `M${m} ${top + r}`,
    `Q${m} ${top} ${m + r} ${top}`,
    `L${x1 - f} ${top}`,
    `C${x1 - f * 0.2} ${top} ${x1} ${top - f * 0.2} ${x1 + w * 0.012} ${top - h * 0.06}`,
    `C${x1 + w * 0.05} ${top - h * 0.16} ${w * 0.3} ${m} ${w * 0.5} ${m}`,
    `C${w * 0.7} ${m} ${x2 - w * 0.05} ${top - h * 0.16} ${x2 - w * 0.012} ${top - h * 0.06}`,
    `C${x2} ${top - f * 0.2} ${x2 + f * 0.2} ${top} ${x2 + f} ${top}`,
    `L${w - m - r} ${top}`,
    `Q${w - m} ${top} ${w - m} ${top + r}`,
    `L${w - m} ${h - m - r}`,
    `Q${w - m} ${h - m} ${w - m - r} ${h - m}`,
    `L${m + r} ${h - m}`,
    `Q${m} ${h - m} ${m} ${h - m - r}`,
    "Z",
  ].join(" ");
}

/** Flutter `drawArc` (clockwise sweep from [start] rad) as an SVG arc path. */
function arc(cx: number, cy: number, r: number, start: number, sweep: number): string {
  const x0 = cx + r * Math.cos(start);
  const y0 = cy + r * Math.sin(start);
  const x1 = cx + r * Math.cos(start + sweep);
  const y1 = cy + r * Math.sin(start + sweep);
  return `M${x0} ${y0} A${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
}

function ArchCard({
  name,
  logoUrl,
  imageUrl,
  s,
  uid,
}: {
  name: string;
  logoUrl: string;
  imageUrl: string;
  s: (k: string) => string;
  uid: string;
}) {
  const w = CARD_W;
  const h = CARD_H;
  const bodyTop = h * 0.185;
  const bandTop = h * 0.805;
  const a = w * 0.1;
  const cx = w / 2;
  const cy = h * 0.15;
  const sx = cx;
  const sy = h * 0.075;
  const sr = w * 0.03;
  const path = archPath(w, h);
  return (
    <div style={{ position: "relative", width: w, height: h, flexShrink: 0 }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <clipPath id={`${uid}-clip`}>
            <path d={path} />
          </clipPath>
          <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={s("fill_top_color")} />
            <stop offset="1" stopColor={s("fill_bottom_color")} />
          </linearGradient>
          <linearGradient id={`${uid}-line`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={s("border_top_color")} />
            <stop offset="1" stopColor={s("border_bottom_color")} />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${uid}-clip)`}>
          <rect width={w} height={h} fill={`url(#${uid}-fill)`} />
          <rect y={bandTop} width={w} height={h} fill={s("band_color")} />
          <g fill="none" stroke={s("ornament_color")} strokeWidth={w * 0.035} strokeLinecap="round">
            <path d={arc(cx - a * 1.2, cy + a * 0.4, a, 3.4, 3.6)} />
            <path d={arc(cx + a * 1.2, cy + a * 0.4, a, -0.3, 3.6)} />
          </g>
        </g>
        <path
          d={`M${sx} ${sy - sr * 1.6} Q${sx} ${sy} ${sx + sr * 1.6} ${sy} Q${sx} ${sy} ${sx} ${sy + sr * 1.6} Q${sx} ${sy} ${sx - sr * 1.6} ${sy} Q${sx} ${sy} ${sx} ${sy - sr * 1.6} Z`}
          fill={s("border_top_color")}
          fillOpacity={0.7}
        />
        <path d={path} fill="none" stroke={`url(#${uid}-line)`} strokeWidth={2.4} strokeLinejoin="round" />
      </svg>
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            left: w * 0.12,
            right: w * 0.12,
            top: bodyTop + h * 0.07,
            bottom: h - bandTop + h * 0.03,
            width: w * 0.76,
            height: bandTop - h * 0.03 - (bodyTop + h * 0.07),
            objectFit: "contain",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: w * 0.12,
          right: w * 0.12,
          top: bandTop + 4,
          bottom: h * 0.03,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt="" draggable={false} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        ) : (
          <span style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 20, fontWeight: 800, color: s("text_color"), whiteSpace: "nowrap" }}>
            {name}
          </span>
        )}
      </div>
    </div>
  );
}

function TopBrandsPreview({ section, isSelected, onClick }: PreviewProps) {
  const config = section.config as Record<string, unknown>;
  const s = (k: string) => brandString(config, k);
  const cards = brandCards(config);
  const uid = useId().replace(/:/g, "");
  if (cards.length === 0) return null;

  return (
    <button
      type="button"
      className={cn(styles.sectionSlot, styles.sectionSlotHover, isSelected && styles.sectionSlotSelected)}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div style={{ margin: "6px 8px", background: s("bg_color"), borderRadius: 18, padding: "12px 0 14px", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px" }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 20, fontWeight: 800, color: s("text_color"), whiteSpace: "nowrap" }}>
            {s("title") || "Top Brands"}
          </span>
          <div
            style={{
              flex: 1,
              height: 1.2,
              backgroundImage: `repeating-linear-gradient(90deg, ${s("text_color")}26 0 4px, transparent 4px 8px)`,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 12, padding: "12px 14px 0", height: CARD_H + 4, overflow: "hidden", boxSizing: "content-box" }}>
          {cards.map((c, i) => (
            <ArchCard key={i} name={c.brand_name} logoUrl={c.logo_url} imageUrl={c.image_url} s={s} uid={`${uid}${i}`} />
          ))}
        </div>
      </div>
    </button>
  );
}

export default memo(TopBrandsPreview);
