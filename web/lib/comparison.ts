/**
 * Wikipedia-style comparison tables for Semitic languages.
 *
 * Rows are concepts (for vocabulary tables) or sound-law features (for
 * isogloss tables). Columns are the ten Semitic varieties, grouped and
 * color-coded by branch. Cell values are string[]: first entry is the
 * primary orthography (native script), later entries are alternates
 * (romanization, coexisting scripts).
 *
 * Curated by hand from Wiktionary, standard reference lexica (Klein for
 * Hebrew, Wehr for Arabic, Sokoloff for Aramaic/Syriac, Leslau for
 * Ethio-Semitic, CAD for Akkadian), and standard comparative-Semitic
 * references (Lipiński, Huehnergard, Rubin).
 */

import type { LanguageCode } from "./models";

export type Branch =
  | "east"             // Akkadian
  | "northwest"        // Ugaritic, Hebrew, Aramaic, Syriac (all NW Semitic)
  | "central"          // Arabic
  | "south-arabian"    // Sabaean (Old South Arabian)
  | "ethio-semitic";   // Ge'ez, Amharic, Tigrinya

// Column order: East anchor first, then Northwest (ancient → classical →
// modern), then Central (Arabic), then South Arabian, then Ethio-Semitic.
export const LANGUAGE_ORDER: LanguageCode[] = [
  "akk",                           // East Semitic anchor
  "ug", "he", "arc", "syc",        // Northwest Semitic: Ugaritic + Canaanite + Aramaic
  "ar",                            // Central Semitic
  "sab",                           // South Arabian
  "gez", "am", "ti",               // Ethio-Semitic
];

export const LANGUAGE_BRANCH: Record<string, Branch> = {
  akk: "east",
  ug: "northwest", he: "northwest", arc: "northwest", syc: "northwest",
  ar: "central",
  sab: "south-arabian",
  gez: "ethio-semitic", am: "ethio-semitic", ti: "ethio-semitic",
};

export const LANGUAGE_NAME: Record<string, string> = {
  akk: "Akkadian",
  ug: "Ugaritic", he: "Hebrew", arc: "Aramaic", syc: "Syriac",
  ar: "Arabic",
  sab: "Sabaean",
  gez: "Geʿez", am: "Amharic", ti: "Tigrinya",
};

export const BRANCH_LABEL: Record<Branch, string> = {
  east: "East Semitic",
  northwest: "Northwest Semitic",
  central: "Central Semitic",
  "south-arabian": "South Arabian",
  "ethio-semitic": "Ethio-Semitic",
};

export const BRANCH_CLASS: Record<Branch, string> = {
  east: "branch-east",
  northwest: "branch-northwest",
  central: "branch-central",
  "south-arabian": "branch-south-arabian",
  "ethio-semitic": "branch-ethio-semitic",
};

export type ComparisonRow = {
  label: string;
  gloss?: string;
  proto?: string;
  isogloss?: string;
  cells: Partial<Record<LanguageCode, string[]>>;
  note?: string;
};

export type ComparisonTable = {
  slug: string;
  title: string;
  description: string;
  kind: "vocabulary" | "isogloss";
  rows: ComparisonRow[];
};

// ────────────────────────────────────────────────────────────────
// Curated tables. Cells use conventional transliterations:
//   - Akkadian: normalized Latin (ā ū ī ê ḫ ṣ ṭ š)
//   - Ugaritic: standard alphabetic transliteration (ʔ ʕ ḫ ġ ṯ ḏ ṯ̣ ś š)
//   - Hebrew: pointed Hebrew + Sephardi romanization
//   - Aramaic: standard/Imperial + Klein-style transliteration
//   - Syriac: Serto/Estrangela + tradition Latin
//   - Arabic: Arabic script + DIN 31635
//   - Sabaean: Sabaean script (U+10A60–10A7C) + Latin
//   - Geʿez / Amharic / Tigrinya: Ethiopic + Leslau-style transliteration
// ────────────────────────────────────────────────────────────────

