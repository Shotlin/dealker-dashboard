import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getDeals, getMerchSections } from "@/services/merch-sections.service"
import { updateSection, updateSectionMerch } from "@/services/sections.service"
import type { UpdateSectionMerchPayload, UpdateSectionPayload } from "@/types/theme.types"

export function useMerchSections(tabId: string | null) {
  return useQuery({
    queryKey: ["merch-sections", tabId],
    queryFn: () => getMerchSections(tabId!),
    enabled: !!tabId,
    staleTime: 15_000,
  })
}

/** Saves a section's product list: plain sections use merch_binding, tabbed ones use config.tabs. */
export function useSaveSectionProducts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; merch?: UpdateSectionMerchPayload; config?: UpdateSectionPayload["config"] }) =>
      args.merch ? updateSectionMerch(args.id, args.merch) : updateSection(args.id, { config: args.config }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["merch-sections"] })
      qc.invalidateQueries({ queryKey: ["merch-deals"] })
      qc.invalidateQueries({ queryKey: ["sections"] })
    },
    onError: (e: Error) => toast.error(e.message || "Could not save changes"),
  })
}

export function useDeals() {
  return useQuery({ queryKey: ["merch-deals"], queryFn: getDeals, staleTime: 15_000 })
}
