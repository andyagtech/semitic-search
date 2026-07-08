import Link from "next/link";

export const metadata = {
  title: "Generators — Semitic Search",
  description: "Imagined-form generators for Semitic linguistics.",
};

const GENERATORS = [
  {
    slug: "replace",
    title: "Loan Replacement Generator",
    tag: "LIVE",
    description:
      "Take a Semitic loanword and imagine native-sounding replacements using two mechanics: NATIVE-STOCK COINAGE (build from a Proto-Semitic root using binyanim/mishqalim) and REFLEX-ADAPTED (apply the target language's regular sound laws to the source form).",
    example: "labneh → lavnah (via begadkefat *b→v) · jibneh → gvinah · komputer → maḥšev",
  },
  {
    slug: "loanwords",
    title: "Loanwords & native alternatives",
    tag: "LIVE",
    description:
      "A curated showcase of common Semitic loanwords (Aramaic/Greek/Persian in Hebrew and Arabic; Italian/English in Amharic) paired with their imagined or attested native alternatives. Ben-Yehuda-era Hebrew coinings and modern Arabic Academy neologisms are highlighted.",
    example: "See how Hebrew, Arabic, and Amharic would look without their foreign loan strata.",
  },
];

export default function GeneratorsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10">
      <nav className="text-sm text-neutral-500 mb-4">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <span>Generators</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Generators</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-2xl leading-relaxed">
          Tools that <em>imagine</em> forms rather than looking them up. These are creative
          linguistic thought experiments — none of the outputs are attested vocabulary
          unless explicitly marked. Use for exploration, teaching, and asking &quot;what
          if?&quot; about a Semitic language&apos;s vocabulary.
        </p>
      </header>

      <div className="grid gap-3">
        {GENERATORS.map((g) => (
          <Link
            key={g.slug}
            href={`/${g.slug}`}
            className="block bg-white border border-neutral-200 rounded-lg p-5 hover:border-neutral-400 transition"
          >
            <div className="flex items-baseline gap-3 flex-wrap mb-2">
              <span className="text-lg font-semibold">{g.title}</span>
              <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border badge-inherited">
                {g.tag}
              </span>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed mb-2">{g.description}</p>
            <p className="text-xs text-neutral-500 font-mono">{g.example}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
