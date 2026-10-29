"use client";

// App sidebar (desktop) — on small screens the library shows a top bar instead.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import type { Limits } from "@/types";

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(0, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

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

export default function Sidebar({ docCount, limits }: { docCount: number | null; limits?: Limits | null }) {
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
              {limits ? <span className="font-normal text-faint"> of {limits.max_documents}</span> : null}
            </p>
            {limits && (
              <>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-500"
                    style={{ width: `${Math.min(100, (docCount / Math.max(1, limits.max_documents)) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-faint">{formatBytes(limits.storage_used_bytes)} stored</p>
              </>
            )}
            <p className="mt-1 text-xs leading-relaxed text-faint">Private to your account.</p>
          </div>
        )}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-faint">Theme</span>
          <ThemeToggle />
        </div>
        <div className="border-t border-line pt-2">
          <UserMenu />
        </div>
      </div>
    </aside>
  );
}
