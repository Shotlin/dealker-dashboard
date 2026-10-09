"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { commandCenterApi } from "@/services/command-center.service"
import type { CcPeriod } from "@/services/command-center.service"

/** Refreshes every 30 s so the board stays live without a reload. */
export const useCommandCenter = (period: CcPeriod) =>
  useQuery({ queryKey: ["command-center", period], queryFn: () => commandCenterApi.get(period), refetchInterval: 30_000, placeholderData: keepPreviousData })
