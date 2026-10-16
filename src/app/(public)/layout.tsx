import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: { default: "Dealker", template: "%s · Dealker" },
  description: "Dealker — buy, sell, repair and auction phones and electronics.",
}

const links = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
]

/** Public, login-free pages (store listings link to these). */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/about" className="text-xl font-extrabold tracking-tight text-indigo-900">
            Dealker
          </Link>
          <nav className="flex gap-5 text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-slate-600 hover:text-indigo-700">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 leading-7 [&_h1]:mb-2 [&_h1]:text-3xl [&_h1]:font-extrabold [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_li]:my-1 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        Questions? Write to{" "}
        <a className="text-indigo-700" href="mailto:support@dealker.in">
          support@dealker.in
        </a>
      </footer>
    </div>
  )
}
