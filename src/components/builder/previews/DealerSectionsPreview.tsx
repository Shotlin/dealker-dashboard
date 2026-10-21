/* eslint-disable @next/next/no-img-element */

import { memo, useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import type { PreviewProps } from "./index";
import styles from "../MobilePreviewFrame.module.css";
import { blockValue, isDealerBlock, type DealerBlockType } from "../dealerBlocks";
import { DealkerProductCardPreview, DealerProductRailPreview, cardMetrics, cardSlots, money } from "./DealkerProductCardPreview";

/**
 * Previews of the dealer-block sections, mirroring the app's
 * `deal_of_day` (dealer_blocks.dart), `brand_spotlight`, `banner_rail` and
 * `oval_spotlight` sections number for number, in app points (the section area is
 * zoomed to the phone's 402pt width).
 */
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif";

type P = Product & Record<string, unknown>;
const eff = (p: P) => (p.sale_price != null && Number(p.sale_price) > 0 && Number(p.sale_price) < Number(p.price) ? Number(p.sale_price) : Number(p.price));
const onSale = (p: P) => eff(p) < Number(p.price);

/** `splitNameAndVariant`: "Apple iPhone 15 (128GB, Blue)" -> name + "128GB | Blue". */
function splitNameAndVariant(full: string): { name: string; variant: string | null } {
  const m = /^(.*?)\s*\(([^()]{1,40})\)\s*$/.exec(full.trim());
  if (!m) return { name: full.trim(), variant: null };
  const parts = m[2].split(/[,/|]/).map((x) => x.trim()).filter(Boolean);
  if (!m[1].trim() || parts.length === 0 || parts.length > 3 || parts.some((x) => x.length > 24)) return { name: full.trim(), variant: null };
  return { name: m[1].trim(), variant: parts.join(" | ") };
}

/** Outlined ADD pill (`AddPill`). */
function AddPill({ accent, label }: { accent: string; label: string }) {
  return (
    <span style={{ height: 38, minWidth: 78, boxSizing: "border-box", padding: "0 14px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: 10, border: `1.5px solid ${accent}`, boxShadow: `1.5px 2.5px 0 ${accent}4D`, fontFamily: JAKARTA, fontSize: 14, fontWeight: 800, color: accent }}>
      {label}
    </span>
  );
}

function Shell({ children, isSelected, onClick }: { children: ReactNode; isSelected: boolean; onClick: () => void }) {
  return (
    <button type="button" className={cn(styles.sectionSlot, styles.sectionSlotHover, isSelected && styles.sectionSlotSelected)} onClick={onClick} aria-pressed={isSelected} style={{ textAlign: "left" }}>
      {children}
    </button>
  );
}

function DealerSectionsPreview({ section, isSelected, onClick, products }: PreviewProps) {
  const uid = useId().replace(/:/g, "");
  if (!isDealerBlock(section.section_type)) return null;
  const type: DealerBlockType = section.section_type;
  const config = section.config as Record<string, unknown>;
  const v = (key: string) => blockValue(config, type, key);
  const list = (products ?? []) as P[];
  if (list.length === 0 && type !== "live_auction" && type !== "recent_recommended") return null;

  // ───────────────────────── deal_of_day ─────────────────────────
  if (type === "deal_of_day") {
    const REF = 1448;
    const w = 402;
    const s = w / REF;
    const bgUrl = v("bg_image_url").trim();
    const headerBg = v("header_bg_color");
    const headerH = 285 * s;
    const side = 45 * s;
    const pad = Math.max(20 * s, 8);
    const cardW = Math.min(280, Math.max(220, 402 * 0.6));
    const slots = cardSlots(list, cardW);
    const cardH = cardMetrics(cardW, slots).height;
    const panelH = cardH + 2 * pad;
    const totalH = headerH + panelH + 26 * s;
    const timerBg = v("timer_bg_color");
    const timerBorder = v("timer_border_color");
    const timerText = v("timer_text_color");
    const end = v("ends_at") ? new Date(v("ends_at")) : new Date(Date.now() + 24 * 3600 * 1000);
    const left = Math.max(0, end.getTime() - Date.now());
    const two = (n: number) => String(Math.floor(n)).padStart(2, "0");
    const clock = `${two(left / 3600000)}:${two((left / 60000) % 60)}:${two((left / 1000) % 60)}`;
    return (
      <Shell isSelected={isSelected} onClick={onClick}>
        <div style={{ position: "relative", width: w, height: totalH, overflow: "hidden", background: `linear-gradient(135deg, ${headerBg}, color-mix(in srgb, ${headerBg} ${bgUrl ? 90 : 65}%, #000))` }}>
          {bgUrl ? (
            <img src={bgUrl} alt="" draggable={false} style={{ position: "absolute", left: 0, top: 0, width: "100%", height: Math.min(w * 1086 / REF, totalH), objectFit: "fill", WebkitMaskImage: "linear-gradient(#000 0, #000 72%, transparent 100%)", maskImage: "linear-gradient(#000 0, #000 72%, transparent 100%)" }} />
          ) : (
            <div style={{ position: "absolute", left: 60 * s, top: 70 * s, width: w * 0.5, color: v("header_text_color") }}>
              <div style={{ fontSize: Math.max(88 * s, 18), fontWeight: 900, lineHeight: 1, whiteSpace: "nowrap" }}>{v("title")}</div>
              {v("subtitle") && <div style={{ fontSize: Math.max(40 * s, 10), opacity: 0.85 }}>{v("subtitle")}</div>}
            </div>
          )}
          <div style={{ position: "absolute", right: 28 * s, top: 128 * s, height: 112 * s, padding: `0 ${10 * s}px`, display: "flex", alignItems: "center", background: `${timerBg}8C`, borderRadius: 99, border: `${Math.max(1.5 * s, 0.6)}px solid ${timerBorder}40` }}>
            <div style={{ height: 98 * s, padding: `0 ${24 * s}px`, display: "flex", alignItems: "center", gap: 16 * s, background: timerBg, borderRadius: 99, border: `${Math.max(3 * s, 1)}px solid ${timerBorder}`, color: timerText }}>
              <svg width={Math.max(54 * s, 14)} height={Math.max(54 * s, 14)} viewBox="0 0 24 24" fill="none" stroke={timerText} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" /></svg>
              <div>
                <div style={{ fontSize: Math.max(25 * s, 7.5), lineHeight: 1, opacity: 0.85 }}>{v("ends_label")}</div>
                <div style={{ fontSize: Math.max(40 * s, 11), fontWeight: 900, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{clock}</div>
              </div>
            </div>
            <span style={{ width: Math.max(2 * s, 0.7), height: 62 * s, margin: `0 ${14 * s}px`, background: `${timerBorder}4D` }} />
            <span style={{ height: 82 * s, padding: `0 ${22 * s}px`, display: "grid", placeItems: "center", background: v("view_all_bg_color"), borderRadius: 99, boxShadow: `0 ${6 * s}px ${14 * s}px rgba(0,0,0,0.18)`, color: v("view_all_text_color"), fontSize: Math.max(36 * s, 10), fontWeight: 800, lineHeight: 1, whiteSpace: "nowrap" }}>
              {v("view_all_label")}
            </span>
          </div>
          <div style={{ position: "absolute", left: side, right: side, top: headerH, height: panelH, background: v("panel_color"), borderRadius: 46 * s, boxShadow: `0 ${10 * s}px ${30 * s}px rgba(0,0,0,0.12)`, overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 12, padding: pad, height: "100%", boxSizing: "border-box" }}>
              {list.slice(0, 6).map((p) => (
                <DealkerProductCardPreview key={p.id} product={p} width={cardW} slots={slots} buttonLabel={v("button_label")} buttonColor={v("grab_button_color")} />
              ))}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ───────────────────────── live_auction ─────────────────────────
  if (type === "live_auction") {
    // Sample auction (the real ones come from the live auctions API); sizes mirror
    // `AuctionCard` in app points (.w/.sp = 402/375, .h = 874/812).
    const W = 402 / 375, H = 874 / 812;
    const text = v("text_color"), live = v("live_color"), button = v("button_color"), winning = v("winning_color");
    const f = (n: number) => n * W;
    const barW = 78;
    return (
      <Shell isSelected={isSelected} onClick={onClick}>
        <div style={{ margin: `${6 * H}px ${12 * W}px`, boxSizing: "border-box", padding: f(8), background: v("bg_color"), borderRadius: f(18), color: text, fontFamily: "system-ui, sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", gap: f(8), padding: `${7 * H}px ${f(10)}px`, background: `linear-gradient(90deg, ${v("header_bg_color")}, #fff)`, borderRadius: f(12) }}>
            <svg width={f(26)} height={f(26)} viewBox="0 0 256 256" fill={button}><path d="M248 192a8 8 0 0 1-8 8H128a8 8 0 0 1 0-16h112a8 8 0 0 1 8 8zM220.700 100.700l-40 40a16 16 0 0 1-22.600 0l-6.100-6.100-29.800 29.800 6.100 6.100a16 16 0 0 1 0 22.600l-40 40a16 16 0 0 1-22.600 0l-34.800-34.800a16 16 0 0 1 0-22.600l40-40a16 16 0 0 1 22.600 0l6.100 6.100 29.800-29.800-6.100-6.100a16 16 0 0 1 0-22.600l40-40a16 16 0 0 1 22.600 0l34.800 34.800a16 16 0 0 1 0 22.600z" /></svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: f(6) }}>
                <span style={{ fontSize: f(15), fontWeight: 900, lineHeight: 1.1 }}>{v("title")}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: f(2), background: live, color: "#fff", borderRadius: 99, padding: `${1.5 * H}px ${f(6)}px`, fontSize: f(8), fontWeight: 800 }}>
                  <svg width={f(7)} height={f(7)} viewBox="0 0 24 24" fill="#fff"><path d="M6 4l14 8-14 8z" /></svg>LIVE
                </span>
              </div>
              <div style={{ fontSize: f(9), opacity: 0.7 }}>{v("subtitle")}</div>
            </div>
            <span style={{ fontSize: f(10), fontWeight: 800, color: button, whiteSpace: "nowrap" }}>{v("view_all_label")}</span>
          </div>
          <div style={{ height: 8 * H }} />
          <div style={{ display: "flex", gap: f(6), alignItems: "flex-start" }}>
            <div style={{ width: f(78), height: f(82), borderRadius: f(12), background: v("header_bg_color"), display: "grid", placeItems: "center", fontSize: f(30), flexShrink: 0 }}>📱</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "inline-block", background: live, color: "#fff", borderRadius: f(4), padding: `${1 * H}px ${f(5)}px`, fontSize: f(7.5), fontWeight: 800 }}>◆ LIVE</span>
              <div style={{ marginTop: 3 * H, fontSize: f(10.5), fontWeight: 800, lineHeight: 1.15 }}>Sample auction product</div>
              <div style={{ marginTop: 4 * H, fontSize: f(9), opacity: 0.7 }}>Highest Bid</div>
              <div style={{ fontSize: f(16), fontWeight: 900, lineHeight: 1.1 }}>{money(68400)}</div>
              <span style={{ display: "inline-block", marginTop: 4 * H, background: winning, color: "#fff", borderRadius: 99, padding: `${1.5 * H}px ${f(6)}px`, fontSize: f(8.5), fontWeight: 700 }}>You are Winning</span>
            </div>
            <div style={{ width: f(104), flexShrink: 0, textAlign: "right" }}>
              <div style={{ color: live, fontSize: f(10), fontWeight: 800 }}>⏱ 12m 36s left</div>
              <div style={{ marginTop: 8 * H, fontSize: f(8.5), opacity: 0.7 }}>Bid Increment</div>
              <div style={{ fontSize: f(12), fontWeight: 900 }}>{money(500)}</div>
              <div style={{ marginTop: 8 * H, padding: `${9 * H}px 0`, textAlign: "center", color: "#fff", fontSize: f(11), fontWeight: 800, borderRadius: f(11), background: `linear-gradient(90deg, ${button}, #3B82F6)` }}>{v("button_label")}</div>
            </div>
          </div>
          <div style={{ height: 8 * H }} />
          <div style={{ display: "flex", alignItems: "center", gap: f(6), fontSize: f(9) }}>
            <span style={{ fontWeight: 700 }}>👥 42 bids</span>
            <div style={{ flex: 1, height: 4 * H, borderRadius: 99, background: "rgba(0,0,0,0.07)" }}>
              <div style={{ width: `${barW}%`, height: "100%", borderRadius: 99, background: button }} />
            </div>
            <span style={{ fontSize: f(8.5), fontWeight: 700, opacity: 0.65 }}>Reserve not met</span>
          </div>
        </div>
      </Shell>
    );
  }

  // ───────────────────────── banner_rail ─────────────────────────
  if (type === "banner_rail") {
    const panel = v("panel_color");
    const image = v("header_image_url").trim();
    const title = v("title").trim();
    return (
      <Shell isSelected={isSelected} onClick={onClick}>
        <div style={{ margin: "6px 8px", background: panel, borderRadius: 22, paddingBottom: 14, overflow: "hidden" }}>
          {image ? (
            <div style={{ position: "relative", aspectRatio: "1148 / 360" }}>
              <img src={image} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 36, background: `linear-gradient(to bottom, ${panel}00, ${panel})` }} />
            </div>
          ) : title ? (
            <div style={{ padding: "16px 16px 0", fontFamily: JAKARTA, fontSize: 22, fontWeight: 800, color: v("title_color") }}>{title}</div>
          ) : null}
          <div style={{ height: image ? 2 : 12 }} />
          <DealerProductRailPreview products={list.slice(0, 6)} seeAllLabel={v("see_all_label")} />
        </div>
      </Shell>
    );
  }

  // ───────────────────────── brand_spotlight ─────────────────────────
  if (type === "brand_spotlight") {
    const text = v("text_color");
    const muted = v("muted_color");
    const featured = list[0];
    const more = list.slice(1, 7);
    const logo = v("brand_logo_url");
    const brand = v("brand_name") || String(featured.brand ?? "").trim();
    const split = splitNameAndVariant(featured.name);
    const unit = String(featured.unit ?? "").trim();
    const unitLine = [unit ? `1 ${unit}` : null, (featured.option_label as string | undefined)?.trim() || split.variant ? `(${(featured.option_label as string | undefined)?.trim() || split.variant})` : null].filter(Boolean).join(" ");
    const thumb = (featured.thumbnail_url as string | null) || ((featured.images as string[] | undefined) ?? [])[0] || null;
    const accent = v("accent_color");
    return (
      <Shell isSelected={isSelected} onClick={onClick}>
        <div style={{ margin: "6px 8px", background: v("bg_color"), borderRadius: 18, padding: "14px 0", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 14px" }}>
            <div style={{ width: 56, height: 56, boxSizing: "border-box", padding: 6, background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", display: "grid", placeItems: "center", flexShrink: 0 }}>
              {logo ? <img src={logo} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontFamily: JAKARTA, fontSize: 22, fontWeight: 800, color: text }}>{brand ? brand[0].toUpperCase() : ""}</span>}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: JAKARTA, fontSize: 20, fontWeight: 800, color: text, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{brand}</div>
              <div style={{ marginTop: 3, fontFamily: JAKARTA, fontSize: 13, fontWeight: 500, color: muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v("tagline")}</div>
            </div>
          </div>
          <div style={{ height: 12 }} />
          <div style={{ margin: "0 12px", padding: "10px 10px 14px", background: v("panel_color"), borderRadius: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, borderRadius: 18, border: "1.5px solid rgba(255,255,255,0.9)", background: `linear-gradient(90deg, ${v("featured_start_color")}, ${v("featured_end_color")})` }}>
              <div style={{ width: 104, height: 112, boxSizing: "border-box", padding: 8, background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", flexShrink: 0 }}>
                {thumb && <img src={thumb} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: text, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{split.name}</div>
                {unitLine && <div style={{ marginTop: 3, fontFamily: JAKARTA, fontSize: 11.5, color: muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{unitLine}</div>}
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                  <span style={{ padding: "4px 8px", background: v("price_badge_color"), borderRadius: 8, border: "1.2px solid rgba(0,0,0,0.87)", boxShadow: "1.5px 2px 0 rgba(0,0,0,0.87)", fontFamily: JAKARTA, fontSize: 16, fontWeight: 800, color: v("price_badge_text_color") }}>{money(eff(featured))}</span>
                  {onSale(featured) && <span style={{ fontFamily: JAKARTA, fontSize: 13, fontWeight: 600, color: muted, textDecoration: "line-through" }}>{money(Number(featured.price))}</span>}
                </div>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {onSale(featured) ? <span style={{ fontFamily: JAKARTA, fontSize: 12, fontWeight: 800, color: v("off_text_color") }}>{money(Number(featured.price) - eff(featured))} OFF</span> : <span />}
                  <AddPill accent={accent} label={v("add_label")} />
                </div>
              </div>
            </div>
            {more.length > 0 && (
              <>
                <div style={{ height: 14 }} />
                <div style={{ height: 1.2, backgroundImage: `repeating-linear-gradient(90deg, ${muted}59 0 4px, transparent 4px 8px)` }} />
                <div style={{ height: 14 }} />
                <div style={{ padding: "0 6px", fontFamily: JAKARTA, fontSize: 15.5, fontWeight: 800, color: text }}>{v("more_title")}</div>
                <div style={{ height: 12 }} />
                <div style={{ overflow: "hidden" }}>
                  <DealerProductRailPreview products={more} padding={0} />
                </div>
              </>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  // ───────────────────────── oval_spotlight ─────────────────────────
  if (type === "oval_spotlight") {
    const HEADER_H = 150, CARD_H = 176, ARC = 16;
    const total = HEADER_H + CARD_H + 44;
    const cardW = Math.min(200, Math.max(160, 402 * 0.44));
    const bw = 402 - 16;
    const x0 = -bw * 0.15, x1 = bw * 1.15;
    const ovalH = total - 28;
    const titleC = v("title_color");
    const serif = v("title_font") === "serif";
    const priceC = v("price_color");
    const accent = v("accent_color");
    const left = v("art_left_url"), right = v("art_right_url");
    const path = `M${x0} ${ARC * 2.6} Q${bw / 2} ${-ARC * 1.9} ${x1} ${ARC * 2.6} L${x1} ${ovalH - ARC * 2.6} Q${bw / 2} ${ovalH + ARC * 1.9} ${x0} ${ovalH - ARC * 2.6} Z`;
    return (
      <Shell isSelected={isSelected} onClick={onClick}>
        <div style={{ position: "relative", margin: "6px 8px", background: v("bg_color"), height: total }}>
          <svg width={bw} height={ovalH} style={{ position: "absolute", left: 0, top: 28, overflow: "visible" }}>
            <defs>
              <linearGradient id={`${uid}-ov`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={v("oval_start_color")} />
                <stop offset="1" stopColor={v("oval_end_color")} />
              </linearGradient>
            </defs>
            <path d={path} fill={`url(#${uid}-ov)`} stroke={v("oval_border_color")} strokeWidth="1.4" />
          </svg>
          {left && <img src={left} alt="" draggable={false} style={{ position: "absolute", left: -4, top: 0, width: 84, height: 80, objectFit: "contain", objectPosition: "left top" }} />}
          {right && <img src={right} alt="" draggable={false} style={{ position: "absolute", right: -4, top: 0, width: 84, height: 80, objectFit: "contain", objectPosition: "right top" }} />}
          <div style={{ position: "absolute", left: 76, right: 76, top: 58, textAlign: "center" }}>
            <div style={{ fontFamily: serif ? "Georgia, serif" : JAKARTA, fontSize: 25, fontWeight: 700, color: titleC, whiteSpace: "nowrap" }}>{v("title")}</div>
            {v("subtitle") && <div style={{ marginTop: 6, fontFamily: JAKARTA, fontSize: 13, fontWeight: 500, color: v("subtitle_color") }}>{v("subtitle")}</div>}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: HEADER_H, height: CARD_H + 4, display: "flex", gap: 12, padding: "0 14px", overflow: "hidden" }}>
            {list.slice(0, 6).map((p) => {
              const sp = splitNameAndVariant(p.name);
              const opt = (p.option_label as string | undefined)?.trim() || sp.variant;
              const unit = String(p.unit ?? "").trim();
              const unitLine = [unit ? `1 ${unit}` : null, opt ? `(${opt})` : null].filter(Boolean).join(" ");
              const img = (p.thumbnail_url as string | null) || ((p.images as string[] | undefined) ?? [])[0] || null;
              return (
                <div key={p.id} style={{ width: cardW, height: CARD_H, flexShrink: 0, boxSizing: "border-box", padding: "12px 10px 10px 12px", borderRadius: 16, border: `1px solid ${v("card_border_color")}`, background: `linear-gradient(180deg, ${v("card_start_color")}, ${v("card_end_color")})`, display: "flex", flexDirection: "column" }}>
                  <div style={{ flex: 1, display: "flex", gap: 6, minHeight: 0 }}>
                    <div style={{ flex: 11, fontFamily: JAKARTA, fontSize: 13, fontWeight: 700, color: v("name_color"), lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{sp.name}</div>
                    <div style={{ flex: 9, minHeight: 0 }}>
                      {img && <img src={img} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "top center", mixBlendMode: "multiply" }} />}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {unitLine && <div style={{ fontFamily: JAKARTA, fontSize: 10.5, fontWeight: 500, color: `${priceC}CC`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{unitLine}</div>}
                      <div style={{ marginTop: 3, display: "flex", alignItems: "baseline", gap: 5, whiteSpace: "nowrap" }}>
                        <span style={{ fontFamily: JAKARTA, fontSize: 15, fontWeight: 800, color: priceC }}>{money(eff(p))}</span>
                        {onSale(p) && <span style={{ fontFamily: JAKARTA, fontSize: 10.5, color: `${priceC}73`, textDecoration: "line-through" }}>{money(Number(p.price))}</span>}
                      </div>
                    </div>
                    <AddPill accent={accent} label={v("add_label")} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Shell>
    );
  }

  return null;
}

export default memo(DealerSectionsPreview);
