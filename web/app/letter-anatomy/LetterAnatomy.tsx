"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// One point in a glyph — x, y are in font units (UPM 1000 for Frank Ruhl).
type Pt = { x: number; y: number; onCurve: boolean };
// One contour — array of points.
type Contour = Pt[];
// One glyph — a name, contours, xMin/yMin/xMax/yMax bounds, unitsPerEm.
type Glyph = {
  name: string;
  contours: Contour[];
  bounds: { xMin: number; yMin: number; xMax: number; yMax: number };
  upem: number;
  advance: number;
};

// Fonts we can load. Each entry: display label + .ttf file path (relative
// to /public). The list mirrors the stretch-debug picker for consistency.
const FONTS: Array<{ id: string; label: string; file: string }> = [
  { id: "frank-ruhl-src", label: "Frank Ruhl (source)", file: "FrankRuhlLibre.ttf" },
  { id: "stretch-hebrew", label: "Semitic Stretch Hebrew", file: "SemiticStretchHebrew-v2.ttf" },
];

// Hebrew letters — Unicode codepoint plus a short name. Rendered as
// clickable chips so we pick by shape not memorized code.
const HEBREW_LETTERS: Array<{ cp: number; name: string; ch: string }> = [
  { cp: 0x05D0, name: "aleph",    ch: "א" },
  { cp: 0x05D1, name: "bet",      ch: "ב" },
  { cp: 0x05D2, name: "gimel",    ch: "ג" },
  { cp: 0x05D3, name: "dalet",    ch: "ד" },
  { cp: 0x05D4, name: "he",       ch: "ה" },
  { cp: 0x05D5, name: "vav",      ch: "ו" },
  { cp: 0x05D6, name: "zayin",    ch: "ז" },
  { cp: 0x05D7, name: "het",      ch: "ח" },
  { cp: 0x05D8, name: "tet",      ch: "ט" },
  { cp: 0x05D9, name: "yod",      ch: "י" },
  { cp: 0x05DA, name: "finalkaf", ch: "ך" },
  { cp: 0x05DB, name: "kaf",      ch: "כ" },
  { cp: 0x05DC, name: "lamed",    ch: "ל" },
  { cp: 0x05DD, name: "finalmem", ch: "ם" },
  { cp: 0x05DE, name: "mem",      ch: "מ" },
  { cp: 0x05DF, name: "finalnun", ch: "ן" },
  { cp: 0x05E0, name: "nun",      ch: "נ" },
  { cp: 0x05E1, name: "samekh",   ch: "ס" },
  { cp: 0x05E2, name: "ayin",     ch: "ע" },
  { cp: 0x05E3, name: "finalpe",  ch: "ף" },
  { cp: 0x05E4, name: "pe",       ch: "פ" },
  { cp: 0x05E5, name: "finaltsadi", ch: "ץ" },
  { cp: 0x05E6, name: "tzade",    ch: "צ" },
  { cp: 0x05E7, name: "qof",      ch: "ק" },
  { cp: 0x05E8, name: "resh",     ch: "ר" },
  { cp: 0x05E9, name: "shin",     ch: "ש" },
  { cp: 0x05EA, name: "tav",      ch: "ת" },
];

// A rainbow of contour colours. Contour 0 is charcoal so the outer body
// reads as the "letter"; sub-contours get accent hues so they pop.
const CONTOUR_COLOURS = [
  "#1f2937", // 0: outer body
  "#dc2626", // 1: red
  "#059669", // 2: emerald
  "#7c3aed", // 3: violet
  "#d97706", // 4: amber
  "#0891b2", // 5: cyan
];

// Load a font over the network with opentype.js and extract per-glyph
// contour geometry. Cached by (file, cp) so switching between letters is
// instant after the initial load.
type GlyphCache = Map<string, Glyph>;
const glyphCaches = new Map<string, GlyphCache>();

