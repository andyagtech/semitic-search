import Link from "next/link";
import { LoanReplaceForm } from "./LoanReplaceForm";

export const metadata = {
  title: "Loan Replacement Generator — Semitic Search",
  description:
    "Imagine native-sounding replacements for Semitic loanwords using two mechanics: native-stock coinage (build from a Proto-Semitic root using binyanim/mishqalim) and reflex-adapted (apply the language's regular sound laws to the loan, e.g. labneh → lavnah via begadkefat spirantization).",
};

export default function ReplacePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10">
      <nav className="text-sm text-neutral-500 mb-4">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <span>Loan Replacement Generator</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Loan Replacement Generator</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-2xl leading-relaxed">
          Imagine native-sounding replacements for Semitic loanwords using two
          mechanics. This is a linguistic thought experiment — the outputs are
          <em> invented</em> forms, not attested vocabulary.
        </p>
      </header>

      {/* ────── Introduction: the theory + history of Semitic loan replacement ────── */}
      <section className="mb-8 prose prose-sm max-w-none">
        <h2 className="text-lg font-semibold text-neutral-800 mt-6 mb-2">Why replace loanwords?</h2>
        <p className="text-sm text-neutral-600 leading-relaxed">
          Every Semitic language carries deep loan strata. Hebrew has thousands of years
          of Aramaic borrowings, plus Greek/Latin from the Roman period and modern
          English/French/Arabic. Arabic borrowed heavily from Persian (via the ʿAbbasid
          empire) and Aramaic (via Syriac literature). Amharic has an Italian layer from
          the colonial period plus modern English. Some loans are so old they feel
          native — Hebrew <span className="font-mono">אבא abba</span> and{" "}
          <span className="font-mono">אמא imma</span> are actually Aramaic borrowings
          that displaced the Biblical Hebrew <span className="font-mono">אב av</span> and
          {" "}<span className="font-mono">אם em</span> in colloquial speech.
        </p>
        <p className="text-sm text-neutral-600 leading-relaxed mt-2">
          Language-purism movements ask: <em>if the language had never borrowed the word,
          what would it have coined natively?</em> For Hebrew this question has been
          asked seriously since Eliezer Ben-Yehuda&apos;s revival of Hebrew as a spoken
          language in the 1880s; the Academy of the Hebrew Language continues the work
          today. Arabic has its own Language Academies (Cairo, Damascus, Baghdad, Amman);
          Amharic has the Academy of Ethiopian Studies.
        </p>

        <h2 className="text-lg font-semibold text-neutral-800 mt-6 mb-2">The Academy of the Hebrew Language (1953–)</h2>
        <p className="text-sm text-neutral-600 leading-relaxed">
          The{" "}
          <a href="https://terms.hebrew-academy.org.il/" className="underline" target="_blank" rel="noopener">
            Academy of the Hebrew Language
          </a>
          {" "}is the successor to the Va&apos;ad ha-Lashon founded by Ben-Yehuda in 1890.
          It coordinates all coining of new terminology; its <em>Milonim</em>{" "}
          (terminology databases) span linguistics, medicine, technology, agriculture,
          and dozens of other fields. Modern Hebrew is unique among world languages in
          the depth of its documented, deliberate lexical construction. Some coinings
          that WON completely: <span className="font-mono">מחשב machshev</span> (computer,
          from ח-ש-ב &quot;think, calculate&quot;), <span className="font-mono">מזגן
          mazgan</span> (air conditioner, from מ-ז-ג &quot;blend, temper&quot;),{" "}
          <span className="font-mono">רמזור ramzor</span> (traffic light, portmanteau of
          {" "}רמז + אור).
          Some famously FAILED: <span className="font-mono">שח-רחוק saḥ-rachok</span>{" "}
          (telephone, calque of τῆλε+φωνή) never caught on and today{" "}
          <span className="font-mono">telefon</span> is treated as a native root (verb{" "}
          <span className="font-mono">לְטַלְפֵּן letalfen</span> &quot;to phone&quot;
          conjugates like any piʿel).
        </p>

        <h2 className="text-lg font-semibold text-neutral-800 mt-6 mb-2">The Arabic Language Academies (1932–)</h2>
        <p className="text-sm text-neutral-600 leading-relaxed">
          Cairo (1932), Damascus (1919), Baghdad (1947), and Amman (1976) each host an
          Arabic Language Academy tasked with coining native replacements for European
          loans. Arabic&apos;s deep root-and-pattern morphology makes this fruitful:{" "}
          <span className="font-mono">هاتف hātif</span> (telephone, from ه-ت-ف &quot;call
          out&quot;), <span className="font-mono">حاسوب ḥāsūb</span> (computer, from
          ح-س-ب &quot;count, reckon&quot;), and <span className="font-mono">شابكة šābika
          </span> (internet, from ش-ب-ك &quot;to net&quot;) are all Academy coinings that
          are now standard in Modern Standard Arabic.
        </p>

        <h2 className="text-lg font-semibold text-neutral-800 mt-6 mb-2">The two mechanics</h2>
      </section>

      <section className="mb-6 grid sm:grid-cols-2 gap-3 text-sm">
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="font-semibold mb-1 accent-inherited">Native-stock coinage</div>
          <p className="text-neutral-600 leading-relaxed text-xs">
            Find a Proto-Semitic root that shares the loanword&apos;s meaning and build
            a plausible daughter form using the target language&apos;s morphology
            (binyanim for verbs, mishqalim for nouns in Hebrew; awzān in Arabic).
            Modern Hebrew&apos;s <span className="font-mono">machshev</span>
            &nbsp;&quot;computer&quot; (from ח-ש-ב) is the flagship real-world example
            of this mechanic actually winning.
          </p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="font-semibold mb-1 accent-showcase">Reflex-adapted</div>
          <p className="text-neutral-600 leading-relaxed text-xs">
            Take the source loan and apply the target&apos;s regular sound laws as if
            it had been inherited from Proto-Semitic. Arabic{" "}
            <span className="font-mono">لبنة labneh</span> → Hebrew{" "}
            <span className="font-mono">לָבְנַה lavnah</span> via begadkefat
            spirantization (*b→v after a vowel). Same rule that turns Arabic{" "}
            <span className="font-mono">جبنة jibnah</span> &quot;cheese&quot; into
            Hebrew <span className="font-mono">גבינה gvinah</span> (the standard word
            for cheese — Hebrew reflex won there).
          </p>
        </div>
      </section>

      <LoanReplaceForm />

      <footer className="mt-10 pt-6 border-t border-neutral-200 text-xs text-neutral-500">
        Sibling to <Link href="/" className="underline">the main search</Link>. v0
        prototype — imagined forms, not attested vocabulary.
      </footer>
    </main>
  );
}
