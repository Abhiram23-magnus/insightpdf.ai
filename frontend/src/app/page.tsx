// app/page.tsx — Landing page
import Link from "next/link";
import { Logo } from "@/components/ui";
import { buttonClass } from "@/lib/styles";
import ThemeToggle from "@/components/ThemeToggle";
import ProductPreview from "@/components/landing/ProductPreview";
import Reveal from "@/components/landing/Reveal";
import WakeServer from "@/components/landing/WakeServer";
import AuthLink from "@/components/landing/AuthLink";

const features = [
  {
    title: "Ask in plain language",
    body: "Type a question the way you'd ask a colleague. Answers stream in as they're written.",
    tint: "bg-brand-soft text-brand",
    icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  },
  {
    title: "Check every source",
    body: "Each answer lists the pages it used. Click a page number to jump straight to it.",
    tint: "bg-cite-soft text-cite",
    icon: (
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
  },
  {
    title: "Summaries in seconds",
    body: "Get the key points of a long report, a contract's obligations, or a paper's method.",
    tint: "bg-[color-mix(in_srgb,var(--violet)_14%,transparent)] text-violet",
    icon: <path d="M4 6h16M4 12h10M4 18h6" />,
  },
];

const steps = [
  ["01", "Upload your PDF", "Drag in one file or several. You'll see each one upload and process."],
  ["02", "We read and index it", "The text is split into passages with their page numbers, so the right section is found fast."],
  ["03", "Ask and verify", "Ask questions beside the PDF and check every answer against the page it cites."],
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <WakeServer />
      {/* Soft glow behind the hero — the only gradient on the page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-240px] h-[520px] w-[900px] -translate-x-1/2"
        style={{ background: "radial-gradient(closest-side, var(--glow), transparent)" }}
      />

      <header className="relative border-b border-line">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Logo />
          <div className="flex flex-wrap items-center gap-2 sm:gap-6">
            <a href="#features" className="hidden text-sm font-medium text-muted hover:text-ink sm:inline">Features</a>
            <a href="#how" className="hidden text-sm font-medium text-muted hover:text-ink sm:inline">How it works</a>
            <a href="#privacy" className="hidden text-sm font-medium text-muted hover:text-ink sm:inline">Privacy</a>
            <ThemeToggle />
            <AuthLink />
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto flex max-w-6xl flex-wrap items-center gap-14 px-6 pb-16 pt-14 sm:pt-20">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-6">
            <Reveal delay={0.05}>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-brand-soft px-3 py-1 text-[13px] font-medium text-brand-text">
                <span className="h-1.5 w-1.5 rounded-full bg-cite" />
                Answers that cite the page they came from
              </span>
            </Reveal>
            <Reveal delay={0.12}>
              <h1 className="text-[42px] font-bold leading-[1.05] tracking-[-0.035em] sm:text-[56px]">
                Your documents,
                <br />
                <span className="bg-gradient-to-r from-brand to-violet bg-clip-text text-transparent">understood.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="max-w-[520px] text-lg leading-relaxed text-muted">
                Upload a PDF and ask it anything. InsightPDF summarizes long reports, answers specific
                questions, and pulls out the figures you need — with every answer linked to the exact page.
              </p>
            </Reveal>
            <Reveal delay={0.28}>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/signin?mode=signup" className={buttonClass("primary", "lg")}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6M4 20h16" /></svg>
                  Get started free
                </Link>
                <a href="#how" className={buttonClass("secondary", "lg")}>See how it works</a>
              </div>
            </Reveal>
            <Reveal delay={0.36}>
              <p className="text-[13px] text-faint">Free account · Your library stays private · Text-based PDFs work best</p>
            </Reveal>
          </div>

          <Reveal delay={0.2} className="min-w-0 flex-[1_1_540px]">
            <ProductPreview />
          </Reveal>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-line bg-surface/40">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-20">
            <Reveal className="flex max-w-[620px] flex-col gap-2.5">
              <h2 className="text-[32px] font-semibold tracking-[-0.02em]">Read less. Know more.</h2>
              <p className="text-base leading-relaxed text-muted">
                Everything is grounded in your file. If the answer isn&apos;t in the document,
                InsightPDF says so instead of guessing.
              </p>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={i * 0.08} lift>
                  <div className="flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-6 transition-colors hover:border-line-strong">
                    <span className={`grid h-10 w-10 place-items-center rounded-lg ${f.tint}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{f.icon}</svg>
                    </span>
                    <h3 className="text-[17px] font-semibold">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-muted">{f.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-20">
            <Reveal>
              <h2 className="text-[32px] font-semibold tracking-[-0.02em]">How it works</h2>
            </Reveal>
            <ol className="grid gap-8 sm:grid-cols-3">
              {steps.map(([n, title, body], i) => (
                <Reveal key={n} delay={i * 0.08}>
                  <li className="flex flex-col gap-2.5 border-t border-line pt-5">
                    <span className="font-mono text-[13px] text-brand">{n}</span>
                    <h3 className="text-[17px] font-semibold">{title}</h3>
                    <p className="text-sm leading-relaxed text-muted">{body}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Privacy — describes what the app does today, nothing more. */}
        <section id="privacy" className="border-t border-line bg-surface/40">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-10 px-6 py-20">
            <Reveal className="flex flex-[1_1_320px] flex-col gap-2.5">
              <h2 className="text-[32px] font-semibold tracking-[-0.02em]">What happens to your file</h2>
              <p className="text-base leading-relaxed text-muted">A plain description, with nothing overstated.</p>
            </Reveal>
            <Reveal delay={0.1} className="flex-[2_1_480px]">
              <ul className="flex flex-col gap-4">
                {[
                  "Your PDFs, their passages and your chats are tied to your account. Each request is checked against your sign-in, and the database itself refuses to show one person's data to anyone else.",
                  "The original file is kept in private storage (Supabase), so it's still there next time you sign in. The viewer opens it through a link that expires after an hour.",
                  "To answer a question, the most relevant passages are sent to Google Gemini. The whole file is never sent at once.",
                  "Delete a document and its file, passages and chat history are removed for good.",
                ].map((text) => (
                  <li key={text} className="flex gap-3 text-[15px] leading-relaxed text-ink/90">
                    <svg className="mt-1 shrink-0 text-success" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                    {text}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-6 py-7 text-[13px] text-faint">
          <span>© {new Date().getFullYear()} InsightPDF</span>
          <div className="flex gap-5">
            <a href="#privacy" className="hover:text-ink">Privacy</a>
            <a href="https://github.com/Abhiram23-magnus/insightpdf.ai" className="hover:text-ink">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
