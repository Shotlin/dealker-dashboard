import { useQuery } from "@tanstack/react-query"
import { previewSectionProducts } from "@/services/builder-preview.service"
import type { SectionManifest } from "@/types/theme.types"

/**
 * Real products per section (what the customer app receives, sponsored ads first).
 * Re-fetches when a section's product binding changes, including unsaved edits.
 */
export function useBuilderPreview(sections: SectionManifest[]) {
  const signature = JSON.stringify(
    sections.map((s) => [s.id, s.section_type, s.visible, s.merch_binding ?? null, (s.config as { tabs?: unknown } | null)?.tabs ? 1 : 0]),
  )
  return useQuery({
    queryKey: ["builder-preview", signature],
    queryFn: () => previewSectionProducts(sections),
    enabled: sections.length > 0,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    retry: 1,
  })
}
