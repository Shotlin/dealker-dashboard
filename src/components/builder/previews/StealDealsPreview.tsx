/* eslint-disable @next/next/no-img-element */

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { PreviewProps } from "./index";
import styles from "../MobilePreviewFrame.module.css";
import { stealString, stealTabs, type TabbedVariant } from "../stealDeals";
import { DealerProductRailPreview } from "./DealkerProductCardPreview";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** Mirrors the app's StealDealsSection: title, price tabs, chips, product rail. */
function StealDealsPreview({
  section,
  isSelected,
  onClick,
  products,
  categories,
}: PreviewProps) {
  const config = section.config as Record<string, unknown>;
  const variant = section.section_type as TabbedVariant;
  const collection = variant === "collection_showcase";
  const s = (k: string) => stealString(config, k, variant);
  const tabs = stealTabs(config);
  const accent = s("accent_color");
  const soft = s("accent_soft_color");
  const text = s("text_color");
  const muted = s("muted_color");
  const first = tabs[0];
  const items = (products ?? []).slice(0, 3);

  if (variant === "category_deals") {
    const catTabs = stealTabs(config);
    const accent = s("accent_color");
    const text = s("text_color");
    // The server fills each tile with its category's picture and the tab's products; the builder
    // does the same from the category list and the loaded products.
    const tileImage = (t: (typeof catTabs)[number]) =>
      t.image_url || categories?.find((c) => c.id === t.category_ids?.[0])?.image_url || "";
    const firstCat = catTabs[0]?.category_ids?.[0];
    const inFirst = (products ?? []).filter((p) => !firstCat || p.category_id === firstCat);
    const railProducts = (inFirst.length ? inFirst : products ?? []).slice(0, 6);
    const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif";
    return (
      <button
        type="button"
        className={cn(styles.sectionSlot, styles.sectionSlotHover, isSelected && styles.sectionSlotSelected)}
        onClick={onClick}
        aria-pressed={isSelected}
      >
        {/* Mirrors CategoryDealsSection (category_deals_section.dart), in app points. */}
        <div style={{ margin: "6px 8px", background: s("bg_color"), borderRadius: 18, padding: "14px 0", color: text, textAlign: "left", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "0 14px", gap: 10 }}>
            <span style={{ flex: 1, fontFamily: JAKARTA, fontSize: 18, fontWeight: 800, lineHeight: 1.15, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {s("title")}
            </span>
            {s("see_all_label") && (
              <span style={{ display: "flex", alignItems: "center", padding: "9px 14px", background: s("see_all_bg_color"), borderRadius: 12, border: `1px solid ${accent}38`, fontFamily: JAKARTA, fontSize: 13, fontWeight: 800, color: accent, whiteSpace: "nowrap" }}>
                {s("see_all_label")}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </span>
            )}
          </div>
          <div style={{ height: 14 }} />
          <div style={{ display: "flex", gap: 14, padding: "0 14px", height: 128, overflow: "hidden" }}>
            {catTabs.map((t, i) => (
              <div key={i} style={{ width: 76, flexShrink: 0 }}>
                <div style={{ width: 76, height: 76, boxSizing: "border-box", padding: 8, borderRadius: 18, background: i === 0 ? s("tile_selected_color") : s("tile_color") }}>
                  {tileImage(t) && <img src={tileImage(t)} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
                </div>
                <div style={{ height: 34, marginTop: 7, display: "flex", justifyContent: "center" }}>
                  <div style={{ width: 90, textAlign: "center", fontFamily: JAKARTA, fontSize: 12, lineHeight: 1.2, fontWeight: i === 0 ? 800 : 500, color: i === 0 ? accent : s("muted_color"), display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {t.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ position: "relative", height: 3 }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1.2, background: `${text}1A` }} />
            <div style={{ position: "absolute", left: 14 - 4, bottom: 0, width: 84, height: 3, background: s("indicator_color") }} />
          </div>
          <div style={{ height: 14 }} />
          {railProducts.length === 0 ? (
            <div style={{ padding: "28px 14px", textAlign: "center", fontFamily: JAKARTA, fontSize: 13, fontWeight: 600, color: s("muted_color") }}>
              {s("empty_text") || "No deals here yet"}
            </div>
          ) : (
            <DealerProductRailPreview products={railProducts} />
          )}
        </div>
      </button>
    );
  }

  if (variant === "price_sale") {
    const saleTabs = stealTabs(config);
    const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif";
    const first = saleTabs[0];
    const inRange = (products ?? []).filter((p) => {
      const eff = p.sale_price != null && Number(p.sale_price) > 0 ? Number(p.sale_price) : Number(p.price);
      return first?.max_price == null || eff <= first.max_price;
    });
    const railProducts = (inRange.length ? inRange : products ?? []).slice(0, 6);
    const titleC = s("title_color");
    const priceText = first?.price_text || first?.sub_label || "";
    const art = (url: string, left: boolean) =>
      url ? (
        <img src={url} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: left ? "left center" : "right center" }} />
      ) : null;
    return (
      <button
        type="button"
        className={cn(styles.sectionSlot, styles.sectionSlotHover, isSelected && styles.sectionSlotSelected)}
        onClick={onClick}
        aria-pressed={isSelected}
      >
        {/* Mirrors PriceSaleSection (price_sale_section.dart), in app points. */}
        <div style={{ margin: "6px 8px", background: s("bg_color"), borderRadius: 18, padding: "10px 0 14px", textAlign: "left", overflow: "hidden" }}>
          <div style={{ height: 92, display: "flex", alignItems: "stretch" }}>
            <div style={{ width: 78, flexShrink: 0 }}>{art(first?.header_left_url ?? "", true)}</div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
              <div style={{ fontFamily: JAKARTA, fontSize: 19, fontWeight: 800, color: titleC, whiteSpace: "nowrap" }}>{s("title")}</div>
              <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 5, whiteSpace: "nowrap" }}>
                <span style={{ fontFamily: JAKARTA, fontSize: 12.5, fontWeight: 500, color: s("subtitle_color") }}>{s("subtitle")}</span>
                <span style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 800, color: s("price_color") }}>{priceText}</span>
              </div>
            </div>
            <div style={{ width: 78, flexShrink: 0 }}>{art(first?.header_right_url ?? "", false)}</div>
          </div>
          <div style={{ height: 10 }} />
          <div style={{ display: "flex", gap: 10, padding: "0 14px", height: 84, overflow: "hidden" }}>
            {saleTabs.map((t, i) => {
              const on = i === 0;
              return (
                <div key={i} style={{ width: 84, flexShrink: 0, boxSizing: "border-box", padding: 4, borderRadius: 20, background: on ? `${s("pill_halo_color")}BF` : "transparent" }}>
                  <div style={{
                    height: "100%", boxSizing: "border-box", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    background: on ? s("pill_selected_color") : s("pill_color"),
                    border: `${on ? 2 : 1}px solid ${on ? s("pill_selected_border_color") : s("pill_border_color")}`,
                    boxShadow: `0 3px ${on ? 10 : 5}px ${s("pill_text_color")}${on ? "38" : "1A"}`,
                  }}>
                    {t.label && <span style={{ fontFamily: JAKARTA, fontSize: 13, fontWeight: 800, color: s("pill_text_color"), whiteSpace: "nowrap" }}>{t.label}</span>}
                    {t.sub_label && <span style={{ fontFamily: JAKARTA, fontSize: 20, fontWeight: 800, color: s("pill_text_color"), whiteSpace: "nowrap" }}>{t.sub_label}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ height: 8 }} />
          <div style={{ position: "relative", height: 3 }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1.2, background: `${titleC}26` }} />
            <div style={{ position: "absolute", left: 14 - 4, bottom: 0, width: 92, height: 3, background: s("indicator_color") }} />
          </div>
          <div style={{ height: 14 }} />
          {railProducts.length === 0 ? (
            <div style={{ padding: "28px 14px", textAlign: "center", fontFamily: JAKARTA, fontSize: 13, fontWeight: 600, color: `${s("subtitle_color")}B3` }}>
              {s("empty_text") || "No products in this range yet"}
            </div>
          ) : (
            <DealerProductRailPreview products={railProducts} seeAllLabel={s("see_all_label")} />
          )}
        </div>
      </button>
    );
  }

  if (variant === "price_shop") {
    const priceTabs = stealTabs(config);
    return (
      <button
        type="button"
        className={cn(
          styles.sectionSlot,
          styles.sectionSlotHover,
          isSelected && styles.sectionSlotSelected,
        )}
        onClick={onClick}
        aria-pressed={isSelected}
      >
        <div style={{ padding: "6px 8px" }}>
          <div
            style={{
              background: s("bg_color"),
              borderRadius: 14,
              padding: "10px 10px 8px",
              color: s("text_color"),
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color:
                    false ? s("title_color") : undefined,
                }}
              >
                {s("title")}
              </span>
              {false && (
                <span style={{ fontSize: 9, color: s("subtitle_color") }}>
                  {s("subtitle")}{" "}
                  <b style={{ color: s("price_color") }}>
                    {priceTabs[0]?.price_text || priceTabs[0]?.sub_label}
                  </b>
                </span>
              )}
              {s("badge_text") && (
                <span
                  style={{
                    background: s("badge_bg_color"),
                    color: s("badge_text_color"),
                    borderRadius: 5,
                    fontSize: 8,
                    fontWeight: 800,
                    fontStyle: "italic",
                    padding: "2px 6px",
                  }}
                >
                  {s("badge_text")}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {priceTabs.slice(0, 4).map((t, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 11,
                    padding: false ? 3 : 0,
                    background:
                      false && i === 0
                        ? s("pill_halo_color") + "bf"
                        : "transparent",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 9,
                      border:
                        false
                          ? `${i === 0 ? 1.5 : 1}px solid ${i === 0 ? s("pill_selected_border_color") : s("pill_border_color")}`
                          : "none",
                      background:
                        i === 0 ? s("pill_selected_color") : s("pill_color"),
                      color:
                        false
                          ? s("pill_text_color")
                          : i === 0
                            ? s("accent_color")
                            : s("text_color"),
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      fontStyle: false ? "normal" : "italic",
                    }}
                  >
                    <span style={{ fontSize: 7.5 }}>{t.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>
                      {t.sub_label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                height: 2,
                background: s("indicator_color"),
                width: "25%",
                marginTop: 5,
              }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {[0, 1, 2].map((i) => {
                const p = (products ?? [])[i];
                return (
                  <div key={i} style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        aspectRatio: "1",
                        background: "#F6F6F6",
                        borderRadius: 6,
                        overflow: "hidden",
                      }}
                    >
                      {p?.thumbnail_url && (
                        <img
                          src={p.thumbnail_url}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 8,
                        fontWeight: 800,
                        marginTop: 3,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p?.name ?? "Product"}
                    </div>
                    <div style={{ fontSize: 8.5, fontWeight: 800 }}>
                      {p ? inr(p.sale_price ?? p.price) : "₹—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        styles.sectionSlot,
        styles.sectionSlotHover,
        isSelected && styles.sectionSlotSelected,
      )}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div style={{ padding: "6px 8px" }}>
        <div
          style={{
            background: s("bg_color"),
            borderRadius: 14,
            padding: "10px 0",
            color: text,
            textAlign: "left",
          }}
        >
          <div
            style={{
              padding: "0 10px",
              fontSize: collection ? 18 : 14,
              fontWeight: 800,
              color: collection ? accent : text,
            }}
          >
            {s("title_image_url") ? (
              <img
                src={s("title_image_url")}
                alt=""
                style={{ height: 34, objectFit: "contain" }}
              />
            ) : (
              s("title")
            )}
          </div>
          {s("subtitle") && (
            <div
              style={{
                padding: "4px 10px 0",
                fontSize: 9,
                color: muted,
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              {s("subtitle")}
              <span
                style={{ flex: 1, height: 1, background: muted, opacity: 0.25 }}
              />
            </div>
          )}

          <div
            style={{
              display: "flex",
              margin: "10px 0 0",
              padding: "0 10px",
              borderBottom: `1.5px solid ${accent}`,
              height: 42,
              alignItems: "stretch",
            }}
          >
            {tabs.slice(0, 4).map((t, i) => {
              const active = i === 0;
              const iconTab = !collection && (!!t.icon_url || !t.sub_label);
              return (
                <div
                  key={i}
                  style={{
                    flex: collection ? "0 0 auto" : "0 0 25%",
                    padding: collection ? "0 10px" : undefined,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    border: active ? `1.5px solid ${accent}` : "none",
                    borderBottom: "none",
                    borderRadius: "10px 10px 0 0",
                    background: active ? soft : "transparent",
                    color: active ? accent : text,
                    marginBottom: -1.5,
                  }}
                >
                  {iconTab ? (
                    <>
                      {t.icon_url ? (
                        <img
                          src={t.icon_url}
                          alt=""
                          style={{
                            width: 18,
                            height: 18,
                            objectFit: "contain",
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 14 }}>🔥</span>
                      )}
                      <span style={{ fontSize: 8, fontWeight: 700 }}>
                        {t.label}
                      </span>
                    </>
                  ) : collection ? (
                    <span style={{ fontSize: 10, fontWeight: 700 }}>
                      {t.label}
                    </span>
                  ) : (
                    <>
                      <span
                        style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}
                      >
                        {t.label}
                      </span>
                      <span
                        style={{
                          fontSize: 7.5,
                          color: active ? accent : muted,
                        }}
                      >
                        {t.sub_label}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {!collection && (
            <div
              style={{
                display: "flex",
                gap: 5,
                padding: "8px 10px 0",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  border: `1.2px solid ${accent}`,
                  background: soft,
                  color: accent,
                  borderRadius: 9,
                  fontSize: 8.5,
                  fontWeight: 800,
                  padding: "5px 8px",
                }}
              >
                ▦ {s("all_label")}
              </span>
              {(first?.chips ?? []).slice(0, 3).map((c, i) => (
                <span
                  key={i}
                  style={{
                    border: "1px solid #E2E2E2",
                    borderRadius: 9,
                    fontSize: 8,
                    fontWeight: 700,
                    padding: "3px 7px",
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.image_url && (
                    <img
                      src={c.image_url}
                      alt=""
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        objectFit: "cover",
                      }}
                    />
                  )}
                  {c.label || "Category"}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, padding: "10px 10px 0" }}>
            {[0, 1, 2].map((i) => {
              const p = items[i];
              const price = p ? (p.sale_price ?? p.price) : null;
              return (
                <div key={i} style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      aspectRatio: "1",
                      background: "#F6F6F6",
                      borderRadius: 7,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {p?.thumbnail_url && (
                      <img
                        src={p.thumbnail_url}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <span
                      style={{
                        position: "absolute",
                        right: 3,
                        bottom: 4,
                        width: 20,
                        height: 20,
                        borderRadius: 5,
                        border: `1.2px solid ${accent}`,
                        background: "#fff",
                        color: accent,
                        fontSize: 14,
                        lineHeight: "17px",
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      +
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 8.5,
                      fontWeight: 800,
                      marginTop: 5,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p?.name ?? "Product"}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 800 }}>
                    {price != null ? inr(price) : "₹—"}
                  </div>
                </div>
              );
            })}
          </div>

          {!collection && (
            <div
              style={{
                display: "flex",
                gap: 5,
                padding: "8px 10px 0",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  border: `1.2px solid ${accent}`,
                  background: soft,
                  color: accent,
                  borderRadius: 9,
                  fontSize: 8.5,
                  fontWeight: 800,
                  padding: "5px 8px",
                }}
              >
                ▦ {s("all_label")}
              </span>
              {(first?.chips ?? []).slice(0, 3).map((c, i) => (
                <span
                  key={i}
                  style={{
                    border: "1px solid #E2E2E2",
                    borderRadius: 9,
                    fontSize: 8,
                    fontWeight: 700,
                    padding: "3px 7px",
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.image_url && (
                    <img
                      src={c.image_url}
                      alt=""
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        objectFit: "cover",
                      }}
                    />
                  )}
                  {c.label || "Category"}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, padding: "10px 10px 0" }}>
            {[0, 1, 2].map((i) => {
              const p = items[i];
              const price = p ? (p.sale_price ?? p.price) : null;
              return (
                <div key={i} style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      aspectRatio: "1",
                      background: "#F6F6F6",
                      borderRadius: 7,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {p?.thumbnail_url && (
                      <img
                        src={p.thumbnail_url}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <span
                      style={{
                        position: "absolute",
                        right: 3,
                        bottom: 4,
                        width: 20,
                        height: 20,
                        borderRadius: 5,
                        border: `1.2px solid ${accent}`,
                        background: "#fff",
                        color: accent,
                        fontSize: 14,
                        lineHeight: "17px",
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      +
                    </span>
                  </div>
                  <div style={{ marginTop: 5 }}>
                    <span
                      style={{
                        background: s("price_badge_color"),
                        color: "#fff",
                        borderRadius: 4,
                        fontSize: 9,
                        fontWeight: 800,
                        padding: "2px 5px",
                        boxShadow: `1px 1.5px 0 ${s("price_badge_shadow_color")}`,
                      }}
                    >
                      {price != null ? inr(price) : "₹—"}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 8.5,
                      fontWeight: 700,
                      marginTop: 5,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p?.name ?? "Product"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div
        style={{
          padding: "0 12px 8px",
          fontSize: 10,
          color: "#64748b",
          textAlign: "left",
        }}
      >
        {s("see_all_label")
          ? `[ ${s("see_all_label")} ▸ ] button under the products. `
          : ""}
        {tabs.length} tab{tabs.length === 1 ? "" : "s"}. Products come from each
        tab&apos;s chips and pinned products — the preview shows the
        section&apos;s product source as sample photos.
      </div>
    </button>
  );
}

export default memo(StealDealsPreview);
