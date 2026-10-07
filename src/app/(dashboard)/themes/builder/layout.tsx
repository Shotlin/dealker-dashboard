import type { ReactNode } from "react"
import { StoreProvider } from "@/contexts/StoreContext"

export default function BuilderLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <StoreProvider defaultStoreKey="marketplace">
      <div className="flex h-screen flex-col overflow-hidden">{children}</div>
    </StoreProvider>
  )
}
