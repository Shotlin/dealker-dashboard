import { BadgeCheck, ShoppingBag, Store, Truck } from "lucide-react"

const HIGHLIGHTS = [
  { icon: Store, text: "Onboard and verify sellers with KYC" },
  { icon: BadgeCheck, text: "Moderate listings before they go live" },
  { icon: Truck, text: "Ship, settle and pay out vendors" },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <span className="text-xl font-semibold tracking-tight">Dealker</span>
        </div>
        <div className="relative max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-4xl font-semibold leading-tight tracking-tight">
              Run your multi-vendor marketplace with confidence.
            </h2>
            <p className="text-base text-white/75">
              One control center for sellers, catalog, orders, shipping and payouts.
            </p>
          </div>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} Dealker. All rights reserved.</p>
      </aside>
      <main className="flex items-center justify-center bg-[var(--surface-bg)] px-4 py-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  )
}
