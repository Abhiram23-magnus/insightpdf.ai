// app/layout.tsx
// The root layout wraps every page. We load two Google fonts here:
//   - Fraunces (a characterful display serif) for headings/brand
//   - Geist Sans-like "Outfit" for body text
// and expose them as CSS variables that Tailwind picks up.

import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
});

const body = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "InsightPDF AI — Turn Documents into Actionable Insights",
  description:
    "Upload a PDF and ask questions about it. Powered by RAG, LangChain, ChromaDB and Google Gemini.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: the script below may add the "dark" class
    // before React loads, which is expected and not a real mismatch.
    <html
      lang="en"
      className={`${display.variable} ${body.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved theme BEFORE the page paints, so there's no
            white flash when someone who chose dark mode reloads. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased grain">{children}</body>
    </html>
  );
}
