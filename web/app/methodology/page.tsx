import Link from "next/link";

export const metadata = {
  title: "Methodology — Semitic Search",
  description:
    "How the cognate index, Proto-Semitic reconstruction engine, reflex table, and attestations pipeline actually work — plus data provenance and licenses.",
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Semitic Search
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            How it works
          </h1>
          <p className="text-neutral-600 mt-3 text-sm max-w-2xl">
            A single tool for exploring Semitic roots across 17 languages
            and two-and-a-half millennia of attestations. This page walks
            through the data, the algorithms, and where to look when
            something feels off.
          </p>
        </header>

        <div className="space-y-6 text-sm text-neutral-800 leading-relaxed">
          <Section title="1. Data sources">
            <p>
              All primary data is open-license. We deliberately keep each
              source isolated so provenance stays clean.
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-2">
              <li>
                <b>Wiktionary (via Kaikki.org)</b> — CC-BY-SA. Lemmas,
                glosses, etymology text, derived/related terms, and
                editor-tagged roots for 10 Kaikki-available Semitic
                varieties (~111k lemmas).
              </li>
              <li>
                <b>Scraped Wiktionary</b> — for Sabaean, Phoenician, Punic,
                Old South Arabian, Mandaic, Turoyo, Western Neo-Aramaic:
                direct HTML scrapes when Kaikki coverage was sparse.
              </li>
              <li>
                <b>Open Scriptures Hebrew Bible (OSHB)</b> — CC-BY.
                Morphologically-tagged Tanakh (306k words, 39 books) with
                Strong&apos;s lemma IDs.
              </li>
              <li>
                <b>Quranic Arabic Corpus</b> (Dukes 2011) — GPL. 128k
                Qur&apos;anic segments with ROOT, POS, and morphology
                features.
              </li>
              <li>
                <b>Sefaria</b> — public API (CC-BY). Mishnah (63 tractates),
                Targum Onkelos (Torah), Targum Jonathan (Prophets), Targum
                Neofiti &amp; Targum Jerusalem (Torah). Together they span
                ~500k words of rabbinic Hebrew and Jewish Aramaic.
              </li>
            </ul>
          </Section>

          <Section title="2. Ingestion pipeline">
            <p>
              Each source lands in <code className="font-mono bg-neutral-100 px-1 rounded">data/raw/</code>,
              gets parsed by a source-specific Python script, and is written
              to a local SQLite DB (<code className="font-mono text-xs">data/processed/semitic.sqlite3</code>).
              From there a resilient sync streams to Turso over Hrana with
              smart-resume on stream drops.
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-2">
              <li><code className="font-mono text-xs">ingest.py</code> — Kaikki JSONL → <code className="font-mono text-xs">entries</code> table</li>
              <li><code className="font-mono text-xs">backfill_camel_arabic.py</code> — CAMeL Tools MSA analyzer (51k Arabic roots)</li>
              <li><code className="font-mono text-xs">resolve_hollow_roots.py</code> — corrects CAMeL&apos;s <code>#</code> placeholder in hollow verbs using the surface word (18k rows)</li>
              <li><code className="font-mono text-xs">ethiopic_root.py</code> — rule-based Ge&apos;ez syllabary decomposition (79% Ge&apos;ez / 63% Amharic / 100% Tigrinya gold accuracy)</li>
              <li><code className="font-mono text-xs">nwsemitic_root.py</code> — Hebrew / Syriac / Aramaic abjad extractor</li>
              <li><code className="font-mono text-xs">llm_backfill_*.py</code> — Gemini Flash Lite on hard cases, tightly scoped (~$0.18 total spend across the whole corpus)</li>
              <li><code className="font-mono text-xs">ingest_oshb.py / ingest_quran.py / ingest_sefaria.py</code> — strip niqqud/te&apos;amim, match consonantal forms against entries, write <code className="font-mono text-xs">attestations</code> table</li>
              <li><code className="font-mono text-xs">ingest_derivations.py</code> — re-parses Kaikki for <code className="font-mono text-xs">derived</code>/<code className="font-mono text-xs">related</code> arrays (12k edges)</li>
            </ul>
            <p className="mt-2">
              End state: <b>111,471 lemmas, 110,025 rooted (98.7%), 59,765
              textual attestations</b>, and 12,125 derivation edges, covering
              17 Semitic varieties from Akkadian (c. 2400 BCE) through modern
              Neo-Aramaic.
            </p>
          </Section>

          <Section title="3. Canonical root index">
            <p>
              The core move: map every script-specific root — Arabic ك ت ب,
              Hebrew כ ת ב, Syriac ܟ ܬ ܒ, Ge&apos;ez ከ ተ በ, Akkadian <i>katab-</i> —
              to a shared space-separated Semitistic transliteration like
              <span className="font-mono mx-1">k t b</span>. One indexed
              column on <code className="font-mono text-xs">entries.root_canonical</code> turns cross-script
              cognate lookup into a single-digit-millisecond query.
            </p>
            <p>
              Mapping tables live in <code className="font-mono text-xs">src/semitic_search/canonical_root.py</code>.
              Where scripts distinguish phonemes that others merge (Hebrew ש
              covers PS *š/*ś/*ṯ but Arabic ش/س/ث distinguish them), we pick
              the most common proto-segment and let collisions happen — the
              index is a hash function for finding cognate families, not a
              reconstruction.
            </p>
          </Section>

          <Section title="4. Proto-Semitic reflex-aware fuzzy matching">
            <p>
              Strict canonical identity finds <b>42%</b> of editor-curated
              cognate claims. The remaining 58% involve
              Proto-Semitic sound correspondences where daughter languages
              chose different reflexes of the same ancestor — the classic
              examples being
              Ar ض ↔ Heb צ ↔ Syc ܥ (all from *ḍ), and
              Ar ث ↔ Heb ש ↔ Syc ܬ (all from *ṯ).
            </p>
            <p>
              The fuzzy matcher (<code className="font-mono text-xs">src/semitic_search/fuzzy_canonical.py</code>)
              maps each surface phoneme to the SET of PS sources it could
              reflect, then declares two roots potentially-cognate iff every
              aligned position has at least one shared PS source. Expanding
              the cartesian product gives ~3.6 surface variants per root;
              398,684 junction rows cover all 109,952 rooted entries. The
              reflex table is conservative — it only collapses phonemes
              whose shared ancestry is attested in scholarly references
              (Lipiński 2001, Huehnergard 2000, Moscati 1964).
            </p>
            <p>
              Effect: strict 42% → fuzzy <b>64%</b> recall on editor claims;
              precision stays at 100% on hand-curated negative probes
              (see <Link href="/linguistics" className="text-blue-700 hover:underline">/linguistics</Link> for
              the empirical reflex weights).
            </p>
          </Section>

          <Section title="5. Proto-Semitic reconstruction">
            <p>
              Given a cognate set, the reconstruction engine
              (<code className="font-mono text-xs">src/semitic_search/reconstruct.py</code>) walks each slot:
            </p>
            <ol className="mt-2 list-decimal pl-5 space-y-1">
              <li>Map each surface phoneme to its set of possible PS sources.</li>
              <li>For each candidate PS label, count supporters (languages whose surface phoneme could reflect it).</li>
              <li>Best label = highest supporter count. Ties broken by <i>specificity</i>: a PS source with fewer sibling surface reflexes is more diagnostic.</li>
              <li>Per-slot confidence = supporters / total cognates. Overall confidence = geometric mean across slots.</li>
            </ol>
            <p className="mt-2">
              Spot-check (all verified): <b>gold</b> {"{ar ذ-h-b, he z-h-b, syc d-h-b}"} → *ḏ-h-b (100%) ·
              <b> three</b> {"{ar ṯ-l-ṯ, he š-l-š, syc t-l-t, akk š-l-š}"} → *ṯ-l-ṯ (83%) ·
              <b> earth</b> {"{ar ʾ-r-ḍ, he ʾ-r-ṣ, syc ʾ-r-ʿ}"} → *ʾ-r-ḍ (100%).
            </p>
          </Section>

          <Section title="6. Attestation matching">
            <p>
              For each textual source, we strip niqqud / te&apos;amim /
              cantillation and match consonantal-form tokens against
              <code className="font-mono text-xs">entries.word</code> and <code className="font-mono text-xs">entries.vocalized_form</code> (same
              stripping on both sides). Each hit writes a row to
              <code className="font-mono text-xs">attestations(entry_id, source, citation, book_order)</code>,
              with UNIQUE on (entry_id, source, citation) so re-ingests are
              idempotent.
            </p>
            <p>
              &quot;Earliest attestation&quot; is computed over all matches
              with a source priority Tanakh → Targumim → Mishnah → Qur&apos;an,
              then by book_order within a source. Displayed as badges
              (📜 Tanakh, ✡︎ Mishnah, 𐡀 Targum, ☪︎ Qur&apos;an) across the UI.
            </p>
          </Section>

          <Section title="7. Regression harness">
            <p>
              <code className="font-mono text-xs">scripts/eval_regression.py</code> runs three test suites and
              exits non-zero if any fall below its floor:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Recall on 168 editor claims (strict ≥ 40%, fuzzy ≥ 60%)</li>
              <li>Precision on 13 hand-curated negative pairs (≥ 95%)</li>
              <li>Reconstruction spot tests (100% — every case must match)</li>
            </ul>
            <p className="mt-2">
              Current readings: strict <b>42%</b>, fuzzy <b>64%</b>,
              precision <b>100%</b>, reconstruction <b>4/4</b>. Run before
              any data change to catch regressions.
            </p>
          </Section>

          <Section title="8. Known limitations">
            <ul className="list-disc pl-5 space-y-2">
              <li>The reflex table is <b>conservative</b> — it misses some attested cross-family cognates (e.g. certain Syriac-Arabic pairs involving non-standard sound changes).</li>
              <li><b>Polysemy and semantic drift</b> aren&apos;t tracked. The root k-t-b covers &quot;write&quot; in Hebrew/Aramaic/Arabic but &quot;troops/squadron&quot; in some Arabic senses — we surface both without distinguishing.</li>
              <li><b>Loanwords</b> aren&apos;t flagged. An Arabic word borrowed from Greek via Syriac may show up under its Semitic-looking surface consonants.</li>
              <li><b>Neofiti is patchy</b> — historical manuscript gaps leave ~15 chapters unavailable. Fragment Targum is genuinely partial.</li>
              <li>The canonical hash <b>collides</b> emphatic/non-emphatic pairs under the fuzzy index; use the strict badge to tell which matches are identity vs reflex.</li>
            </ul>
          </Section>

          <Section title="9. Licenses & attribution">
            <p>
              Wiktionary data under CC-BY-SA. OSHB under CC-BY. Quranic Arabic
              Corpus under GPL. Sefaria content under CC-BY. Ktav Yad CLM
              font under GPL (Culmus Project, Maxim Iorsh). All Noto and
              Amiri fonts under SIL OFL. Reflex table drawn from Lipiński
              (2001), Huehnergard (2000), Moscati (1964).
            </p>
            <p>
              When re-publishing data, please cite the upstream source —
              this project is aggregation + indexing, the linguistic
              primary sources deserve attribution.
            </p>
          </Section>

          <Section title="10. Everything in one place">
            <p>
              Want the raw data or the API?
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><Link href="/docs" className="text-blue-700 hover:underline">/docs</Link> — endpoint reference with curl examples</li>
              <li><Link href="/stats" className="text-blue-700 hover:underline">/stats</Link> — live coverage and quality metrics</li>
              <li><Link href="/linguistics" className="text-blue-700 hover:underline">/linguistics</Link> — reflex matrix and empirical weights</li>
              <li><Link href="/isogloss" className="text-blue-700 hover:underline">/isogloss</Link> — interactive map of phoneme preservation</li>
              <li><code className="font-mono text-xs">/data/root_families.json</code> — top-60 polyglot families as JSON</li>
              <li><code className="font-mono text-xs">/data/reflex_weights.json</code> — empirical correspondence weights</li>
            </ul>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-5">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
