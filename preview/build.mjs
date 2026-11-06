// Compile Tailwind locally for the rendered preview pages, inline it, and screenshot at phone + desktop widths.
import { readFileSync, writeFileSync } from "node:fs";
import { compile } from "/opt/npm-tools/node_modules/tailwindcss/dist/lib.mjs";
import { chromium } from "/opt/npm-tools/node_modules/playwright/index.mjs";

const root = new URL("../", import.meta.url);
const globals = readFileSync(new URL("app/globals.css", root), "utf8");
const fonts = `:root { --font-barlow: "Barlow Condensed", "DejaVu Sans Condensed"; --font-archivo: "Archivo", "DejaVu Sans"; --font-jetbrains: "JetBrains Mono", "DejaVu Sans Mono"; --font-serif4: "Source Serif 4", "DejaVu Serif"; }`;
const compiler = await compile(globals, {
  base: "/opt/npm-tools/node_modules/tailwindcss",
  loadStylesheet: async (id, base) => ({ path: "/opt/npm-tools/node_modules/tailwindcss/index.css", base, content: readFileSync("/opt/npm-tools/node_modules/tailwindcss/index.css", "utf8") }),
});

const pages = process.argv.slice(2);
const browser = await chromium.launch();
for (const name of pages) {
  const file = new URL(`preview/${name}.html`, root);
  let html = readFileSync(file, "utf8");
  const candidates = new Set(html.match(/class="([^"]+)"/g)?.flatMap((m) => m.slice(7, -1).replace(/&amp;/g, "&").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").split(/\s+/)) ?? []);
  const css = compiler.build([...candidates]);
  html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@tailwindcss\/browser@4"><\/script>\s*<style type="text\/tailwindcss">[\s\S]*?<\/style>/, `<style>${fonts}\n${css}\n.stadium{background:radial-gradient(120% 70% at 50% 0%,#1b2a21 0%,#0b0e0c 45%,#050607 80%)}</style>`);
  writeFileSync(file, html);
  for (const [w, h, tag] of [[390, 844, "phone"], [1280, 900, "desktop"]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: tag === "phone" ? 2 : 1 });
    await page.goto(file.href);
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const bad = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > W + 1) && !el.closest(".ticker, .overflow-x-auto, .snap-x")) bad.push(`${el.tagName}.${(el.className?.baseVal ?? el.className ?? "").toString().slice(0, 60)} right=${Math.round(r.right)}`);
      }
      return { scrollW: document.documentElement.scrollWidth, W, bad: bad.slice(0, 12) };
    });
    console.log(name, tag, JSON.stringify(overflow));
    await page.screenshot({ path: new URL(`preview/shots/${name}-${tag}.png`, root).pathname, fullPage: true });
    await page.close();
  }
}
await browser.close();
