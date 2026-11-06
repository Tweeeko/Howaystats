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
  title: { default: "HOWAYSTATS — The numbers don't lie", template: "%s · HOWAYSTATS" },
  description: SITE.secondary + " Live Premier League table, Newcastle United analytics and the Sunderland relegation watch.",
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
        <footer className="mt-24 border-t border-[var(--line)] bg-ink">
          <div className="stripe-bar" />
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.3fr_1fr_1fr]">
            <div>
              <Logo />
              <p className="display mt-3 text-2xl">{SITE.tagline}</p>
              <p className="mt-1 text-sm text-silver">{SITE.secondary}</p>
              <p className="mt-4 max-w-md text-xs leading-relaxed text-silver">{SITE.disclaimer}</p>
              <p className="mt-2 text-xs text-silver">Built by {SITE.creator}.</p>
            </div>
            <nav aria-label="Footer">
              <div className="kicker mb-2">Sections</div>
              <ul className="grid grid-cols-2 gap-1 text-sm">
                {[...NAV, { href: "/tear-jar", label: "Tears Index" }, { href: "/how-it-works", label: "How the numbers work" }].map((n) => (
                  <li key={n.href}>
                    <Link className="text-mist hover:text-chalk" href={n.href}>
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="text-xs leading-relaxed text-silver">
              <div className="kicker mb-2">Credits</div>
              <p>Match data: API-Football. News: links to the original publishers. Memes: credited to their creators and sources.</p>
              <p className="mt-2">
                Background photo:{" "}
                <a className="underline" href={HERO_IMAGE.creditUrl} target="_blank" rel="noopener noreferrer">
                  {HERO_IMAGE.credit}
                </a>
                , <a className="underline" href={HERO_IMAGE.licenceUrl} target="_blank" rel="noopener noreferrer">{HERO_IMAGE.licence}</a> (blurred and darkened).
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
