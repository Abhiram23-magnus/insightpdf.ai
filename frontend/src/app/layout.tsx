// app/layout.tsx — wraps every page.
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "InsightPDF — Your documents, understood",
  description:
    "Upload a PDF and ask it anything. Answers stream in and cite the exact page they came from.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B1020" },
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
  ],
};

// Runs before the page paints: applies the saved theme (dark by default)
// so there's never a flash of the wrong colors.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"){document.documentElement.classList.add("dark")}}catch(e){document.documentElement.classList.add("dark")}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
