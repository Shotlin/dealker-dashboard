import api from "@/lib/api"
import type { ApiResponse } from "@/types"

export interface ProductPageBlock {
  key: string
  visible: boolean
}

export interface ProductPageCatalogItem {
  key: string
  label: string
  locked?: boolean
}

export interface ProductPageLayout {
  blocks: ProductPageBlock[]
  catalog: ProductPageCatalogItem[]
}

export async function getProductPageLayout(): Promise<ProductPageLayout> {
  const { data } = await api.get<ApiResponse<ProductPageLayout>>("/admin/product-page/layout")
  return data.data
}

export async function saveProductPageLayout(blocks: ProductPageBlock[]): Promise<ProductPageLayout> {
  const { data } = await api.put<ApiResponse<ProductPageLayout>>("/admin/product-page/layout", { blocks })
  return data.data
}
