"use client";

import Link from "next/link";

type Row = {
  font: string;
  cells: Record<string, string>;
  total_wide: number;
  total_inf: number;
};
type Data = {
  letters: [string, string][];
  rows: Row[];
  totals: Record<string, [number, number]>;
};

// The chart is server-rendered — data is static. Styling is scoped
// via `styled-jsx` (Next.js App Router's built-in), which keeps the
// coverage page's design independent of the rest of the app's Tailwind.
export function CoverageChart({ data }: { data: Data }) {
  let grandWide = 0;
  let grandInf = 0;
  for (const [name] of data.letters) {
    const t = data.totals[name] ?? [0, 0];
    grandWide += t[0];
    grandInf += t[1];
  }

  return (
    <div className="page">
      <p className="eyebrow">Semitic Search · Hebrew stretch fonts</p>
      <h1>
        Which fonts widen <em>which letters</em>.
      </h1>
      <p className="lede">
        Each Semitic Stretch build ligates a letter followed by U+05C6
        triggers (<code>letter + ׆ × N</code>) into a widened variant.{" "}
        <span className="mark-inline wide">•</span> marks the 16 pre-baked
        levels s1–s16 that ship with the font. Past s16, additional
        triggers currently render as raw glyphs — the infinite-extension
        chain code is present but disabled (see notes below).
      </p>

      <div className="legend">
        <div className="legend-item">
          <span className="mark none">·</span>
          <span>Not widened</span>
        </div>
        <div className="legend-item">
          <span className="mark wide">•</span>
          <span>Widens s1&thinsp;→&thinsp;s16 (16 pre-baked variants)</span>
        </div>
        <div className="legend-actions">
          <Link href="/stretch-debug">Test in stretch-debug →</Link>
          <Link href="/letter-anatomy">Inspect anatomy →</Link>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="corner">
                <div className="corner-label">Typeface</div>
              </th>
              {data.letters.map(([name, ch]) => (
                <th key={name}>
                  <span className="letter">{ch}</span>
                  <span className="name">{name}</span>
                </th>
              ))}
              <th className="total-header">
                <span className="total-letter">Total</span>
                <span className="name">of 19</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.font}>
                <th className="row-header">{row.font}</th>
                {data.letters.map(([name]) => {
                  const v = row.cells[name] || "";
                  const cls =
                    v === "∞" ? "cell inf" : v === "•" ? "cell wide" : "cell empty";
                  return (
                    <td key={name} className={cls}>
                      {v || "·"}
                    </td>
                  );
                })}
                <td className="total">
                  {row.total_inf > 0 ? (
                    <>
                      {row.total_wide}
                      <span className="of"> / </span>
                      <span className="inf-count">{row.total_inf} ∞</span>
                    </>
                  ) : (
                    row.total_wide
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="row-header foot-header">Fonts covering</th>
              {data.letters.map(([name]) => {
                const [nWide, nInf] = data.totals[name] || [0, 0];
                if (nWide === 0) {
                  return (
                    <td key={name} className="total-cell">
                      <span className="zero">—</span>
                    </td>
                  );
                }
                if (nInf > 0) {
                  return (
                    <td key={name} className="total-cell has-inf">
                      <span className="stack">
                        <span className="wide-count">{nWide}</span>
                        <span className="inf-count">{nInf}∞</span>
                      </span>
                    </td>
                  );
                }
                return (
                  <td key={name} className="total-cell">
                    <span className="wide-count">{nWide}</span>
                  </td>
                );
              })}
              <td className="total-grand">
                {grandWide}
                <span className="mid-dot">·</span>
                <span className="inf-count">{grandInf} ∞</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="foot">
        <p>
          <strong>Reading the totals.</strong> Row totals give the letter
          count per font. Column totals show how many of the 15 fonts
          widen each letter.
        </p>
        <p>
          <strong>Why some cells are blank.</strong> The complex letters —
          aleph, ayin, shin — have per-font geometry that doesn&rsquo;t
          cleanly port; they only widen where a font&rsquo;s config
          carries hand-tuned point overrides (Frank Ruhl&rsquo;s aleph is
          the reference implementation). Shmulik CLM keeps
          heavily-customized existing configs for its base six letters
          and hasn&rsquo;t received the complex-letter batch.
        </p>
        <hr />
        <p className="attempted">
          <strong>Infinite extension — attempted, shelved.</strong> The
          natural next feature is Arabic-tatweel-style unbounded widening:
          past s16, additional trigger characters would substitute into a
          repeating bar-segment glyph via a GSUB chained-context rule.
          The infrastructure (build_overflow_chain in the build script,
          the 3-glyph start / intermediate / tail pattern, and a
          demote-pass FEA) all works mechanically — glyphs get built,
          GSUB fires, extension goes past s16.
        </p>
        <p className="attempted">
          What we could not solve reliably was <em>seamlessness</em> of
          the seams. In every attempt at least one boundary between
          glyphs — start↔intermediate, intermediate↔intermediate, or
          intermediate↔tail — shows a visible discontinuity at some zoom
          level. The natural top-bar y-range of each letter doesn&rsquo;t
          quite match the synthetic tile&rsquo;s y-range for any global
          default; mono-mode LSB math survived multiple iterations
          (bumping overlap from 2 to 8 units still left AA seams); and
          the tail&rsquo;s left cap must be shifted into positive x space
          to avoid colliding with the preceding letter, which then throws
          the cluster off the natural letter-spacing grid.
        </p>
        <p className="attempted">
          <strong>Verdict.</strong> Feasible in principle for a
          per-letter, per-font hand-tuned setup, but not as a
          one-size-fits-all auto-build. The code lives on in
          <code>build_overflow_chain</code> and{" "}
          <code>build_overflow_segment</code>; each letter can still opt
          in with an explicit <code>&#123;&quot;overflow&quot;: True,
          &quot;chain_bar_top&quot;: y, &quot;chain_bar_bottom&quot;: y
          &#125;</code> plus tail-cap tuning. Until that per-letter work
          gets done, we ship the 16 pre-baked variants only.
        </p>
        <hr />
        <p className="get">
          <strong>Get the fonts.</strong>{" "}
          <Link href="/fonts">Direct downloads</Link> for every font on
          the site, or the full source at{" "}
          <a
            href="https://github.com/andyagtech/semitic-stretch-fonts"
            target="_blank"
            rel="noreferrer"
          >
            github.com/andyagtech/semitic-stretch-fonts
          </a>
          . The mechanism is written up on{" "}
          <Link href="/how-it-works">how it works</Link>.
        </p>
      </div>

      <style jsx>{`
        :global(:root) {
          --ground: #f7f5ee;
          --ground-panel: #fefdf9;
          --ink: #1e1f26;
          --ink-soft: #4c4e5a;
          --ink-quiet: #7c7e88;
          --rule: #e4dfcf;
          --rule-strong: #c9c0a9;
          --grid: #ede7d3;
          --wide: #8b6e2e;
          --inf: #b8354c;
          --wide-bg: rgba(139, 110, 46, 0.09);
          --inf-bg: rgba(184, 53, 76, 0.09);
          --highlight: rgba(139, 110, 46, 0.05);
        }
        @media (prefers-color-scheme: dark) {
          :global(:root) {
            --ground: #161821;
            --ground-panel: #1c1f2b;
            --ink: #e8e5da;
            --ink-soft: #a6a7b1;
            --ink-quiet: #6b6d77;
            --rule: #2a2c37;
            --rule-strong: #3d404e;
            --grid: #23252f;
            --wide: #c9a566;
            --inf: #e85471;
            --wide-bg: rgba(201, 165, 102, 0.1);
            --inf-bg: rgba(232, 84, 113, 0.11);
            --highlight: rgba(255, 255, 255, 0.03);
          }
        }
        .page {
          max-width: 1120px;
          margin: 0 auto;
          padding: 40px 24px 64px;
          background: var(--ground);
          color: var(--ink);
          font: 15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif;
          min-height: 100vh;
        }
        .eyebrow {
          font: 500 11px/1 system-ui, sans-serif;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-quiet);
          margin: 0 0 14px;
        }
        h1 {
          margin: 0;
          font: 400 34px/1.05 Georgia, "Iowan Old Style", "Palatino Linotype",
            serif;
          color: var(--ink);
          letter-spacing: -0.01em;
          text-wrap: balance;
          max-width: 32ch;
        }
        h1 em {
          font-style: italic;
          color: var(--wide);
          letter-spacing: -0.005em;
        }
        .lede {
          margin: 14px 0 0;
          max-width: 62ch;
          color: var(--ink-soft);
          font-size: 15.5px;
          line-height: 1.6;
        }
        .lede code {
          font: 500 13px/1 ui-monospace, "SF Mono", Menlo, monospace;
          color: var(--ink);
          background: var(--grid);
          padding: 2px 6px;
          border-radius: 3px;
        }
        .mark-inline.wide {
          color: var(--wide);
          background: var(--wide-bg);
          padding: 1px 6px;
          border-radius: 3px;
          font-weight: 500;
        }
        .mark-inline.inf {
          color: var(--inf);
          background: var(--inf-bg);
          padding: 1px 6px;
          border-radius: 3px;
          font-weight: 500;
        }
        .legend {
          margin: 24px 0 32px;
          padding: 14px 18px;
          background: var(--ground-panel);
          border: 1px solid var(--rule);
          border-radius: 6px;
          display: flex;
          flex-wrap: wrap;
          gap: 22px 34px;
          font-size: 13.5px;
          color: var(--ink-soft);
          align-items: center;
        }
        .legend-item {
          display: flex;
          align-items: baseline;
          gap: 10px;
        }
        .legend-actions {
          margin-left: auto;
          display: flex;
          gap: 22px;
          font-size: 12.5px;
        }
        .legend-actions :global(a) {
          color: var(--ink-soft);
          text-decoration: none;
          border-bottom: 1px solid var(--rule);
          padding-bottom: 1px;
          transition: color 0.15s, border-color 0.15s;
        }
        .legend-actions :global(a):hover {
          color: var(--wide);
          border-color: var(--wide);
        }
        .mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          font-size: 15px;
          line-height: 1;
          font-weight: 500;
          flex-shrink: 0;
        }
        .mark.wide {
          color: var(--wide);
          background: var(--wide-bg);
        }
        .mark.inf {
          color: var(--inf);
          background: var(--inf-bg);
          font-size: 17px;
        }
        .mark.none {
          color: var(--ink-quiet);
          background: transparent;
          border: 1px solid var(--rule);
          font-size: 11px;
        }

        .table-wrap {
          background: var(--ground-panel);
          border: 1px solid var(--rule);
          border-radius: 6px;
          overflow-x: auto;
          max-width: 100%;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          font-variant-numeric: tabular-nums;
        }
        th,
        td {
          border-bottom: 1px solid var(--rule);
          padding: 0;
          text-align: center;
          vertical-align: middle;
        }
        thead th {
          background: var(--ground);
          border-bottom: 1px solid var(--rule-strong);
          padding: 12px 6px 10px;
          vertical-align: bottom;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        thead th .letter {
          display: block;
          font-family: "SBL Hebrew", "Times New Roman", Georgia, serif;
          font-size: 21px;
          line-height: 1;
          color: var(--ink);
          margin-bottom: 6px;
          font-weight: 400;
        }
        thead th .name {
          display: block;
          font: 500 9.5px/1.15 system-ui, sans-serif;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-quiet);
        }
        th.row-header,
        th.corner {
          text-align: left;
          padding-left: 16px;
          padding-right: 16px;
          background: var(--ground);
          position: sticky;
          left: 0;
          z-index: 3;
          border-right: 1px solid var(--rule);
          min-width: 172px;
        }
        th.corner {
          z-index: 4;
          border-bottom: 1px solid var(--rule-strong);
        }
        .corner-label {
          font: 500 11px/1.2 system-ui, sans-serif;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-quiet);
        }
        tbody th.row-header {
          text-align: left;
          padding: 12px 16px;
          font: 500 13.5px/1.25 system-ui, sans-serif;
          color: var(--ink);
          border-bottom: 1px solid var(--rule);
          letter-spacing: -0.005em;
        }
        tbody tr:hover th.row-header,
        tbody tr:hover td {
          background: var(--highlight);
        }
        td.cell {
          min-width: 34px;
          padding: 10px 4px;
          font-size: 16px;
          color: var(--ink-quiet);
        }
        td.cell.wide {
          color: var(--wide);
          background: var(--wide-bg);
          font-weight: 500;
        }
        td.cell.inf {
          color: var(--inf);
          background: var(--inf-bg);
          font-size: 18px;
          font-weight: 500;
        }
        td.cell.empty {
          color: var(--rule-strong);
          font-size: 14px;
        }

        th.total-header {
          background: var(--ground);
          text-align: center;
          padding: 12px 16px 10px;
          border-left: 1px solid var(--rule-strong);
          min-width: 96px;
          vertical-align: bottom;
        }
        .total-letter {
          color: var(--ink);
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-weight: 500;
          font-family: system-ui, sans-serif;
          display: block;
          margin-bottom: 4px;
        }
        th.total-header .name {
          display: block;
          font-size: 9.5px;
          color: var(--ink-quiet);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        td.total {
          border-left: 1px solid var(--rule-strong);
          padding: 10px 16px;
          font: 500 13.5px/1.15 ui-monospace, "SF Mono", Menlo, monospace;
          color: var(--ink);
          text-align: right;
        }
        td.total .inf-count {
          color: var(--inf);
          font-weight: 500;
        }
        td.total .of {
          color: var(--ink-quiet);
          padding: 0 3px;
        }

        tfoot th,
        tfoot td {
          background: var(--ground);
          border-top: 1px solid var(--rule-strong);
          padding: 12px 4px;
          font: 500 12px/1.2 ui-monospace, "SF Mono", Menlo, monospace;
          color: var(--ink-soft);
        }
        tfoot th.row-header.foot-header {
          text-align: left;
          padding: 12px 16px;
          font: 500 11px/1.2 system-ui, sans-serif;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-quiet);
        }
        tfoot td.total-cell {
          color: var(--ink);
        }
        tfoot td.total-cell.has-inf .wide-count {
          color: var(--wide);
        }
        tfoot td.total-cell.has-inf .inf-count {
          color: var(--inf);
        }
        tfoot td.total-cell .stack {
          display: inline-flex;
          flex-direction: column;
          line-height: 1.05;
          align-items: center;
        }
        tfoot td.total-cell .wide-count {
          font-size: 13px;
          color: var(--wide);
        }
        tfoot td.total-cell .inf-count {
          font-size: 10.5px;
          color: var(--inf);
          margin-top: 1px;
        }
        tfoot td.total-cell .zero {
          color: var(--ink-quiet);
          font-size: 12px;
        }
        tfoot td.total-grand {
          border-left: 1px solid var(--rule-strong);
          text-align: right;
          padding: 12px 16px;
          font-size: 12.5px;
          color: var(--ink);
          font-weight: 600;
        }
        tfoot td.total-grand .mid-dot {
          color: var(--ink-quiet);
          padding: 0 4px;
        }
        tfoot td.total-grand .inf-count {
          color: var(--inf);
        }

        .foot {
          margin-top: 28px;
          max-width: 62ch;
          color: var(--ink-quiet);
          font-size: 13px;
          line-height: 1.55;
        }
        .foot p {
          margin: 0 0 10px;
        }
        .foot strong {
          color: var(--ink-soft);
          font-weight: 500;
        }
        .foot hr {
          margin: 22px 0 16px;
          border: none;
          border-top: 1px solid var(--rule);
          max-width: 40ch;
        }
        .foot .attempted {
          color: var(--ink-quiet);
        }
        .foot .attempted em {
          color: var(--ink-soft);
          font-style: italic;
        }
        .foot code {
          font: 500 12px/1 ui-monospace, "SF Mono", Menlo, monospace;
          color: var(--ink-soft);
          background: var(--grid);
          padding: 1px 5px;
          border-radius: 3px;
          margin: 0 2px;
        }
      `}</style>
    </div>
  );
}
