"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { getThemeTabs } from "@/services/theme-tabs.service"
import { BUILDER_STORE_KEYS, type ThemeStoreKey } from "@/types/theme.types"

export interface StoreConfig {
  /** Display label for the store (shown in tooltips, toolbar) */
  label: string
  /** Path to PNG chip image in /public/preview-assets/ */
  chipImage: string
  /** Primary background color (hex) — from Flutter store_model.dart */
  bg: string
  /** Active chip background color (hex) */
  chipActive: string
  /** Text color on store backgrounds (hex) */
  text: string
  /** 3-stop gradient for preview header [top, mid, bottom] */
  gradient: [string, string, string]
  /** Bottom nav items matching Flutter app */
  bottomNav: [string, string, string, string]
  /** Category tab labels for this store */
  categories: string[]
  /** Category tab emoji icons (fallback when no API icon) */
  categoryIcons: string[]
}

export type StoreTransitionStatus = "idle" | "switching" | "loading"

export interface StoreContextValue {
  /** Currently active store key */
  activeStoreKey: ThemeStoreKey
  /** Setter — triggers state machine transition */
  setActiveStoreKey: (key: ThemeStoreKey) => void
  /** Resolved config for the active store (memoized, stable reference) */
  storeConfig: StoreConfig
  /** Current transition state — use for CSS crossfade */
  transitionStatus: StoreTransitionStatus
  /** Whether the store is in the middle of switching */
  isSwitching: boolean
}

export const ALL_STORE_KEYS: ThemeStoreKey[] = BUILDER_STORE_KEYS

