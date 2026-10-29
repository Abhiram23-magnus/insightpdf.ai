"use client";

// App sidebar (desktop) — on small screens the library shows a top bar instead.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";

const nav = [
  {
    href: "/library",
    label: "Library",
    icon: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
  },
  {
    href: "/",
    label: "Home",
    icon: <path d="M3 11 12 4l9 7M5 10v10h14V10" />,
  },
];

export default function Sidebar({ docCount }: { docCount: number | null }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 border-r border-line bg-surface px-3 py-5 lg:flex">
      <div className="px-2 pb-5">
        <Logo />
      </div>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {nav.map((n) => {
          const active = path === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                active ? "bg-brand-soft text-brand-text" : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{n.icon}</svg>
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {docCount !== null && (
          <div className="rounded-xl border border-line p-3.5 text-[13px]">
            <p className="font-medium">
              {docCount} document{docCount === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-faint">
              Stored on the free server — it may clear files when it restarts.
            </p>
          </div>
        )}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-faint">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
