"use client";

// Coach-marks tour: a darkened backdrop with a transparent cutout around
// the currently-highlighted element, plus a floating tooltip card with
// step content and Next/Skip controls.
//
// Auto-runs once per device (localStorage flag 'semitic-tour-seen').
// Replayable via <TourHelpButton />.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type TourStep = {
  /** id of a DOM element to spotlight (document.getElementById). If omitted,
   *  the step renders centered with no cutout. */
  targetId?: string;
  title: string;
  body: string;
  /** Where to place the tooltip relative to the target. Auto-flips on small
   *  screens. Ignored when targetId is omitted (then it centers). */
  placement?: "top" | "bottom" | "left" | "right";
};

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to Semitic Search",
    body:
      "Explore the root structure of 17 Semitic languages — from ancient Akkadian and Ugaritic through modern Arabic, Hebrew, Amharic and Neo-Aramaic. Everything is cross-indexed by canonical root, so cognates show up no matter what script you type in.",
  },
  {
    targetId: "tour-search-box",
    placement: "bottom",
    title: "Search any Semitic word",
    body:
      "Paste or type a word in Arabic, Hebrew, Syriac, Ethiopic, cuneiform Akkadian, or the ancient scripts. The app identifies the root, finds cognates across the family, and reconstructs the Proto-Semitic ancestor.",
  },
  {
    targetId: "tour-script-buttons",
    placement: "bottom",
    title: "Or type in romanization",
    body:
      "No Semitic keyboard? Switch to Buckwalter (Arabic) or SBL (Hebrew) romanization and type in Latin letters. There's an on-screen keyboard available too.",
  },
  {
    targetId: "tour-nav",
    placement: "bottom",
    title: "Eight ways to explore",
    body:
      "Browse curated root families, walk through the attestation timeline (Tanakh → Mishnah → Qur'an), see Proto-Semitic sound correspondences, or intersect languages to find shared vocabulary. Also: a guess-the-cognate game.",
  },
  {
    targetId: "tour-root-of-day",
    placement: "top",
    title: "A root every day",
    body:
      "A new featured root rotates at midnight — a good starting point if you're not sure what to search. Click to see its full cross-script family.",
  },
  {
    targetId: "tour-seed-packs",
    placement: "top",
    title: "Themed tours",
    body:
      "Curated sets of roots around a common topic: body parts, kinship terms, colors, numbers, roots for peace across the family. One-click to explore.",
  },
  {
    title: "Tips & tricks",
    body:
      "Press / anywhere to focus the search box. Results pages have a ? 'Help' button in the nav — click it to see this tour again anytime. Every page is shareable via its URL.",
  },
];

export function Tour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const card = useRef<HTMLDivElement>(null);

  const current = TOUR_STEPS[step];
  const total = TOUR_STEPS.length;

  const updateRect = useCallback(() => {
    if (!current.targetId) { setRect(null); return; }
    const el = document.getElementById(current.targetId);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Small delay so the scroll finishes before we measure.
    requestAnimationFrame(() => {
      setRect(el.getBoundingClientRect());
    });
  }, [current]);

  useLayoutEffect(() => { updateRect(); }, [updateRect]);
  useEffect(() => {
    const onResize = () => updateRect();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [updateRect]);

  const advance = () => {
    if (step < total - 1) setStep(step + 1);
    else finish();
  };
  const finish = () => {
    try { localStorage.setItem("semitic-tour-seen", "1"); } catch { /* ignore */ }
    onClose();
  };

  // Compute tooltip position from rect + placement. If rect is null, center.
  const tooltip = (() => {
    if (!rect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const pad = 14;
    const cw = 340;
    const ch = 180;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let placement = current.placement ?? "bottom";
    if (placement === "bottom" && rect.bottom + pad + ch > vh) placement = "top";
    if (placement === "top" && rect.top - pad - ch < 0) placement = "bottom";
    if (placement === "right" && rect.right + pad + cw > vw) placement = "left";
    if (placement === "left" && rect.left - pad - cw < 0) placement = "right";
    switch (placement) {
      case "top":
        return {
          top: Math.max(8, rect.top - pad - ch) + "px",
          left: Math.min(vw - cw - 8, Math.max(8, rect.left + rect.width / 2 - cw / 2)) + "px",
        };
      case "bottom":
        return {
          top: Math.min(vh - ch - 8, rect.bottom + pad) + "px",
          left: Math.min(vw - cw - 8, Math.max(8, rect.left + rect.width / 2 - cw / 2)) + "px",
        };
      case "left":
        return {
          top: Math.min(vh - ch - 8, Math.max(8, rect.top + rect.height / 2 - ch / 2)) + "px",
          left: Math.max(8, rect.left - pad - cw) + "px",
        };
      case "right":
        return {
          top: Math.min(vh - ch - 8, Math.max(8, rect.top + rect.height / 2 - ch / 2)) + "px",
          left: Math.min(vw - cw - 8, rect.right + pad) + "px",
        };
    }
  })();

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dark backdrop with an optional cutout around the spotlight target. */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-auto"
        onClick={advance}
      >
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.x - 6}
                y={rect.y - 6}
                width={rect.width + 12}
                height={rect.height + 12}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(10, 10, 20, 0.65)"
          mask="url(#tour-mask)"
        />
        {rect && (
          <rect
            x={rect.x - 6}
            y={rect.y - 6}
            width={rect.width + 12}
            height={rect.height + 12}
            rx="8"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            style={{ pointerEvents: "none" }}
          />
        )}
      </svg>

      {/* Tooltip card */}
      <div
        ref={card}
        className="absolute pointer-events-auto w-80 bg-white border border-amber-200 rounded-lg shadow-xl p-4"
        style={tooltip as React.CSSProperties}
      >
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">
            Tour · {step + 1} of {total}
          </span>
          <button
            onClick={finish}
            className="text-xs text-neutral-400 hover:text-neutral-700"
            aria-label="Close tour"
          >
            skip
          </button>
        </div>
        <h3 className="font-semibold text-neutral-900 mb-1">{current.title}</h3>
        <p className="text-sm text-neutral-700 leading-snug">{current.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i === step ? "bg-amber-500" : "bg-neutral-300"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="text-xs px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-50"
              >
                Back
              </button>
            )}
            <button
              onClick={advance}
              className="text-xs px-3 py-1 rounded bg-amber-500 text-white hover:bg-amber-600 font-medium"
            >
              {step === total - 1 ? "Done" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mounts <Tour> on first visit and exposes a Help button that replays it. */
export function TourHost() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("semitic-tour-seen")) {
        // Delay so DOM elements are measurable.
        setTimeout(() => setOpen(true), 400);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const onHelp = () => setOpen(true);
    window.addEventListener("semitic-tour-open", onHelp);
    return () => window.removeEventListener("semitic-tour-open", onHelp);
  }, []);

  if (!open) return null;
  return <Tour onClose={() => setOpen(false)} />;
}

export function TourHelpButton({ className = "" }: { className?: string }) {
  const onClick = () => window.dispatchEvent(new Event("semitic-tour-open"));
  return (
    <button
      onClick={onClick}
      className={`text-neutral-500 hover:text-neutral-900 underline-offset-2 hover:underline ${className}`}
      title="Replay the tour"
    >
      ? Help
    </button>
  );
}
