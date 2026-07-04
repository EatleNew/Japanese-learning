export type KanaCell = {
  hiragana: string;
  katakana: string;
  romaji: string;
};

export type KanaRow = {
  label: string;
  cells: Array<KanaCell | null>;
};

export const kanaColumns = ['あ段', 'い段', 'う段', 'え段', 'お段'];

export const basicKanaRows: KanaRow[] = [
  {
    label: 'あ行',
    cells: [
      { hiragana: 'あ', katakana: 'ア', romaji: 'a' },
      { hiragana: 'い', katakana: 'イ', romaji: 'i' },
      { hiragana: 'う', katakana: 'ウ', romaji: 'u' },
      { hiragana: 'え', katakana: 'エ', romaji: 'e' },
      { hiragana: 'お', katakana: 'オ', romaji: 'o' },
    ],
  },
  {
    label: 'か行',
    cells: [
      { hiragana: 'か', katakana: 'カ', romaji: 'ka' },
      { hiragana: 'き', katakana: 'キ', romaji: 'ki' },
      { hiragana: 'く', katakana: 'ク', romaji: 'ku' },
      { hiragana: 'け', katakana: 'ケ', romaji: 'ke' },
      { hiragana: 'こ', katakana: 'コ', romaji: 'ko' },
    ],
  },
  {
    label: 'さ行',
    cells: [
      { hiragana: 'さ', katakana: 'サ', romaji: 'sa' },
      { hiragana: 'し', katakana: 'シ', romaji: 'shi' },
      { hiragana: 'す', katakana: 'ス', romaji: 'su' },
      { hiragana: 'せ', katakana: 'セ', romaji: 'se' },
      { hiragana: 'そ', katakana: 'ソ', romaji: 'so' },
    ],
  },
  {
    label: 'た行',
    cells: [
      { hiragana: 'た', katakana: 'タ', romaji: 'ta' },
      { hiragana: 'ち', katakana: 'チ', romaji: 'chi' },
      { hiragana: 'つ', katakana: 'ツ', romaji: 'tsu' },
      { hiragana: 'て', katakana: 'テ', romaji: 'te' },
      { hiragana: 'と', katakana: 'ト', romaji: 'to' },
    ],
  },
  {
    label: 'な行',
    cells: [
      { hiragana: 'な', katakana: 'ナ', romaji: 'na' },
      { hiragana: 'に', katakana: 'ニ', romaji: 'ni' },
      { hiragana: 'ぬ', katakana: 'ヌ', romaji: 'nu' },
      { hiragana: 'ね', katakana: 'ネ', romaji: 'ne' },
      { hiragana: 'の', katakana: 'ノ', romaji: 'no' },
    ],
  },
  {
    label: 'は行',
    cells: [
      { hiragana: 'は', katakana: 'ハ', romaji: 'ha' },
      { hiragana: 'ひ', katakana: 'ヒ', romaji: 'hi' },
      { hiragana: 'ふ', katakana: 'フ', romaji: 'fu' },
      { hiragana: 'へ', katakana: 'ヘ', romaji: 'he' },
      { hiragana: 'ほ', katakana: 'ホ', romaji: 'ho' },
    ],
  },
  {
    label: 'ま行',
    cells: [
      { hiragana: 'ま', katakana: 'マ', romaji: 'ma' },
      { hiragana: 'み', katakana: 'ミ', romaji: 'mi' },
      { hiragana: 'む', katakana: 'ム', romaji: 'mu' },
      { hiragana: 'め', katakana: 'メ', romaji: 'me' },
      { hiragana: 'も', katakana: 'モ', romaji: 'mo' },
    ],
  },
  {
    label: 'や行',
    cells: [
      { hiragana: 'や', katakana: 'ヤ', romaji: 'ya' },
      null,
      { hiragana: 'ゆ', katakana: 'ユ', romaji: 'yu' },
      null,
      { hiragana: 'よ', katakana: 'ヨ', romaji: 'yo' },
    ],
  },
  {
    label: 'ら行',
    cells: [
      { hiragana: 'ら', katakana: 'ラ', romaji: 'ra' },
      { hiragana: 'り', katakana: 'リ', romaji: 'ri' },
      { hiragana: 'る', katakana: 'ル', romaji: 'ru' },
      { hiragana: 'れ', katakana: 'レ', romaji: 're' },
      { hiragana: 'ろ', katakana: 'ロ', romaji: 'ro' },
    ],
  },
  {
    label: 'わ行',
    cells: [
      { hiragana: 'わ', katakana: 'ワ', romaji: 'wa' },
      null,
      { hiragana: 'を', katakana: 'ヲ', romaji: 'wo' },
      null,
      { hiragana: 'ん', katakana: 'ン', romaji: 'n' },
    ],
  },
];

