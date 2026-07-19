"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  description: string;
  external?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    id: "explore",
    label: "Explore",
    items: [
      { href: "/roots", label: "Root families",
        description: "Browse every Semitic root in the index" },
      { href: "/polyglot", label: "Polyglot table",
        description: "Same word, every daughter language, side by side" },
      { href: "/cross-language", label: "Cross-language",
        description: "Pick a language pair and see shared roots" },
      { href: "/tables", label: "Comparison tables",
        description: "Numbers, body parts, colors — curated cognate grids" },
      { href: "/themes", label: "Themes",
        description: "Roots grouped by semantic domain" },
      { href: "/timeline", label: "Timeline",
        description: "When each Semitic language was spoken and written" },
      { href: "/isogloss", label: "Isogloss map",
        description: "Where sound changes travelled" },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    items: [
      { href: "/learn", label: "Lessons",
        description: "Vocabulary and paradigms per language" },
      { href: "/guess", label: "Guess the root",
        description: "Test your feel for cross-language cognates" },
      { href: "/generators", label: "Generators",
        description: "Imagined daughter forms from a proto root" },
      { href: "/loanwords", label: "Loanwords",
        description: "Non-native vocabulary in each language" },
      { href: "/replace", label: "Loan replacement",
        description: "Rebuild a loan with native Semitic morphology" },
    ],
  },
  {
    id: "reference",
    label: "Reference",
    items: [
      { href: "/linguistics", label: "Sound changes",
        description: "Proto-Semitic → daughter phoneme correspondences" },
      { href: "/proto", label: "Proto reconstruction",
        description: "Reconstructed roots with per-slot confidence" },
      { href: "/methodology", label: "Methodology",
        description: "How the index was built and validated" },
      { href: "/stats", label: "Statistics",
        description: "Dataset coverage, root counts, per-language depth" },
      { href: "/docs", label: "API docs",
        description: "Programmatic access endpoints" },
    ],
  },
  {
    id: "type",
    label: "Typography",
    items: [
      { href: "/how-it-works", label: "How widening works",
        description: "GSUB ligatures, tatweel comparison, mkmk chain" },
      { href: "/coverage", label: "Font coverage",
        description: "Which letters widen in which fonts" },
      { href: "/font-lab", label: "Font lab",
        description: "Live playground for the stretch fonts" },
      { href: "/fonts", label: "Download fonts",
        description: "21 free .ttf files — Hebrew, Syriac, Ethiopic" },
      { href: "https://github.com/andyagtech/semitic-stretch-fonts",
        label: "Source on GitHub ↗",
        description: "Font sources, build scripts, per-font LICENSE sidecars",
        external: true },
    ],
  },
];

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close any open dropdown on outside click or Escape.
  useEffect(() => {
    if (!open && !mobileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(null);
        setMobileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, mobileOpen]);

  const isActiveGroup = (g: NavGroup) =>
    g.items.some((it) => pathname === it.href || pathname.startsWith(it.href + "/"));

  return (
    <div ref={rootRef} className="relative">
      {/* Desktop bar */}
      <nav
        id="tour-nav"
        className="hidden sm:flex items-center gap-1 text-sm"
        aria-label="Primary"
      >
        <Link
          href="/"
          className={`px-2 py-1 rounded hover:bg-neutral-100 ${
            pathname === "/" ? "text-neutral-900 font-medium" : "text-neutral-700"
          }`}
        >
          Search
        </Link>
        {GROUPS.map((g) => {
          const active = isActiveGroup(g);
          const isOpen = open === g.id;
          return (
            <div key={g.id} className="relative">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : g.id)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                className={`inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-100 ${
                  active || isOpen ? "text-neutral-900 font-medium" : "text-neutral-700"
                }`}
              >
                {g.label}
                <svg
                  width="10" height="10" viewBox="0 0 10 10"
                  className={`opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  <path d="M1 3 L5 7 L9 3" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              </button>
              {isOpen && (
                <div
                  role="menu"
                  className="absolute z-50 left-0 top-full mt-1 w-80 rounded-lg border border-neutral-200 bg-white shadow-lg p-1"
                >
                  {g.items.map((it) => {
                    const itemActive = pathname === it.href;
                    const linkClass = `block px-3 py-2 rounded hover:bg-neutral-50 ${
                      itemActive ? "bg-neutral-100" : ""
                    }`;
                    const inner = (
                      <>
                        <div className="text-sm font-medium text-neutral-900">{it.label}</div>
                        <div className="text-xs text-neutral-500 leading-snug mt-0.5">
                          {it.description}
                        </div>
                      </>
                    );
                    return it.external ? (
                      <a
                        key={it.href}
                        href={it.href}
                        role="menuitem"
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setOpen(null)}
                        className={linkClass}
                      >
                        {inner}
                      </a>
                    ) : (
                      <Link
                        key={it.href}
                        href={it.href}
                        role="menuitem"
                        onClick={() => setOpen(null)}
                        className={linkClass}
                      >
                        {inner}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <Link
          href="/settings"
          aria-label="Preferences"
          title="Preferences"
          className={`px-2 py-1 rounded hover:bg-neutral-100 ${
            pathname === "/settings" ? "text-neutral-900" : "text-neutral-500"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none">
            <path
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
              d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            />
            <path
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
              d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
            />
          </svg>
        </Link>
      </nav>

      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="sm:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded border border-neutral-300 bg-white text-sm text-neutral-700"
        aria-expanded={mobileOpen}
        aria-label="Menu"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path d="M2 4h10M2 7h10M2 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Menu
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="sm:hidden absolute z-50 right-0 top-full mt-2 w-[min(92vw,20rem)] rounded-lg border border-neutral-200 bg-white shadow-lg p-3 max-h-[70vh] overflow-y-auto">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="block px-2 py-1.5 rounded hover:bg-neutral-50 text-sm font-medium"
          >
            Search
          </Link>
          {GROUPS.map((g) => (
            <div key={g.id} className="mt-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 px-2 mb-1">
                {g.label}
              </div>
              <div>
                {g.items.map((it) => {
                  const cls = `block px-2 py-1.5 rounded hover:bg-neutral-50 text-sm ${
                    pathname === it.href ? "bg-neutral-100 font-medium" : "text-neutral-700"
                  }`;
                  return it.external ? (
                    <a
                      key={it.href}
                      href={it.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setMobileOpen(false)}
                      className={cls}
                    >
                      {it.label}
                    </a>
                  ) : (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setMobileOpen(false)}
                      className={cls}
                    >
                      {it.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="mt-3 pt-3 border-t border-neutral-200">
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className="block px-2 py-1.5 rounded hover:bg-neutral-50 text-sm text-neutral-700"
            >
              Preferences
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
