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

const kanaToRomajiEntries = [...basicKanaRows, ...markKanaRows].flatMap((row) =>
  row.cells.flatMap((cell) => (cell ? [[cell.hiragana, cell.romaji], [cell.katakana, cell.romaji]] : [])),
);

const kanaToRomaji = new Map<string, string>(kanaToRomajiEntries as Array<[string, string]>);

export function romanizeKana(value: string) {
  return Array.from(value)
    .map((char) => kanaToRomaji.get(char) ?? char)
    .join(' ');
}
