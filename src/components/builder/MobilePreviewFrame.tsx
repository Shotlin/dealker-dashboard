"use client"

import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import {
  House,
  ShoppingCart,
  Grid2x2,
  UserRound,
  Tag,
  RotateCcw,
  Gavel,
  ClipboardList,
  Smartphone,
  ChevronRight,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import { DEFAULT_HOME_LOOK, type SectionManifest, type ThemeData, type ThemeTab } from "@/types/theme.types"
import {
  usePreviewData,
  resolveProductsForSection,
} from "@/hooks/usePreviewData"
import { FixedHeaderPreview } from "./FixedHeaderPreview"
import { ZoomTo402 } from "./ZoomTo402"
import { useStoreContext } from "@/contexts/StoreContext"
import { previewRegistry } from "./previews"
import { QuickActionsToolbar } from "./QuickActionsToolbar"
import { BuilderErrorBoundary } from "./BuilderErrorBoundary"
import PreviewInsertionLine from "./PreviewInsertionLine"
import PreviewSortableSection from "./PreviewSortableSection"
import { DRAG_KIND, previewInsertSlotId } from "./dndTypes"
import type { ChromeRegion } from "./chromeRegions"
import styles from "./MobilePreviewFrame.module.css"

interface MobilePreviewFrameProps {
  sections: SectionManifest[]
  selectedSectionId: string | null
  hoveredSectionId?: string | null
  onSectionClick: (sectionId: string) => void
  themeData: ThemeData | null
  activeTabKey: string
  scale?: number
  onMoveUp?: (sectionId: string) => void
  onMoveDown?: (sectionId: string) => void
  onToggleVisibility?: (sectionId: string, visible: boolean) => void
  onDuplicate?: (sectionId: string) => void
  onDelete?: (sectionId: string) => void
  /** Click handler for chrome regions (top bar, search, category tabs, bottom nav). */
  onChromeRegionClick?: (region: ChromeRegion) => void
  /** Currently selected chrome region — drives the highlight outline. */
  selectedChromeRegion?: ChromeRegion | null
  /** Callback fired when a category tab inside the preview is clicked. */
  onPreviewTabChange?: (tabKey: string) => void
  /** Live API theme tabs — passed to FixedHeaderPreview for real icons/labels. */
  themeTabs?: ThemeTab[]
  /** True while a drag is active anywhere in the builder — expands insertion slots. */
  isDragActive?: boolean
}

const PHONE_WIDTH = 430
const PHONE_HEIGHT = 932
const FIT_STAGE_GUTTER = 12

const NAV_ICON_MAP: Record<string, LucideIcon> = {
  Home: House,
  Cart: ShoppingCart,
  Categories: Grid2x2,
  Auction: Gavel,
  Order: ClipboardList,
  Profile: UserRound,
  "Buy Again": RotateCcw,
  Deals: Tag,
  Account: UserRound,
}

export function MobilePreviewFrame({
  sections,
  selectedSectionId,
  hoveredSectionId,
  onSectionClick,
  themeData,
  activeTabKey,
  scale = 0.92,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onDuplicate,
  onDelete,
  onChromeRegionClick,
  selectedChromeRegion,
  onPreviewTabChange,
  themeTabs,
  isDragActive = false,
}: MobilePreviewFrameProps) {
  const navLook = { ...DEFAULT_HOME_LOOK, ...(themeData?.sections.homeLook ?? {}) }
  // The app paints the page below the header with homeLook.canvasColor (white if unset).
  const canvasColor = themeData?.sections.homeLook?.canvasColor ?? "#FFFFFF"
  const frameRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [availableSize, setAvailableSize] = useState({
    width: PHONE_WIDTH * scale,
    height: PHONE_HEIGHT * scale,
  })

  const { categories, products } = usePreviewData()
  const { activeStoreKey, storeConfig } = useStoreContext()

  const deferredSections = useDeferredValue(sections)
  const isStale = deferredSections !== sections

  // Flutter contract: visible=false sections collapse to SizedBox.shrink() — zero height.
  // Dashboard preview must do the same: never render hidden sections.
  const orderedSections = [...deferredSections]
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((s) => s.visible)

  useEffect(() => {
    const node = frameRef.current
    if (!node) return

    const updateSize = () => {
      const rect = node.getBoundingClientRect()
      setAvailableSize({
        width: rect.width,
        height: rect.height,
      })
    }

    updateSize()

    const observer = new ResizeObserver(() => {
      updateSize()
    })

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!selectedSectionId) return
    const timer = setTimeout(() => {
      const el = sectionRefs.current.get(selectedSectionId)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, 100)
    return () => clearTimeout(timer)
  }, [selectedSectionId])

  useEffect(() => {
    if (!hoveredSectionId) return
    const el = sectionRefs.current.get(hoveredSectionId)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [hoveredSectionId])

  const widthScale =
    (availableSize.width - FIT_STAGE_GUTTER * 2) / PHONE_WIDTH
  const heightScale =
    (availableSize.height - FIT_STAGE_GUTTER * 2) / PHONE_HEIGHT
  const fittedScale = Math.min(scale, widthScale, heightScale)
  const resolvedScale =
    Number.isFinite(fittedScale) && fittedScale > 0
      ? Math.min(scale, fittedScale)
      : scale

  const frameStyle = {
    "--preview-scale": resolvedScale,
  } as CSSProperties

  return (
    <div ref={frameRef} className={styles.previewStage}>
      <div
        className={styles.previewSizer}
        style={{
          width: PHONE_WIDTH * resolvedScale,
          height: PHONE_HEIGHT * resolvedScale,
        }}
      >
        <div className={styles.phoneContainer} style={frameStyle}>
          <div className={styles.phoneViewport}>
            <div className={styles.notch}>
              <span className={styles.notchSpeaker} />
              <span className={styles.notchCamera} />
            </div>

            <div className={styles.fixedHeader}>
              <FixedHeaderPreview
                themeData={themeData}
                activeTabKey={activeTabKey}
                storeKey={activeStoreKey}
                themeTabs={themeTabs}
                onRegionClick={onChromeRegionClick}
                selectedRegion={selectedChromeRegion ?? null}
                onPreviewTabChange={onPreviewTabChange}
              />
            </div>

            <div
              className={styles.scrollableContent}
              style={{ opacity: isStale ? 0.97 : 1, transition: "opacity 100ms ease", background: canvasColor }}
            >
              <ZoomTo402 background={canvasColor}>
              {orderedSections.length === 0 ? (
                <PreviewEmptyDropZone />
              ) : (
                <SortableContext
                  items={orderedSections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <PreviewInsertionLine index={0} active={isDragActive} />
                  {orderedSections.map((section, index) => {
                    const PreviewComponent =
                      previewRegistry[section.section_type]
                    const sectionProducts = resolveProductsForSection(
                      products,
                      section
                    )
                    return (
                      <div
                        key={section.id}
                        id={`preview-section-${section.id}`}
                        ref={(el) => {
                          if (el) sectionRefs.current.set(section.id, el)
                          else sectionRefs.current.delete(section.id)
                        }}
                      >
                        <PreviewSortableSection
                          sectionId={section.id}
                          sectionType={section.section_type}
                          isSelected={selectedSectionId === section.id}
                          onClick={() => onSectionClick(section.id)}
                        >
                          <BuilderErrorBoundary
                            sectionType={section.section_type}
                            sectionId={section.id}
                          >
                            <PreviewComponent
                              section={section}
                              isSelected={selectedSectionId === section.id}
                              onClick={() => onSectionClick(section.id)}
                              categories={categories}
                              products={sectionProducts}
                              themeData={themeData}
                              onChromeRegionClick={onChromeRegionClick}
                            />
                          </BuilderErrorBoundary>
                          {selectedSectionId === section.id && (
                            <div className="flex justify-center py-1">
                              <QuickActionsToolbar
                                sectionId={section.id}
                                sectionIndex={index}
                                totalSections={orderedSections.length}
                                isVisible={section.visible}
                                onMoveUp={() => onMoveUp?.(section.id)}
                                onMoveDown={() => onMoveDown?.(section.id)}
                                onToggleVisibility={() =>
                                  onToggleVisibility?.(
                                    section.id,
                                    !section.visible
                                  )
                                }
                                onDuplicate={() => onDuplicate?.(section.id)}
                                onDelete={() => onDelete?.(section.id)}
                              />
                            </div>
                          )}
                        </PreviewSortableSection>
                        <PreviewInsertionLine
                          index={index + 1}
                          active={isDragActive}
                        />
                      </div>
                    )
                  })}
                </SortableContext>
              )}
              </ZoomTo402>
            </div>

            <div
              className={styles.bottomNav}
              data-region="bottom_nav"
              onClick={(e) => {
                if (!onChromeRegionClick) return
                e.stopPropagation()
                onChromeRegionClick("bottom_nav")
              }}
              style={
                onChromeRegionClick
                  ? {
                      cursor: "pointer",
                      outline:
                        selectedChromeRegion === "bottom_nav"
                          ? "2px solid var(--store-accent, #3B82F6)"
                          : "2px solid transparent",
                      outlineOffset: -2,
                      transition: "outline-color 150ms ease",
                    }
                  : undefined
              }
            >
              {/* Mirrors the app's AppShell bottom bar (app_bottom_nav.dart), in app points. */}
              <ZoomTo402>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: `${4 * (874 / 812)}px ${12 * (402 / 375)}px ${22}px`,
                    background: navLook.navBackgroundColor,
                    boxShadow: "0 -6px 20px rgba(0,0,0,0.08)",
                  }}
                >
                  <div style={{ display: "flex", flex: 1 }}>
                    {["Home", "Categories", "Auction", "Order"].map((label, index) => {
                      const Icon = NAV_ICON_MAP[label] ?? Grid2x2
                      const isActive = index === 0
                      const color = isActive ? navLook.navActiveColor : navLook.navLabelColor
                      return (
                        <div
                          key={label}
                          aria-label={label}
                          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: `${4 * (874 / 812)}px ${1 * (402 / 375)}px`, color, transition: "color 220ms ease" }}
                        >
                          <div style={{ width: 48 * (402 / 375), height: 34 * (874 / 812), display: "grid", placeItems: "center", transform: isActive ? "scale(1.05)" : "none", transition: "transform 220ms ease" }}>
                            <Icon size={28 * (402 / 375)} strokeWidth={isActive ? 2.4 : 1.8} />
                          </div>
                          <span style={{ marginTop: 3 * (874 / 812), fontSize: 11 * (402 / 375), lineHeight: 1.2, fontWeight: isActive ? 700 : 500, whiteSpace: "nowrap" }}>{label}</span>
                        </div>
                      )
                    })}
                  </div>
                  {navLook.repairLabel.trim() !== "" && (
                    <>
                      <div style={{ width: 1, height: 44 * (874 / 812), margin: `0 ${6 * (402 / 375)}px`, background: navLook.navLabelColor, opacity: 0.18 }} />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          width: 402 * 0.27,
                          height: 50 * (874 / 812),
                          boxSizing: "border-box",
                          padding: `0 ${6 * (402 / 375)}px`,
                          borderRadius: 18 * (402 / 375),
                          background: navLook.repairPillColor,
                          color: navLook.repairPillTextColor,
                          fontSize: 11 * (402 / 375),
                          fontWeight: 600,
                          lineHeight: 1.15,
                          whiteSpace: "pre-line",
                        }}
                      >
                        <Smartphone size={22 * (402 / 375)} strokeWidth={1.8} />
                        <span style={{ flex: 1, marginLeft: 3 * (402 / 375) }}>{navLook.repairLabel}</span>
                        <ChevronRight size={14 * (402 / 375)} strokeWidth={2} />
                      </div>
                    </>
                  )}
                </div>
              </ZoomTo402>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Empty-canvas drop target shown when the active tab has no sections.
 * Drops resolve to insertion at index 0.
 */
function PreviewEmptyDropZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: previewInsertSlotId(0),
    data: { kind: DRAG_KIND.PREVIEW_INSERT_SLOT, index: 0 },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        margin: 16,
        padding: "32px 16px",
        borderRadius: 16,
        border: `2px dashed ${
          isOver ? "var(--store-accent, #3B82F6)" : "#CBD5E1"
        }`,
        background: isOver
          ? "rgba(59, 130, 246, 0.08)"
          : "rgba(248, 250, 252, 0.7)",
        textAlign: "center",
        transition: "background 150ms ease, border-color 150ms ease",
      }}
    >
      <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 6 }}>📦</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
        Drag sections here to build this page
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: "#64748B" }}>
        or click <strong>Add</strong> on any card in the section library
      </div>
    </div>
  )
}
