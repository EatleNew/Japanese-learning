import { vocabulary, type Book, type Level, type VocabularyItem } from './vocabulary';

type ScopeKey = `${Level}:${Book}`;
type LessonKey = `${ScopeKey}:${number}`;

const emptyWords: VocabularyItem[] = [];
const emptyLessons: number[] = [];

const scopeKey = (level: Level, book: Book): ScopeKey => `${level}:${book}`;
const lessonKey = (level: Level, book: Book, lesson: number): LessonKey => `${scopeKey(level, book)}:${lesson}`;

const buildVocabularyIndex = () => {
  const wordsByScope = new Map<ScopeKey | LessonKey, VocabularyItem[]>();
  const lessonsByScope = new Map<ScopeKey, number[]>();
  const lessonSets = new Map<ScopeKey, Set<number>>();

  vocabulary.forEach((item) => {
    const allKey = scopeKey(item.level, item.book);
    const singleLessonKey = lessonKey(item.level, item.book, item.lesson);

    const allWords = wordsByScope.get(allKey);
    if (allWords) {
      allWords.push(item);
    } else {
      wordsByScope.set(allKey, [item]);
    }

    const lessonWords = wordsByScope.get(singleLessonKey);
    if (lessonWords) {
      lessonWords.push(item);
    } else {
      wordsByScope.set(singleLessonKey, [item]);
    }

    const lessons = lessonSets.get(allKey);
    if (lessons) {
      lessons.add(item.lesson);
    } else {
      lessonSets.set(allKey, new Set([item.lesson]));
    }
  });

  lessonSets.forEach((lessons, key) => {
    lessonsByScope.set(key, Array.from(lessons).sort((a, b) => a - b));
  });

  return { lessonsByScope, wordsByScope };
};

const vocabularyIndex = buildVocabularyIndex();

export const getVocabularyByScope = (level: Level, book: Book, lesson: number | 'all') =>
  vocabularyIndex.wordsByScope.get(lesson === 'all' ? scopeKey(level, book) : lessonKey(level, book, lesson)) ??
  emptyWords;

export const getLessonsForScope = (level: Level, book: Book) =>
  vocabularyIndex.lessonsByScope.get(scopeKey(level, book)) ?? emptyLessons;