export const markKanaRows: KanaRow[] = [
  {
    label: 'が行',
    cells: [
      { hiragana: 'が', katakana: 'ガ', romaji: 'ga' },
      { hiragana: 'ぎ', katakana: 'ギ', romaji: 'gi' },
      { hiragana: 'ぐ', katakana: 'グ', romaji: 'gu' },
      { hiragana: 'げ', katakana: 'ゲ', romaji: 'ge' },
      { hiragana: 'ご', katakana: 'ゴ', romaji: 'go' },
    ],
  },
  {
    label: 'ざ行',
    cells: [
      { hiragana: 'ざ', katakana: 'ザ', romaji: 'za' },
      { hiragana: 'じ', katakana: 'ジ', romaji: 'ji' },
      { hiragana: 'ず', katakana: 'ズ', romaji: 'zu' },
      { hiragana: 'ぜ', katakana: 'ゼ', romaji: 'ze' },
      { hiragana: 'ぞ', katakana: 'ゾ', romaji: 'zo' },
    ],
  },
  {
    label: 'だ行',
    cells: [
      { hiragana: 'だ', katakana: 'ダ', romaji: 'da' },
      { hiragana: 'ぢ', katakana: 'ヂ', romaji: 'ji' },
      { hiragana: 'づ', katakana: 'ヅ', romaji: 'zu' },
      { hiragana: 'で', katakana: 'デ', romaji: 'de' },
      { hiragana: 'ど', katakana: 'ド', romaji: 'do' },
    ],
  },
  {
    label: 'ば行',
    cells: [
      { hiragana: 'ば', katakana: 'バ', romaji: 'ba' },
      { hiragana: 'び', katakana: 'ビ', romaji: 'bi' },
      { hiragana: 'ぶ', katakana: 'ブ', romaji: 'bu' },
      { hiragana: 'べ', katakana: 'ベ', romaji: 'be' },
      { hiragana: 'ぼ', katakana: 'ボ', romaji: 'bo' },
    ],
  },
  {
    label: 'ぱ行',
    cells: [
      { hiragana: 'ぱ', katakana: 'パ', romaji: 'pa' },
      { hiragana: 'ぴ', katakana: 'ピ', romaji: 'pi' },
      { hiragana: 'ぷ', katakana: 'プ', romaji: 'pu' },
      { hiragana: 'ぺ', katakana: 'ペ', romaji: 'pe' },
      { hiragana: 'ぽ', katakana: 'ポ', romaji: 'po' },
    ],
  },
];

