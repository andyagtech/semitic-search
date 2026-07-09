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
    slug: "colors",
    title: "Colors",
    description:
      "Basic color terms across Semitic. Shows the *l/*b root of 'white' (*labn-), the *r-w-t root of 'blackness', and how Arabic's afʕal color pattern (aḥmar, aḫḍar, azraq) contrasts with Hebrew's CāCōC pattern (adom, yarok, kaḥol).",
    kind: "vocabulary",
    rows: [
      {
        label: "black", proto: "*šḥr / *ʔdm variant",
        cells: {
          akk: ["ṣalmu"],
          ug: ["𐎌𐎈𐎗", "šḥr"], he: ["שָׁחוֹר", "šāḥōr"], arc: ["אֻכָּמָא", "ʾukkāmā"], syc: ["ܐܘܟܡܐ", "ʾukkāmā"],
          ar: ["أسود", "ʾaswad"],
          sab: ["𐩱𐩪𐩥𐩵", "ʔswd"],
          gez: ["ጸሊም", "ṣallim"], am: ["ጥቁር", "ṭəqur"], ti: ["ጸሊም", "ṣälim"],
        },
      },
      {
        label: "white", proto: "*labn-",
        cells: {
          akk: ["peṣû"],
          ug: ["𐎍𐎁𐎐", "lbn"], he: ["לָבָן", "lāvān"], arc: ["חִוָּר", "ḥiwwār"], syc: ["ܚܘܪܐ", "ḥewwārā"],
          ar: ["أبيض", "ʾabyaḍ"],
          sab: ["𐩱𐩨𐩺𐩳", "ʔbyḍ"],
          gez: ["ጸዓዳ", "ṣaʿadā"], am: ["ነጭ", "näč"], ti: ["ጻዕዳ", "ṣäʿda"],
        },
      },
      {
        label: "red", proto: "*ʔdm / *ḥmr",
        cells: {
          akk: ["sāmu"],
          ug: ["𐎀𐎄𐎎", "ʾadm"], he: ["אָדֹם", "ʾādōm"], arc: ["סוּמָּקָא", "summāqā"], syc: ["ܣܘܡܩܐ", "summāqā"],
          ar: ["أحمر", "ʾaḥmar"],
          sab: ["𐩱𐩢𐩣𐩧", "ʔḥmr"],
          gez: ["ቀይሕ", "qayyəḥ"], am: ["ቀይ", "qäy"], ti: ["ቀይሕ", "qäyəḥ"],
        },
        note: "Semitic has two competing 'red' roots: *ʔdm (Hebrew) and *ḥmr (Arabic). The latter is the source of Spanish/English 'amber'.",
      },
      {
        label: "yellow", proto: "*ṣpr / *ṣhb",
        cells: {
          akk: ["arqu"],
          ug: ["𐎊𐎗𐎖", "yrq"], he: ["צָהֹב", "ṣāhōv"], arc: ["צהוב"], syc: ["ܙܪܝܩܐ", "zrīqā"],
          ar: ["أصفر", "ʾaṣfar"],
          sab: [],
          gez: ["ብጫ", "bəṭča"], am: ["ቢጫ", "biṭča"], ti: ["ብጫ", "bəṭča"],
        },
      },
      {
        label: "green", proto: "*yrq",
        cells: {
          akk: ["arqu"],
          ug: ["𐎊𐎗𐎖", "yrq"], he: ["יָרֹק", "yārōq"], arc: ["ירוק"], syc: ["ܝܘܪܩܐ", "yūrāqā"],
          ar: ["أخضر", "ʾaḫḍar"],
          sab: [],
          gez: ["ሐመልማል", "ḥamalmāl"], am: ["አረንጓዴ", "aräng(w)ade"], ti: ["ቀጠልያ", "qäṭälya"],
        },
        note: "Arabic innovates ʾaḫḍar (< 'moist, fresh') while Hebrew/Aramaic keep *yrq. Hebrew also uses יָרֹק for 'yellow-green'; the yellow/green boundary was fuzzy in ancient Semitic.",
      },
      {
        label: "blue", proto: "no clear PS — later innovations",
        cells: {
          akk: ["uqnû (lapis-lazuli color)"],
          ug: [], he: ["כָּחֹל", "kāḥōl"], arc: [], syc: [],
          ar: ["أزرق", "ʾazraq"],
          sab: [],
          gez: [], am: ["ሰማያዊ", "sämayawi (sky-color)"], ti: ["ሰማያዊ", "sämayawi"],
        },
        note: "'Blue' has no reconstructible Proto-Semitic root — each language coined its own from various sources (lapis lazuli, kohl, sky).",
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
    slug: "weather-sky",
    title: "Weather & sky",
    description:
      "Celestial and atmospheric vocabulary. The Proto-Semitic root *šmš (sun) and *lyl (night) are stunningly stable — nearly identical across the whole family for 4,000+ years.",
    kind: "vocabulary",
    rows: [
      {
        label: "sun", proto: "*šamš-",
        cells: {
          akk: ["šamaš, šamšu"],
          ug: ["𐎌𐎔𐎌", "špš"], he: ["שֶׁמֶשׁ", "šémeš"], arc: ["שִׁמְשָׁא", "šimšā"], syc: ["ܫܡܫܐ", "šemšā"],
          ar: ["شمس", "šams"],
          sab: ["𐩦𐩣𐩪", "s̆ms"],
          gez: ["ፀሓይ", "ṣaḥay"], am: ["ፀሐይ", "ṣähay"], ti: ["ጸሓይ", "ṣäḥay"],
        },
        note: "Ethio-Semitic replaces *šmš with *ṣḥy (originally 'be bright, shine'). Ugaritic špš with *š→p is a spirantization.",
      },
      {
        label: "moon", proto: "*warḫ- (also 'month')",
        cells: {
          akk: ["arḫu"],
          ug: ["𐎊𐎗𐎃", "yrḫ"], he: ["יָרֵחַ", "yārēaḥ"], arc: ["יַרְחָא", "yarḥā"], syc: ["ܝܪܚܐ", "yarḥā"],
          ar: ["قمر", "qamar"],
          sab: ["𐩥𐩧𐩭", "wrḫ"],
          gez: ["ወርሕ", "warḥ"], am: ["ጨረቃ", "č̣äräqa"], ti: ["ወርሒ", "wärḥi"],
        },
        note: "Arabic innovates qamar. Ge'ez/Ti keep the ancestral *warḫ- (also meaning 'month'). Semantic dual 'moon' = 'month' is universal in Semitic.",
      },
      {
        label: "star", proto: "*kabkab-",
        cells: {
          akk: ["kakkabu"],
          ug: ["𐎋𐎁𐎋𐎁", "kbkb"], he: ["כּוֹכָב", "kōḵāv"], arc: ["כּוֹכְבָא", "kōḵəḇā"], syc: ["ܟܘܟܒܐ", "kawkəḇā"],
          ar: ["كوكب", "kawkab"],
          sab: ["𐩫𐩥𐩫𐩨", "kwkb"],
          gez: ["ኮከብ", "kokäb"], am: ["ኮከብ", "kokäb"], ti: ["ኮኸብ", "koḵäb"],
        },
        note: "Beautiful reduplicated biliteral *k-b-k-b, preserved almost identically across every branch.",
      },
      {
        label: "sky, heaven", proto: "*šamāy- (dual/plural)",
        cells: {
          akk: ["šamû"],
          ug: ["𐎌𐎎𐎎", "šmm"], he: ["שָׁמַיִם", "šāmayim"], arc: ["שְׁמַיָּא", "šəmayyā"], syc: ["ܫܡܝܐ", "šmayā"],
          ar: ["سماء", "samāʔ"],
          sab: ["𐩪𐩣𐩺", "smy"],
          gez: ["ሰማይ", "sämay"], am: ["ሰማይ", "sämay"], ti: ["ሰማይ", "sämay"],
        },
        note: "The Hebrew plural שָׁמַיִם ('waters above') is an intensive plural — the sky is grammatically plural or dual across the family.",
      },
      {
        label: "rain", proto: "*maṭar-",
        cells: {
          akk: ["zunnu, meṭu"],
          ug: ["𐎎𐎉𐎗", "mṭr"], he: ["מָטָר", "māṭār"], arc: ["מִטְרָא", "miṭrā"], syc: ["ܡܛܪܐ", "meṭrā"],
          ar: ["مطر", "maṭar"],
          sab: ["𐩣𐩷𐩧", "mṭr"],
          gez: ["ዝናም", "zənām"], am: ["ዝናብ", "zənab"], ti: ["ዝናብ", "zənam"],
        },
        note: "Ethio-Semitic uses a different root *zVnV(m/b)-. Everywhere else *m-ṭ-r is preserved.",
      },
      {
        label: "cloud", proto: "*ġaym-  /  *ʕanan-",
        cells: {
          akk: ["upû, erpetu"],
          ug: ["𐎓𐎐𐎐", "ʕnn"], he: ["עָנָן", "ʿānān"], arc: ["עֲנָנָא", "ʿănānā"], syc: ["ܥܢܢܐ", "ʿnānā"],
          ar: ["سحاب, غيم", "saḥāb, ġaym"],
          sab: [],
          gez: ["ደመና", "dammanā"], am: ["ደመና", "dämmäna"], ti: ["ደበና", "däbäna"],
        },
      },
      {
        label: "wind, spirit", proto: "*rīḥ-",
        cells: {
          akk: ["šāru"],
          ug: ["𐎗𐎈", "rḥ"], he: ["רוּחַ", "rūaḥ"], arc: ["רוּחָא", "rūḥā"], syc: ["ܪܘܚܐ", "rūḥā"],
          ar: ["ريح", "rīḥ"],
          sab: ["𐩧𐩢", "rḥ"],
          gez: ["ነፋስ", "näfas"], am: ["ነፋስ", "näfas"], ti: ["ንፋስ", "nəfas"],
        },
        note: "The Hebrew רוּחַ 'wind, spirit, breath' polysemy runs across the whole family. Ethio-Semitic uses *nfs (also 'soul' in Arabic نفس).",
      },
      {
        label: "fire", proto: "*ʔišš- / *nūr-",
        cells: {
          akk: ["išātu"],
          ug: ["𐎀𐎌𐎚", "išt"], he: ["אֵשׁ", "ʾēš"], arc: ["אֶשָּׁתָא", "ʾeššātā"], syc: ["ܢܘܪܐ", "nūrā"],
          ar: ["نار", "nār"],
          sab: ["𐩱𐩪", "ʔs"],
          gez: ["እሳት", "ʾəsat"], am: ["እሳት", "əsat"], ti: ["ሓዊ", "ḥawi"],
        },
        note: "Two competing roots — *ʔišš- (preserved in Hebrew, Akkadian, Ge'ez, and Ugaritic) and *nūr- (Aramaic/Syriac/Arabic). The nuːr- root is likely a semantic shift from 'light'.",
      },
    ],
  },
  {
    slug: "animals",
    title: "Animals",
    description:
      "Domestic and iconic animals. The words for dog (*kalb-), horse (*sūs-), and camel (*gamal-) are pan-Semitic; some names travelled to English through Greek and Latin (camel, gazelle).",
    kind: "vocabulary",
    rows: [
      {
        label: "dog", proto: "*kalb-",
        cells: {
          akk: ["kalbu"],
          ug: ["𐎋𐎍𐎁", "klb"], he: ["כֶּלֶב", "kelev"], arc: ["כַּלְבָּא", "kalbā"], syc: ["ܟܠܒܐ", "kalbā"],
          ar: ["كلب", "kalb"],
          sab: ["𐩫𐩡𐩨", "klb"],
          gez: ["ከልብ", "kalb"], am: ["ውሻ", "wəša"], ti: ["ከልቢ", "kälbi"],
        },
        note: "One of the most perfectly-preserved biliterals in Semitic. Amharic ውሻ is an Agaw substrate loan.",
      },
      {
        label: "horse", proto: "*sūs-",
        cells: {
          akk: ["sīsû"],
          ug: ["𐎒𐎒𐎆", "ssw"], he: ["סוּס", "sūs"], arc: ["סוּסָא", "sūsā"], syc: ["ܣܘܣܝܐ", "sūsyā"],
          ar: ["فرس, حصان", "faras, ḥiṣān"],
          sab: [],
          gez: ["ፈረስ", "färäs"], am: ["ፈረስ", "färäs"], ti: ["ፈረስ", "färäs"],
        },
        note: "Arabic innovates faras/ḥiṣān; the *sūs word is retained everywhere else and even entered Egyptian as swsw.",
      },
      {
        label: "camel", proto: "*gamal-",
        cells: {
          akk: ["gammalu"],
          ug: ["𐎂𐎎𐎍", "gml"], he: ["גָּמָל", "gāmāl"], arc: ["גַּמְלָא", "gamlā"], syc: ["ܓܡܠܐ", "gamlā"],
          ar: ["جمل", "ǧamal"],
          sab: ["𐩴𐩣𐩡", "gml"],
          gez: ["ግምል", "gəməl"], am: ["ግመል", "gəmäl"], ti: ["ግመል", "gəmäl"],
        },
        note: "The English word 'camel' descends from this exact root via Greek κάμηλος from a Semitic source.",
      },
      {
        label: "ox, bull", proto: "*ṯawr-",
        cells: {
          akk: ["šūru"],
          ug: ["𐎘𐎗", "ṯr"], he: ["שׁוֹר", "šōr"], arc: ["תּוֹרָא", "tōrā"], syc: ["ܬܘܪܐ", "tōrā"],
          ar: ["ثور", "ṯawr"],
          sab: ["𐩻𐩥𐩧", "ṯwr"],
          gez: ["ሶር", "sor"], am: ["በሬ", "bäre"], ti: ["ብዕራይ", "bəʿray"],
        },
        note: "Flagship *ṯ correspondence row: Ar ث, He שׁ, Aram ת, Akk š, Ug ṯ.",
      },
      {
        label: "sheep, lamb", proto: "*ṯaʔ-  /  *ʕanz-",
        cells: {
          akk: ["immeru, ṣēnu"],
          ug: ["𐎌𐎀𐎜", "šʔu"], he: ["שֶׂה", "śeh"], arc: ["חוּרְפָא, שֵׂה"], syc: ["ܥܡܪܐ", "ʿemrā"],
          ar: ["شاة", "šāh"],
          sab: [],
          gez: ["በግዕ", "bagəʿ"], am: ["በግ", "bäg"], ti: ["በጊዕ", "bägəʿ"],
        },
      },
      {
        label: "fish", proto: "*nūn- / *dāg-",
        cells: {
          akk: ["nūnu"],
          ug: ["𐎄𐎂", "dg"], he: ["דָּג", "dāg"], arc: ["נוּנָא", "nūnā"], syc: ["ܢܘܢܐ", "nūnā"],
          ar: ["سمك", "samak"],
          sab: [],
          gez: ["ዓሣ", "ʿāśā"], am: ["ዓሣ", "asa"], ti: ["ዓሳ", "asa"],
        },
        note: "TWO Proto-Semitic roots: *nūn- (Akk, Aram) and *dāg- (Ug, He). Arabic innovates samak; Ethio-Semitic uses *ʿśš.",
      },
      {
        label: "lion", proto: "*labiʔ- / *ʔaryē-",
        cells: {
          akk: ["labbu, nēšu"],
          ug: ["𐎍𐎁𐎜", "lbʔ"], he: ["אַרְיֵה", "ʾaryēh"], arc: ["אַרְיָא", "ʾaryā"], syc: ["ܐܪܝܐ", "ʾaryā"],
          ar: ["أسد", "ʾasad"],
          sab: [],
          gez: ["አንበሳ", "ʾanbasā"], am: ["አንበሳ", "anbäsa"], ti: ["ኣንበሳ", "ʾanbäsa"],
        },
      },
      {
        label: "snake", proto: "*ḥayy- / *naḥaš-",
        cells: {
          akk: ["ṣerru"],
          ug: ["𐎁𐎘𐎐", "bṯn"], he: ["נָחָשׁ", "nāḥāš"], arc: ["חִוְיָא", "ḥiwyā"], syc: ["ܚܘܝܐ", "ḥewyā"],
          ar: ["حيّة", "ḥayya"],
          sab: [],
          gez: ["እባብ", "ʾəbab"], am: ["እባብ", "əbab"], ti: ["ተመን", "tämän"],
        },
      },
    ],
  },
  {
    slug: "motion-verbs",
    title: "Motion verbs",
    description:
      "Basic verbs of motion and posture (given in the perfect 3ms — the citation form in most Semitic dictionaries). Some of the oldest and stablest roots in the family.",
    kind: "vocabulary",
    rows: [
      {
        label: "go, walk", proto: "*hlk / *ʔty",
        cells: {
          akk: ["alāku"],
          ug: ["𐎅𐎍𐎋", "hlk"], he: ["הָלַךְ", "hāláḵ"], arc: ["הֲלַךְ, אֲזַל"], syc: ["ܗܠܟ, ܐܙܠ"],
          ar: ["ذهب, مشى", "ḏahaba, mašā"],
          sab: ["𐩠𐩡𐩫"],
          gez: ["ሖረ", "ḥorä"], am: ["ሄደ", "hedä"], ti: ["ከደ", "kedä"],
        },
      },
      {
        label: "come", proto: "*bwʔ / *ʔty",
        cells: {
          akk: ["mâʔu, wašābu"],
          ug: ["𐎀𐎚𐎊", "aty"], he: ["בָּא", "bā"], arc: ["אֲתָא", "ʾatā"], syc: ["ܐܬܐ", "ʾetā"],
          ar: ["أتى, جاء", "ʾatā, ǧāʔa"],
          sab: [],
          gez: ["መጽአ", "maṣʔa"], am: ["መጣ", "mäṭṭa"], ti: ["መጸ", "mäṣä"],
        },
      },
      {
        label: "sit, dwell", proto: "*yṯb / *wṯb",
        cells: {
          akk: ["wašābu"],
          ug: ["𐎊𐎘𐎁", "yṯb"], he: ["יָשַׁב", "yāšav"], arc: ["יְתֵב", "yəṯēḇ"], syc: ["ܝܬܒ", "yiteb"],
          ar: ["جلس", "ǧalasa"],
          sab: [],
          gez: ["ነበረ", "nabärä"], am: ["ተቀመጠ", "täqämmäṭä"], ti: ["ተቐመጠ", "täqʼämmätä"],
        },
        note: "Arabic innovates ǧ-l-s (the source of majlis 'council'). The pan-Semitic *y/wṯb survives elsewhere.",
      },
      {
        label: "stand, rise", proto: "*qwm",
        cells: {
          akk: ["izuzzu"],
          ug: ["𐎖𐎎", "qm"], he: ["קָם", "qām"], arc: ["קָם", "qām"], syc: ["ܩܡ", "qām"],
          ar: ["قام", "qāma"],
          sab: [],
          gez: ["ቆመ", "qomä"], am: ["ቆመ", "qomä"], ti: ["ቆመ", "qomä"],
        },
        note: "A universally-preserved hollow root (medial-weak *q-w-m).",
      },
      {
        label: "return, come back", proto: "*šwb",
        cells: {
          akk: ["târu"],
          ug: ["𐎘𐎁", "ṯb"], he: ["שָׁב", "šāv"], arc: ["תָּב", "tāḇ"], syc: ["ܬܒ", "tāḇ"],
          ar: ["ثاب, رجع", "ṯāba, raǧaʿa"],
          sab: [],
          gez: ["ገብአ", "gäbʔa"], am: ["ተመለሰ", "tämälläsä"], ti: ["ተመልሰ", "tämälsä"],
        },
      },
      {
        label: "cross, pass", proto: "*ʕbr",
        cells: {
          akk: ["ebēru"],
          ug: ["𐎓𐎁𐎗", "ʕbr"], he: ["עָבַר", "ʿāvar"], arc: ["עֲבַר", "ʿăḇar"], syc: ["ܥܒܪ", "ʿḇar"],
          ar: ["عبر", "ʿabara"],
          sab: ["𐩲𐩨𐩧", "ʕbr"],
          gez: ["ዓደወ", "ʿadäwä"], am: ["አለፈ", "aläfä"], ti: ["ሓለፈ", "ḥaläfä"],
        },
        note: "The root of 'Hebrew' (ʿivri) itself — 'one who crossed over' (the Euphrates).",
      },
      {
        label: "run", proto: "*rwṣ",
        cells: {
          akk: ["lasāmu"],
          ug: ["𐎗𐎕", "rṣ"], he: ["רָץ", "rāṣ"], arc: ["רְהַט"], syc: ["ܪܗܛ"],
          ar: ["ركض, جرى", "rakaḍa, ǧarā"],
          sab: [],
          gez: ["ሮጠ", "roṭä"], am: ["ሮጠ", "roṭä"], ti: ["ጎየ", "goyä"],
        },
      },
    ],
  },
  {
    slug: "time-seasons",
    title: "Time & seasons",
    description:
      "Divisions of time. Day, night, and year use the most stable pan-Semitic roots. Words for 'week' are a later innovation everywhere.",
    kind: "vocabulary",
    rows: [
      {
        label: "day", proto: "*yawm-",
        cells: {
          akk: ["ūmu"],
          ug: ["𐎊𐎎", "ym"], he: ["יוֹם", "yōm"], arc: ["יוֹמָא", "yōmā"], syc: ["ܝܘܡܐ", "yawmā"],
          ar: ["يوم", "yawm"],
          sab: ["𐩺𐩥𐩣", "ywm"],
          gez: ["ዕለት", "ʿəlät"], am: ["ቀን", "qän"], ti: ["መዓልቲ", "mäʿalti"],
        },
        note: "Ethio-Semitic uses different roots. Everywhere else *yawm- is preserved.",
      },
      {
        label: "night", proto: "*layl-",
        cells: {
          akk: ["mūšu"],
          ug: ["𐎍𐎍", "ll"], he: ["לַיְלָה", "layəlāh"], arc: ["לֵילְיָא", "lēləyā"], syc: ["ܠܠܝܐ", "lelyā"],
          ar: ["ليل", "layl"],
          sab: ["𐩡𐩺𐩡", "lyl"],
          gez: ["ሌሊት", "lelit"], am: ["ሌሊት", "lelit"], ti: ["ለይቲ", "läyti"],
        },
      },
      {
        label: "year", proto: "*šan(a)t-",
        cells: {
          akk: ["šattu"],
          ug: ["𐎌𐎐𐎚", "šnt"], he: ["שָׁנָה", "šānāh"], arc: ["שַׁתָּא", "šattā"], syc: ["ܫܢܬܐ", "šnattā"],
          ar: ["سنة", "sana"],
          sab: ["𐩪𐩬𐩩", "snt"],
          gez: ["ዓመት", "ʿāmät"], am: ["ዓመት", "amät"], ti: ["ዓመት", "amät"],
        },
      },
      {
        label: "morning", proto: "*bqr-  /  *ṣbḥ-",
        cells: {
          akk: ["šēru, ṣīt šamši"],
          ug: [], he: ["בֹּקֶר", "bōqer"], arc: ["צַפְרָא", "ṣaprā"], syc: ["ܨܦܪܐ", "ṣaprā"],
          ar: ["صباح", "ṣabāḥ"],
          sab: [],
          gez: ["ጽባሕ", "ṣəbaḥ"], am: ["ጠዋት", "ṭäwat"], ti: ["ንጉሆ", "nguho"],
        },
        note: "Hebrew uses *bqr (from 'to break, split' — 'day-break') while Aramaic and Arabic prefer *ṣbḥ.",
      },
      {
        label: "evening", proto: "*ʕrb-",
        cells: {
          akk: ["līlātu"],
          ug: ["𐎓𐎗𐎁", "ʕrb"], he: ["עֶרֶב", "ʿerev"], arc: ["רַמְשָׁא"], syc: ["ܪܡܫܐ"],
          ar: ["مساء", "masāʔ"],
          sab: [],
          gez: ["ምሴት", "məset"], am: ["ማታ", "mata"], ti: ["ምሸት", "məšät"],
        },
        note: "The word 'Arab' itself descends from this root — either 'wandering' or 'sunset/west'.",
      },
      {
        label: "hour, time", proto: "loan: *šaʕat- (all from Aramaic)",
        cells: {
          akk: ["adannu"],
          ug: [], he: ["שָׁעָה", "šāʿāh"], arc: ["שַׁעְתָּא", "šaʿtā"], syc: ["ܫܥܬܐ", "šaʿtā"],
          ar: ["ساعة", "sāʕa"],
          sab: [],
          gez: ["ሰዓት", "säʿat"], am: ["ሰዓት", "säʿat"], ti: ["ሰዓት", "säʿat"],
        },
        note: "The word 'hour' spread FROM Aramaic to everywhere in the Semitic-speaking world (and beyond — Turkish saat, Hindi saʔat).",
      },
    ],
  },
  {
    slug: "verb-ktb-perfect",
    title: "Verb conjugation: *k-t-b 'write' — perfect (G-stem)",
    description:
      "The pan-Semitic root k-t-b 'write' conjugated in the SUFFIX conjugation (perfect / past). The Semitic perfect marks person + gender + number with SUFFIXES only (unlike the imperfect, which uses prefixes). The stem *katab- surfaces almost identically across Central, NW, and Old South Arabian; Akkadian and Ethio-Semitic substitute their own preferred 'write' roots (šaṭāru, ṣ-ḥ-f).",
    kind: "vocabulary",
    rows: [
      {
        label: "he wrote (3ms)", proto: "*kataba",
        cells: {
          akk: ["išṭur (šaṭāru)"],
          ug: ["𐎋𐎚𐎁", "ktb"], he: ["כָּתַב", "kāṯav"], arc: ["כְּתַב", "kəṯav"], syc: ["ܟܼܬܼܒ", "kṯaḇ"],
          ar: ["كتب", "kataba"],
          sab: ["𐩫𐩩𐩨", "ktb"],
          gez: ["ጸሐፈ", "ṣäḥafa (ṣ-ḥ-f)"], am: ["ጻፈ", "ṣafä (ṣ-f)"], ti: ["ጸሐፈ", "ṣäḥafä"],
        },
        note: "3ms is the DICTIONARY-CITATION form throughout Semitic — bare stem, no suffix. Akkadian dropped the *katab- root in favor of šaṭāru; Ethio-Semitic uses ṣ-ḥ-f (Ge'ez, Ti) or ṣ-f (Am).",
      },
      {
        label: "she wrote (3fs)", proto: "*katabat",
        cells: {
          akk: ["išṭur (same as 3ms)"],
          ug: ["𐎋𐎚𐎁𐎚", "ktbt"], he: ["כָּתְבָה", "kāṯəvāh"], arc: ["כִּתְבַת", "kiṯbaṯ"], syc: ["ܟܼܬܼܒܼܬ", "kiṯḇaṯ"],
          ar: ["كتبت", "katabat"],
          sab: ["𐩫𐩩𐩨𐩩", "ktbt"],
          gez: ["ጸሐፈት", "ṣäḥafat"], am: ["ጻፈች", "ṣafäččə"], ti: ["ጸሐፈት", "ṣäḥafät"],
        },
        note: "Feminine marker *-at is preserved from PS across NW + Central + South Semitic. Amharic evolves -čč (< -at + -a).",
      },
      {
        label: "you wrote (2ms)", proto: "*katabta",
        cells: {
          akk: ["tašṭur"],
          ug: ["𐎋𐎚𐎁𐎚", "ktbt"], he: ["כָּתַבְתָּ", "kāṯavtā"], arc: ["כְּתַבְתְּ", "kəṯavt"], syc: ["ܟܼܬܼܒܼܬ", "kṯaḇt"],
          ar: ["كتبت", "katabta"],
          sab: ["𐩫𐩩𐩨𐩫", "ktbk"],
          gez: ["ጸሐፍከ", "ṣäḥafka"], am: ["ጻፍክ", "ṣafk"], ti: ["ጸሐፍካ", "ṣäḥafka"],
        },
        note: "2ms afformative *-tā (from PS pronoun *ʔantā) preserved everywhere. Ethio-Semitic uses -k (from a different pronoun *kā).",
      },
      {
        label: "I wrote (1cs)", proto: "*katabtu",
        cells: {
          akk: ["ašṭur"],
          ug: ["𐎋𐎚𐎁𐎚", "ktbt"], he: ["כָּתַבְתִּי", "kāṯavtī"], arc: ["כִּתְבֵית", "kiṯvēṯ"], syc: ["ܟܼܬܼܒܼܬ", "kiṯḇeṯ"],
          ar: ["كتبت", "katabtu"],
          sab: ["𐩫𐩩𐩨𐩫", "ktbk"],
          gez: ["ጸሐፍኩ", "ṣäḥafku"], am: ["ጻፍኩ", "ṣafku"], ti: ["ጸሐፍኩ", "ṣäḥafku"],
        },
        note: "1cs afformative *-tu (from PS pronoun *ʔanākū). Hebrew and Aramaic add a further vowel (-tī, -ēṯ); Ge'ez keeps -ku.",
      },
      {
        label: "they wrote (3mp)", proto: "*katabū",
        cells: {
          akk: ["išṭurū"],
          ug: ["𐎋𐎚𐎁𐎜", "ktbw"], he: ["כָּתְבוּ", "kāṯəvū"], arc: ["כְּתַבוּ", "kəṯavū"], syc: ["ܟܼܬܼܒܼܘ", "kṯaḇw"],
          ar: ["كتبوا", "katabū"],
          sab: ["𐩫𐩩𐩨𐩥", "ktbw"],
          gez: ["ጸሐፉ", "ṣäḥafu"], am: ["ጻፉ", "ṣafu"], ti: ["ጸሐፉ", "ṣäḥafu"],
        },
      },
      {
        label: "we wrote (1cp)", proto: "*katabnā",
        cells: {
          akk: ["nišṭur"],
          ug: ["𐎋𐎚𐎁𐎐", "ktbn"], he: ["כָּתַבְנוּ", "kāṯavnū"], arc: ["כְּתַבְנָא", "kəṯavnā"], syc: ["ܟܼܬܼܒܼܢ", "kṯaḇn"],
          ar: ["كتبنا", "katabnā"],
          sab: ["𐩫𐩩𐩨𐩬", "ktbn"],
          gez: ["ጸሐፍነ", "ṣäḥafna"], am: ["ጻፍን", "ṣafnä"], ti: ["ጸሐፍና", "ṣäḥafna"],
        },
        note: "1cp *-nā/*-nū is nearly identical across the entire family — one of the most conservative morphemes in Semitic.",
      },
    ],
  },
  {
    slug: "verb-ktb-imperfect",
    title: "Verb conjugation: *k-t-b 'write' — imperfect / yiktub",
    description:
      "The PREFIX conjugation — Semitic's imperfect/present/future tense. This is the ancient PS conjugation whose subject-marker system is the mirror image of the perfect: person is marked BEFORE the root (prefix) and, for some persons, also AFTER (suffix). The prefixes ʔ- (1cs), t- (2/3fs), y- (3ms), n- (1cp) are near-universal across the family.",
    kind: "vocabulary",
    rows: [
      {
        label: "he writes / will write (3ms)", proto: "*ya-ktub-u",
        cells: {
          akk: ["išaṭṭar"],
          ug: ["𐎊𐎋𐎚𐎁", "yktb"], he: ["יִכְתֹּב", "yiḵtōv"], arc: ["יִכְתּוֹב"], syc: ["ܢܸܟܼܬܘܿܒ", "neḵtōḇ"],
          ar: ["يكتب", "yaktubu"],
          sab: ["𐩺𐩫𐩩𐩨", "yktb"],
          gez: ["ይጽሕፍ", "yəṣəḥəf"], am: ["ይጽፋል", "yəṣəfal"], ti: ["ይጽሕፍ", "yəṣəḥəf"],
        },
        note: "The 3ms prefix y- (< PS *ya-) is the flagship Semitic morpheme. Syriac reanalyzed as n- (< *ny-); this is a defining feature of Eastern Aramaic.",
      },
      {
        label: "she writes (3fs)", proto: "*ta-ktub-u",
        cells: {
          akk: ["tašaṭṭar"],
          ug: ["𐎚𐎋𐎚𐎁", "tktb"], he: ["תִּכְתֹּב", "tiḵtōv"], arc: ["תִּכְתּוֹב"], syc: ["ܬܸܟܼܬܘܿܒ", "teḵtōḇ"],
          ar: ["تكتب", "taktubu"],
          sab: ["𐩩𐩫𐩩𐩨", "tktb"],
          gez: ["ትጽሕፍ", "təṣəḥəf"], am: ["ትጽፋለች", "təṣəfalläčč"], ti: ["ትጽሕፍ", "təṣəḥəf"],
        },
      },
      {
        label: "you write (2ms)", proto: "*ta-ktub-u",
        cells: {
          akk: ["tašaṭṭar"],
          ug: ["𐎚𐎋𐎚𐎁", "tktb"], he: ["תִּכְתֹּב", "tiḵtōv"], arc: ["תִּכְתּוֹב"], syc: ["ܬܸܟܼܬܘܿܒ", "teḵtōḇ"],
          ar: ["تكتب", "taktubu"],
          sab: ["𐩩𐩫𐩩𐩨", "tktb"],
          gez: ["ትጽሕፍ", "təṣəḥəf"], am: ["ትጽፋለህ", "təṣəfalläh"], ti: ["ትጽሕፍ", "təṣəḥəf"],
        },
        note: "IDENTICAL in form to 3fs across most of the family — one of Semitic's classic ambiguities, disambiguated only by context.",
      },
      {
        label: "I write (1cs)", proto: "*ʔa-ktub-u",
        cells: {
          akk: ["ašaṭṭar"],
          ug: ["𐎀𐎋𐎚𐎁", "aktb"], he: ["אֶכְתֹּב", "ʾeḵtōv"], arc: ["אֶכְתּוֹב"], syc: ["ܐܸܟܼܬܘܿܒ", "ʾeḵtōḇ"],
          ar: ["أكتب", "ʾaktubu"],
          sab: ["𐩱𐩫𐩩𐩨", "ʔktb"],
          gez: ["እጽሕፍ", "ʾəṣəḥəf"], am: ["እጽፋለሁ", "əṣəfallähu"], ti: ["እጽሕፍ", "ʾəṣəḥəf"],
        },
        note: "1cs prefix ʔ- (glottal stop) is the ancient Proto-Semitic mark, from pronoun *ʔanākū 'I'.",
      },
      {
        label: "they write (3mp)", proto: "*ya-ktub-ū",
        cells: {
          akk: ["išaṭṭarū"],
          ug: ["𐎊𐎋𐎚𐎁𐎐", "yktbn"], he: ["יִכְתְּבוּ", "yiḵtəḇū"], arc: ["יִכְתְּבוּן"], syc: ["ܢܸܟܼܬܒܘܿܢ", "neḵtḇōn"],
          ar: ["يكتبون", "yaktubūna"],
          sab: ["𐩺𐩫𐩩𐩨𐩬", "yktbn"],
          gez: ["ይጽሕፉ", "yəṣəḥəfu"], am: ["ይጽፋሉ", "yəṣəfallu"], ti: ["ይጽሕፉ", "yəṣəḥəfu"],
        },
        note: "Notice how NW Semitic (Aramaic, Ugaritic, Sabaean) preserved the ancient FINAL -n suffix — the 'energic ending' that Hebrew and Ge'ez lost.",
      },
      {
        label: "we write (1cp)", proto: "*na-ktub-u",
        cells: {
          akk: ["nišaṭṭar"],
          ug: ["𐎐𐎋𐎚𐎁", "nktb"], he: ["נִכְתֹּב", "niḵtōv"], arc: ["נִכְתּוֹב"], syc: ["ܢܸܟܼܬܘܿܒ", "neḵtōḇ"],
          ar: ["نكتب", "naktubu"],
          sab: ["𐩬𐩫𐩩𐩨", "nktb"],
          gez: ["ንጽሕፍ", "nəṣəḥəf"], am: ["እንጽፋለን", "ənəṣəfallän"], ti: ["ንጽሕፍ", "nəṣəḥəf"],
        },
        note: "1cp prefix n- (from PS *naḥnu 'we') is universal. In Syriac 3ms (nektōḇ) is IDENTICAL to 1cp — a famous Eastern Aramaic ambiguity.",
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
