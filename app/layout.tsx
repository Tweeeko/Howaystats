import type { Metadata, Viewport } from "next";
import { Archivo, Barlow_Condensed, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SiteHeader } from "@/components/header";
import { StadiumBackdrop } from "@/components/stadium";
import { Logo } from "@/components/brand";
import { HERO_IMAGE, NAV, SITE } from "@/lib/site";
import { env } from "@/lib/env";

const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800", "900"], style: ["normal", "italic"], variable: "--font-barlow", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-jetbrains", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"], variable: "--font-serif4", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl()),
  title: { default: "HOWAYSTATS · Written on the Tyne. Taking the piss on the Wear.", template: "%s · HOWAYSTATS" },
  description: "Newcastle United fan site. Real scores, real Sunderland news, Geordie commentary. 18+.",
  applicationName: "HOWAYSTATS",
  openGraph: { type: "website", siteName: "HOWAYSTATS", locale: "en_GB", images: ["/api/og?type=home"] },
  twitter: { card: "summary_large_image", images: ["/api/og?type=home"] },
  creator: SITE.creator,
};

export const viewport: Viewport = { themeColor: "#050607", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${barlow.variable} ${archivo.variable} ${mono.variable} ${serif.variable}`}>
      <body className="min-h-screen pb-16 lg:pb-0">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-chalk focus:p-2 focus:text-ink">
          Skip to content
        </a>
        <StadiumBackdrop />
        <SiteHeader />
        <main id="main">{children}</main>
        <footer className="mt-20 border-t border-[var(--line)] bg-ink/90">
          <div className="stripe-bar" />
          <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Logo />
                <p className="display mt-3 text-2xl">{SITE.tagline}</p>
              </div>
              <nav aria-label="Footer">
                <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-mist">
                  {[...NAV.slice(1), { href: "/memes", label: "The Terrace" }, { href: "/how-it-works", label: "The small print" }].map((n) => (
                    <li key={n.href}>
                      <Link className="hover:text-chalk hover:underline" href={n.href}>
                        {n.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <p className="mt-8 max-w-3xl text-xs leading-relaxed text-silver">{SITE.disclaimer}</p>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-silver">
              Scores from football-data.org. News links back to whoever wrote it first. Background:{" "}
              <a className="underline" href={HERO_IMAGE.creditUrl} target="_blank" rel="noopener noreferrer">
                {HERO_IMAGE.credit}
              </a>
              , <a className="underline" href={HERO_IMAGE.licenceUrl} target="_blank" rel="noopener noreferrer">{HERO_IMAGE.licence}</a>, darkened. Built by {SITE.creator}.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
