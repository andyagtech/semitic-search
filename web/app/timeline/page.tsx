import Link from "next/link";
import { allFamilies } from "@/lib/root_families";

export const metadata = {
  title: "Attestation timeline — Semitic Search",
  description:
    "When each Semitic root family is first attested in the Tanakh or Qur'an. A chronological walk through the oldest continuous textual tradition in human history.",
};

const BOOK_NAMES: Record<string, string> = {
  Gen: "Genesis", Exod: "Exodus", Lev: "Leviticus", Num: "Numbers", Deut: "Deuteronomy",
  Josh: "Joshua", Judg: "Judges", Ruth: "Ruth",
  "1Sam": "1 Samuel", "2Sam": "2 Samuel",
  "1Kgs": "1 Kings", "2Kgs": "2 Kings",
  "1Chr": "1 Chronicles", "2Chr": "2 Chronicles",
  Ezra: "Ezra", Neh: "Nehemiah", Esth: "Esther",
  Job: "Job", Ps: "Psalms", Prov: "Proverbs", Eccl: "Ecclesiastes", Song: "Song of Songs",
  Isa: "Isaiah", Jer: "Jeremiah", Lam: "Lamentations", Ezek: "Ezekiel", Dan: "Daniel",
  Hos: "Hosea", Joel: "Joel", Amos: "Amos", Obad: "Obadiah", Jonah: "Jonah",
  Mic: "Micah", Nah: "Nahum", Hab: "Habakkuk", Zeph: "Zephaniah",
  Hag: "Haggai", Zech: "Zechariah", Mal: "Malachi",
};

// Rough absolute-date anchors for era tagging. These aren't precise for
// every verse — they mark the consensus "composition period" for major
// textual layers. Good enough for pedagogical bucketing.
const ERAS: { label: string; range: string; sources: string[] }[] = [
  { label: "Torah / Pentateuch",   range: "c. 1200 – 500 BCE (final form)",
    sources: ["Gen", "Exod", "Lev", "Num", "Deut"] },
  { label: "Former Prophets",      range: "c. 1000 – 550 BCE",
    sources: ["Josh", "Judg", "1Sam", "2Sam", "1Kgs", "2Kgs", "Ruth"] },
  { label: "Latter / Writing Prophets", range: "c. 800 – 400 BCE",
    sources: ["Isa", "Jer", "Ezek", "Hos", "Joel", "Amos", "Obad", "Jonah",
              "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal"] },
  { label: "Writings",             range: "c. 1000 BCE – 200 BCE",
    sources: ["Ps", "Prov", "Job", "Song", "Eccl", "Lam",
              "Esth", "Dan", "Ezra", "Neh", "1Chr", "2Chr"] },
  { label: "Targumim — Torah",     range: "c. 100 – 300 CE (Aramaic renderings of the Torah)",
    sources: ["onkelos", "neofiti", "jerusalem"] },
  { label: "Targum Jonathan",      range: "c. 100 – 300 CE (Aramaic Prophets)",
    sources: ["jonathan"] },
  { label: "Mishnah",              range: "c. 200 CE (rabbinic Hebrew)",
    sources: ["mishnah"] },
  { label: "Jahiliyya poetry (Mu'allaqāt)", range: "6th c. CE (pre-Islamic Arabic odes)",
    sources: ["mualaqat"] },
  { label: "Qur'an",               range: "c. 610 – 632 CE",
    sources: ["quran"] },
];

export default function TimelinePage() {
  const families = allFamilies();
  const eligible = families.filter((f) => f.earliest_attestation);

  // Sort by (source priority, book order, chapter, verse)
  const withBook = eligible.map((f) => {
    const ea = f.earliest_attestation!;
    const [book, ch, v] = ea.source === "tanakh" ? ea.citation.split(".") : [ea.source, "", ""];
    return { ...f, ea, book, ch: Number(ch) || 0, v: Number(v) || 0 };
  });

  // Group by era
  const byEra: Record<string, typeof withBook> = {};
  for (const era of ERAS) byEra[era.label] = [];
  for (const f of withBook) {
    const key =
      f.ea.source === "quran"    ? "Qur'an" :
      f.ea.source === "mualaqat" ? "Jahiliyya poetry (Mu'allaqāt)" :
      f.ea.source === "onkelos"  ? "Targumim — Torah" :
      f.ea.source === "neofiti"  ? "Targumim — Torah" :
      f.ea.source === "jerusalem"? "Targumim — Torah" :
      f.ea.source === "jonathan" ? "Targum Jonathan" :
      f.ea.source === "mishnah"  ? "Mishnah" :
      ERAS.find((e) => e.sources.includes(f.book))?.label ?? "Writings";
    byEra[key].push(f);
  }
  for (const era of Object.values(byEra)) {
    era.sort((a, b) => {
      const order = a.ea.order ?? 0;
      return order - (b.ea.order ?? 0);
    });
  }

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Semitic Search
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            Attestation timeline
          </h1>
          <p className="text-neutral-600 mt-3 text-sm max-w-2xl">
            Of the {families.length} polyglot root families in the curated set,
            <b> {eligible.length} have a first textual attestation</b> —
            spanning the Hebrew Bible, Aramaic Targumim, the Mishnah, the
            pre-Islamic Arabic <i>Mu&apos;allaqāt</i>, and the Qur&apos;an.
            Here they are in chronological order, bucketed by the textual era
            of first appearance. Each root links to its full cross-script
            family page.
          </p>
        </header>

        <div className="mb-6 bg-amber-50/60 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          <b>A note on chronology.</b>{" "}
          Composition dates for the biblical books span centuries; this page
          uses broad consensus bucketing rather than precise verse-dating.
          Akkadian, Ugaritic, Phoenician, and Old South Arabian inscriptions
          predate most of the Hebrew Bible — those attestations aren&apos;t
          yet integrated (future work via ORACC and KTU corpora).
        </div>

        <div className="space-y-6">
          {ERAS.map((era) => {
            const list = byEra[era.label];
            if (!list.length) return null;
            return (
              <section key={era.label} className="bg-white rounded-lg border border-neutral-200 p-4 sm:p-5">
                <header className="mb-3 pb-2 border-b border-neutral-100">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <h2 className="text-lg font-semibold">{era.label}</h2>
                    <span className="text-xs text-neutral-500 font-mono">
                      {era.range}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {list.length} root{list.length === 1 ? "" : "s"}
                  </div>
                </header>
                <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {list.map((f) => (
                    <li key={f.slug} className="flex items-baseline justify-between gap-2 py-0.5">
                      <Link
                        href={`/roots/${encodeURIComponent(f.slug)}`}
                        className="font-mono text-neutral-800 hover:underline underline-offset-2"
                      >
                        {f.canonical.replace(/ /g, "-")}
                      </Link>
                      <span className="text-xs text-neutral-500 font-mono">
                        {f.ea.source === "quran" ? `Q ${f.ea.citation.replace("Q.", "")}` :
                          f.ea.source === "mualaqat" ? f.ea.citation.replace(/^mu'allaqa of /, "") :
                          `${BOOK_NAMES[f.book] ?? f.book} ${f.ch}:${f.v}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
