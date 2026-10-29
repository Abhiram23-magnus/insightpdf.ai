import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-sm text-center">
        <p className="font-mono text-sm text-brand">404</p>
        <h1 className="mt-2 text-2xl font-semibold">This page doesn&apos;t exist</h1>
        <p className="mt-2 text-sm text-muted">The link may be wrong or out of date.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/" className={buttonClass("secondary")}>Home</Link>
          <Link href="/library" className={buttonClass("primary")}>Go to library</Link>
        </div>
      </div>
    </div>
  );
}