const baseRomaji: Record<string, string> = {
  あ: 'a',
  い: 'i',
  う: 'u',
  え: 'e',
  お: 'o',
  か: 'ka',
  き: 'ki',
  く: 'ku',
  け: 'ke',
  こ: 'ko',
  さ: 'sa',
  し: 'shi',
  す: 'su',
  せ: 'se',
  そ: 'so',
  た: 'ta',
  ち: 'chi',
  つ: 'tsu',
  て: 'te',
  と: 'to',
  な: 'na',
  に: 'ni',
  ぬ: 'nu',
  ね: 'ne',
  の: 'no',
  は: 'ha',
  ひ: 'hi',
  ふ: 'fu',
  へ: 'he',
  ほ: 'ho',
  ま: 'ma',
  み: 'mi',
  む: 'mu',
  め: 'me',
  も: 'mo',
  や: 'ya',
  ゆ: 'yu',
  よ: 'yo',
  ら: 'ra',
  り: 'ri',
  る: 'ru',
  れ: 're',
  ろ: 'ro',
  わ: 'wa',
  を: 'wo',
  ん: 'n',
  が: 'ga',
  ぎ: 'gi',
  ぐ: 'gu',
  げ: 'ge',
  ご: 'go',
  ざ: 'za',
  じ: 'ji',
  ず: 'zu',
  ぜ: 'ze',
  ぞ: 'zo',
  だ: 'da',
  ぢ: 'ji',
  づ: 'zu',
  で: 'de',
  ど: 'do',
  ば: 'ba',
  び: 'bi',
  ぶ: 'bu',
  べ: 'be',
  ぼ: 'bo',
  ぱ: 'pa',
  ぴ: 'pi',
  ぷ: 'pu',
  ぺ: 'pe',
  ぽ: 'po',
  ぁ: 'a',
  ぃ: 'i',
  ぅ: 'u',
  ぇ: 'e',
  ぉ: 'o',
  ゃ: 'ya',
  ゅ: 'yu',
  ょ: 'yo',
};

const digraphRomaji: Record<string, string> = {
  きゃ: 'kya',
  きゅ: 'kyu',
  きょ: 'kyo',
  しゃ: 'sha',
  しゅ: 'shu',
  しょ: 'sho',
  ちゃ: 'cha',
  ちゅ: 'chu',
  ちょ: 'cho',
  にゃ: 'nya',
  にゅ: 'nyu',
  にょ: 'nyo',
  ひゃ: 'hya',
  ひゅ: 'hyu',
  ひょ: 'hyo',
  みゃ: 'mya',
  みゅ: 'myu',
  みょ: 'myo',
  りゃ: 'rya',
  りゅ: 'ryu',
  りょ: 'ryo',
  ぎゃ: 'gya',
  ぎゅ: 'gyu',
  ぎょ: 'gyo',
  じゃ: 'ja',
  じゅ: 'ju',
  じょ: 'jo',
  ぢゃ: 'ja',
  ぢゅ: 'ju',
  ぢょ: 'jo',
  びゃ: 'bya',
  びゅ: 'byu',
  びょ: 'byo',
  ぴゃ: 'pya',
  ぴゅ: 'pyu',
  ぴょ: 'pyo',
};

const smallKana = new Set(['ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ']);

const toHiragana = (value: string) =>
  Array.from(value)
    .map((char) => {
      const code = char.charCodeAt(0);
      return code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : char;
    })
    .join('');

const doubleConsonant = (romaji: string) => {
  const first = romaji[0];
  return first && !['a', 'e', 'i', 'o', 'u', 'n'].includes(first) ? first : '';
};

const longVowel = (romaji: string) => {
  const match = romaji.match(/[aeiou]$/);
  return match ? match[0] : '';
};

export function romanizeKana(value: string) {
  const chars = Array.from(toHiragana(value));
  const parts: string[] = [];
  let doubleNext = false;

  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];

    if (char === 'っ') {
      doubleNext = true;
      continue;
    }

    if (char === 'ー') {
      parts.push(longVowel(parts[parts.length - 1] ?? ''));
      continue;
    }

    if (smallKana.has(char)) {
      parts.push(baseRomaji[char] ?? '');
      continue;
    }

    const pair = `${char}${chars[index + 1] ?? ''}`;
    let romaji = digraphRomaji[pair];

    if (romaji) {
      index += 1;
    } else {
      romaji = baseRomaji[char] ?? char;
    }

    if (doubleNext) {
      romaji = `${doubleConsonant(romaji)}${romaji}`;
      doubleNext = false;
    }

    parts.push(romaji);
  }

  return parts.join('');
}
