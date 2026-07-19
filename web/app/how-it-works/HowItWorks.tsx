"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// U+05C6 — the trigger character for Hebrew widening. Rare glyph (Nun
// Hafukha) that never appears in modern Hebrew text, so it's safe to
// hijack as a widening signal.
const HEB_TRIG = "׆";
const SYR_TRIG = "ܐ";  // Syriac letter alaph, used as the widen trigger in Syriac builds
const TATWEEL = "ـ";   // Arabic tatweel — the real thing we're inspired by

// Build a letter + N triggers.
const w = (letter: string, n: number, trig = HEB_TRIG) =>
  letter + trig.repeat(Math.max(0, n));

export function HowItWorks() {
  // Load the stretch fonts we render inline examples with. Stamped
  // per-mount so we always get fresh bytes.
  const [ready, setReady] = useState(false);
  const [families, setFamilies] = useState<{ heb: string; syr: string }>({
    heb: "serif",
    syr: "serif",
  });
  useEffect(() => {
    const stamp = Date.now();
    const heb = `HIW_Hebrew_${stamp}`;
    const syr = `HIW_Syriac_${stamp}`;
    const hebFace = new FontFace(
      heb,
      `url(/fonts/SemiticStretchHebrew-v2.ttf?v=${stamp}) format("truetype")`,
      { display: "block", unicodeRange: "U+0000-10FFFF" },
    );
    const syrFace = new FontFace(
      syr,
      `url(/fonts/SemiticStretchNotoSansSyriac.ttf?v=${stamp}) format("truetype")`,
      { display: "block", unicodeRange: "U+0000-10FFFF" },
    );
    let cancelled = false;
    Promise.all([hebFace.load(), syrFace.load()])
      .then(([h, s]) => {
        if (cancelled) return;
        document.fonts.add(h);
        document.fonts.add(s);
        setFamilies({ heb, syr });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
      document.fonts.delete(hebFace);
      document.fonts.delete(syrFace);
    };
  }, []);

  return (
    <div className="page">
      <p className="eyebrow">Semitic Search · Reference</p>
      <h1>
        Widening a letter,
        <br />
        five thousand years <em>later</em>.
      </h1>
      <p className="lede">
        Arabic has a Unicode character just for widening a letter. Hebrew
        and Syriac never got one — even though scribes have been widening
        letters by hand for as long as either script has existed. Here is
        how we added it back, and how three layers of diacritic marks stack
        under a single Hebrew consonant.
      </p>

      {/* ---------- Section 1 ---------- */}
      <section>
        <h2>1. Arabic already has this. It&rsquo;s called <em>tatweel</em>.</h2>
        <p>
          Arabic script is <strong>cursive</strong>: letters connect via a
          horizontal joining rail. Because that rail is a shared feature
          of the script, a single codepoint can lengthen it:{" "}
          <code>U+0640 ARABIC TATWEEL</code>, also called the{" "}
          <em>kashida</em>. Insert one after any joining letter and its
          trailing stroke elongates by the tatweel&rsquo;s width. Insert
          five and the stroke elongates five times over — the tatweels
          chain seamlessly because they&rsquo;re all just more length of
          the same rail.
        </p>

        <figure className="strip strip-arabic" dir="rtl">
          <div className="strip-row">
            <span className="strip-cell">
              <span className="glyph ar">كتاب</span>
              <span className="cap">plain</span>
            </span>
            <span className="strip-cell">
              <span className="glyph ar">كتاب{TATWEEL.repeat(3)}</span>
              <span className="cap">+ 3 tatweel</span>
            </span>
            <span className="strip-cell">
              <span className="glyph ar">كتاب{TATWEEL.repeat(8)}</span>
              <span className="cap">+ 8 tatweel</span>
            </span>
            <span className="strip-cell">
              <span className="glyph ar">كتاب{TATWEEL.repeat(20)}</span>
              <span className="cap">+ 20 tatweel</span>
            </span>
          </div>
          <figcaption>
            <span className="ar-inline">كتاب</span> (<em>kitāb</em>,{" &ldquo;"}
            book&rdquo;) with increasing tatweel counts. The connecting
            stroke to the left of the ك lengthens without redrawing the
            letter.
          </figcaption>
        </figure>

        <p>
          Nothing is being pre-baked. The font ships one tatweel glyph, the
          shaper stacks as many as the text asks for, and the joining
          contours meet at the seam. That&rsquo;s why Arabic justification
          in traditional metal type — and later in digital scribal work —
          can widen a line to any width without altering letter identity.
        </p>
      </section>

      {/* ---------- Section 2 ---------- */}
      <section>
        <h2>2. Hebrew and Syriac don&rsquo;t have a joining rail.</h2>
        <p>
          Hebrew letters are <strong>discrete</strong>. Every consonant
          sits in its own advance box; there is no shared connecting
          stroke between letters that a tatweel could plausibly extend.
          Yet the tradition of widening specific letters at line-ends —
          to reach the full column width without breaking a word — has
          been part of the sofer&rsquo;s craft for as long as there have
          been Torah scrolls. It just never made it into Unicode.
        </p>
        <p>
          The scribal tradition targets a small set: the <em>kalabush</em>
          {" "}letters, the ones whose shape has a horizontal top bar that
          can be extended without changing what the letter <em>is</em>.
          The canonical six are{" "}
          <span className="he-inline">ד ה ל ם ר ת</span> — dalet, he,
          lamed, final-mem, resh, tav.
        </p>

        <div className="two-col">
          <div className="col">
            <h3>Our approach, in one sentence.</h3>
            <p>
              Pick a rare Unicode character to serve as the widening
              trigger, pre-bake 16 progressively-wider variants of each
              widenable letter, and wire a GSUB ligature that maps{" "}
              <code>letter + trigger × N</code> to the N-th variant.
            </p>
          </div>
          <div className="col">
            <h3>Why <code>U+05C6</code>?</h3>
            <p>
              <span className="he-inline">׆</span>{" "}
              (<em>Hebrew Punctuation Nun Hafukha</em>) is defined by
              Unicode but effectively never used in modern text. It
              cannot collide with content, it renders as a small mark on
              fallback fonts, and it survives every copy-paste round-trip.
              For Syriac we use <code>U+0710</code> (Syriac letter alaph)
              in the same role.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Section 3 ---------- */}
      <section>
        <h2>3. What actually happens when you type <code>ד׆׆׆</code>.</h2>
        <p>
          The font ships 16 widened variants of dalet, named{" "}
          <code>dalet_s1</code> through <code>dalet_s16</code>. The GSUB
          <code>liga</code> feature contains sixteen rules for dalet:
        </p>
        <pre className="code">
{`sub ד ׆ by dalet_s1;
sub ד ׆ ׆ by dalet_s2;
sub ד ׆ ׆ ׆ by dalet_s3;
...
sub ד ׆ ׆ ׆ ׆ ׆ ׆ ׆ ׆ ׆ ׆ ׆ ׆ ׆ ׆ ׆ ׆ by dalet_s16;`}
        </pre>
        <p>
          HarfBuzz reads left-to-right through the buffer, matches the
          longest applicable rule, and substitutes the composite for a
          single wider glyph. If the input runs off the end of the
          highest ligature (17+ triggers), the extras render as raw ׆
          marks — which is why the coverage chart caps at s16.
        </p>

        <figure className="strip">
          <div className="strip-row" dir="rtl"
               style={{ fontFamily: families.heb, fontSize: 92 }}>
            <span className="strip-cell">
              <span className="glyph">{w("ד", 0)}</span>
              <span className="cap">s0 (natural)</span>
            </span>
            <span className="strip-cell">
              <span className="glyph">{w("ד", 2)}</span>
              <span className="cap">s2</span>
            </span>
            <span className="strip-cell">
              <span className="glyph">{w("ד", 6)}</span>
              <span className="cap">s6</span>
            </span>
            <span className="strip-cell">
              <span className="glyph">{w("ד", 12)}</span>
              <span className="cap">s12</span>
            </span>
            <span className="strip-cell">
              <span className="glyph">{w("ד", 16)}</span>
              <span className="cap">s16</span>
            </span>
          </div>
          <figcaption>
            Frank Ruhl <span className="he-inline">ד</span> at five levels.
            {ready ? "" : " Loading font…"}
          </figcaption>
        </figure>

        <h3 className="sub">How the pre-baked variants are generated.</h3>
        <p>
          Each variant is built by an <em>INFIX</em> operation on the
          letter&rsquo;s outline. We pick an x-cutoff inside the letter&rsquo;s
          bar zone; every on-curve point to the left of the cutoff stays,
          every point to the right translates right by{" "}
          <code>N × step</code>. The closing edges between the two halves
          stretch horizontally to fill the gap. Structurally the letter
          hasn&rsquo;t changed — the identifying features (a resh&rsquo;s hook,
          a bet&rsquo;s foot, a lamed&rsquo;s arm) sit exactly where they
          did — but the bar is longer.
        </p>
        <p>
          The specifics differ per letter. Aleph runs a diagonal, not a
          top bar. Ayin&rsquo;s hooks want to move as a rigid unit relative to
          a curved base. Tzade has a mid-height ear. Each of those gets
          per-point overrides tuned in{" "}
          <Link href="/letter-anatomy">the anatomy inspector</Link>. The
          full picture of which letters ship in which fonts lives in{" "}
          <Link href="/coverage">the coverage chart</Link>.
        </p>
      </section>

      {/* ---------- Section 4 ---------- */}
      <section>
        <h2>4. Syriac — same idea, different set.</h2>
        <p>
          Syriac is cursive like Arabic, and it inherits{" "}
          <code>U+0640</code> tatweel-style joining behaviour where the
          font supports it. But not every letter widens through the
          joining rail alone — the letter&rsquo;s <em>body</em> sometimes
          wants to widen too. For that case we run the same GSUB
          mechanism as Hebrew, with{" "}
          <code>U+0710</code> as the trigger and Syriac letter names on the
          variant glyphs.
        </p>

        <figure className="strip">
          <div className="strip-row" dir="rtl"
               style={{ fontFamily: families.syr, fontSize: 92 }}>
            <span className="strip-cell">
              <span className="glyph">{w("ܪ", 0, SYR_TRIG)}</span>
              <span className="cap">s0</span>
            </span>
            <span className="strip-cell">
              <span className="glyph">{w("ܪ", 4, SYR_TRIG)}</span>
              <span className="cap">s4</span>
            </span>
            <span className="strip-cell">
              <span className="glyph">{w("ܪ", 10, SYR_TRIG)}</span>
              <span className="cap">s10</span>
            </span>
            <span className="strip-cell">
              <span className="glyph">{w("ܪ", 16, SYR_TRIG)}</span>
              <span className="cap">s16</span>
            </span>
          </div>
          <figcaption>
            Noto Sans Syriac <span className="syr-inline">ܪ</span>{" "}
            (<em>rish</em>) at four widening levels.
            {ready ? "" : " Loading font…"}
          </figcaption>
        </figure>
      </section>

      {/* ---------- Section 5 ---------- */}
      <section>
        <h2>5. Three layers of marks under a Hebrew letter.</h2>
        <p>
          A Hebrew consonant can carry marks above (dagesh, mapiq,
          holam-vav) and below (the whole vowel-point system: patah,
          hiriq, qamatz, segol, and friends). In critical editions and
          especially in <strong>Judeo-Arabic</strong> writing, a third
          layer wants to stack under the niqqud — Arabic harakat
          (<em>fatha</em>, <em>kasra</em>, <em>damma</em>) marking the
          vowel below the Hebrew one.
        </p>
        <p>
          The stack is done with{" "}
          <strong>mark-to-mark positioning</strong> (mkmk in OpenType
          terms). Each of the 17 Semitic Stretch fonts carries a GPOS
          mkmk chain that anchors:
        </p>
        <ol className="stack-list">
          <li>
            <span className="mark-lbl base">base</span>
            <span>The consonant itself — attaches a niqqud below and
              optionally a dagesh above.</span>
          </li>
          <li>
            <span className="mark-lbl below">below</span>
            <span>A haraka (fatha ◌َ, kasra ◌ِ, damma ◌ُ) attaches
              underneath the niqqud, not the consonant. The mkmk anchor
              on the niqqud says &quot;another mark, right below me.&quot;</span>
          </li>
          <li>
            <span className="mark-lbl above">above</span>
            <span>Shadda ◌ّ stacks above the letter to mark gemination,
              independent of the below-stack.</span>
          </li>
        </ol>

        <figure className="strip">
          <div className="strip-row" dir="rtl"
               style={{ fontFamily: families.heb, fontSize: 92, lineHeight: 1.55 }}>
            <span className="strip-cell wide">
              <span className="glyph">{"מַ"}</span>
              <span className="cap">base + patah</span>
            </span>
            <span className="strip-cell wide">
              <span className="glyph">{"מַَ"}</span>
              <span className="cap">+ fatha under niqqud</span>
            </span>
            <span className="strip-cell wide">
              <span className="glyph">{"מַَّ"}</span>
              <span className="cap">+ shadda above</span>
            </span>
          </div>
          <figcaption>
            One consonant, three marks — patah below, fatha under the
            patah, shadda above. All positioned via the mkmk anchor
            chain baked into every stretch font.
          </figcaption>
        </figure>

        <p>
          The full worked example from Judeo-Arabic:
          {" "}<span className="he-inline">כּُوּסّ אֶِٔמַَّכּ</span>
          {" "}(<em>kussə emmak</em>, &ldquo;your mother&rsquo;s cup&rdquo;) — kaf-dagesh
          with damma reinforcing the shuruq, vav-dagesh, samekh-shadda,
          alef-hamza-segol-kasra, mem-shadda-patah-fatha, kaf-dagesh.
          Every above and below anchor on the alef and mem is filled
          simultaneously.
        </p>
      </section>

      {/* ---------- Section 6 ---------- */}
      <section>
        <h2>6. What we tried and shelved: infinite extension.</h2>
        <p>
          Arabic&rsquo;s tatweel chains without bound. Hebrew stops at s16.
          The natural next step was to make the extension unbounded via a
          repeating bar-segment glyph past s16 — the same visual result,
          shipped without needing 32 or 64 pre-baked variants.
        </p>
        <p>
          The infrastructure works mechanically. Glyphs get built, GSUB
          fires, extension goes past s16. What we could not solve
          reliably was seam-invisibility. At least one boundary between
          glyphs — start↔intermediate, intermediate↔intermediate, or
          intermediate↔tail — shows a hair-thin discontinuity at some
          zoom level. The natural top-bar y-range of each letter
          doesn&rsquo;t match the synthetic tile&rsquo;s y-range under any
          single global default. Full write-up on{" "}
          <Link href="/coverage">the coverage page</Link>.
        </p>
      </section>

      {/* ---------- Section 7 ---------- */}
      <section>
        <h2>7. Getting the fonts.</h2>
        <p>
          Every font on this page is free to install and use — each retains
          its upstream license (OFL or GPL-2.0) with the modifications
          released under the same terms. Two ways to get them:
        </p>
        <ul className="get-list">
          <li>
            <strong>
              <Link href="/fonts">Downloads page</Link>
            </strong>{" "}
            — one page listing every font with a direct .ttf download and its
            license and upstream source noted inline.
          </li>
          <li>
            <strong>
              <a
                href="https://github.com/andyagtech/semitic-stretch-fonts"
                target="_blank"
                rel="noreferrer"
              >
                github.com/andyagtech/semitic-stretch-fonts
              </a>
            </strong>{" "}
            — full source repo. Every .ttf carries a{" "}
            <code>*.LICENSE.txt</code> sidecar naming the upstream face
            and license; the build scripts and per-letter overrides live
            alongside the fonts.
          </li>
        </ul>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="foot">
        <div className="foot-links">
          <Link href="/fonts">Download the fonts →</Link>
          <Link href="/coverage">Which fonts widen which letters →</Link>
          <Link href="/font-lab">Font lab →</Link>
          <a href="https://github.com/andyagtech/semitic-stretch-fonts"
             target="_blank" rel="noreferrer">
            Source on GitHub →
          </a>
        </div>
      </footer>

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
          --accent: #8b6e2e;
          --accent-strong: #6b5322;
          --accent-2: #b8354c;
          --accent-bg: rgba(139, 110, 46, 0.09);
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
            --accent: #c9a566;
            --accent-strong: #dbb87a;
            --accent-2: #e85471;
            --accent-bg: rgba(201, 165, 102, 0.1);
          }
        }
        .page {
          max-width: 1120px;
          margin: 0 auto;
          padding: 48px 24px 96px;
          background: var(--ground);
          color: var(--ink);
          font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif;
          min-height: 100vh;
        }
        .eyebrow {
          font: 500 11px/1 system-ui, sans-serif;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-quiet);
          margin: 0 0 18px;
        }
        h1 {
          margin: 0;
          font: 400 42px/1.05 Georgia, "Iowan Old Style", "Palatino Linotype",
            serif;
          color: var(--ink);
          letter-spacing: -0.015em;
          text-wrap: balance;
          max-width: 20ch;
        }
        h1 em {
          font-style: italic;
          color: var(--accent);
          letter-spacing: -0.005em;
        }
        h2 {
          font: 500 22px/1.25 Georgia, "Iowan Old Style", serif;
          margin: 0 0 12px;
          letter-spacing: -0.005em;
          text-wrap: balance;
          max-width: 30ch;
        }
        h2 em {
          font-style: italic;
          color: var(--accent);
        }
        h3 {
          font: 500 15px/1.3 system-ui, sans-serif;
          letter-spacing: -0.005em;
          margin: 0 0 10px;
          color: var(--ink);
        }
        h3.sub {
          margin-top: 32px;
        }
        h1 + .lede {
          margin: 22px 0 0;
          max-width: 62ch;
          font-size: 17.5px;
          line-height: 1.65;
          color: var(--ink-soft);
        }
        section {
          margin-top: 72px;
          max-width: 68ch;
        }
        section p {
          margin: 0 0 14px;
          max-width: 65ch;
        }
        section p:last-child {
          margin-bottom: 0;
        }
        strong {
          color: var(--ink);
          font-weight: 600;
        }
        em {
          color: var(--ink);
          font-style: italic;
        }
        code {
          font: 500 13.5px/1 ui-monospace, "SF Mono", Menlo, monospace;
          color: var(--accent-strong);
          background: var(--grid);
          padding: 2px 6px;
          border-radius: 3px;
          white-space: nowrap;
        }
        h2 code {
          font-size: 15px;
          padding: 1px 5px;
        }
        pre.code {
          font: 12.5px/1.55 ui-monospace, "SF Mono", Menlo, monospace;
          background: var(--ground-panel);
          border: 1px solid var(--rule);
          border-left: 3px solid var(--accent);
          border-radius: 5px;
          padding: 14px 18px;
          margin: 14px 0 18px;
          overflow-x: auto;
          color: var(--ink-soft);
          max-width: 62ch;
        }
        pre.code :global(*) {
          font-family: inherit;
        }
        a :global(a),
        section :global(a) {
          color: var(--accent-strong);
          text-decoration: underline;
          text-decoration-color: var(--rule-strong);
          text-underline-offset: 3px;
          text-decoration-thickness: 1px;
        }
        section :global(a):hover {
          text-decoration-color: var(--accent);
        }

        /* ---------- Live example strips ---------- */
        figure.strip {
          margin: 24px 0 8px;
          max-width: 100%;
        }
        .strip-row {
          display: flex;
          gap: 24px;
          overflow-x: auto;
          padding: 24px 20px;
          background: var(--ground-panel);
          border: 1px solid var(--rule);
          border-radius: 6px;
          align-items: flex-end;
          scrollbar-width: thin;
        }
        .strip-cell {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          min-width: 0;
        }
        .strip-cell.wide {
          min-width: 60px;
        }
        .strip-cell .glyph {
          color: var(--ink);
          font-weight: 400;
          white-space: nowrap;
        }
        .strip-cell .glyph.ar {
          font-size: 72px;
          line-height: 1;
          font-family: "SBL Hebrew", "Times New Roman", Georgia, serif;
        }
        .strip-cell .cap {
          font: 500 10px/1 system-ui, sans-serif;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: var(--ink-quiet);
        }
        figure.strip-arabic .strip-row {
          padding: 30px 20px;
        }
        figcaption {
          margin-top: 10px;
          font-size: 13px;
          line-height: 1.55;
          color: var(--ink-quiet);
          max-width: 65ch;
        }
        .ar-inline {
          font-family: "SBL Hebrew", "Times New Roman", Georgia, serif;
          font-size: 20px;
          color: var(--ink);
        }
        .he-inline {
          font-family: "SBL Hebrew", "Times New Roman", Georgia, serif;
          color: var(--ink);
          font-size: 21px;
          letter-spacing: 0.03em;
        }
        .syr-inline {
          font-family: "Estrangelo Edessa", "SBL Hebrew", Georgia, serif;
          color: var(--ink);
          font-size: 21px;
        }

        /* ---------- Two-column split ---------- */
        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          margin-top: 20px;
          padding: 22px 24px;
          background: var(--ground-panel);
          border: 1px solid var(--rule);
          border-radius: 6px;
        }
        @media (max-width: 720px) {
          .two-col {
            grid-template-columns: 1fr;
            gap: 22px;
          }
        }
        .two-col .col p {
          margin: 0;
          font-size: 14.5px;
          color: var(--ink-soft);
        }
        .two-col h3 {
          margin: 0 0 8px;
          color: var(--ink);
        }

        /* ---------- Getting the fonts list ---------- */
        ul.get-list {
          list-style: none;
          padding: 0;
          margin: 18px 0 8px;
          max-width: 65ch;
        }
        ul.get-list li {
          padding: 14px 18px;
          border-left: 2px solid var(--rule);
          margin-bottom: 12px;
          background: var(--ground-panel);
          border-radius: 0 5px 5px 0;
          font-size: 14.5px;
          color: var(--ink-soft);
          line-height: 1.55;
        }
        ul.get-list li strong {
          color: var(--ink);
        }

        /* ---------- Numbered stack for mkmk ---------- */
        ol.stack-list {
          counter-reset: layer;
          list-style: none;
          padding: 0;
          margin: 20px 0 24px;
          border-left: 2px solid var(--rule);
          padding-left: 18px;
          max-width: 65ch;
        }
        ol.stack-list li {
          counter-increment: layer;
          margin-bottom: 14px;
          display: grid;
          grid-template-columns: 96px 1fr;
          gap: 16px;
          align-items: baseline;
          font-size: 14.5px;
          color: var(--ink-soft);
        }
        .mark-lbl {
          font: 500 10.5px/1.2 system-ui, sans-serif;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 3px;
          background: var(--grid);
          color: var(--ink-soft);
          text-align: center;
        }
        .mark-lbl.above {
          color: var(--accent-strong);
          background: var(--accent-bg);
        }
        .mark-lbl.below {
          color: var(--accent-2);
          background: rgba(184, 53, 76, 0.09);
        }

        /* ---------- Footer ---------- */
        footer.foot {
          margin-top: 84px;
          border-top: 1px solid var(--rule);
          padding-top: 28px;
        }
        .foot-links {
          display: flex;
          flex-wrap: wrap;
          gap: 22px 34px;
          font-size: 13.5px;
        }
        .foot-links :global(a) {
          color: var(--ink-soft);
          text-decoration: none;
          border-bottom: 1px solid var(--rule);
          padding-bottom: 2px;
          transition: color 0.15s, border-color 0.15s;
        }
        .foot-links :global(a):hover {
          color: var(--accent);
          border-color: var(--accent);
        }
      `}</style>
    </div>
  );
}
