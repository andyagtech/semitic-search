/**
 * Curated Semitic loanwords + imagined native alternatives.
 *
 * Hebrew entries draw heavily on published Academy of the Hebrew Language
 * (Ha-Aqademia La-Lashon Ha-ʿIvrit) coinings and Ben-Yehuda-era neologisms.
 * Academy sources:
 *   - terms.hebrew-academy.org.il — the official terminology database
 *   - iedit.co.il/foreign-words-and-their-hebrew-alternatives
 *   - individual Academy news posts on lexical replacements
 *
 * Each entry pairs a real loanword with 1-3 native alternatives, tagged
 * `attested` (in real use), `archaic` (fell out of use), or `imagined`
 * (thought-experiment coining).
 */

import type { LanguageCode } from "./models";

export type Alternative = {
  form: string;
  derivation: string;
  status: "attested" | "archaic" | "imagined";
};

export type Loanword = {
  loan: string;
  source: string;
  meaning: string;
  alternatives: Alternative[];
};

export type LoanwordSection = {
  language: LanguageCode;
  languageName: string;
  intro: string;
  loans: Loanword[];
};

export const LOANWORD_SECTIONS: LoanwordSection[] = [
  {
    language: "he",
    languageName: "Hebrew",
    intro:
      "Hebrew has three major loan strata: Aramaic (deeply integrated, especially in rabbinic texts), Greek/Latin (mostly through Roman-era Palestine), and Modern Hebrew's ubiquitous English/French/Arabic borrowings. Ben-Yehuda and later coiners drew on native Biblical roots to produce hundreds of replacements — many are now standard.",
    loans: [
      {
        loan: "אבא abba", source: "Aramaic אבא abba", meaning: "father",
        alternatives: [
          { form: "אב av", derivation: "Biblical Hebrew *ʔab-, the direct native form. Still used but less colloquial.", status: "attested" },
        ],
      },
      {
        loan: "אמא imma", source: "Aramaic אמא imma", meaning: "mother",
        alternatives: [
          { form: "אם em", derivation: "Biblical Hebrew *ʔum(m)-. Used but less colloquial.", status: "attested" },
        ],
      },
      {
        loan: "לבנה labneh", source: "Arabic لبنة labneh", meaning: "strained yogurt",
        alternatives: [
          { form: "לָבְנַה lavnah", derivation: "Reflex-adapted: Arabic لبنة labneh → apply begadkefat *b→v after vowel → lavnah.", status: "imagined" },
        ],
      },
      {
        loan: "ג'יבנה jibneh", source: "Colloquial Arabic جبنة jibneh", meaning: "cheese",
        alternatives: [
          { form: "גבינה gvinah", derivation: "Reflex-adapted: apply *b→v spirantization. The actual standard Hebrew word.", status: "attested" },
        ],
      },
      {
        loan: "מגדל migdal", source: "Aramaic-influenced form", meaning: "tower",
        alternatives: [
          { form: "מגדל migdal", derivation: "Actually native from Biblical Hebrew ג-ד-ל 'grow'. Both forms coexist.", status: "attested" },
        ],
      },
      {
        loan: "אינטרנט", source: "English internet", meaning: "internet",
        alternatives: [
          { form: "מרשתת mireshet", derivation: "Native from רשת 'net' + prefix mi- + geminate. Academy of Hebrew coining, rarely used in practice.", status: "attested" },
        ],
      },
      {
        loan: "טלפון", source: "Greek τηλέφωνον via European languages", meaning: "telephone",
        alternatives: [
          { form: "שח-רחוק sah-rachok", derivation: "שח 'speech' + רחוק 'distant'. Imagined native calque of tele+phone.", status: "imagined" },
        ],
      },
      {
        loan: "קומפיוטר", source: "English computer", meaning: "computer",
        alternatives: [
          { form: "מחשב machshev", derivation: "Native from ח-ש-ב 'think, calculate' + mishqal ma-CCēC. The Academy coining WON — standard modern word.", status: "attested" },
        ],
      },
      {
        loan: "טלוויזיה", source: "French télévision", meaning: "television",
        alternatives: [
          { form: "מִרְאָה rachok", derivation: "מראה 'sight, view' + rachok 'distant'. Imagined native calque.", status: "imagined" },
        ],
      },
      {
        loan: "אוטובוס", source: "French autobus", meaning: "bus",
        alternatives: [
          { form: "רב-רכב rav-rekhev", derivation: "רב 'many' + רכב 'vehicle'. Imagined native compound.", status: "imagined" },
        ],
      },
      {
        loan: "פלטין palatin", source: "Greek παλάτιον palation", meaning: "palace",
        alternatives: [
          { form: "ארמון armon", derivation: "Native from ר-מ-ה 'lift, exalt' (via metathesis). Standard Hebrew word.", status: "attested" },
        ],
      },
      {
        loan: "סנהדרין", source: "Greek συνέδριον synedrion", meaning: "council, court",
        alternatives: [
          { form: "מועצה moetsa", derivation: "Native from י-ע-ץ 'counsel' + mishqal mo-C(C)a. Modern Hebrew for 'council'.", status: "attested" },
        ],
      },

      // ── Academy coinings sourced from terms.hebrew-academy.org.il and iedit.co.il ──
      {
        loan: "אלרגיה alergya", source: "English/German 'allergy'", meaning: "allergy",
        alternatives: [
          { form: "רַגֶּשֶׁת rageshet", derivation: "Academy coining from ר-ג-ש 'feel' + segolate CaCCēCet pattern. The native form is documented but the loan alergya remains more common in daily speech.", status: "attested" },
        ],
      },
      {
        loan: "היררכיה hiyerarkhya", source: "Greek ἱεραρχία via European languages", meaning: "hierarchy",
        alternatives: [
          { form: "מִדְרָג midrag", derivation: "Academy coining from ד-ר-ג 'grade, step' + mishqal mif'āl. Actively used in academic writing.", status: "attested" },
        ],
      },
      {
        loan: "פלצבו platsebo", source: "Latin placebo 'I shall please'", meaning: "placebo",
        alternatives: [
          { form: "תְּרוּפַת דֶּמֶה trufat deme", derivation: "Native compound: תרופה 'medicine' + construct + דמה 'imitation'. Literally 'imitation-medicine'.", status: "attested" },
        ],
      },
      {
        loan: "אאוטפוט output", source: "English 'output'", meaning: "output",
        alternatives: [
          { form: "תְּפוּקָה tfuka", derivation: "From נ-פ-ק 'issue, come out' + qtīlā feminine deverbal pattern. Standard in economics and engineering.", status: "attested" },
        ],
      },
      {
        loan: "אסקפיזם eskapizm", source: "English 'escapism'", meaning: "escapism",
        alternatives: [
          { form: "בּוֹרְחָנוּת borḥanut", derivation: "Native from ב-ר-ח 'flee' + agentive -ān + abstract -ūt. Structurally 'fleer-ness'.", status: "attested" },
        ],
      },
      {
        loan: "סובלימציה sublimatsya", source: "Latin sublimare via European languages", meaning: "sublimation (psychology)",
        alternatives: [
          { form: "עִדּוּן iddun", derivation: "Native from ע-ד-ן 'refine, delight' + piʿel-verbal-noun pattern. Used in Freudian discussions in Hebrew.", status: "attested" },
        ],
      },
      {
        loan: "גלאוקומה glaukoma", source: "Greek γλαύκωμα 'clouding'", meaning: "glaucoma (eye disease)",
        alternatives: [
          { form: "בַּרְקִית barkit", derivation: "From ב-ר-ק 'shine, flash' + -it suffix. Academy coining for the eye condition, referencing the visual disturbance.", status: "attested" },
        ],
      },
      {
        loan: "צנטריפוגה tsentrifuga", source: "Latin centri- + fuga 'flee'", meaning: "centrifuge",
        alternatives: [
          { form: "סַרְכֶּזֶת sarketzet", derivation: "Portmanteau native from סר 'turn' + מרכז 'center' + segolate -et. Academy coining.", status: "attested" },
        ],
      },
      {
        loan: "טרנספירציה transpiratsya", source: "Latin transpiratio", meaning: "transpiration (biology)",
        alternatives: [
          { form: "דִּיּוּת diyut", derivation: "Native from an extended root, deverbal abstract -ūt. Academy coining for the botanical process.", status: "attested" },
        ],
      },
      {
        loan: "בונקר bunker", source: "German/English 'bunker'", meaning: "bunker, fortified shelter",
        alternatives: [
          { form: "בֶּצֶר betser", derivation: "Biblical Hebrew ב-צ-ר 'fortify', citing the Biblical city of refuge (Josh 20:8).", status: "imagined" },
          { form: "בִּצָּרוֹן bitsaron", derivation: "From ב-צ-ר + -ōn, cf. Zech 9:12 'strongholds'.", status: "imagined" },
          { form: "מִבְצוֹר mivtsor", derivation: "From same root using the mistor 'hiding place' pattern.", status: "imagined" },
        ],
      },
      {
        loan: "מזגן mazgan", source: "actually native — but replaced English 'air conditioner'", meaning: "air conditioner",
        alternatives: [
          { form: "מַזְגָּן mazgan", derivation: "Academy coining from מ-ז-ג 'blend, temper' + mishqal -gan (like מטבחן). WON completely — standard word.", status: "attested" },
        ],
      },
      {
        loan: "כספומט kaspomat", source: "actually native — but replaced English 'ATM'", meaning: "ATM, cash machine",
        alternatives: [
          { form: "כַּסְפּוֹמָט kaspomat", derivation: "Portmanteau of כסף kesef 'money' + automat suffix. WON — the standard word.", status: "attested" },
        ],
      },
      {
        loan: "רמזור ramzor", source: "actually native — but replaced 'signal/traffic light'", meaning: "traffic light",
        alternatives: [
          { form: "רַמְזוֹר ramzor", derivation: "Portmanteau of רמז 'hint, signal' + אור 'light'. WON — standard.", status: "attested" },
        ],
      },
      {
        loan: "מסך masakh", source: "actually native — replaced 'screen'", meaning: "screen (display/curtain)",
        alternatives: [
          { form: "מָסָךְ masakh", derivation: "From Biblical מ-ס-ך 'curtain, cover' (Ex 26:36). Extended to modern display screens; WON.", status: "attested" },
        ],
      },
      {
        loan: "מקלדת mikledet", source: "actually native — replaced 'keyboard'", meaning: "keyboard",
        alternatives: [
          { form: "מִקְלֶדֶת mikledet", derivation: "From קליד 'key' + mishqal miCCeCet (instrument feminine). Coined for the piano keyboard, extended to computers. WON.", status: "attested" },
        ],
      },
      {
        loan: "דוא\"ל dual", source: "actually native — replaced 'email'", meaning: "email",
        alternatives: [
          { form: 'דוא"ל dual', derivation: "Abbreviation of דואר אלקטרוני doar elektroni 'electronic mail'. Native דואר from Aramaic דוֹאָרָא. WON — standard.", status: "attested" },
        ],
      },
      {
        loan: "אתר atar", source: "actually native — replaced 'website/site'", meaning: "website",
        alternatives: [
          { form: "אֲתָר atar", derivation: "Native Aramaic-origin 'place, site' (Biblical Aramaic Ezr 5:15). Extended to websites. WON.", status: "attested" },
        ],
      },
      {
        loan: "טלפון telefon", source: "Greek τηλέφωνον via European languages", meaning: "telephone",
        alternatives: [
          { form: "שַׂח-רָחוֹק sach-rachok", derivation: "Academy attempt: שח 'speech' + רחוק 'distant' — a direct calque of Greek tele- + phono-. FAILED completely; nobody uses it. Instead the Hebrew accepted t-l-f-n as a native-like root.", status: "archaic" },
        ],
      },
      {
        loan: "נייד nayad", source: "actually native — replaced 'mobile/cellular'", meaning: "mobile phone",
        alternatives: [
          { form: "נַיָּד nayad", derivation: "From נ-ו-ד 'move, wander' + qattāl pattern (nomen agentis). WON — standard, and the verb לְטַלְפֵּן letalfen 'to phone' now uses the accepted telfen root.", status: "attested" },
        ],
      },

      // ─── Modern high-frequency colloquial loans ────────────────────
      // Includes the significant colloquial Palestinian Arabic layer that
      // marks casual spoken Modern Hebrew (aḥla, walla, sababa, yalla).
      {
        loan: "אחלה aḥla", source: "Colloquial Arabic أحلى ʔaḥla 'sweetest'",
        meaning: "great! awesome! (informal)",
        alternatives: [
          { form: "מְעֻלֶּה meʿulle", derivation: "Native from ע-ל-ה 'ascend' + puʿal past participle. 'Excellent'. Formal alternative.", status: "attested" },
          { form: "נהדר nehdar", derivation: "Native from ה-ד-ר 'glory'. 'Wonderful'. Neutral register.", status: "attested" },
        ],
      },
      {
        loan: "וואלה walla", source: "Colloquial Arabic والله 'by God'",
        meaning: "really! wow! seriously (informal)",
        alternatives: [
          { form: "באמת beemet", derivation: "Native from אמת 'truth'. 'Really, truly'. Standard alternative but doesn't carry the same emphatic emotional charge.", status: "attested" },
        ],
      },
      {
        loan: "סבבה sababa", source: "Colloquial Palestinian Arabic صبابة",
        meaning: "cool, OK, fine (informal)",
        alternatives: [
          { form: "בסדר beseder", derivation: "Native 'in order' — בְּ- + סדר 'order'. Ubiquitous standard 'OK'.", status: "attested" },
        ],
      },
      {
        loan: "יאללה yalla", source: "Colloquial Arabic يا الله 'O God'",
        meaning: "come on! let's go! (informal)",
        alternatives: [
          { form: "קדימה qadima", derivation: "Native from קדם 'front, forward'. 'Forward! onward!'. Standard alternative.", status: "attested" },
        ],
      },
      {
        loan: "טלפון telefon", source: "Greek τηλέφωνον via European languages",
        meaning: "telephone",
        alternatives: [
          { form: "נַיָּד nayad", derivation: "For 'mobile'; native from נ-ו-ד. Won for the specific mobile-phone meaning; landline 'telefon' remains the loan.", status: "attested" },
        ],
      },
      {
        loan: "אוטובוס otobus", source: "French autobus",
        meaning: "bus",
        alternatives: [
          { form: "רב-קו rav-qav", derivation: "Native compound: 'many-line'. Actually a proper name for Israel's transit smart-card system, not a general 'bus' word.", status: "attested" },
        ],
      },
      {
        loan: "קפה kafe", source: "Turkish kahve < Arabic qahwa",
        meaning: "coffee (also café)",
        alternatives: [
          { form: "בית קפה", derivation: "Native compound bayit 'house' + kafe. But 'kafe' itself is the loanword. Coffee has no ancient Hebrew word — it entered the region in the Ottoman period.", status: "attested" },
        ],
      },
      {
        loan: "פיצה pizza", source: "Italian",
        meaning: "pizza",
        alternatives: [
          { form: "—", derivation: "No native alternative; pizza is universally borrowed.", status: "imagined" },
        ],
      },
      {
        loan: "ג'ינס jeans", source: "English",
        meaning: "jeans (denim trousers)",
        alternatives: [
          { form: "מכנסי ג'ינס mikhnesey jeans", derivation: "Hybrid: native mikhnasayim 'trousers' + loan. No fully-native alternative — the item is imported.", status: "attested" },
        ],
      },
      {
        loan: "אוקיי OK", source: "English",
        meaning: "OK, alright",
        alternatives: [
          { form: "בסדר beseder", derivation: "Native standard. Also טוב tov 'good' works.", status: "attested" },
        ],
      },
      {
        loan: "אינטרנט internet", source: "English",
        meaning: "internet",
        alternatives: [
          { form: "מרשתת mireshet", derivation: "Academy coining from רשת 'net' + prefix mi- + geminate. Rarely used in practice — the loan won.", status: "attested" },
        ],
      },
    ],
  },
  {
    language: "ar",
    languageName: "Arabic",
    intro:
      "Modern Standard Arabic has an active Language Academy tradition that coins native replacements from classical roots. Many replacements (hātif, ḥāsūb, šābika) are now standard alongside the transliterated European forms.",
    loans: [
      {
        loan: "تلفون tilifūn", source: "Greek/European telephone", meaning: "telephone",
        alternatives: [
          { form: "هاتف hātif", derivation: "Native from ه-ت-ف 'to call out, address'. The Academy coining is fully standard.", status: "attested" },
        ],
      },
      {
        loan: "كومبيوتر kombiyūtar", source: "English computer", meaning: "computer",
        alternatives: [
          { form: "حاسوب ḥāsūb", derivation: "Native from ح-س-ب 'to count, reckon' + mishqal fāʿūl. Now standard in formal Arabic.", status: "attested" },
        ],
      },
      {
        loan: "إنترنت intərnet", source: "English internet", meaning: "internet",
        alternatives: [
          { form: "شابكة šābika", derivation: "Native from ش-ب-ك 'to net, entangle' + active participle fāʿila. Modern Academy coining.", status: "attested" },
        ],
      },
      {
        loan: "ديوان dīwān", source: "Persian دیوان dīwān", meaning: "council, register, poetry collection",
        alternatives: [
          { form: "مجلس majlis", derivation: "Native from ج-ل-س 'to sit' + mishqal maf'il. Both terms are used, majlis for 'council' primarily.", status: "attested" },
        ],
      },
      {
        loan: "بستان bustān", source: "Persian بستان bostān", meaning: "garden, orchard",
        alternatives: [
          { form: "حديقة ḥadīqa", derivation: "Native from ح-د-ق 'enclose'. Now the standard 'garden' word in most Arabic dialects.", status: "attested" },
        ],
      },
      {
        loan: "قصر qaṣr", source: "Latin castrum via Aramaic", meaning: "palace, castle",
        alternatives: [
          { form: "دار dār", derivation: "Native root د-و-ر 'turn, rotate' → 'dwelling'. Used more broadly for 'house, dwelling'.", status: "attested" },
        ],
      },
      {
        loan: "تلفزيون tilfazyūn", source: "French télévision", meaning: "television",
        alternatives: [
          { form: "مِرْآة miryāt", derivation: "Native from ر-أ-ي 'see' + mishqal mif'āl. Imagined native calque.", status: "imagined" },
        ],
      },

      // ─── Common colloquial + modern loans in daily Arabic ──────────
      {
        loan: "بنطلون banṭalūn", source: "French pantalon",
        meaning: "trousers, pants",
        alternatives: [
          { form: "سِرْوَال sirwāl", derivation: "Native root — 'traditional loose trousers'. Standard alternative for pants but has a folk-dress connotation.", status: "attested" },
        ],
      },
      {
        loan: "قميص qamīṣ", source: "Latin camisia via Aramaic",
        meaning: "shirt",
        alternatives: [
          { form: "—", derivation: "Universally borrowed; entered Arabic so long ago it feels native. Modern Standard Arabic accepts it.", status: "attested" },
        ],
      },
      {
        loan: "بوليس būlīs", source: "French police",
        meaning: "police",
        alternatives: [
          { form: "شرطة šurṭa", derivation: "Native from ش-ر-ط 'stipulation, condition'. Standard MSA — has completely displaced būlīs in formal writing.", status: "attested" },
        ],
      },
      {
        loan: "فيلم film", source: "English film",
        meaning: "film, movie",
        alternatives: [
          { form: "شريط sinemāʔī", derivation: "Native but analytical: 'cinematic strip'. Loan wins in daily use.", status: "attested" },
        ],
      },
      {
        loan: "بنك bank", source: "Italian banco via European",
        meaning: "bank",
        alternatives: [
          { form: "مَصْرِف maṣrif", derivation: "Native from ص-ر-ف 'exchange, spend' + mishqal maf'il. Fully standard alternative in MSA.", status: "attested" },
        ],
      },
      {
        loan: "أوتيل ʔūtīl", source: "French hôtel",
        meaning: "hotel",
        alternatives: [
          { form: "فُنْدُق funduq", derivation: "Native root — 'inn, hotel'. Standard MSA. Historical root from Greek πάνδοκος but naturalized so early it's treated as native.", status: "attested" },
        ],
      },
      {
        loan: "راديو rādyo", source: "English radio",
        meaning: "radio",
        alternatives: [
          { form: "مِذْيَاع miḏyāʿ", derivation: "Native from ذ-ي-ع 'broadcast' + mishqal mif'āl. Academy coining; used in formal writing.", status: "attested" },
        ],
      },
      {
        loan: "أوتوبيس ʔutūbīs", source: "French autobus",
        meaning: "bus",
        alternatives: [
          { form: "حَافِلَة ḥāfila", derivation: "Native from ح-ف-ل 'gather'. Fully standard MSA — has won in formal contexts.", status: "attested" },
        ],
      },
      {
        loan: "سيگارة sīgāra", source: "French cigarette",
        meaning: "cigarette",
        alternatives: [
          { form: "—", derivation: "No traditional Arabic alternative; universally borrowed.", status: "attested" },
        ],
      },
      {
        loan: "شاي šāy", source: "Persian < Chinese chá",
        meaning: "tea",
        alternatives: [
          { form: "—", derivation: "The plant itself came via trade, so the word travelled with it. No native alternative.", status: "attested" },
        ],
      },
      {
        loan: "قهوة qahwa", source: "actually native — 'coffee'",
        meaning: "coffee",
        alternatives: [
          { form: "قَهْوَة qahwa", derivation: "Native Arabic word from an Ethio-Semitic root — the plant originated in Ethiopia. Traveled OUT of Arabic to European languages (coffee, café).", status: "attested" },
        ],
      },
    ],
  },
  {
    language: "am",
    languageName: "Amharic",
    intro:
      "Amharic's loan strata include Ge'ez (learned/liturgical), Arabic (via Ge'ez and modern contact), Italian (colonial period 1935-1941), and English (modern). Amharic is more open to loans than the more purist trends in Modern Hebrew and Arabic.",
    loans: [
      {
        loan: "ፓስታ pasta", source: "Italian pasta", meaning: "pasta",
        alternatives: [
          { form: "ገንፎ genfo", derivation: "Native Amharic word for a traditional wheat/barley porridge. Distinct dish but functionally analogous.", status: "attested" },
        ],
      },
      {
        loan: "ኮምፒዩተር", source: "English computer", meaning: "computer",
        alternatives: [
          { form: "አስተማራ", derivation: "Native from አስተማረ 'compute, calculate'. Imagined native coining.", status: "imagined" },
        ],
      },
      {
        loan: "ቴሌፎን", source: "English/European telephone", meaning: "telephone",
        alternatives: [
          { form: "ሩቅ-አነጋገር ruq-anägagär", derivation: "ሩቅ 'far' + አነጋገር 'speech' — imagined native calque.", status: "imagined" },
        ],
      },
      {
        loan: "ማዥን mažin", source: "Italian macchina / English machine", meaning: "machine",
        alternatives: [
          { form: "መሣሪያ mäsariyya", derivation: "Native from ሠ-ራ 'work, do' + mishqal-like prefix. Actually used for 'tool, instrument'.", status: "attested" },
        ],
      },
    ],
  },
];
