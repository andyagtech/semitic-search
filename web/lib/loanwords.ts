/**
 * Curated Semitic loanwords + imagined native alternatives.
 *
 * Each entry pairs a real loanword (in a Semitic language) with 1-3 imagined
 * native alternatives, drawn from Proto-Semitic roots + native derivational
 * patterns (binyanim / mishqalim in Hebrew; awzān in Arabic).
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
