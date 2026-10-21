/* eslint-disable @next/next/no-img-element */

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { PreviewProps } from "./index";
import styles from "../MobilePreviewFrame.module.css";
import { stealString, stealTabs, type TabbedVariant } from "../stealDeals";
import { DealerProductRailPreview } from "./DealkerProductCardPreview";

/**
 * Previews of the three tabbed sections that share the app's tab parts
 * (`tabbed_section_parts.dart`): Steal Deals, Collection Showcase and Shop by price.
 * Sizes are app points (the section area is zoomed to the phone's 402pt width).
 */
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif";

const effPrice = (p: { price: number; sale_price: number | null }) =>
  p.sale_price != null && Number(p.sale_price) > 0 ? Number(p.sale_price) : Number(p.price);

function textWidth(text: string, font: string): number {
  if (typeof document === "undefined") return text.length * 7.7;
  const ctx = (textWidth as unknown as { c?: CanvasRenderingContext2D }).c ?? document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * 7.7;
  (textWidth as unknown as { c?: CanvasRenderingContext2D }).c = ctx;
  ctx.font = font;
  return ctx.measureText(text).width;
}

/** `TabbedSectionHeader`: title (artwork or text) + subtitle with a hairline. */
function Header({ title, titleImage, subtitle, titleColor, subtitleColor, titleSize = 16.5 }: { title: string; titleImage: string; subtitle: string; titleColor: string; subtitleColor: string; titleSize?: number }) {
  return (
    <div>
      <div style={{ padding: "0 14px" }}>
        {titleImage ? (
          <img src={titleImage} alt="" draggable={false} style={{ height: 44, maxWidth: "100%", objectFit: "contain", objectPosition: "left center", display: "block" }} />
        ) : (
          <div style={{ fontFamily: JAKARTA, fontSize: titleSize, fontWeight: 800, color: titleColor, lineHeight: 1.1 }}>{title}</div>
        )}
      </div>
      {subtitle && (
        <div style={{ padding: "8px 14px 0", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: JAKARTA, fontSize: 12.5, fontWeight: 500, color: subtitleColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</span>
          <span style={{ flex: 1, height: 1.2, background: `${subtitleColor}38` }} />
        </div>
      )}
    </div>
  );
}

/** `TabStripPainter`: accent baseline with the selected tab lifted out of it. */
function TabStripSvg({ width, height, left, tabW, accent, soft, uid }: { width: number; height: number; left: number; tabW: number; accent: string; soft: string; uid: string }) {
  const r = 16, f = 14, sw = 1.6;
  const h = height - sw / 2, top = sw / 2, l = left, rr = left + tabW;
  const outline = `M0 ${h} L${l - f} ${h} A${f} ${f} 0 0 0 ${l} ${h - f} L${l} ${top + r} A${r} ${r} 0 0 1 ${l + r} ${top} L${rr - r} ${top} A${r} ${r} 0 0 1 ${rr} ${top + r} L${rr} ${h - f} A${f} ${f} 0 0 0 ${rr + f} ${h} L${width} ${h}`;
  const fill = `M${l - f} ${h} A${f} ${f} 0 0 0 ${l} ${h - f} L${l} ${top + r} A${r} ${r} 0 0 1 ${l + r} ${top} L${rr - r} ${top} A${r} ${r} 0 0 1 ${rr} ${top + r} L${rr} ${h - f} A${f} ${f} 0 0 0 ${rr + f} ${h} Z`;
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={soft} />
          <stop offset="1" stopColor={soft} stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${uid}-g)`} />
      <path d={outline} fill="none" stroke={accent} strokeWidth={sw} strokeLinejoin="round" />
    </svg>
  );
}

function EmptyText({ text, color }: { text: string; color: string }) {
  return <div style={{ padding: "28px 14px", textAlign: "center", fontFamily: JAKARTA, fontSize: 13, fontWeight: 600, color }}>{text}</div>;
}

function Panel({ children, bg, isSelected, onClick }: { children: React.ReactNode; bg: string; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={cn(styles.sectionSlot, styles.sectionSlotHover, isSelected && styles.sectionSlotSelected)}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div style={{ margin: "6px 8px", background: bg, borderRadius: 18, padding: "14px 0", textAlign: "left", overflow: "hidden" }}>{children}</div>
    </button>
  );
}

function TabbedSectionsPreview({ section, isSelected, onClick, products, categories }: PreviewProps) {
  const config = section.config as Record<string, unknown>;
  const variant = section.section_type as TabbedVariant;
  const s = (k: string) => stealString(config, k, variant);
  const tabs = stealTabs(config);
  const list = products ?? [];
  const uid = `tb${section.id.replace(/[^a-z0-9]/gi, "")}`;
  const text = s("text_color");
  const muted = s("muted_color");
  const accent = s("accent_color");
  const soft = s("accent_soft_color");

  if (variant === "price_shop") {
    const indicator = s("indicator_color");
    const badge = s("badge_text");
    const first = tabs[0];
    const rail = (first?.max_price != null ? list.filter((p) => effPrice(p) <= (first.max_price as number)) : list).slice(0, 6);
    const pillOn = s("pill_selected_color");
    return (
      <Panel bg={s("bg_color")} isSelected={isSelected} onClick={onClick}>
        <div style={{ display: "flex", alignItems: "center", padding: "0 14px", gap: 10 }}>
          <span style={{ fontFamily: JAKARTA, fontSize: 21, fontWeight: 800, color: text, whiteSpace: "nowrap" }}>{s("title") || "Shop by price"}</span>
          {badge && (
            <span style={{ padding: "5px 10px", borderRadius: 8, background: s("badge_bg_color"), fontFamily: JAKARTA, fontSize: 12.5, fontWeight: 800, fontStyle: "italic", color: s("badge_text_color"), whiteSpace: "nowrap" }}>{badge}</span>
          )}
          <span style={{ flex: 1, height: 1.2, background: `${text}1F` }} />
        </div>
        <div style={{ height: 14 }} />
        <div style={{ display: "flex", gap: 10, padding: "0 14px", height: 76, overflow: "hidden" }}>
          {tabs.map((t, i) => (
            <div key={i} style={{ width: 78, flexShrink: 0, borderRadius: 16, background: i === 0 ? pillOn : s("pill_color"), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              {t.label && <span style={{ fontFamily: JAKARTA, fontSize: 13, fontStyle: "italic", fontWeight: 500, color: i === 0 ? accent : text }}>{t.label}</span>}
              {t.sub_label && <span style={{ fontFamily: JAKARTA, fontSize: 22, fontStyle: "italic", fontWeight: 800, color: i === 0 ? accent : text, padding: "0 6px", whiteSpace: "nowrap" }}>{t.sub_label}</span>}
            </div>
          ))}
        </div>
        <div style={{ height: 8 }} />
        <div style={{ position: "relative", height: 3 }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1.2, background: `${text}1A` }} />
          <div style={{ position: "absolute", left: 14 - 4, bottom: 0, width: 86, height: 3, background: indicator }} />
        </div>
        <div style={{ height: 14 }} />
        {rail.length === 0 ? <EmptyText text={s("empty_text") || "No products in this range yet"} color={`${text}99`} /> : <DealerProductRailPreview products={rail} seeAllLabel={s("see_all_label")} />}
      </Panel>
    );
  }

  if (variant === "collection_showcase") {
    const lead = 14, padX = 18, gap = 4, H = 44;
    const widths = tabs.map((t) => textWidth(t.label, `700 14px ${JAKARTA}`) + padX * 2);
    const lefts: number[] = [];
    let x = lead;
    widths.forEach((w) => { lefts.push(x); x += w + gap; });
    const contentW = Math.max(402 - 16, x - gap + lead);
    const first = tabs[0];
    const fc = first?.category_ids?.[0];
    const inCat = list.filter((p) => !fc || p.category_id === fc);
    const rail = (inCat.length ? inCat : list).slice(0, 6);
    return (
      <Panel bg={s("bg_color")} isSelected={isSelected} onClick={onClick}>
        <Header title={s("title") || "Collection"} titleImage={s("title_image_url")} subtitle={s("subtitle")} titleColor={accent} subtitleColor={text} titleSize={22} />
        <div style={{ height: 14 }} />
        <div style={{ position: "relative", width: contentW, height: H, overflow: "hidden" }}>
          {tabs.length > 0 && <TabStripSvg width={contentW} height={H} left={lefts[0]} tabW={widths[0]} accent={accent} soft={soft} uid={uid} />}
          {tabs.map((t, i) => (
            <div key={i} style={{ position: "absolute", left: lefts[i], top: 0, width: widths[i], height: H, display: "grid", placeItems: "center", paddingBottom: 3, boxSizing: "border-box" }}>
              <span style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: i === 0 ? accent : text, whiteSpace: "nowrap" }}>{t.label}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 14 }} />
        {rail.length === 0 ? <EmptyText text={s("empty_text") || "Nothing here yet"} color={muted} /> : <DealerProductRailPreview products={rail} seeAllLabel={s("see_all_label")} />}
      </Panel>
    );
  }

  // steal_deals
  const tabW = 92, tabH = 60, lead = 14;
  const contentW = Math.max(402 - 16, lead * 2 + tabs.length * tabW);
  const first = tabs[0];
  const chips = first?.chips ?? [];
  const chipImg = (c: { category_id?: string; image_url?: string }) => c.image_url || categories?.find((k) => k.id === c.category_id)?.image_url || "";
  const rail = list.slice(0, 6);
  return (
    <Panel bg={s("bg_color")} isSelected={isSelected} onClick={onClick}>
      <Header title={s("title") || "Steal Deals"} titleImage={s("title_image_url")} subtitle={s("subtitle")} titleColor={text} subtitleColor={muted} />
      <div style={{ height: 14 }} />
      <div style={{ position: "relative", width: contentW, height: tabH, overflow: "hidden" }}>
        {tabs.length > 0 && <TabStripSvg width={contentW} height={tabH} left={lead} tabW={tabW} accent={accent} soft={soft} uid={uid} />}
        {tabs.map((t, i) => {
          const active = i === 0;
          const iconTab = !!t.icon_url || !t.sub_label;
          return (
            <div key={i} style={{ position: "absolute", left: lead + i * tabW, top: 0, width: tabW, height: tabH, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 4, boxSizing: "border-box" }}>
              {iconTab ? (
                <>
                  <div style={{ width: 30, height: 30, display: "grid", placeItems: "center" }}>
                    {t.icon_url ? (
                      <img src={t.icon_url} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : (
                      <svg width="26" height="26" viewBox="0 0 256 256" fill={active ? accent : muted}><path d="M173.800 51.500c-8-14.500-18.300-28-29.700-39.700a8 8 0 0 0-13.200 3.200C124 36.200 112 54 96.700 66.900 79.600 81.300 56 104 56 144a72 72 0 0 0 144 0c0-34.700-9.300-65.400-26.200-92.500zM128 200a28 28 0 0 1-28-28c0-18 12-28 28-44 16 16 28 26 28 44a28 28 0 0 1-28 28z" /></svg>
                    )}
                  </div>
                  <span style={{ marginTop: 2, fontFamily: JAKARTA, fontSize: 11.5, fontWeight: 700, color: active ? accent : text, whiteSpace: "nowrap" }}>{t.label}</span>
                </>
              ) : (
                <>
                  <span style={{ padding: "0 10px", fontFamily: JAKARTA, fontSize: 18, fontWeight: 800, color: active ? accent : text, lineHeight: 1.05, whiteSpace: "nowrap" }}>{t.label}</span>
                  <span style={{ marginTop: 2, fontFamily: JAKARTA, fontSize: 11, fontWeight: 600, color: active ? accent : muted, whiteSpace: "nowrap" }}>{t.sub_label}</span>
                </>
              )}
            </div>
          );
        })}
        {tabs.map((_, i) => i > 0 && i < tabs.length && i !== 1 && i !== 0 ? (
          <span key={`d${i}`} style={{ position: "absolute", left: lead + i * tabW - 0.5, top: 14, height: tabH - 28, width: 1, background: `${muted}40` }} />
        ) : null)}
      </div>
      <div style={{ height: 12 }} />
      <div style={{ display: "flex", gap: 7, padding: "0 14px", height: 40, overflow: "hidden" }}>
        <div style={{ height: 40, boxSizing: "border-box", padding: "0 10px", display: "flex", alignItems: "center", gap: 6, borderRadius: 13, background: soft, border: `1.4px solid ${accent}`, flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 256 256" fill={accent}><path d="M104 40H56a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16zm0 64H56V56h48zm96-64h-48a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16zm0 64h-48V56h48zm-96 32H56a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16v-48a16 16 0 0 0-16-16zm0 64H56v-48h48zm96-64h-48a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16v-48a16 16 0 0 0-16-16zm0 64h-48v-48h48z" /></svg>
          <span style={{ fontFamily: JAKARTA, fontSize: 13, fontWeight: 800, color: accent }}>{s("all_label") || "ALL"}</span>
        </div>
        {chips.map((c, i) => (
          <div key={i} style={{ height: 40, boxSizing: "border-box", padding: "0 7px", display: "flex", alignItems: "center", gap: 8, borderRadius: 13, background: "#fff", border: "1px solid #E2E2E2", flexShrink: 0 }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, overflow: "hidden", background: soft, flexShrink: 0 }}>
              {chipImg(c) && <img src={chipImg(c)} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            </span>
            <span style={{ maxWidth: 104, fontFamily: JAKARTA, fontSize: 11, fontWeight: 700, color: text, lineHeight: 1.15, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.label}</span>
          </div>
        ))}
      </div>
      <div style={{ height: 14 }} />
      {rail.length === 0 ? <EmptyText text={s("empty_text") || "No deals here yet"} color={muted} /> : <DealerProductRailPreview products={rail} seeAllLabel={s("see_all_label")} />}
    </Panel>
  );
}

export default memo(TabbedSectionsPreview);
