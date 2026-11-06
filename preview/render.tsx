import { readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "../app/page";
import MackemWatch from "../app/mackem-watch/page";
import News from "../app/news/page";
import Toon from "../app/newcastle/page";
import Derby from "../app/tyne/page";
import Table from "../app/premier-league/page";
import SmallPrint from "../app/how-it-works/page";
import { SiteHeader } from "../components/header";
import { StadiumBackdrop } from "../components/stadium";
import { SITE } from "../lib/site";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace('@import "tailwindcss";', "");

async function page(title: string, el: any) {
  const body = renderToStaticMarkup(
    <>
      <div style={{ background: "#111214", color: "#f4f4f0", textAlign: "center", font: "800 13px/1.4 system-ui, sans-serif", padding: "6px 10px", position: "sticky", top: 0, zIndex: 60 }}>
        PREVIEW · Real data from the live database, 6 Nov 2026. Links don't work in the preview.
      </div>
      <StadiumBackdrop />
      <SiteHeader />
      <div className="stripes h-2" />
      <main>{el}</main>
      <footer className="mt-20 border-t border-[var(--line)] bg-ink/90"><div className="stripe-bar" /><div className="mx-auto max-w-6xl px-4 py-10"><p className="display text-2xl">{SITE.tagline}</p><p className="mt-4 max-w-3xl text-xs text-silver">{SITE.disclaimer}</p></div></footer>
    </>,
  );
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700&family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=JetBrains+Mono:wght@500;700&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
<style type="text/tailwindcss">
:root { --font-barlow: "Barlow Condensed"; --font-archivo: "Archivo"; --font-jetbrains: "JetBrains Mono"; --font-serif4: "Source Serif 4"; }
${css}
</style></head><body class="min-h-screen">${body}</body></html>`;
}

(async () => {
  const sp = Promise.resolve({});
  const pages: [string, () => Promise<any>][] = [
    ["home", () => Home()],
    ["news", () => News({ searchParams: sp as any })],
    ["mackem-watch", () => MackemWatch()],
    ["newcastle", () => Toon()],
    ["tyne", () => Derby()],
    ["premier-league", () => Table({ searchParams: sp as any })],
    ["how-it-works", () => SmallPrint()],
  ];
  for (const [name, fn] of pages) {
    const html = await page(`HOWAYSTATS preview: ${name}`, await fn());
    writeFileSync(new URL(`./${name}.html`, import.meta.url), html);
    console.log(name, html.length);
  }
})();
