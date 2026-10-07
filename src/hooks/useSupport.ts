"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { supportApi } from "@/services/support.service"
import type { SupportFilters } from "@/types/support.types"

const POLL = 20_000

export function useSupportTickets(filters: SupportFilters) {
  return useQuery({
    queryKey: ["support", "tickets", filters],
    queryFn: () => supportApi.list(filters),
    placeholderData: keepPreviousData,
    refetchInterval: POLL,
  })
}

export function useSupportStats() {
  return useQuery({ queryKey: ["support", "stats"], queryFn: supportApi.stats, refetchInterval: 30_000 })
}

export function useSupportAgents() {
  return useQuery({ queryKey: ["support", "agents"], queryFn: supportApi.agents, staleTime: 60_000 })
}

export function useCannedReplies() {
  return useQuery({ queryKey: ["support", "canned"], queryFn: supportApi.canned, staleTime: 300_000 })
}

export function useSupportTicket(id: string | null) {
  return useQuery({
    queryKey: ["support", "ticket", id],
    queryFn: () => supportApi.detail(id as string),
    enabled: Boolean(id),
    refetchInterval: 10_000,
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ["support"] })
}

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong"

export function useSendMessage(id: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ body, internal }: { body: string; internal: boolean }) => supportApi.send(id, body, internal),
    onSuccess: invalidate,
    onError: (e) => toast.error(errMsg(e)),
  })
}

export function useUpdateTicket(id: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (patch: Parameters<typeof supportApi.update>[1]) => supportApi.update(id, patch),
    onSuccess: invalidate,
    onError: (e) => toast.error(errMsg(e)),
  })
}

export function useAssignTicket(id: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (assigneeId: string | null) => supportApi.assign(id, assigneeId),
    onSuccess: () => { invalidate(); toast.success("Conversation reassigned") },
    onError: (e) => toast.error(errMsg(e)),
  })
}

export function useMarkRead() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: string) => supportApi.markRead(id), onSuccess: invalidate })
}

export function useStartConversation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (ctx: { orderId?: string; refundRequestId?: string }) => supportApi.start(ctx),
    onSuccess: invalidate,
    onError: (e) => toast.error(errMsg(e)),
  })
}