export const STORE_CONFIGS: Record<ThemeStoreKey, StoreConfig> = {
  mobile: {
    label: "Mobile",
    chipImage: "",
    bg: "#F7DC4E",
    chipActive: "#FDE68A",
    text: "#111827",
    gradient: ["#F7DC4E", "#FDE68A", "#FFFFFF"],
    bottomNav: ["Home", "Categories", "Auction", "Order"],
    categories: ["All", "Smartphones", "Tablets", "Wearables", "Deals"],
    categoryIcons: ["📱", "•", "•", "•", "•"],
  },
  mobile_part: {
    label: "Mobile Part",
    chipImage: "",
    bg: "#F7DC4E",
    chipActive: "#FDE68A",
    text: "#111827",
    gradient: ["#F7DC4E", "#FDE68A", "#FFFFFF"],
    bottomNav: ["Home", "Categories", "Auction", "Order"],
    categories: ["All", "Screens", "Batteries", "Chargers", "Tools"],
    categoryIcons: ["🔧", "•", "•", "•", "•"],
  },
  accessories: {
    label: "Accessories",
    chipImage: "",
    bg: "#F7DC4E",
    chipActive: "#FDE68A",
    text: "#111827",
    gradient: ["#F7DC4E", "#FDE68A", "#FFFFFF"],
    bottomNav: ["Home", "Categories", "Auction", "Order"],
    categories: ["All", "Earbuds", "Cables", "Cases", "Power Banks"],
    categoryIcons: ["🎧", "•", "•", "•", "•"],
  },
  electronics: {
    label: "Electronics",
    chipImage: "",
    bg: "#F7DC4E",
    chipActive: "#FDE68A",
    text: "#111827",
    gradient: ["#F7DC4E", "#FDE68A", "#FFFFFF"],
    bottomNav: ["Home", "Categories", "Auction", "Order"],
    categories: ["All", "Laptops", "TV", "Audio", "Appliances"],
    categoryIcons: ["💻", "•", "•", "•", "•"],
  },
  repellents: {
    label: "Repellents & Fresheners",
    chipImage: "",
    bg: "#F7DC4E",
    chipActive: "#FDE68A",
    text: "#111827",
    gradient: ["#F7DC4E", "#FDE68A", "#FFFFFF"],
    bottomNav: ["Home", "Categories", "Auction", "Order"],
    categories: ["All", "Repellents", "Fresheners", "Cleaning", "Home Care"],
    categoryIcons: ["🧴", "•", "•", "•", "•"],
  },
  marketplace: {
    label: "Marketplace",
    chipImage: "",
    bg: "#EEF2FF",
    chipActive: "#C7D2FE",
    text: "#111827",
    gradient: ["#EEF2FF", "#E0E7FF", "#FFFFFF"],
    bottomNav: ["Home", "Categories", "Deals", "Profile"],
    categories: ["All", "Electronics", "Fashion", "Home & Kitchen", "Beauty"],
    categoryIcons: ["🛍️", "🎧", "👗", "🏠", "💄"],
  },
  deals: {
    label: "Mega Deals",
    chipImage: "",
    bg: "#F97316",
    chipActive: "#FED7AA",
    text: "#FFFFFF",
    gradient: ["#EA580C", "#F97316", "#FFEDD5"],
    bottomNav: ["Home", "Categories", "Deals", "Profile"],
    categories: ["Flash Sale", "Combos", "Clearance", "Under ₹999", "Bank Offers"],
    categoryIcons: ["⚡", "🎯", "🏷️", "💸", "🏦"],
  },
  brand_store: {
    label: "Brand Store",
    chipImage: "",
    bg: "#4338CA",
    chipActive: "#312E81",
    text: "#FFFFFF",
    gradient: ["#4338CA", "#6366F1", "#E0E7FF"],
    bottomNav: ["Home", "Categories", "Deals", "Profile"],
    categories: ["Top Brands", "Mobiles", "Audio", "Appliances", "Fashion"],
    categoryIcons: ["⭐", "📱", "🎧", "🔌", "👕"],
  },
  new_arrivals: {
    label: "New Arrivals",
    chipImage: "",
    bg: "#0F766E",
    chipActive: "#115E59",
    text: "#FFFFFF",
    gradient: ["#0F766E", "#14B8A6", "#CCFBF1"],
    bottomNav: ["Home", "Categories", "Deals", "Profile"],
    categories: ["Just Launched", "Smart Devices", "Wearables", "Home", "Lifestyle"],
    categoryIcons: ["✨", "📟", "⌚", "🏡", "🎒"],
  },
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({
  children,
  defaultStoreKey = "mobile",
}: {
  children: ReactNode
  defaultStoreKey?: ThemeStoreKey
}) {
  const [activeStoreKey, setActiveStoreKeyRaw] = useState<ThemeStoreKey>(defaultStoreKey)
  const [transitionStatus, setTransitionStatus] = useState<StoreTransitionStatus>("idle")
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const queryClient = useQueryClient()

  // Prefetch all stores' tabs on mount so store switches are instant from cache
  useEffect(() => {
    ALL_STORE_KEYS.forEach(storeKey => {
      queryClient.prefetchQuery({
        queryKey: ["theme-tabs", { store_key: storeKey, status: "active" }],
        queryFn: () => getThemeTabs({ store_key: storeKey, status: "active" }),
        staleTime: 120_000,
      })
    })
  }, [queryClient])

  const setActiveStoreKey = useCallback((key: ThemeStoreKey) => {
    if (key === activeStoreKey) return

    // Clear any pending transition
    if (transitionTimer.current) clearTimeout(transitionTimer.current)

    // Enter switching state (triggers CSS crossfade)
    setTransitionStatus("switching")

    // After 200ms transition, commit the switch
    transitionTimer.current = setTimeout(() => {
      setActiveStoreKeyRaw(key)
      setTransitionStatus("idle")
    }, 200)
  }, [activeStoreKey])

  const storeConfig = useMemo(() => STORE_CONFIGS[activeStoreKey], [activeStoreKey])

  const value = useMemo<StoreContextValue>(() => ({
    activeStoreKey,
    setActiveStoreKey,
    storeConfig,
    transitionStatus,
    isSwitching: transitionStatus === "switching",
  }), [activeStoreKey, setActiveStoreKey, storeConfig, transitionStatus])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStoreContext(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error("useStoreContext must be used within <StoreProvider>")
  }
  return ctx
}
