import { readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "../app/page";
import MackemWatch from "../app/mackem-watch/page";
import TearsPage from "../app/tear-jar/page";
import { SiteHeader } from "../components/header";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace('@import "tailwindcss";', "");

async function page(title: string, el: any) {
  const body = renderToStaticMarkup(
    <>
      <div style={{ background: "#e0161f", color: "#f4f4f0", textAlign: "center", font: "800 13px/1.4 system-ui, sans-serif", padding: "6px 10px", position: "sticky", top: 0, zIndex: 60 }}>
        FAKE SAMPLE NUMBERS — LAYOUT PREVIEW ONLY. The live site shows football-data.org data.
      </div>
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 55, pointerEvents: "none", display: "grid", placeItems: "center", overflow: "hidden" }}>
        <div style={{ transform: "rotate(-30deg)", font: "900 13vw/1 system-ui, sans-serif", color: "rgba(224,22,31,.10)", whiteSpace: "nowrap" }}>SAMPLE DATA</div>
      </div>
      <div className="stadium" aria-hidden="true"><div className="floodlight l" /><div className="floodlight r" /></div>
      <SiteHeader />
      <main>{el}</main>
      <footer className="mt-24 border-t border-[var(--line)] bg-ink"><div className="stripe-bar" /><div className="mx-auto max-w-7xl px-4 py-10 text-xs text-silver">HOWAYSTATS · independent fan site · built by Leeko</div></footer>
    </>,
  );
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700&family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=JetBrains+Mono:wght@500;700&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
<style type="text/tailwindcss">
:root { --font-barlow: "Barlow Condensed"; --font-archivo: "Archivo"; --font-jetbrains: "JetBrains Mono"; --font-serif4: "Source Serif 4"; }
${css}
.stadium { background: radial-gradient(120% 70% at 50% 0%, #1b2a21 0%, #0b0e0c 45%, #050607 80%); }
</style></head><body class="min-h-screen">${body}</body></html>`;
}

(async () => {
const home = await page("HOWAYSTATS — design preview", await Home());
writeFileSync(new URL("./home.html", import.meta.url), home);
const mw = await page("HOWAYSTATS — Mackem Watch preview", await MackemWatch());
writeFileSync(new URL("./mackem-watch.html", import.meta.url), mw);
const tj = await page("HOWAYSTATS — Tears Index preview", await TearsPage());
writeFileSync(new URL("./tear-jar.html", import.meta.url), tj);
console.log("home", home.length, "mackem", mw.length);
})();
