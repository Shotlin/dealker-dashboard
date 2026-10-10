"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getReturnJourney, saveQc, savePickup, setPickupStatus, syncPickup } from "@/services/return-journey.service"
import type { PickupInput, PickupStatus, QcInput } from "@/types/return-journey.types"

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong"

export function useReturnJourney(id: string) {
  return useQuery({ queryKey: ["return-journey", id], queryFn: () => getReturnJourney(id) })
}

export function useReturnJourneyActions(id: string) {
  const qc = useQueryClient()
  const done = (m: string) => () => {
    qc.invalidateQueries({ queryKey: ["return-journey", id] })
    qc.invalidateQueries({ queryKey: ["order-overview"] })
    qc.invalidateQueries({ queryKey: ["refund-requests"] })
    toast.success(m)
  }
  const onError = (e: unknown) => toast.error(errMsg(e))
  return {
    savePickup: useMutation({ mutationFn: (p: PickupInput) => savePickup(id, p), onSuccess: done("Pickup saved — the customer can now track it"), onError }),
    setStatus: useMutation({ mutationFn: ({ status, note }: { status: PickupStatus; note?: string }) => setPickupStatus(id, status, note), onSuccess: done("Pickup updated"), onError }),
    sync: useMutation({ mutationFn: () => syncPickup(id), onSuccess: done("Tracking refreshed from the courier"), onError }),
    saveQc: useMutation({ mutationFn: (p: QcInput) => saveQc(id, p), onSuccess: done("Quality report saved"), onError }),
  }
}
