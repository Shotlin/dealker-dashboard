"use client"

/**
 * Adapter between TanStack Query errors and the shared ErrorBlock, which
 * expects an HTTP status + message rather than an Error instance.
 */

import { ErrorBlock } from "@/components/shared/error-block"

interface QueryErrorBlockProps {
  error: unknown
  onRetry?: () => void
  className?: string
}

export function QueryErrorBlock({ error, onRetry, className }: QueryErrorBlockProps) {
  const err = error as (Error & { status?: number }) | undefined
  const status = typeof err?.status === "number" ? err.status : undefined
  const message = err instanceof Error ? err.message : ""
  return <ErrorBlock status={status} message={message} onRetry={onRetry} className={className} />
}
