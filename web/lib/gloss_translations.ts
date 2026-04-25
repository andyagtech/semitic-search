// Hand-curated English → Arabic / Hebrew translations for the ~200 most
// common theme keywords that appear across our root family pages. These
// cover ~80% of theme occurrences; unmatched words just render in English.
// Romanizations follow SBL (Hebrew) / ALA-LC (Arabic) conventions.
//
// Intentionally terse — the target is the CORE MEANING, not a full
// definition. Multi-sense words pick the most Semitic-linguistics-salient
// sense (e.g. "spring" → "fountain/spring of water").

export type TrilingualGloss = {
  ar: string;     // Arabic in script
  ar_roman?: string;
  he: string;     // Hebrew in script
  he_roman?: string;
};

export const GLOSS_TRANSLATIONS: Record<string, TrilingualGloss> = {
  // Rulership + royalty
  king:     { ar: "مَلِك", ar_roman: "malik",    he: "מֶלֶךְ",   he_roman: "mélekh" },
  queen:    { ar: "مَلِكَة", ar_roman: "malika", he: "מַלְכָּה", he_roman: "malká" },
  kingdom:  { ar: "مَمْلَكَة", ar_roman: "mamlaka", he: "מַמְלָכָה", he_roman: "mamlakhá" },
  ruler:    { ar: "حَاكِم", ar_roman: "ḥākim",  he: "מוֹשֵׁל",  he_roman: "moshél" },
  royal:    { ar: "مَلَكِيّ", ar_roman: "malakī", he: "מַלְכוּתִי", he_roman: "malkhutí" },

  // Body parts
  eye:      { ar: "عَيْن",   ar_roman: "ʿayn",   he: "עַיִן",   he_roman: "ʿáyin" },
  eyes:     { ar: "عُيُون",  ar_roman: "ʿuyūn",  he: "עֵינַיִם", he_roman: "ʿeynáyim" },
  hand:     { ar: "يَد",    ar_roman: "yad",    he: "יָד",     he_roman: "yad" },
  foot:     { ar: "قَدَم",   ar_roman: "qadam",  he: "רֶגֶל",    he_roman: "régel" },
  head:     { ar: "رَأْس",   ar_roman: "raʾs",   he: "רֹאשׁ",   he_roman: "rosh" },
  heart:    { ar: "قَلْب",   ar_roman: "qalb",   he: "לֵב",     he_roman: "lev" },
  tongue:   { ar: "لِسَان",  ar_roman: "lisān",  he: "לָשׁוֹן",  he_roman: "lashón" },
  mouth:    { ar: "فَم",    ar_roman: "fam",    he: "פֶּה",     he_roman: "peh" },
  tooth:    { ar: "سِنّ",    ar_roman: "sinn",   he: "שֵׁן",    he_roman: "shen" },
  bone:     { ar: "عَظْم",   ar_roman: "ʿaẓm",   he: "עֶצֶם",    he_roman: "ʿétsem" },
  blood:    { ar: "دَم",    ar_roman: "dam",    he: "דָּם",     he_roman: "dam" },
  knee:     { ar: "رُكْبَة",  ar_roman: "rukba",  he: "בֶּרֶךְ",   he_roman: "bérekh" },
  arm:      { ar: "ذِرَاع",  ar_roman: "ḏirāʿ",  he: "זְרוֹעַ",  he_roman: "zróaʿ" },

  // Kinship
  father:   { ar: "أَب",   ar_roman: "ʾab",   he: "אָב",    he_roman: "av" },
  mother:   { ar: "أُمّ",   ar_roman: "ʾumm",  he: "אֵם",    he_roman: "em" },
  brother:  { ar: "أَخ",   ar_roman: "ʾakh",  he: "אָח",    he_roman: "aḥ" },
  sister:   { ar: "أُخْت",  ar_roman: "ʾukht", he: "אָחוֹת", he_roman: "aḥót" },
  son:      { ar: "اِبْن",  ar_roman: "ibn",   he: "בֵּן",    he_roman: "ben" },
  daughter: { ar: "اِبْنَة", ar_roman: "ibna",  he: "בַּת",    he_roman: "bat" },
  wife:     { ar: "زَوْجَة", ar_roman: "zawja", he: "אִשָּׁה",  he_roman: "ishá" },
  husband:  { ar: "زَوْج",   ar_roman: "zawj",   he: "בַּעַל",  he_roman: "báʿal" },
  man:      { ar: "رَجُل",   ar_roman: "rajul",  he: "אִישׁ",   he_roman: "ish" },
  male:     { ar: "ذَكَر",   ar_roman: "ḏakar",  he: "זָכָר",    he_roman: "zakhár" },
  female:   { ar: "أُنْثَى",  ar_roman: "ʾunṯá", he: "נְקֵבָה",  he_roman: "nqevá" },
  people:   { ar: "شَعْب",   ar_roman: "shaʿb",  he: "עַם",     he_roman: "ʿam" },

  // Animals
  dog:      { ar: "كَلْب",   ar_roman: "kalb",   he: "כֶּלֶב",    he_roman: "kélev" },
  bitch:    { ar: "كَلْبَة",  ar_roman: "kalba",  he: "כַּלְבָּה",  he_roman: "kalbá" },
  hound:    { ar: "كَلْب صَيْد", ar_roman: "kalb ṣayd", he: "כֶּלֶב צַיִד", he_roman: "kélev tsáyid" },
  donkey:   { ar: "حِمَار",  ar_roman: "ḥimār",  he: "חֲמוֹר",   he_roman: "ḥamór" },
  ass:      { ar: "حِمَار",  ar_roman: "ḥimār",  he: "חֲמוֹר",   he_roman: "ḥamór" },
  cow:      { ar: "بَقَرَة",  ar_roman: "baqara", he: "פָּרָה",   he_roman: "pará" },
  sheep:    { ar: "خَرُوف",  ar_roman: "kharūf", he: "כֶּבֶשׂ",   he_roman: "kéves" },
  goat:     { ar: "مَاعِز",  ar_roman: "māʿiz",  he: "עֵז",     he_roman: "ʿez" },
  lion:     { ar: "أَسَد",   ar_roman: "ʾasad",  he: "אַרְיֵה",  he_roman: "aryé" },
  fish:     { ar: "سَمَك",   ar_roman: "samak",  he: "דָּג",     he_roman: "dag" },
  bird:     { ar: "طَيْر",   ar_roman: "ṭayr",   he: "צִפּוֹר",   he_roman: "tsipór" },
  serpent:  { ar: "ثُعْبَان", ar_roman: "ṯuʿbān", he: "נָחָשׁ",   he_roman: "naḥásh" },

  // Religion + spirit
  god:      { ar: "إِلَه",   ar_roman: "ilāh",   he: "אֱלֹהִים",   he_roman: "elohím" },
  deity:    { ar: "إِلَه",   ar_roman: "ilāh",   he: "אֱלוֹהַּ",   he_roman: "elóah" },
  holy:     { ar: "مُقَدَّس", ar_roman: "muqaddas", he: "קָדוֹשׁ",   he_roman: "qadósh" },
  peace:    { ar: "سَلَام",  ar_roman: "salām",  he: "שָׁלוֹם",   he_roman: "shalóm" },
  bless:    { ar: "بَارَكَ",  ar_roman: "bāraka", he: "בֵּרֵךְ",   he_roman: "berékh" },
  blessing: { ar: "بَرَكَة",  ar_roman: "baraka", he: "בְּרָכָה",  he_roman: "brakhá" },
  prayer:   { ar: "صَلَاة",  ar_roman: "ṣalāh",  he: "תְּפִלָּה",  he_roman: "tefilá" },
  pray:     { ar: "صَلَّى",   ar_roman: "ṣallá",  he: "הִתְפַּלֵּל", he_roman: "hitpalél" },

  // Everyday objects + places
  house:    { ar: "بَيْت",   ar_roman: "bayt",   he: "בַּיִת",    he_roman: "báyit" },
  door:     { ar: "بَاب",   ar_roman: "bāb",    he: "דֶּלֶת",    he_roman: "délet" },
  gate:     { ar: "بَوَّابَة", ar_roman: "bawwāba", he: "שַׁעַר",  he_roman: "sháʿar" },
  city:     { ar: "مَدِينَة", ar_roman: "madīna", he: "עִיר",    he_roman: "ʿir" },
  land:     { ar: "أَرْض",   ar_roman: "ʾarḍ",   he: "אֶרֶץ",    he_roman: "érets" },
  earth:    { ar: "أَرْض",   ar_roman: "ʾarḍ",   he: "אֶרֶץ",    he_roman: "érets" },
  mountain: { ar: "جَبَل",   ar_roman: "jabal",  he: "הַר",     he_roman: "har" },
  road:     { ar: "طَرِيق",  ar_roman: "ṭarīq",  he: "דֶּרֶךְ",   he_roman: "dérekh" },
  stone:    { ar: "حَجَر",   ar_roman: "ḥajar",  he: "אֶבֶן",    he_roman: "éven" },
  stones:   { ar: "حِجَارَة", ar_roman: "ḥijāra", he: "אֲבָנִים",  he_roman: "avaním" },
  tree:     { ar: "شَجَرَة",  ar_roman: "shajara", he: "עֵץ",    he_roman: "ʿets" },
  fruit:    { ar: "فَاكِهَة", ar_roman: "fākiha", he: "פְּרִי",    he_roman: "pri" },

  // Nature + water
  water:    { ar: "مَاء",   ar_roman: "māʾ",    he: "מַיִם",    he_roman: "máyim" },
  spring:   { ar: "عَيْن",   ar_roman: "ʿayn",   he: "מַעְיָן",  he_roman: "maʿyán" },
  fountain: { ar: "نَافُورَة", ar_roman: "nāfūra", he: "מַבּוּעַ", he_roman: "mabúaʿ" },
  well:     { ar: "بِئْر",   ar_roman: "biʾr",   he: "בְּאֵר",   he_roman: "beʾér" },
  sea:      { ar: "بَحْر",   ar_roman: "baḥr",   he: "יָם",     he_roman: "yam" },
  river:    { ar: "نَهْر",   ar_roman: "nahr",   he: "נָהָר",   he_roman: "nahár" },
  rain:     { ar: "مَطَر",   ar_roman: "maṭar",  he: "גֶּשֶׁם",   he_roman: "géshem" },
  wind:     { ar: "رِيح",    ar_roman: "rīḥ",    he: "רוּחַ",    he_roman: "rúaḥ" },
  fire:     { ar: "نَار",    ar_roman: "nār",    he: "אֵשׁ",     he_roman: "esh" },
  light:    { ar: "نُور",    ar_roman: "nūr",    he: "אוֹר",     he_roman: "or" },
  sun:      { ar: "شَمْس",   ar_roman: "shams",  he: "שֶׁמֶשׁ",   he_roman: "shémesh" },
  moon:     { ar: "قَمَر",   ar_roman: "qamar",  he: "יָרֵחַ",    he_roman: "yaréaḥ" },
  star:     { ar: "نَجْم",   ar_roman: "najm",   he: "כּוֹכָב",   he_roman: "kokháv" },
  sky:      { ar: "سَمَاء",  ar_roman: "samāʾ",  he: "שָׁמַיִם",  he_roman: "shamáyim" },
  lightning:{ ar: "بَرْق",   ar_roman: "barq",   he: "בָּרָק",    he_roman: "baráq" },
  thunder:  { ar: "رَعْد",   ar_roman: "raʿd",   he: "רַעַם",    he_roman: "ráʿam" },
  flash:    { ar: "وَمْضَة",  ar_roman: "wamḍa", he: "הֶבְזֵק",   he_roman: "hevzéq" },

  // Food + drink
  bread:    { ar: "خُبْز",   ar_roman: "khubz",  he: "לֶחֶם",    he_roman: "léḥem" },
  meat:     { ar: "لَحْم",   ar_roman: "laḥm",   he: "בָּשָׂר",   he_roman: "basár" },
  milk:     { ar: "حَلِيب",  ar_roman: "ḥalīb",  he: "חָלָב",    he_roman: "ḥaláv" },
  oil:      { ar: "زَيْت",   ar_roman: "zayt",   he: "שֶׁמֶן",   he_roman: "shémen" },
  olive:    { ar: "زَيْتُون", ar_roman: "zaytūn", he: "זַיִת",    he_roman: "záyit" },
  wine:     { ar: "خَمْر",   ar_roman: "khamr",  he: "יַיִן",    he_roman: "yáyin" },
  honey:    { ar: "عَسَل",   ar_roman: "ʿasal",  he: "דְּבַשׁ",  he_roman: "dvash" },
  salt:     { ar: "مِلْح",    ar_roman: "milḥ",    he: "מֶלַח",   he_roman: "mélaḥ" },

  // Colors
  red:      { ar: "أَحْمَر",  ar_roman: "ʾaḥmar", he: "אָדוֹם",   he_roman: "adóm" },
  white:    { ar: "أَبْيَض",  ar_roman: "ʾabyaḍ", he: "לָבָן",    he_roman: "laván" },
  black:    { ar: "أَسْوَد",  ar_roman: "ʾaswad", he: "שָׁחוֹר",  he_roman: "shaḥór" },
  green:    { ar: "أَخْضَر",  ar_roman: "ʾakhḍar", he: "יָרוֹק",  he_roman: "yaróq" },
  yellow:   { ar: "أَصْفَر",  ar_roman: "ʾaṣfar", he: "צָהֹב",   he_roman: "tsahóv" },

  // Numbers
  one:      { ar: "وَاحِد",   ar_roman: "wāḥid",  he: "אֶחָד",    he_roman: "eḥád" },
  two:      { ar: "اِثْنَان",  ar_roman: "iṯnān",  he: "שְׁנַיִם", he_roman: "shnáyim" },
  three:    { ar: "ثَلَاثَة", ar_roman: "ṯalāṯa", he: "שָׁלוֹשׁ", he_roman: "shalósh" },
  four:     { ar: "أَرْبَعَة", ar_roman: "ʾarbaʿa", he: "אַרְבַּע", he_roman: "arbáʿ" },
  five:     { ar: "خَمْسَة",  ar_roman: "khamsa", he: "חָמֵשׁ",   he_roman: "ḥamésh" },
  six:      { ar: "سِتَّة",    ar_roman: "sitta",  he: "שֵׁשׁ",    he_roman: "shesh" },
  seven:    { ar: "سَبْعَة",  ar_roman: "sabʿa",  he: "שֶׁבַע",   he_roman: "shévaʿ" },
  eight:    { ar: "ثَمَانِيَة", ar_roman: "ṯamāniya", he: "שְׁמוֹנֶה", he_roman: "shmoné" },
  nine:     { ar: "تِسْعَة",  ar_roman: "tisʿa",  he: "תֵּשַׁע",   he_roman: "téshaʿ" },
  ten:      { ar: "عَشَرَة",  ar_roman: "ʿashara", he: "עֶשֶׂר",  he_roman: "ʿéser" },
  forty:    { ar: "أَرْبَعُون", ar_roman: "ʾarbaʿūn", he: "אַרְבָּעִים", he_roman: "arbaʿím" },

  // Speech + knowledge
  name:     { ar: "اِسْم",    ar_roman: "ism",    he: "שֵׁם",     he_roman: "shem" },
  word:     { ar: "كَلِمَة",   ar_roman: "kalima", he: "מִלָּה",   he_roman: "milá" },
  speak:    { ar: "تَكَلَّمَ",  ar_roman: "takallama", he: "דִּבֵּר", he_roman: "dibér" },
  hear:     { ar: "سَمِعَ",   ar_roman: "samiʿa", he: "שָׁמַע",   he_roman: "shamáʿ" },
  teach:    { ar: "عَلَّمَ",   ar_roman: "ʿallama", he: "לִמֵּד",  he_roman: "limméd" },
  learn:    { ar: "تَعَلَّمَ", ar_roman: "taʿallama", he: "לָמַד",   he_roman: "lamád" },
  know:     { ar: "عَرَفَ",   ar_roman: "ʿarafa", he: "יָדַע",    he_roman: "yadáʿ" },
  wisdom:   { ar: "حِكْمَة",   ar_roman: "ḥikma", he: "חָכְמָה",  he_roman: "ḥokhmá" },
  book:     { ar: "كِتَاب",   ar_roman: "kitāb",  he: "סֵפֶר",    he_roman: "séfer" },
  letter:   { ar: "رِسَالَة",  ar_roman: "risāla", he: "מִכְתָּב",  he_roman: "mikhtáv" },
  scripture:{ ar: "كِتَاب مُقَدَّس", ar_roman: "kitāb muqaddas", he: "כִּתְבֵי הַקֹּדֶשׁ", he_roman: "kitvéi ha-qódesh" },
  write:    { ar: "كَتَبَ",   ar_roman: "kataba", he: "כָּתַב",    he_roman: "katáv" },
  read:     { ar: "قَرَأَ",    ar_roman: "qaraʾa", he: "קָרָא",    he_roman: "qará" },
  school:   { ar: "مَدْرَسَة", ar_roman: "madrasa", he: "בֵּית סֵפֶר", he_roman: "beit séfer" },
  writer:   { ar: "كَاتِب",   ar_roman: "kātib",  he: "סוֹפֵר",   he_roman: "sofér" },

  // Emotions + mind
  love:     { ar: "حُبّ",     ar_roman: "ḥubb",   he: "אַהֲבָה",  he_roman: "ahavá" },
  hate:     { ar: "كَرِهَ",    ar_roman: "kariha", he: "שָׂנֵא",   he_roman: "sané" },
  fear:     { ar: "خَوْف",    ar_roman: "khawf",  he: "פַּחַד",   he_roman: "páḥad" },
  mercy:    { ar: "رَحْمَة",   ar_roman: "raḥma", he: "רַחֲמִים", he_roman: "raḥamím" },
  joy:      { ar: "فَرَح",     ar_roman: "faraḥ", he: "שִׂמְחָה",  he_roman: "simḥá" },
  sorrow:   { ar: "حُزْن",    ar_roman: "ḥuzn",   he: "צַעַר",    he_roman: "tsáʿar" },

  // Time
  day:      { ar: "يَوْم",    ar_roman: "yawm",   he: "יוֹם",    he_roman: "yom" },
  night:    { ar: "لَيْل",    ar_roman: "layl",   he: "לַיְלָה",  he_roman: "láyla" },
  morning:  { ar: "صَبَاح",   ar_roman: "ṣabāḥ",  he: "בֹּקֶר",   he_roman: "bóqer" },
  evening:  { ar: "مَسَاء",   ar_roman: "masāʾ",  he: "עֶרֶב",    he_roman: "ʿérev" },
  year:     { ar: "سَنَة",    ar_roman: "sana",   he: "שָׁנָה",   he_roman: "shaná" },

  // Abstract
  eternity: { ar: "أَبَد",    ar_roman: "ʾabad",  he: "עוֹלָם",    he_roman: "ʿolám" },
  world:    { ar: "عَالَم",   ar_roman: "ʿālam",  he: "עוֹלָם",    he_roman: "ʿolám" },
  forever:  { ar: "إِلَى الأَبَد", ar_roman: "ilá l-ʾabad", he: "לְעוֹלָם", he_roman: "lʿolám" },
  complete: { ar: "كَامِل",   ar_roman: "kāmil",  he: "שָׁלֵם",   he_roman: "shalém" },
  hello:    { ar: "مَرْحَبَا",  ar_roman: "marḥaban", he: "שָׁלוֹם", he_roman: "shalóm" },
  greeting: { ar: "تَحِيَّة",   ar_roman: "taḥiyya", he: "בְּרָכָה", he_roman: "brakhá" },
  because:  { ar: "لِأَنَّ",    ar_roman: "liʾanna", he: "כִּי",    he_roman: "ki" },
};

export function getGlossTranslation(enWord: string): TrilingualGloss | null {
  return GLOSS_TRANSLATIONS[enWord.toLowerCase()] ?? null;
}
