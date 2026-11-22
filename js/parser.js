// Offline expense parser for Egyptian Arabic and English. Runs fully in the browser; nothing is sent anywhere.
// Port of the Android app's OfflineArabicParser, so both read text the same way.
//
// parse('جبت لحمة بـ 450 كاش') ->
//   { date: '2026-11-22', kind: 'meat', amount: 450, description: 'لحمة', payment: 'cash' }

// Common attached Arabic prefixes (و، ب، ال، بال، ...) allowed before a short keyword.
const PREFIXES = ['', 'و', 'ب', 'ف', 'ل', 'ال', 'بال', 'وال', 'فال', 'لل', 'وب', 'وبال'];
// Everyday words that look like "prefix + short keyword" but mean something else (e.g. بنت = ب + نت).
const EXCLUDED = new Set(['بنت', 'بنات', 'كنت', 'انت', 'فنت', 'وبنت', 'البنت']);
// Keywords at or below this length must match a whole word (optionally with a prefix).
const SHORT_MAX = 3;
const DATE_RE = /\d{4}-\d{1,2}-\d{1,2}/;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function normalize(text) {
  let s = String(text ?? '').trim();
  s = s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  s = s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  return s
    .replace(/٫/g, '.') // Arabic decimal separator
    .replace(/(?<=\d)[,٬](?=\d{3}(?!\d))/g, '') // Thousands separators: 1,500 -> 1500
    .replace(/[ً-ْٰ]/g, '') // Diacritics (harakat)
    .replace(/[إأآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '') // Tatweel
    .toLowerCase();
}

const tokenize = (n) => n.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

// Matches a keyword without false positives from substrings:
// - multi-word keywords match as a phrase,
// - English and short Arabic keywords must be a whole word (Arabic may carry a prefix like ال/و/ب),
// - longer Arabic keywords may appear inside a word (e.g. "لحمه" in "اللحمه").
export function matches(normalized, words, rawKeyword) {
  const kw = normalize(rawKeyword);
  if (!kw) return false;
  if (kw.includes(' ')) {
    return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(kw)}(?![\\p{L}\\p{N}])`, 'u').test(normalized);
  }
  if (/^[a-z-]+$/.test(kw)) return words.includes(kw);
  if (kw.length <= SHORT_MAX) {
    return words.some((w) => !EXCLUDED.has(w) && PREFIXES.some((p) => w === p + kw));
  }
  return normalized.includes(kw);
}

const any = (n, w, list) => list.some((k) => matches(n, w, k));

// Category keywords, checked in this order. The first group that matches wins.
// Dairy comes before pantry so "لبن" is never read as "بن" (coffee).
export const KEYWORDS = [
  ['bills', [
    'كهربا', 'كهرباء', 'غاز', 'ميه', 'مياه', 'نت', 'انترنت', 'واي فاي', 'روتر', 'ايجار', 'بواب', 'صيانه عمارة',
    'مصاريف شقه', 'اسانسير', 'تليفون ارضي', 'شحن عداد', 'كارت كهربا', 'فاتوره', 'فواتير', 'فاتورة',
    'electricity', 'electric', 'bill', 'bills', 'gas', 'water', 'internet', 'wifi', 'router', 'rent', 'utility',
  ]],
  ['transport', [
    'بنزين', 'بنزينه', 'سولار', 'اوبر', 'كريم', 'تاكسي', 'ميكروباص', 'مترو', 'تذكره', 'كارته', 'جراج', 'ركنه',
    'باركنج', 'غسيل عربيه', 'كاوتش', 'زيت عربيه', 'ميني باص', 'اتوبيس', 'مواصلات',
    'uber', 'careem', 'taxi', 'bus', 'metro', 'subway', 'fuel', 'gasoline', 'parking', 'petrol', 'transport',
  ]],
  ['meat', [
    'لحمه', 'لحوم', 'جزار', 'مفروم', 'كفته', 'ستيك', 'فراخ', 'دجاج', 'بانيه', 'كبده', 'شاورما', 'بط', 'وز',
    'ارانب', 'سمك', 'جمبري', 'تونه طازه', 'فيليه', 'سالمون', 'بوري', 'بلطي', 'مشويات',
    'meat', 'beef', 'chicken', 'poultry', 'fish', 'steak', 'shawarma', 'burger', 'seafood',
  ]],
  ['dairy', [
    'لبن', 'حليب', 'جبنه', 'جبن', 'بيض', 'كرتونه بيض', 'زبادي', 'رايب', 'قشطه', 'زبده', 'رومي', 'موتزاريلا',
    'شيدر', 'فيتا', 'قريش', 'البان',
    'milk', 'cheese', 'egg', 'eggs', 'yogurt', 'butter', 'dairy',
  ]],
  ['pantry', [
    'رز', 'ارز', 'زيت', 'سكر', 'مكرونه', 'صلصه', 'شاي', 'بن', 'قهوه', 'دقيق', 'سمنه', 'تونه', 'بقوليات', 'عدس',
    'فول', 'حمص', 'لوبيا', 'فاصوليا', 'توابل', 'بهارات', 'ملح', 'عسل', 'مربي', 'خل', 'بقاله', 'سوبرماركت',
    'هايبر', 'ماركت', 'خزين',
    'grocery', 'groceries', 'supermarket', 'rice', 'oil', 'sugar', 'pasta', 'tea', 'coffee', 'canned', 'pantry',
  ]],
  ['cleaning', [
    'مسحوق', 'اريال', 'تايد', 'برسيل', 'صابون', 'صابونه', 'ديتول', 'كلور', 'سلك', 'ليفه', 'مناديل', 'فاين',
    'فوط', 'ورق تواليت', 'معجون سنان', 'شامبو', 'شاور جل', 'اكياس زباله', 'منظفات', 'مستلزمات',
    'detergent', 'soap', 'tissues', 'cleaning', 'shampoo', 'supplies',
  ]],
  ['produce', [
    'طماطم', 'خيار', 'بطاطس', 'بصل', 'توم', 'كوسه', 'بتنجان', 'جزر', 'ملوخيه', 'باميه', 'سبانخ', 'خس', 'جرجير',
    'لمون', 'ليمون', 'تفاح', 'موز', 'برتقال', 'مانجا', 'عنب', 'بطيخ', 'فراوله', 'رمان', 'جوافه', 'فاكهه',
    'فواكه', 'خضار', 'خضروات',
    'fruits', 'fruit', 'vegetables', 'veggies', 'tomato', 'potato', 'onion', 'apple', 'banana', 'produce',
  ]],
  ['medical', [
    'صيدليه', 'دوا', 'دواء', 'علاج', 'روشته', 'كشف', 'دكتور', 'عياده', 'مستشفي', 'تحاليل', 'تحليل', 'معمل',
    'اشعه', 'حقنه', 'مسكن', 'بنادول', 'قطره', 'مرهم', 'مضاد حيوي', 'فيتامين', 'ادويه',
    'pharmacy', 'medicine', 'doctor', 'clinic', 'hospital', 'pill', 'pills', 'medication', 'medical',
  ]],
  ['charity', [
    'صدقه', 'زكاه', 'تبرع', 'كرتونه رمضان', 'لله', 'مساعده', 'رساله', 'بهيه', 'دار ايتام', 'محتاج', 'غارمات',
    'اطعام',
    'charity', 'donation', 'zakat', 'sadaka',
  ]],
  ['fun', [
    'مطعم', 'كافيه', 'خروجه', 'سينما', 'فشار', 'فسحه', 'ملاهي', 'مصيف', 'العاب', 'لعبه', 'بلايستيشن', 'نزهه',
    'دليفري', 'اكل جاهز', 'ماك', 'كنتاكي', 'حلويات', 'جاتوه', 'تورته', 'ايس كريم', 'ترفيه',
    'restaurant', 'cafe', 'cinema', 'movie', 'outing', 'games', 'takeout', 'delivery', 'entertainment',
  ]],
];

const PAYMENTS = [
  ['wallet', ['فودافون كاش', 'فودافون', 'اورنج كاش', 'اتصالات كاش', 'وي باي', 'محفظه', 'انستاباي', 'انستا باي',
    'انستابي', 'instapay', 'wallet', 'e-wallet']],
  ['card', ['فيزا', 'ماستر', 'كارت', 'بطاقه', 'visa', 'mastercard', 'card', 'credit']],
  ['transfer', ['تحويل بنكي', 'تحويل', 'حساب بنكي', 'cib', 'البنك', 'transfer', 'wire']],
  ['cash', ['كاش', 'نقدا', 'نقد', 'cash']],
];

const WORD_NUMBERS = [
  ['الفين', 2000], ['الف', 1000], ['خمسميه', 500], ['ربعميه', 400], ['تلتميه', 300], ['تلتوميه', 300],
  ['ميتين', 200], ['ميه', 100], ['خمسين', 50],
];

// Filler words removed from the description (whole words only). Multi-word phrases first.
const FILLERS = [
  'فودافون كاش', 'اورنج كاش', 'اتصالات كاش', 'وي باي', 'انستا باي', 'تحويل بنكي',
  'اول امبارح', 'اول امس', 'النهارده', 'النهاردة', 'امبارح', 'امس',
  'دفعت', 'اشتريت', 'جبت', 'ركبت', 'صرفت', 'سددت', 'حاسبت', 'شحنت',
  'جنيه', 'جنية', 'ج.م', 'ج', 'egp',
  'كاش', 'نقداً', 'نقدا', 'فيزا', 'انستاباي', 'تحويل',
  'بمبلغ', 'حوالي',
  'paid', 'for', 'bought', 'by', 'cash', 'pounds', 'pound', 'le', 'egp',
];

const pad = (n) => String(n).padStart(2, '0');
export const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function amountOf(n, words) {
  const text = n.replace(new RegExp(DATE_RE.source, 'g'), ' ');
  const patterns = [
    // "ب 150", "ب150", "دفعت 150": the trigger word must start a word
    /(?<!\p{L})(?:ب|بمبلغ|دفعت|حوالي|سعرها|سعره|حسابها|حسابه)\s*([0-9]+(?:\.[0-9]+)?)/gu,
    // "150 جنيه", "150ج"
    /([0-9]+(?:\.[0-9]+)?)\s*(?:جنيه|ج\.م|ج|egp|le|pounds?)(?!\p{L})/gu,
    // Any number
    /([0-9]+(?:\.[0-9]+)?)/g,
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const v = Number(m[1]);
      if (v > 0) return v;
    }
  }
  for (const [w, v] of WORD_NUMBERS) if (words.some((x) => x === w || x === 'ب' + w)) return v;
  return 0;
}

function dateOf(n, words, now) {
  const shift = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return localDate(d);
  };
  if (matches(n, words, 'اول امبارح') || matches(n, words, 'اول امس')) return shift(2);
  if (any(n, words, ['امبارح', 'امس', 'yesterday'])) return shift(1);
  const m = n.match(DATE_RE);
  if (m) {
    const [y, mo, d] = m[0].split('-').map(Number);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${y}-${pad(mo)}-${pad(d)}`;
  }
  return localDate(now);
}

