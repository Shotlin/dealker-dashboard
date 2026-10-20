import type { FC } from "react"
import type { Category, Product } from "@/types"
import type { SectionManifest, SectionType, ThemeData } from "@/types/theme.types"
import type { ChromeRegion } from "../chromeRegions"
import ArchedShowcasePreview from "./ArchedShowcasePreview"
import BannerPreview from "./BannerPreview"
import CarouselPreview from "./CarouselPreview"
import CategoryIconsPreview from "./CategoryIconsPreview"
import CustomBannerPreview from "./CustomBannerPreview"
import DealerBlocksPreview from "./DealerBlocksPreview"
import FeeStripPreview from "./FeeStripPreview"
import MosaicPreview from "./MosaicPreview"
import ProductGridPreview from "./ProductGridPreview"
import CategoryHubPreview from "./CategoryHubPreview"
import SpacerPreview from "./SpacerPreview"
import StealDealsPreview from "./StealDealsPreview"
import TextHeaderPreview from "./TextHeaderPreview"
import TrendingPreview from "./TrendingPreview"

export interface PreviewProps {
  section: SectionManifest
  isSelected: boolean
  onClick: () => void
  categories?: Category[]
  products?: Product[]
  /** Theme being edited — lets previews use the same colours as the app. */
  themeData?: ThemeData | null
  /** Opens the theme-colour editor for a chrome region (hero frame, fee card…). */
  onChromeRegionClick?: (region: ChromeRegion) => void
}

export const previewRegistry: Record<SectionType, FC<PreviewProps>> = {
  animated_banner: BannerPreview,
  fee_strip: FeeStripPreview,
  seasonal_mosaic: MosaicPreview,
  round_category_icons: CategoryIconsPreview,
  category_product_grid: ProductGridPreview,
  product_carousel: TrendingPreview,
  trending_products: TrendingPreview,
  promo_carousel: CarouselPreview,
  bank_offers: FeeStripPreview,
  custom_banner: CustomBannerPreview,
  text_header: TextHeaderPreview,
  arched_product_showcase: ArchedShowcasePreview,
  spacer: SpacerPreview,
  live_auction: DealerBlocksPreview,
  deal_of_day: DealerBlocksPreview,
  recent_recommended: DealerBlocksPreview,
  brand_spotlight: DealerBlocksPreview,
  banner_rail: DealerBlocksPreview,
  price_shop: StealDealsPreview,
  category_hub: CategoryHubPreview,
  steal_deals: StealDealsPreview,
  collection_showcase: StealDealsPreview,
}
