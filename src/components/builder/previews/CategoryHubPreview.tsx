/* eslint-disable @next/next/no-img-element */

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { PreviewProps } from "./index";
import styles from "../MobilePreviewFrame.module.css";
import { hubString, hubTabs } from "../categoryHub";

/**
 * Mirrors the app's `CategoryHubSection` (category_hub_section.dart) in app points:
 * text tabs with an underline, a row of 112x128 tile cards, then a titled 4-column grid.
 */
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif";

function CategoryHubPreview({ section, isSelected, onClick }: PreviewProps) {
  const config = section.config as Record<string, unknown>;
  const s = (k: string) => hubString(config, k);
  const tabs = hubTabs(config);
  if (tabs.length === 0) return null;
  const hub = tabs[0];
  const text = s("text_color");
  const muted = s("muted_color");
  const indicator = s("indicator_color");
  const tile = s("tile_color");
  const tileBorder = s("tile_border_color");
  const accent = s("accent_color");
  const seeAll = s("see_all_label");
  const gridW = (402 - 16 - 28 - 10 * 3) / 4;

  return (
    <button
      type="button"
      className={cn(styles.sectionSlot, styles.sectionSlotHover, isSelected && styles.sectionSlotSelected)}
      onClick={onClick}
      aria-pressed={isSelected}
      style={{ textAlign: "left" }}
    >
      <div style={{ margin: "6px 8px", background: s("bg_color"), borderRadius: 18, padding: "6px 0 16px", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 22, padding: "0 14px", height: 46, overflow: "hidden" }}>
          {tabs.map((t, i) => (
            <div key={i} style={{ position: "relative", display: "flex", alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: JAKARTA, fontSize: 15, fontWeight: i === 0 ? 800 : 700, color: i === 0 ? indicator : text, whiteSpace: "nowrap" }}>{t.label}</span>
              {i === 0 && <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: indicator, borderRadius: "6px 6px 0 0" }} />}
            </div>
          ))}
        </div>
        <div style={{ height: 1.2, background: `${muted}33` }} />
        <div style={{ height: 14 }} />
        {hub.tiles.length > 0 && (
          <div style={{ display: "flex", gap: 12, padding: "0 14px", height: 128, overflow: "hidden" }}>
            {hub.tiles.map((t, i) => (
              <div key={i} style={{ position: "relative", width: 112, flexShrink: 0, boxSizing: "border-box", borderRadius: 14, border: `1px solid ${tileBorder}`, background: `linear-gradient(180deg, #fff, ${tile})`, overflow: "hidden" }}>
                {t.image_url && <img src={t.image_url} alt="" draggable={false} style={{ position: "absolute", left: 6, right: 6, bottom: 4, width: 98, height: 70, objectFit: "contain", objectPosition: "bottom center" }} />}
                <div style={{ position: "absolute", left: 9, top: 8, right: 30, fontFamily: JAKARTA, fontSize: 12, fontWeight: 800, color: text, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.title}</div>
                <span style={{ position: "absolute", right: 6, top: 6, width: 20, height: 20, borderRadius: 999, background: "#fff", display: "grid", placeItems: "center" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={text}><path d="M19 9l1.250-2.750L23 5l-2.750-1.250L19 1l-1.250 2.750L15 5l2.750 1.250zm-7.500.5L9 4 6.500 9.500 1 12l5.500 2.500L9 20l2.500-5.500L17 12zM19 15l-1.250 2.750L15 19l2.750 1.250L19 23l1.250-2.750L23 19l-2.750-1.250z" /></svg>
                </span>
              </div>
            ))}
          </div>
        )}
        {hub.grid.length > 0 && (
          <>
            <div style={{ height: 22 }} />
            <div style={{ display: "flex", alignItems: "center", padding: "0 14px", gap: 10 }}>
              <span style={{ flex: 1, minWidth: 0, fontFamily: JAKARTA, fontSize: 19, fontWeight: 800, color: text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hub.grid_title}</span>
              {seeAll && (
                <span style={{ display: "flex", alignItems: "center", padding: "8px 14px", background: `${accent}12`, borderRadius: 12, border: `1px solid ${accent}40`, fontFamily: JAKARTA, fontSize: 13, fontWeight: 800, color: accent, whiteSpace: "nowrap" }}>
                  {seeAll}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </span>
              )}
            </div>
            <div style={{ height: 14 }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 10px", padding: "0 14px" }}>
              {hub.grid.map((g, i) => (
                <div key={i} style={{ width: gridW }}>
                  <div style={{ width: gridW, height: gridW, boxSizing: "border-box", padding: 6, background: tile, borderRadius: 14 }}>
                    {g.image_url && <img src={g.image_url} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
                  </div>
                  <div style={{ marginTop: 6, textAlign: "center", fontFamily: JAKARTA, fontSize: 11.5, fontWeight: 600, color: text, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{g.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </button>
  );
}

export default memo(CategoryHubPreview);