function paymentOf(n) {
  for (const [key, list] of PAYMENTS) if (list.some((k) => n.includes(normalize(k)))) return key;
  return 'cash';
}

function kindOf(n, words) {
  for (const [key, list] of KEYWORDS) if (any(n, words, list)) return key;
  return null;
}

function descriptionOf(raw) {
  let s = String(raw ?? '').replace(/ـ/g, '');
  s = s.replace(/[0-9٠-٩]{4}-[0-9٠-٩]{1,2}-[0-9٠-٩]{1,2}/g, ' ');
  s = s.replace(/(?<!\p{L})ب?\s*[0-9٠-٩]+(?:[.,٫٬][0-9٠-٩]+)*/gu, ' ');
  for (const f of FILLERS) {
    // Arabic filler words may carry a prefix: "بالفيزا", "والكاش", "بجنيه".
    const prefix = /^[؀-ۿ]{2,}$/.test(f) ? '(?:و|ب|بال|وب|وبال|فال|ال)?' : '';
    s = s.replace(new RegExp(`(?<!\\p{L})${prefix}${escapeRe(f)}(?!\\p{L})`, 'giu'), ' ');
  }
  s = s.replace(/(?<!\p{L})ب(?!\p{L})/gu, ' '); // a lone "ب" left after removing the amount
  return s.replace(/\s+/g, ' ').trim();
}

// customNames: optional list of { id, names: [..] } for the household's own categories. If one of
// those names appears in the text it wins over the built-in keywords (e.g. a category called "مدارس").
export function parse(input, { now = new Date(), customNames = [] } = {}) {
  const n = normalize(input);
  const words = tokenize(n);
  const custom = customNames.find((c) => c.names.some((name) => name && name.trim().length >= 2 && matches(n, words, name)));
  const description = descriptionOf(input);
  return {
    date: dateOf(n, words, now),
    amount: amountOf(n, words),
    payment: paymentOf(n),
    kind: kindOf(n, words),
    customId: custom?.id ?? null,
    description: description.length >= 3 ? description : '',
  };
}
