"use client"

/**
 * Auction hooks — TanStack Query bindings + the live socket feed for the control room.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useSocket } from "@/components/providers/SocketProvider"
import {
  apiMessage,
  auctionsApi,
  type AuctionSettings,
  type CreateAuctionInput,
} from "@/services/auctions.service"

export const auctionKeys = {
  all: ["auctions"] as const,
  stats: ["auctions", "stats"] as const,
  attention: ["auctions", "attention"] as const,
  rules: ["auctions", "rules"] as const,
  list: (f: Record<string, unknown>) => ["auctions", "list", f] as const,
  detail: (id: string) => ["auctions", "detail", id] as const,
  settings: ["auctions", "settings"] as const,
  risk: ["auctions", "risk"] as const,
  products: (q: string) => ["auctions", "products", q] as const,
}

export const useAuctionStats = () =>
  useQuery({ queryKey: auctionKeys.stats, queryFn: auctionsApi.stats, refetchInterval: 15_000 })

export const useAuctionAttention = () =>
  useQuery({ queryKey: auctionKeys.attention, queryFn: auctionsApi.attention, refetchInterval: 30_000 })

export const useAuctionRules = () =>
  useQuery({ queryKey: auctionKeys.rules, queryFn: auctionsApi.rules, staleTime: 60_000 })

export const useAuctionList = (filters: Record<string, unknown>) =>
  useQuery({
    queryKey: auctionKeys.list(filters),
    queryFn: () => auctionsApi.list(filters),
    refetchInterval: 10_000,
    placeholderData: (prev) => prev,
  })

export const useAuctionDetail = (id: string) =>
  useQuery({ queryKey: auctionKeys.detail(id), queryFn: () => auctionsApi.get(id), refetchInterval: 15_000, enabled: !!id })

export const useAuctionProducts = (q: string) =>
  useQuery({ queryKey: auctionKeys.products(q), queryFn: () => auctionsApi.products(q), staleTime: 15_000 })

export const useAuctionSettings = () =>
  useQuery({ queryKey: auctionKeys.settings, queryFn: auctionsApi.settings })

export const useAuctionRisk = () =>
  useQuery({ queryKey: auctionKeys.risk, queryFn: auctionsApi.risk, refetchInterval: 60_000 })

export function useCreateAuction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateAuctionInput) => auctionsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: auctionKeys.all }),
    onError: (e) => toast.error(apiMessage(e, "Could not create the auction")),
  })
}

export function useUpdateAuction(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<CreateAuctionInput>) => auctionsApi.update(id, body),
    onSuccess: () => {
      toast.success("Auction updated")
      qc.invalidateQueries({ queryKey: auctionKeys.all })
    },
    onError: (e) => toast.error(apiMessage(e, "Could not update the auction")),
  })
}

/** submit / approve / reject / start-now / pause / resume / extend / end-now / cancel / relist */
export function useAuctionAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name, body }: { id: string; name: string; body?: Record<string, unknown> }) =>
      auctionsApi.action(id, name, body),
    onSuccess: (_d, v) => {
      toast.success(
        { approve: "Auction approved", reject: "Auction rejected", pause: "Auction paused", resume: "Auction resumed",
          "end-now": "Auction ended", cancel: "Auction cancelled — fees refunded", extend: "Auction extended",
          "start-now": "Auction started", submit: "Submitted", relist: "Relisted as a draft" }[v.name] ?? "Done"
      )
      qc.invalidateQueries({ queryKey: auctionKeys.all })
    },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export function useUpdateAuctionSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<AuctionSettings>) => auctionsApi.updateSettings(body),
    onSuccess: () => {
      toast.success("Auction settings saved")
      qc.invalidateQueries({ queryKey: auctionKeys.settings })
      qc.invalidateQueries({ queryKey: auctionKeys.rules })
    },
    onError: (e) => toast.error(apiMessage(e, "Could not save settings")),
  })
}

export function useBidderBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, block, reason }: { userId: string; block: boolean; reason?: string }) =>
      block ? auctionsApi.blockBidder(userId, reason) : auctionsApi.unblockBidder(userId),
    onSuccess: (_d, v) => {
      toast.success(v.block ? "Bidder blocked" : "Bidder unblocked")
      qc.invalidateQueries({ queryKey: auctionKeys.all })
    },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

// ── live feed ───────────────────────────────────────────────────────────

export interface LiveState {
  status: string
  current_price: number
  min_next_bid: number | null
  bid_count: number
  bidder_count: number
  registration_count: number
  ends_at: string
  extension_count: number
  reserve_status: "NONE" | "MET" | "NOT_MET"
  leader_alias: string | null
  server_time: string
}

/**
 * Subscribe to an auction's public socket room. Returns the freshest pushed
 * state (or null until the first frame) and refreshes the detail query when
 * anything material happens, so the control room stays live without polling hard.
 */
export function useAuctionLive(id: string) {
  const socket = useSocket()
  const qc = useQueryClient()
  const [live, setLive] = useState<LiveState | null>(null)
  const [connected, setConnected] = useState(false)
  const lastInvalidate = useRef(0)

  useEffect(() => {
    if (!socket || !id) return
    const join = () => { socket.emit("auction:join", id); setConnected(true) }
    const refresh = () => {
      const now = Date.now()
      if (now - lastInvalidate.current < 1500) return // coalesce bursts
      lastInvalidate.current = now
      qc.invalidateQueries({ queryKey: auctionKeys.detail(id) })
    }
    const onState = (s: LiveState & { id: string }) => { if (s.id === id) { setLive(s); refresh() } }
    const onBid = () => refresh()
    const onEnded = () => { refresh(); qc.invalidateQueries({ queryKey: auctionKeys.all }) }
    const onDown = () => setConnected(false)

    if (socket.connected) join()
    socket.on("connect", join)
    socket.on("disconnect", onDown)
    socket.on("auction:state", onState)
    socket.on("auction:bid", onBid)
    socket.on("auction:ended", onEnded)
    return () => {
      socket.emit("auction:leave", id)
      socket.off("connect", join)
      socket.off("disconnect", onDown)
      socket.off("auction:state", onState)
      socket.off("auction:bid", onBid)
      socket.off("auction:ended", onEnded)
    }
  }, [socket, id, qc])

  return { live, connected }
}

/**
 * Countdown that follows the SERVER clock (offset measured from `server_time`),
 * so a wrong device clock cannot show a wrong time-left. Returns ms remaining.
 */
export function useCountdown(endsAt: string | null | undefined, serverTime?: string) {
  const offset = useMemo(() => (serverTime ? new Date(serverTime).getTime() - Date.now() : 0), [serverTime])
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])
  if (!endsAt) return null
  return Math.max(0, new Date(endsAt).getTime() - (now + offset))
}