export const TABLES: ComparisonTable[] = [
  {
    slug: "numbers",
    title: "Numbers 1–10",
    description:
      "Cardinal numerals — every family showcase in one table. The Proto-Semitic sibilants (*ṯ, *ś, *š) split three ways in the daughter languages, visible especially in 'three' (*ṯalāṯ-), 'six' (*šidṯ-), and 'ten' (*ʕaśr-). The masculine forms are given; feminine forms differ regularly.",
    kind: "vocabulary",
    rows: [
      {
        label: "one", proto: "*ʔaḥad-",
        cells: {
          akk: ["ištēn"],
          ug: ["𐎀𐎈𐎄", "aḥd"], he: ["אֶחָד", "eḥad"], arc: ["חַד", "ḥad"], syc: ["ܚܕ", "ḥaḏ"],
          ar: ["واحد", "wāḥid"],
          sab: ["𐩱𐩢𐩵", "ʔḥd"],
          gez: ["አሐዱ", "ʾaḥadu"], am: ["አንድ", "and"], ti: ["ሓደ", "ḥadä"],
        },
        note: "Akkadian ištēn is a suppletive innovation from *ʔišten-; the rest of the family shares *ʔaḥad-.",
      },
      {
        label: "two", proto: "*ṯinn- (m) / *ṯintayn- (f)",
        cells: {
          akk: ["šinā", "šittā"],
          ug: ["𐎘𐎐", "ṯn"], he: ["שְׁנַיִם", "šənayim"], arc: ["תְּרֵין", "tərēn"], syc: ["ܬܪܝܢ", "trēn"],
          ar: ["اثنان", "iṯnān"],
          sab: ["𐩻𐩬𐩺", "ṯny"],
          gez: ["ክልኤቱ", "kəlʾētu"], am: ["ሁለት", "hulätt"], ti: ["ክልተ", "kələttä"],
        },
        note: "*ṯ splits: Akk/He/Sy → š, Aram → t, Ar → ṯ (preserved), Ug → ṯ. Ethio-Semitic replaces the numeral entirely with *kilʔay- 'a pair'.",
      },
      {
        label: "three", proto: "*ṯalāṯ-",
        cells: {
          akk: ["šalāš"],
          ug: ["𐎘𐎍𐎘", "ṯlṯ"], he: ["שָׁלוֹשׁ", "šālōš"], arc: ["תְּלָתָא", "təlātā"], syc: ["ܬܠܬܐ", "tlāṯā"],
          ar: ["ثلاثة", "ṯalāṯa"],
          sab: ["𐩻𐩡𐩻", "ṯlṯ"],
          gez: ["ሠለስቱ", "śalastu"], am: ["ሦስት", "sost"], ti: ["ሠለስተ", "šäläste"],
        },
        note: "The FLAGSHIP *ṯ correspondence: Ar preserves ṯ; He, Akk merge to š; Aram merges to t; Ug preserves; Ethio-Sem to s.",
      },
      {
        label: "four", proto: "*ʔarbaʕ-",
        cells: {
          akk: ["erbe"],
          ug: ["𐎀𐎗𐎁𐎓", "arbʕ"], he: ["אַרְבַּע", "arbaʕ"], arc: ["אַרְבְּעָה", "arbəʕā"], syc: ["ܐܪܒܥܐ", "arbʕā"],
          ar: ["أربعة", "arbaʕa"],
          sab: ["𐩱𐩧𐩨𐩲", "ʔrbʕ"],
          gez: ["አርባዕቱ", "ʾarbaʿtu"], am: ["አራት", "arat"], ti: ["ኣርባዕተ", "ʾarbaʿte"],
        },
      },
      {
        label: "five", proto: "*ḫamš-",
        cells: {
          akk: ["ḫamiš"],
          ug: ["𐎃𐎎𐎌", "ḫmš"], he: ["חָמֵשׁ", "ḥāmēš"], arc: ["חַמְשָׁה", "ḥamšā"], syc: ["ܚܡܫܐ", "ḥamšā"],
          ar: ["خمسة", "ḫamsa"],
          sab: ["𐩭𐩣𐩪", "ḫms"],
          gez: ["ኀምስቱ", "ḫamestu"], am: ["አምስት", "amməst"], ti: ["ሓሙሽተ", "ḥammuštä"],
        },
        note: "*ḫ (voiceless uvular fricative): preserved as ḫ in Ar/Ug/Akk/Sab; merged with ḥ in He/Aram; distinct in Geʿez, lost in Am/Ti.",
      },
      {
        label: "six", proto: "*šidṯ-",
        cells: {
          akk: ["šeššu"],
          ug: ["𐎘𐎘", "ṯṯ"], he: ["שֵׁשׁ", "šēš"], arc: ["שִׁתָּא", "šittā"], syc: ["ܫܬܐ", "štā"],
          ar: ["ستة", "sitta"],
          sab: ["𐩪𐩪", "ss"],
          gez: ["ስድስቱ", "sədəstu"], am: ["ስድስት", "səddəst"], ti: ["ሽዱሽተ", "šuddušte"],
        },
        note: "Multiple sibilants collide here: *š-*d-*ṯ, giving different outcomes as clusters simplify differently by branch.",
      },
      {
        label: "seven", proto: "*šabʕ-",
        cells: {
          akk: ["sebe"],
          ug: ["𐎌𐎁𐎓", "šbʕ"], he: ["שֶׁבַע", "ševaʕ"], arc: ["שִׁבְעָה", "šibʕā"], syc: ["ܫܒܥܐ", "šabʕā"],
          ar: ["سبعة", "sabʕa"],
          sab: ["𐩪𐩨𐩲", "sbʕ"],
          gez: ["ሰብዐቱ", "sabʿatu"], am: ["ሰባት", "säbat"], ti: ["ሸውዓተ", "šäwʿatte"],
        },
      },
      {
        label: "eight", proto: "*ṯamān-",
        cells: {
          akk: ["samāne"],
          ug: ["𐎘𐎎𐎐", "ṯmn"], he: ["שְׁמוֹנֶה", "šəmōneh"], arc: ["תְּמָנְיָא", "təmānyā"], syc: ["ܬܡܢܝܐ", "tmānyā"],
          ar: ["ثمانية", "ṯamāniya"],
          sab: ["𐩻𐩣𐩬𐩺", "ṯmny"],
          gez: ["ሰማንቱ", "samantu"], am: ["ስምንት", "səmmənt"], ti: ["ሸሞንተ", "šämonte"],
        },
        note: "The same *ṯ→š/t/s/ṯ split as 'three'. Ethio-Semitic goes to s via *ś→s.",
      },
      {
        label: "nine", proto: "*tišʕ-",
        cells: {
          akk: ["tiše"],
          ug: ["𐎚𐎌𐎓", "tšʕ"], he: ["תֵּשַׁע", "tēšaʕ"], arc: ["תִּשְׁעָה", "tišʕā"], syc: ["ܬܫܥܐ", "tšaʕ"],
          ar: ["تسعة", "tisʕa"],
          sab: ["𐩩𐩪𐩲", "tsʕ"],
          gez: ["ተስዐቱ", "təsʿatu"], am: ["ዘጠኝ", "zäṭäññ"], ti: ["ትሽዓተ", "tišʿatte"],
        },
        note: "Amharic ዘጠኝ zäṭäññ is a suppletive innovation, replacing the inherited *tišʕ-.",
      },
      {
        label: "ten", proto: "*ʕaśr-",
        cells: {
          akk: ["ešer"],
          ug: ["𐎓𐎌𐎗", "ʕšr"], he: ["עֶשֶׂר", "ʿeser"], arc: ["עַסְרָא", "ʿasrā"], syc: ["ܥܣܪܐ", "ʿesrā"],
          ar: ["عشرة", "ʿašra"],
          sab: ["𐩲𐩦𐩧", "ʕs̆r"],
          gez: ["ዐሠርቱ", "ʿaśartu"], am: ["አስር", "assər"], ti: ["ዓሰርተ", "ʿassärte"],
        },
        note: "The FLAGSHIP *ś (lateral sibilant) row: Ar → ش, He preserves שׂ (śin), Aram → ס, Ug/Akk → š, Ethio-Sem → s.",
      },
    ],
  },
  {
    slug: "body-parts",
    title: "Body parts",
    description:
      "Body-part vocabulary — some of the most stable inherited stems in the Semitic family. Excellent for seeing the regular sibilant, laryngeal, and interdental correspondences at work.",
    kind: "vocabulary",
    rows: [
      {
        label: "head", proto: "*raʔš-",
        cells: {
          akk: ["rēšu"],
          ug: ["𐎗𐎜𐎌", "rʔš"], he: ["רֹאשׁ", "rōš"], arc: ["רֵישָׁא", "rēšā"], syc: ["ܪܝܫܐ", "rīšā"],
          ar: ["رأس", "raʔs"],
          sab: ["𐩧𐩱𐩪", "rʔs"],
          gez: ["ርእስ", "rəʔs"], am: ["ራስ", "ras"], ti: ["ርእሲ", "rəʔsi"],
        },
      },
      {
        label: "eye", proto: "*ʕayn-",
        cells: {
          akk: ["īnu"],
          ug: ["𐎓𐎐", "ʕn"], he: ["עַיִן", "ʿayin"], arc: ["עֵינָא", "ʿēnā"], syc: ["ܥܝܢܐ", "ʿaynā"],
          ar: ["عين", "ʕayn"],
          sab: ["𐩲𐩺𐩬", "ʕyn"],
          gez: ["ዐይን", "ʿayn"], am: ["ዓይን", "ayn"], ti: ["ዓይኒ", "ʿayni"],
        },
        note: "Akkadian īnu shows loss of the pharyngeal *ʕ — the classic Akk laryngeal reduction. Every other language preserves it.",
      },
      {
        label: "ear", proto: "*ʔuḏn-",
        cells: {
          akk: ["uznu"],
          ug: ["𐎜𐎄𐎐", "ʔudn"], he: ["אֹזֶן", "ʾōzen"], arc: ["אוּדְנָא", "ʾuḏnā"], syc: ["ܐܕܢܐ", "ʾeḏnā"],
          ar: ["أذن", "ʾuḏn"],
          sab: ["𐩱𐩱𐩬", "ʔʔn"],
          gez: ["እዝን", "ʾəzn"], am: ["ጆሮ", "ǧoro"], ti: ["እዝኒ", "ʾəzni"],
        },
        note: "*ḏ (voiced interdental): Ar preserves ذ; He/Akk/Ethio-Sem → z; Aram → d; Ug preserves ḏ. Amharic ጆሮ is an Agaw substrate loan.",
      },
      {
        label: "tongue", proto: "*lišān-",
        cells: {
          akk: ["lišānu"],
          ug: ["𐎍𐎌𐎐", "lšn"], he: ["לָשׁוֹן", "lāšōn"], arc: ["לִשָּׁנָא", "liššānā"], syc: ["ܠܫܢܐ", "leššānā"],
          ar: ["لسان", "lisān"],
          sab: ["𐩡𐩪𐩬", "lsn"],
          gez: ["ልሳን", "ləssan"], am: ["ምላስ", "məlas"], ti: ["መልሓስ", "mälḥas"],
        },
        note: "*š: preserved in Ug/He/Aram/Sy/Akk; Ar retains as s; Sab s. Amharic/Tigrinya prefix a m- to yield the modern forms.",
      },
      {
        label: "tooth", proto: "*šinn-",
        cells: {
          akk: ["šinnu"],
          ug: ["𐎌𐎐", "šn"], he: ["שֵׁן", "šēn"], arc: ["שִׁנָּא", "šinnā"], syc: ["ܫܢܐ", "šennā"],
          ar: ["سن", "sinn"],
          sab: ["𐩪𐩬", "sn"],
          gez: ["ስን", "sən"], am: ["ጥርስ", "ṭərs"], ti: ["ጥርሲ", "ṭərsi"],
        },
        note: "Amharic/Tigrinya innovate ጥርስ ṭərs from a different proto stem (*ṯ̣irš-).",
      },
      {
        label: "hand", proto: "*yad-",
        cells: {
          akk: ["qātu, idu"],
          ug: ["𐎊𐎄", "yd"], he: ["יָד", "yād"], arc: ["יְדָא", "yəḏā"], syc: ["ܐܝܕܐ", "īḏā"],
          ar: ["يد", "yad"],
          sab: ["𐩺𐩵", "yd"],
          gez: ["እድ", "ʾəd"], am: ["እጅ", "əǧǧ"], ti: ["ኢድ", "ʾid"],
        },
        note: "Akkadian prefers qātu 'hand' as everyday form; idu is preserved but semantically shifted to 'arm, strength'. Ethio-Semitic loses initial *y-.",
      },
      {
        label: "heart", proto: "*libb-",
        cells: {
          akk: ["libbu"],
          ug: ["𐎍𐎁", "lb"], he: ["לֵב", "lēv"], arc: ["לִבָּא", "libbā"], syc: ["ܠܒܐ", "lebbā"],
          ar: ["قلب", "qalb"],
          sab: ["𐩡𐩨", "lb"],
          gez: ["ልብ", "ləbb"], am: ["ልብ", "ləbb"], ti: ["ልቢ", "ləbbi"],
        },
        note: "Arabic innovates qalb (originally 'core, center') as the everyday word; the older *libb- survives dialectally.",
      },
      {
        label: "blood", proto: "*dam-",
        cells: {
          akk: ["damu"],
          ug: ["𐎄𐎎", "dm"], he: ["דָּם", "dām"], arc: ["דְּמָא", "dəmā"], syc: ["ܕܡܐ", "demā"],
          ar: ["دم", "dam"],
          sab: ["𐩵𐩣", "dm"],
          gez: ["ደም", "dam"], am: ["ደም", "däm"], ti: ["ደም", "däm"],
        },
        note: "One of the most stable roots in Semitic — almost identical form-and-meaning across every branch.",
      },
      {
        label: "foot", proto: "*rigl- / *šēp- (Akk)",
        cells: {
          akk: ["šēpu"],
          ug: ["𐎗𐎂𐎍", "rgl"], he: ["רֶגֶל", "regel"], arc: ["רַגְלָא", "raḡlā"], syc: ["ܪܓܠܐ", "reḡlā"],
          ar: ["رجل", "riǧl"],
          sab: ["𐩧𐩴𐩡", "rgl"],
          gez: ["እግር", "ʾəgr"], am: ["እግር", "əgər"], ti: ["እግሪ", "ʾəgri"],
        },
        note: "Akkadian šēpu is unrelated to the rest — the family's *rigl- is preserved everywhere else. Ethio-Semitic uses ʾəgr (< *ʔigr-) with initial ʾ-.",
      },
      {
        label: "name", proto: "*šim-",
        cells: {
          akk: ["šumu"],
          ug: ["𐎌𐎎", "šm"], he: ["שֵׁם", "šēm"], arc: ["שְׁמָא", "šəmā"], syc: ["ܫܡܐ", "šmā"],
          ar: ["اسم", "ism"],
          sab: ["𐩪𐩣", "sm"],
          gez: ["ስም", "səm"], am: ["ስም", "səm"], ti: ["ስም", "šəm"],
        },
        note: "A biliteral root — one of the shortest and most stable stems in Semitic.",
      },
    ],
  },
  {
    slug: "kinship",
    title: "Kinship",
    description:
      "Family terms — biliteral kinship roots like *ʔab- 'father' and *ʔum(m)- 'mother' are among the most conservative vocabulary in the Semitic family.",
    kind: "vocabulary",
    rows: [
      {
        label: "father", proto: "*ʔab-",
        cells: {
          akk: ["abu"],
          ug: ["𐎀𐎁", "ab"], he: ["אָב", "ʾāv"], arc: ["אַבָּא", "abbā"], syc: ["ܐܒܐ", "abbā"],
          ar: ["أب", "ʾab"],
          sab: ["𐩱𐩨", "ʔb"],
          gez: ["አብ", "ʾab"], am: ["አባት", "abbat"], ti: ["ኣቦ", "ʾabbo"],
        },
      },
      {
        label: "mother", proto: "*ʔum(m)-",
        cells: {
          akk: ["ummu"],
          ug: ["𐎜𐎎", "um"], he: ["אֵם", "ʾēm"], arc: ["אִמָּא", "immā"], syc: ["ܐܡܐ", "emmā"],
          ar: ["أم", "ʾumm"],
          sab: ["𐩱𐩣", "ʔm"],
          gez: ["እም", "ʾemm"], am: ["እናት", "ənnat"], ti: ["ኣደ", "ʾadä"],
        },
      },
      {
        label: "brother", proto: "*ʔaḫ-",
        cells: {
          akk: ["aḫu"],
          ug: ["𐎀𐎃", "aḫ"], he: ["אָח", "ʾāḥ"], arc: ["אַחָא", "aḥā"], syc: ["ܐܚܐ", "aḥā"],
          ar: ["أخ", "ʾaḫ"],
          sab: ["𐩱𐩭", "ʔḫ"],
          gez: ["እኁ", "ʾəḫu"], am: ["ወንድም", "wändəmm"], ti: ["ሓው", "ḥaw"],
        },
        note: "*ḫ preserved as ḫ in Ar/Ug/Akk/Sab/Ge; merged with ḥ in He/Aram/Sy. Amharic innovates ወንድም.",
      },
      {
        label: "sister", proto: "*ʔaḫāt-",
        cells: {
          akk: ["aḫātu"],
          ug: ["𐎀𐎃𐎚", "aḫt"], he: ["אָחוֹת", "ʾāḥōt"], arc: ["אַחְתָּא", "aḥtā"], syc: ["ܚܬܐ", "ḥātā"],
          ar: ["أخت", "ʾuḫt"],
          sab: ["𐩱𐩭𐩩", "ʔḫt"],
          gez: ["እኅት", "ʾəḫət"], am: ["እህት", "əhət"], ti: ["ሓብቲ", "ḥawti"],
        },
      },
      {
        label: "son", proto: "*bin-  (Aram: *bar-)",
        cells: {
          akk: ["māru"],
          ug: ["𐎁𐎐", "bn"], he: ["בֵּן", "bēn"], arc: ["בַּר", "bar"], syc: ["ܒܪ", "bar"],
          ar: ["ابن", "ʾibn"],
          sab: ["𐩨𐩬", "bn"],
          gez: ["ወልድ", "wald"], am: ["ልጅ", "ləǧǧ"], ti: ["ወዲ", "wäddi"],
        },
        note: "Aramaic innovates bar (< *bar-) alongside inherited *bin-. Akkadian prefers unrelated māru. Ethio-Semitic uses wald (< *wal(a)d-).",
      },
      {
        label: "daughter", proto: "*bint-  (Aram: *bar(a)t-)",
        cells: {
          akk: ["mārtu"],
          ug: ["𐎁𐎚", "bt"], he: ["בַּת", "bat"], arc: ["בְּרַתָּא", "bərattā"], syc: ["ܒܪܬܐ", "bartā"],
          ar: ["بنت", "bint"],
          sab: ["𐩨𐩩", "bt"],
          gez: ["ወለት", "walatt"], am: ["ልጅ", "ləǧǧ"], ti: ["ጓል", "gwal"],
        },
      },
      {
        label: "husband, man", proto: "*baʕl-  /  *mut-",
        cells: {
          akk: ["mutu, bēlu"],
          ug: ["𐎁𐎓𐎍", "bʕl"], he: ["בַּעַל", "baʕal"], arc: ["בַּעַל", "baʕal"], syc: ["ܒܥܠܐ", "baʿlā"],
          ar: ["بعل", "baʕl"],
          sab: ["𐩨𐩲𐩡", "bʕl"],
          gez: ["በዓል", "baʿl"], am: ["ባል", "bal"], ti: ["በዓል", "baʿal"],
        },
        note: "Same root *baʕl- also means 'lord, master' — the polysemy is ancient.",
      },
      {
        label: "wife", proto: "*ʔinṯat-  (also: *baʕalat-)",
        cells: {
          akk: ["aššatu"],
          ug: ["𐎀𐎘𐎚", "aṯt"], he: ["אִשָּׁה", "ʾiššāh"], arc: ["אִתְּתָא", "ittətā"], syc: ["ܐܢܬܬܐ", "attəṯā"],
          ar: ["امرأة", "imraʔa"],
          sab: ["𐩱𐩻𐩩", "ʔṯt"],
          gez: ["ብእሲት", "bəʾsit"], am: ["ሚስት", "mist"], ti: ["በዓልቲ ቤት", "bäʿalti bet"],
        },
      },
    ],
  },
  {
    slug: "sound-laws",
    title: "Sound-law isoglosses",
    description:
      "The flagship Proto-Semitic phoneme correspondences. Each row picks one PS phoneme and shows how it surfaces across the family. Together they define the branch-splits — Northwest vs Central vs South Semitic — as sharply as any comparative table can.",
    kind: "isogloss",
    rows: [
      {
        label: "*ṯ  (interdental)", isogloss: "PS *ṯ → Ar ث · He שׁ · Aram ת · Ug ṯ · Akk š · Ge ሠ→ሰ",
        gloss: "three",
        cells: {
          akk: ["šalāš"],
          ug: ["𐎘𐎍𐎘", "ṯlṯ"], he: ["שָׁלוֹשׁ", "šālōš"], arc: ["תְּלָתָא", "təlātā"], syc: ["ܬܠܬܐ", "tlāṯā"],
          ar: ["ثلاثة", "ṯalāṯa"],
          sab: ["𐩻𐩡𐩻", "ṯlṯ"],
          gez: ["ሠለስቱ", "śalastu"], am: ["ሦስት", "sost"], ti: ["ሠለስተ", "šäläste"],
        },
      },
      {
        label: "*ḏ  (interdental, voiced)", isogloss: "PS *ḏ → Ar ذ · He ז · Aram ד · Ug ḏ · Akk z · Ge ዘ",
        gloss: "ear",
        cells: {
          akk: ["uznu"],
          ug: ["𐎜𐎄𐎐", "ʔudn"], he: ["אֹזֶן", "ʾōzen"], arc: ["אוּדְנָא", "ʾuḏnā"], syc: ["ܐܕܢܐ", "ʾeḏnā"],
          ar: ["أذن", "ʾuḏn"],
          sab: ["𐩱𐩱𐩬", "ʔʔn"],
          gez: ["እዝን", "ʾəzn"], am: ["ጆሮ", "ǧoro"], ti: ["እዝኒ", "ʾəzni"],
        },
      },
      {
        label: "*ś  (lateral sibilant)", isogloss: "PS *ś → Ar ش · He שׂ · Aram ס · Ug š · Ge ሠ → Am/Ti s",
        gloss: "ten",
        cells: {
          akk: ["ešer"],
          ug: ["𐎓𐎌𐎗", "ʕšr"], he: ["עֶשֶׂר", "ʿeser"], arc: ["עַסְרָא", "ʿasrā"], syc: ["ܥܣܪܐ", "ʿesrā"],
          ar: ["عشرة", "ʿašra"],
          sab: ["𐩲𐩦𐩧", "ʕs̆r"],
          gez: ["ዐሠርቱ", "ʿaśartu"], am: ["አስር", "assər"], ti: ["ዓሰርተ", "ʿassärte"],
        },
        note: "*ś was a lateral sibilant (like Welsh ll); it split into Ar ش, Aram ס, Ug/Akk š, and left a distinct grapheme שׂ in Hebrew and ሠ in Geʿez that later merged into ס/ሰ.",
      },
      {
        label: "*ṯ̣  (emphatic interdental)", isogloss: "PS *ṯ̣ → Ar ظ · He צ · Aram ט · Ug ẓ · Akk ṣ",
        gloss: "shade, shadow",
        cells: {
          akk: ["ṣillu"],
          ug: ["𐎇𐎍", "ẓl"], he: ["צֵל", "ṣēl"], arc: ["טֻלָּא", "ṭullā"], syc: ["ܛܠܠܐ", "ṭellā"],
          ar: ["ظل", "ẓill"],
          sab: ["𐩭𐩡", "ẓl"],
          gez: ["ጽላሎት", "ṣəlalot"], am: ["ጥላ", "ṭəla"], ti: ["ጽላል", "ṣəlal"],
        },
      },
      {
        label: "*ḍ  (emphatic lateral)", isogloss: "PS *ḍ → Ar ض · He צ · Aram ק (later ע) · Ug ṣ",
        gloss: "earth, land",
        cells: {
          akk: ["erṣetu"],
          ug: ["𐎀𐎗𐎕", "arṣ"], he: ["אֶרֶץ", "ʾereṣ"], arc: ["אַרְעָא", "ʾarʿā"], syc: ["ܐܪܥܐ", "arʿā"],
          ar: ["أرض", "ʾarḍ"],
          sab: ["𐩱𐩧𐩳", "ʔrḍ"],
          gez: ["ምድር", "mədr"], am: ["ምድር", "mədər"], ti: ["ምድሪ", "mədri"],
        },
        note: "The Aramaic *ḍ → ʿ shift is FAMOUS: Ar ʾarḍ ~ Aram ʾarʿā — same word, different reflex. Ethio-Semitic uses an entirely different stem *mVdVr-.",
      },
      {
        label: "*ḫ  (uvular fricative)", isogloss: "PS *ḫ → Ar خ · He ח · Aram ח · Ug ḫ · Akk ḫ · Ge ኀ→ኀ/ሐ",
        gloss: "five",
        cells: {
          akk: ["ḫamiš"],
          ug: ["𐎃𐎎𐎌", "ḫmš"], he: ["חָמֵשׁ", "ḥāmēš"], arc: ["חַמְשָׁה", "ḥamšā"], syc: ["ܚܡܫܐ", "ḥamšā"],
          ar: ["خمسة", "ḫamsa"],
          sab: ["𐩭𐩣𐩪", "ḫms"],
          gez: ["ኀምስቱ", "ḫamestu"], am: ["አምስት", "amməst"], ti: ["ሓሙሽተ", "ḥammuštä"],
        },
        note: "Hebrew and Aramaic merge PS *ḫ with *ḥ (both write ח and lose the distinction). Arabic and Ugaritic preserve. Geʿez preserves ኀ; Amharic/Tigrinya collapse it.",
      },
      {
        label: "*ġ  (uvular fricative, voiced)", isogloss: "PS *ġ → Ar غ · He ע · Aram ע · Ug ġ · Akk lost · Ge ዐ",
        gloss: "raven, evening",
        cells: {
          akk: [],
          ug: ["𐎙𐎗𐎁", "ġrb"], he: ["עֹרֵב", "ʿōrēv"], arc: ["עֹרְבָא", "ʿōrbā"], syc: ["ܥܪܒܐ", "ʿārbā"],
          ar: ["غراب", "ġurāb"],
          sab: [],
          gez: ["ቁራ", "quera"], am: ["ቁራ", "quera"], ti: ["ቋዕ", "quaʿ"],
        },
        note: "Hebrew and Aramaic merge PS *ġ with *ʕ (both write ע). Arabic preserves غ; Ugaritic preserves ġ. Akk loses all voiced pharyngeals.",
      },
      {
        label: "*ḥ  (pharyngeal)", isogloss: "PS *ḥ → Ar ح · He ח · Aram ח · Ug ḥ · Akk lost · Ge ሐ",
        gloss: "father-in-law, husband's-father",
        cells: {
          akk: ["emu"],
          ug: ["𐎈𐎎", "ḥm"], he: ["חָם", "ḥām"], arc: ["חָמָא", "ḥāmā"], syc: ["ܚܡܐ", "ḥmā"],
          ar: ["حم", "ḥam"],
          sab: ["𐩢𐩣", "ḥm"],
          gez: ["ሐም", "ḥam"], am: ["አማች", "amaç"], ti: ["ሓሙ", "ḥamu"],
        },
      },
    ],
  },
];

export function tableBySlug(slug: string): ComparisonTable | undefined {
  return TABLES.find((t) => t.slug === slug);
}