async function loadGlyph(file: string, cp: number): Promise<Glyph | null> {
  let cache = glyphCaches.get(file);
  if (!cache) {
    cache = new Map();
    glyphCaches.set(file, cache);
  }
  const cacheKey = `${cp}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const opentype = await import("opentype.js");
  const buf = await (await fetch(`/fonts/${file}`)).arrayBuffer();
  const font = opentype.parse(buf);
  const glyph = font.charToGlyph(String.fromCodePoint(cp));
  if (!glyph) return null;

  // Extract raw path commands. opentype.js gives us a compiled Path with
  // M/L/Q/C commands — for our purposes we want the ORIGINAL contour
  // points with on/off-curve flags, which live inside glyph.points on
  // a TrueType parse. We rehydrate points from the low-level layer if
  // available, otherwise fall back to sampling the path.
  const raw = (glyph as unknown as { points?: Array<{ x: number; y: number; onCurve: boolean; lastPointOfContour?: boolean }> }).points;
  const contours: Contour[] = [];
  if (raw && raw.length) {
    let current: Pt[] = [];
    for (const p of raw) {
      current.push({ x: p.x, y: p.y, onCurve: !!p.onCurve });
      if (p.lastPointOfContour) {
        contours.push(current);
        current = [];
      }
    }
    if (current.length) contours.push(current);
  } else {
    // Fallback: walk the Path and record M/L/Q/C endpoints.
    const path = glyph.getPath(0, 0, font.unitsPerEm);
    let current: Pt[] = [];
    for (const cmd of path.commands as Array<{ type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number }>) {
      if (cmd.type === "M") {
        if (current.length) contours.push(current);
        current = [{ x: cmd.x ?? 0, y: cmd.y ?? 0, onCurve: true }];
      } else if (cmd.type === "L") {
        current.push({ x: cmd.x ?? 0, y: cmd.y ?? 0, onCurve: true });
      } else if (cmd.type === "Q") {
        current.push({ x: cmd.x1 ?? 0, y: cmd.y1 ?? 0, onCurve: false });
        current.push({ x: cmd.x ?? 0, y: cmd.y ?? 0, onCurve: true });
      } else if (cmd.type === "C") {
        current.push({ x: cmd.x1 ?? 0, y: cmd.y1 ?? 0, onCurve: false });
        current.push({ x: cmd.x2 ?? 0, y: cmd.y2 ?? 0, onCurve: false });
        current.push({ x: cmd.x ?? 0, y: cmd.y ?? 0, onCurve: true });
      } else if (cmd.type === "Z") {
        if (current.length) contours.push(current);
        current = [];
      }
    }
    if (current.length) contours.push(current);
  }

  const bounds = glyph.getBoundingBox() as { x1: number; y1: number; x2: number; y2: number };
  const g: Glyph = {
    name: (glyph as unknown as { name?: string }).name ?? `U+${cp.toString(16).toUpperCase()}`,
    contours,
    bounds: { xMin: bounds.x1, yMin: bounds.y1, xMax: bounds.x2, yMax: bounds.y2 },
    upem: font.unitsPerEm,
    advance: (glyph as unknown as { advanceWidth?: number }).advanceWidth ?? bounds.x2,
  };
  cache.set(cacheKey, g);
  return g;
}

export function LetterAnatomy() {
  const [fontIdx, setFontIdx] = useState(0);
  const [cp, setCp] = useState(0x05D0); // aleph default
  const [glyph, setGlyph] = useState<Glyph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xCutoff, setXCutoff] = useState<number | null>(null);
  const [barBottom, setBarBottom] = useState<number | null>(null);
  const [barTop, setBarTop] = useState<number | null>(null);
  const [showPointIndices, setShowPointIndices] = useState(true);
  const [hoverPoint, setHoverPoint] = useState<{ ci: number; pi: number } | null>(null);

  // Load the requested glyph whenever the font or codepoint changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadGlyph(FONTS[fontIdx].file, cp)
      .then((g) => {
        if (cancelled) return;
        setGlyph(g);
        if (g) {
          // Reset partition sliders to sensible defaults for the new glyph.
          setXCutoff(Math.round((g.bounds.xMin + g.bounds.xMax) / 2));
          setBarBottom(g.bounds.yMin);
          setBarTop(g.bounds.yMax);
        }
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fontIdx, cp]);

  // SVG dimensions. Font units → screen pixels. We show a 1200×1000 unit
  // window centred on the glyph, adjusted to always include the glyph
  // bounds plus 100 units of padding.
  const svgWidth = 900;
  const svgHeight = 700;
  const viewBox = useMemo(() => {
    if (!glyph) return `-100 -700 1200 900`;
    const pad = 100;
    const w = glyph.bounds.xMax - glyph.bounds.xMin + 2 * pad;
    const h = glyph.bounds.yMax - glyph.bounds.yMin + 2 * pad;
    // SVG y is downward but font y is upward. Flip in the transform,
    // pick viewBox in font units directly.
    const cx = (glyph.bounds.xMin + glyph.bounds.xMax) / 2;
    const cy = (glyph.bounds.yMin + glyph.bounds.yMax) / 2;
    const size = Math.max(w, h);
    return `${cx - size / 2} ${cy - size / 2} ${size} ${size}`;
  }, [glyph]);

  // Build an SVG path from the contour points. Uses TrueType quadratic
  // semantics — pairs of off-curve points get an implicit ON-curve at
  // their midpoint. This gives the same visual outline as the font
  // renderer would produce.
  const contourPaths: string[] = useMemo(() => {
    if (!glyph) return [];
    return glyph.contours.map((ctr) => {
      if (!ctr.length) return "";
      // TrueType: if first point is off-curve, start at the midpoint
      // between the LAST and FIRST points. This keeps the walk closed.
      let firstOn = ctr[0].onCurve ? ctr[0] : null;
      if (!firstOn) {
        const last = ctr[ctr.length - 1];
        if (last.onCurve) firstOn = last;
        else firstOn = { x: (ctr[0].x + last.x) / 2, y: (ctr[0].y + last.y) / 2, onCurve: true };
      }
      const parts: string[] = [`M ${firstOn.x} ${firstOn.y}`];
      for (let i = 0; i < ctr.length; i++) {
        const cur = ctr[i];
        const nxt = ctr[(i + 1) % ctr.length];
        if (cur.onCurve) continue;
        // cur is off-curve — the curve command is FROM the previous
        // on-curve, VIA cur, TO the next on-curve (or midpoint if two
        // off-curves in a row).
        const endpoint = nxt.onCurve ? nxt : { x: (cur.x + nxt.x) / 2, y: (cur.y + nxt.y) / 2 };
        parts.push(`Q ${cur.x} ${cur.y} ${endpoint.x} ${endpoint.y}`);
      }
      parts.push("Z");
      return parts.join(" ");
    });
  }, [glyph]);

  // Classify each point by which INFIX partition it lands on.
  // Returns "shift" (stays after mono via bar-class shift+mono) or
  // "keep" (translates rightward via mono only).
  const partitionOf = (x: number, y: number): "shift" | "keep" | "outside" => {
    if (xCutoff === null || barBottom === null || barTop === null) return "outside";
    const inYRange = y >= barBottom && y <= barTop;
    if (!inYRange) return "keep"; // mono translates rightward
    if (x < xCutoff) return "shift"; // shift-and-stays
    return "keep";
  };

  const cur = HEBREW_LETTERS.find((l) => l.cp === cp);
  return (
    <div className="space-y-6">
      {/* Font + codepoint pickers */}
      <section className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-neutral-600">font</span>
            <select
              value={fontIdx}
              onChange={(e) => setFontIdx(parseInt(e.target.value, 10))}
              className="border border-neutral-300 rounded px-2 py-1 text-sm"
            >
              {FONTS.map((f, i) => (
                <option key={f.id} value={i}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <div className="ml-auto text-xs text-neutral-500">
            {loading ? "loading…" : glyph ? (
              <>
                <span className="font-mono">{glyph.name}</span> — {glyph.contours.length} contours,{" "}
                {glyph.contours.reduce((s, c) => s + c.length, 0)} pts, upem={glyph.upem},
                bounds=({glyph.bounds.xMin},{glyph.bounds.yMin})..({glyph.bounds.xMax},{glyph.bounds.yMax})
              </>
            ) : (
              <span>no glyph</span>
            )}
            {error ? <span className="ml-3 text-red-600">error: {error}</span> : null}
          </div>
        </div>
        {/* Letter grid — click to select */}
        <div className="grid grid-cols-9 gap-1">
          {HEBREW_LETTERS.map((L) => (
            <button
              key={L.cp}
              onClick={() => setCp(L.cp)}
              className={`text-2xl px-2 py-1 rounded border ${
                cp === L.cp ? "border-neutral-900 bg-neutral-100" : "border-neutral-200 hover:bg-neutral-50"
              }`}
              title={`${L.name} (U+${L.cp.toString(16).toUpperCase()})`}
            >
              <span style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>{L.ch}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Partition sliders */}
      {glyph ? (
        <section className="bg-white border border-neutral-200 rounded-lg p-4 space-y-2 text-sm">
          <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
            INFIX partition preview
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-2">
              <span className="w-16 text-neutral-600">x_cutoff</span>
              <input
                type="range"
                min={glyph.bounds.xMin - 50}
                max={glyph.bounds.xMax + 50}
                step={1}
                value={xCutoff ?? 0}
                onChange={(e) => setXCutoff(parseInt(e.target.value, 10))}
                className="flex-1"
              />
              <span className="w-14 text-right tabular-nums font-mono text-neutral-500">
                {xCutoff}
              </span>
            </label>
            <label className="flex items-center gap-2">
              <span className="w-16 text-neutral-600">bar_bot</span>
              <input
                type="range"
                min={glyph.bounds.yMin - 100}
                max={glyph.bounds.yMax + 100}
                step={1}
                value={barBottom ?? 0}
                onChange={(e) => setBarBottom(parseInt(e.target.value, 10))}
                className="flex-1"
              />
              <span className="w-14 text-right tabular-nums font-mono text-neutral-500">
                {barBottom}
              </span>
            </label>
            <label className="flex items-center gap-2">
              <span className="w-16 text-neutral-600">bar_top</span>
              <input
                type="range"
                min={glyph.bounds.yMin - 100}
                max={glyph.bounds.yMax + 100}
                step={1}
                value={barTop ?? 0}
                onChange={(e) => setBarTop(parseInt(e.target.value, 10))}
                className="flex-1"
              />
              <span className="w-14 text-right tabular-nums font-mono text-neutral-500">
                {barTop}
              </span>
            </label>
          </div>
          <div className="flex items-center gap-4 text-xs pt-2">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={showPointIndices}
                onChange={(e) => setShowPointIndices(e.target.checked)}
              />
              <span>show point indices</span>
            </label>
            <span className="ml-auto text-neutral-500">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1 align-middle" />
              shift (stays via mono)
              <span className="inline-block w-3 h-3 rounded-full bg-rose-500 ml-4 mr-1 align-middle" />
              keep (translates right)
            </span>
          </div>
        </section>
      ) : null}

      {/* Canvas + point list */}
      {glyph ? (
        <section className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* SVG canvas */}
            <div className="flex-1 min-w-0 overflow-x-auto">
              <svg
                width={svgWidth}
                height={svgHeight}
                viewBox={viewBox}
                className="border border-neutral-200 bg-neutral-50 rounded"
                style={{ maxWidth: "100%" }}
              >
                {/* Flip y so font-up == screen-up */}
                <g transform={`scale(1, -1) translate(0, ${-2 * ((glyph.bounds.yMin + glyph.bounds.yMax) / 2)})`}>
                  {/* Baseline (y=0) */}
                  <line
                    x1={glyph.bounds.xMin - 200}
                    x2={glyph.bounds.xMax + 200}
                    y1={0}
                    y2={0}
                    stroke="#9ca3af"
                    strokeWidth={1}
                    strokeDasharray="6 4"
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* bar_bottom / bar_top / x_cutoff overlays */}
                  {barBottom !== null ? (
                    <line
                      x1={glyph.bounds.xMin - 200}
                      x2={glyph.bounds.xMax + 200}
                      y1={barBottom}
                      y2={barBottom}
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  {barTop !== null ? (
                    <line
                      x1={glyph.bounds.xMin - 200}
                      x2={glyph.bounds.xMax + 200}
                      y1={barTop}
                      y2={barTop}
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  {xCutoff !== null ? (
                    <line
                      x1={xCutoff}
                      x2={xCutoff}
                      y1={glyph.bounds.yMin - 200}
                      y2={glyph.bounds.yMax + 200}
                      stroke="#ec4899"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  {/* Each contour: fill + stroke + points */}
                  {glyph.contours.map((_, i) => {
                    const colour = CONTOUR_COLOURS[i % CONTOUR_COLOURS.length];
                    return (
                      <g key={i}>
                        <path
                          d={contourPaths[i]}
                          fill={colour}
                          fillOpacity={0.15}
                          stroke={colour}
                          strokeWidth={1.5}
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                    );
                  })}
                  {/* Points — offset counter tracks the flat point index used elsewhere */}
                  {(() => {
                    let flatIdx = 0;
                    return glyph.contours.flatMap((ctr, ci) => {
                      const colour = CONTOUR_COLOURS[ci % CONTOUR_COLOURS.length];
                      return ctr.map((pt, pi) => {
                        const part = partitionOf(pt.x, pt.y);
                        const fill = part === "shift" ? "#3b82f6" : part === "keep" ? "#ef4444" : "#a3a3a3";
                        const stroke = pt.onCurve ? colour : "#000";
                        const idx = flatIdx++;
                        const hovered = hoverPoint?.ci === ci && hoverPoint?.pi === pi;
                        return (
                          <g
                            key={`${ci}-${pi}`}
                            onMouseEnter={() => setHoverPoint({ ci, pi })}
                            onMouseLeave={() => setHoverPoint((h) => (h?.ci === ci && h?.pi === pi ? null : h))}
                          >
                            {pt.onCurve ? (
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={hovered ? 12 : 7}
                                fill={fill}
                                stroke={stroke}
                                strokeWidth={hovered ? 3 : 1.5}
                                vectorEffect="non-scaling-stroke"
                              />
                            ) : (
                              <rect
                                x={pt.x - (hovered ? 10 : 6)}
                                y={pt.y - (hovered ? 10 : 6)}
                                width={hovered ? 20 : 12}
                                height={hovered ? 20 : 12}
                                fill={fill}
                                stroke={stroke}
                                strokeWidth={hovered ? 3 : 1.5}
                                vectorEffect="non-scaling-stroke"
                              />
                            )}
                            {showPointIndices ? (
                              <text
                                x={pt.x + 15}
                                y={pt.y + 5}
                                fontSize={22}
                                fill={colour}
                                fontFamily="ui-monospace, monospace"
                                transform={`scale(1, -1) translate(0, ${-2 * pt.y})`}
                              >
                                {idx}
                              </text>
                            ) : null}
                          </g>
                        );
                      });
                    });
                  })()}
                </g>
              </svg>
            </div>

            {/* Right side: hover info + per-contour summary */}
            <aside className="w-full lg:w-72 shrink-0 space-y-4 text-sm">
              <div className="border border-neutral-200 rounded p-3">
                <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
                  hover
                </div>
                {hoverPoint && glyph.contours[hoverPoint.ci] ? (
                  (() => {
                    const p = glyph.contours[hoverPoint.ci][hoverPoint.pi];
                    let idx = 0;
                    for (let c = 0; c < hoverPoint.ci; c++) idx += glyph.contours[c].length;
                    idx += hoverPoint.pi;
                    return (
                      <div className="font-mono text-xs space-y-0.5">
                        <div>index {idx}</div>
                        <div>contour {hoverPoint.ci}, point {hoverPoint.pi}</div>
                        <div>({p.x}, {p.y})</div>
                        <div>{p.onCurve ? "ON-curve" : "off-curve"}</div>
                        <div>
                          partition:{" "}
                          <span className={
                            partitionOf(p.x, p.y) === "shift" ? "text-blue-600" :
                            partitionOf(p.x, p.y) === "keep" ? "text-rose-600" :
                            "text-neutral-500"
                          }>
                            {partitionOf(p.x, p.y)}
                          </span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-xs text-neutral-500">
                    hover a point to see details
                  </div>
                )}
              </div>
              <div className="border border-neutral-200 rounded p-3">
                <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
                  contours
                </div>
                <ul className="text-xs font-mono space-y-1">
                  {glyph.contours.map((ctr, ci) => {
                    const xs = ctr.map((p) => p.x);
                    const ys = ctr.map((p) => p.y);
                    return (
                      <li key={ci} className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded"
                          style={{ background: CONTOUR_COLOURS[ci % CONTOUR_COLOURS.length] }}
                        />
                        <span>
                          {ci}: {ctr.length} pts, x=[{Math.min(...xs)},{Math.max(...xs)}], y=[{Math.min(...ys)},{Math.max(...ys)}]
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {cur ? (
                <div className="border border-neutral-200 rounded p-3">
                  <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
                    letter
                  </div>
                  <div className="font-mono text-xs space-y-0.5">
                    <div>{cur.name}</div>
                    <div>U+{cp.toString(16).toUpperCase()}</div>
                    <div className="text-4xl mt-1" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>
                      {cur.ch}
                    </div>
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </section>
      ) : null}
    </div>
  );
}
