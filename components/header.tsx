"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BOTTOM_NAV, NAV } from "@/lib/site";
import { Logo } from "./brand";

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

/** Slim sticky header (48px on phones). Full nav on desktop, "More" sheet on mobile. */
export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-ink/90 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 lg:h-14">
          <Link href="/" aria-label="HOWAYSTATS home" className="scale-[.85] origin-left lg:scale-100">
            <Logo />
          </Link>
          <nav className="hidden lg:block" aria-label="Main">
            <ul className="flex items-center">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className={`display relative block whitespace-nowrap px-2 py-2 text-[0.98rem] xl:px-3 ${isActive(path, n.href) ? "text-chalk" : "text-silver hover:text-chalk"}`}
                  >
                    {n.label}
                    {isActive(path, n.href) && <span className="absolute inset-x-2.5 -bottom-[13px] h-[3px] bg-chalk" />}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <button className="display -mr-2 px-3 py-2 text-base text-mist lg:hidden" aria-expanded={open} aria-controls="more-nav" onClick={() => setOpen((o) => !o)}>
            {open ? "Close" : "More"}
          </button>
        </div>
        {open && (
          <nav id="more-nav" className="border-t border-[var(--line)] bg-ink lg:hidden" aria-label="All sections">
            <ul className="grid grid-cols-2">
              {NAV.map((n) => (
                <li key={n.href} className="border-b border-r border-[var(--line)]">
                  <Link href={n.href} className={`display block px-4 py-4 text-xl ${isActive(path, n.href) ? "bg-chalk text-ink" : "text-chalk"}`}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <BottomNav path={path} />
    </>
  );
}

function BottomNav({ path }: { path: string }) {
  const items = BOTTOM_NAV.map((h) => NAV.find((n) => n.href === h)!);
  return (
    <nav
      aria-label="Quick"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line-strong)] bg-ink/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {items.map((n) => {
          const on = isActive(path, n.href);
          return (
            <li key={n.href}>
              <Link href={n.href} className={`display flex h-14 flex-col items-center justify-center text-[0.95rem] ${on ? "text-chalk" : "text-silver"}`}>
                <span className={`mb-1 h-[3px] w-6 ${on ? (n.href === "/mackem-watch" ? "bg-mackem" : "bg-chalk") : "bg-transparent"}`} />
                {n.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
