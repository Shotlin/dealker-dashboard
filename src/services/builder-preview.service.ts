import api from "@/lib/api"
import type { ApiResponse, Product } from "@/types"
import type { SectionManifest } from "@/types/theme.types"

export interface BuilderPreview {
  products: Record<string, Product[]>
  ads_placed: number
}

/**
 * Resolves the builder's sections exactly like the customer app does (category / rules / deal /
 * auto-fill) and puts approved sponsored campaigns first. Accepts unsaved drafts.
 */
export async function previewSectionProducts(sections: SectionManifest[]): Promise<BuilderPreview> {
  const { data } = await api.post<ApiResponse<BuilderPreview>>("/admin/merch-sections/preview", {
    sections: sections.map((s) => ({
      id: s.id,
      section_type: s.section_type,
      config: s.config ?? {},
      merch_binding: s.merch_binding ?? null,
    })),
  })
  return data.data
}
