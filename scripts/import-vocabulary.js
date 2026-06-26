const fs = require('fs');
const path = require('path');

const sourceDir = process.argv[2] || 'C:/Users/Lenovo/Downloads/japanese-main/json';
const outputFile = path.resolve(__dirname, '../src/data/vocabulary.ts');
const sourceFiles = ['word.json', 'word1.json', 'word2.json', 'word3.json'];

const levelMap = {
  初级: 'beginner',
  中级: 'intermediate',
};

const bookMap = {
  上: 'upper',
  下: 'lower',
};

const chineseNumberMap = {
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

function parseChineseNumber(text) {
  if (/^\d+$/.test(text)) return Number(text);
  if (text === '十') return 10;

  const tenIndex = text.indexOf('十');
  if (tenIndex >= 0) {
    const before = text.slice(0, tenIndex);
    const after = text.slice(tenIndex + 1);
    const tens = before ? chineseNumberMap[before] : 1;
    const ones = after ? chineseNumberMap[after] : 0;
    return tens * 10 + ones;
  }

  return chineseNumberMap[text] ?? 0;
}

function parseBook(rawBook) {
  const levelKey = rawBook.includes('中级') ? '中级' : '初级';
  const bookKey = rawBook.includes('下') ? '下' : '上';
  return {
    level: levelMap[levelKey],
    book: bookMap[bookKey],
    sourceBook: rawBook,
  };
}

function parseLesson(rawTitle) {
  const match = rawTitle.match(/第(.+?)课/);
  return match ? parseChineseNumber(match[1]) : 0;
}

function parseJapanese(rawJapanese) {
  const match = rawJapanese.match(/^(.+?)\((.+)\)$/);
  if (!match) {
    return {
      japanese: rawJapanese,
      kana: rawJapanese,
    };
  }

  return {
    kana: match[1],
    japanese: match[2],
  };
}

function normalizeWord(entry, lesson, lessonIndex, wordIndex) {
  const [rawJapanese = '', meaning = '', accent = '', location = ''] = entry;
  const parsedBook = parseBook(lesson.book);
  const parsedWord = parseJapanese(rawJapanese);
  const lessonNumber = parseLesson(lesson.title);
  const id = [
    parsedBook.level === 'beginner' ? 'b' : 'i',
    parsedBook.book === 'upper' ? 'u' : 'l',
    String(lessonNumber || lessonIndex + 1).padStart(2, '0'),
    String(wordIndex + 1).padStart(3, '0'),
  ].join('-');

  return {
    id,
    level: parsedBook.level,
    book: parsedBook.book,
    lesson: lessonNumber,
    japanese: parsedWord.japanese,
    kana: parsedWord.kana,
    meaning,
    partOfSpeech: '',
    accent,
    location,
    sourceBook: parsedBook.sourceBook,
    sourceLesson: lesson.title,
    raw: rawJapanese,
  };
}

const lessons = sourceFiles.flatMap((file) => {
  const fullPath = path.join(sourceDir, file);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
});

const vocabulary = lessons.flatMap((lesson, lessonIndex) =>
  lesson.data
    .filter((entry) => Array.isArray(entry) && entry[0] && entry[1])
    .map((entry, wordIndex) => normalizeWord(entry, lesson, lessonIndex, wordIndex)),
);

const generated = `export type Level = 'beginner' | 'intermediate';
export type Book = 'upper' | 'lower';

export type VocabularyItem = {
  id: string;
  level: Level;
  book: Book;
  lesson: number;
  japanese: string;
  kana: string;
  meaning: string;
  partOfSpeech: string;
  accent: string;
  location: string;
  sourceBook: string;
  sourceLesson: string;
  raw: string;
};

export const vocabulary: VocabularyItem[] = JSON.parse(${JSON.stringify(JSON.stringify(vocabulary))});
`;

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, generated, 'utf8');

const byBook = vocabulary.reduce((counts, word) => {
  counts[word.sourceBook] = (counts[word.sourceBook] || 0) + 1;
  return counts;
}, {});

console.log(`Imported ${vocabulary.length} words from ${lessons.length} lessons.`);
console.log(JSON.stringify(byBook, null, 2));
