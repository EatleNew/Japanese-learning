import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Sharing from 'expo-sharing';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  StatusBar as RNStatusBar,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { basicKanaRows, kanaColumns, markKanaRows, romanizeKana } from './src/data/kana';
import { vocabulary, type Book, type Level, type VocabularyItem } from './src/data/vocabulary';
import { getLessonsForScope, getVocabularyByScope } from './src/data/vocabularyIndex';

type ViewName = 'home' | 'browse' | 'study' | 'quiz' | 'review' | 'kana';
type QuizMode = 'choice' | 'input' | 'handwriting';
type QuizScope = 'unseen' | 'all';
type SortMode = 'lesson' | 'kana' | 'japanese' | 'meaning' | 'mistakes';
type Familiarity = 'red' | 'yellow' | 'green';
type FamiliarityFilter = Familiarity | 'untagged';
type StrokePoint = { x: number; y: number };
type Stroke = StrokePoint[];

type Progress = {
  correct: number;
  wrong: number;
  dueAt: number;
  familiarity?: Familiarity;
  lastSeenAt?: number;
};

type UserProgressFile = {
  app: 'Japanese-learning';
  exportedAt: string;
  kind: 'user-progress';
  progress: Record<string, Progress>;
  version: 1;
};

const STORAGE_KEY = 'jp-learning-progress-v1';
const EXPORT_FILE_PREFIX = 'japanese-learning-progress';

const levelLabel: Record<Level, string> = {
  beginner: '初级',
  intermediate: '中级',
};

const bookLabel: Record<Book, string> = {
  upper: '上册',
  lower: '下册',
};

const sortLabel: Record<SortMode, string> = {
  lesson: '课次',
  kana: '假名',
  japanese: '日语',
  meaning: '中文',
  mistakes: '错题',
};

const familiarityOptions: Array<{
  color: string;
  label: string;
  value: Familiarity;
}> = [
  { value: 'red', label: '不熟', color: '#DC2626' },
  { value: 'yellow', label: '不太熟', color: '#D97706' },
  { value: 'green', label: '完全熟', color: '#16A34A' },
];

const familiarityFilterOptions: Array<{
  color: string;
  label: string;
  value: FamiliarityFilter;
}> = [{ value: 'untagged', label: '未标记', color: '#6B7280' }, ...familiarityOptions];

const allFamiliarityFilters: FamiliarityFilter[] = familiarityFilterOptions.map((option) => option.value);

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[、。，．・\s]/g, '');

const getDelayDays = (correctCount: number) => {
  if (correctCount <= 0) return 0;
  if (correctCount === 1) return 1;
  if (correctCount === 2) return 3;
  if (correctCount === 3) return 7;
  return 14;
};

const meaningChars = (value: string) => new Set(Array.from(value.replace(/[^\p{Script=Han}ぁ-んァ-ンーa-zA-Z0-9]/gu, '')));

const scoreChoiceCandidate = (target: VocabularyItem, candidate: VocabularyItem) => {
  let score = 0;
  const lessonDistance = Math.abs(candidate.lesson - target.lesson);

  if (candidate.level === target.level) score += 20;
  if (candidate.book === target.book) score += 20;
  if (candidate.lesson === target.lesson) score += 80;
  else if (lessonDistance === 1) score += 55;
  else if (lessonDistance === 2) score += 35;
  else if (lessonDistance <= 4) score += 15;

  if (target.partOfSpeech && candidate.partOfSpeech === target.partOfSpeech) score += 18;

  const targetChars = meaningChars(target.meaning);
  const sharedChars = Array.from(meaningChars(candidate.meaning)).filter((char) => targetChars.has(char)).length;
  score += Math.min(sharedChars * 10, 40);
  score += Math.max(0, 18 - Math.abs(candidate.meaning.length - target.meaning.length));

  return score;
};

const pickChoices = (target: VocabularyItem, sourcePool: VocabularyItem[]) => {
  const pool = sourcePool.length >= 4 ? sourcePool : vocabulary;
  const ranked = pool
    .filter((item) => item.id !== target.id)
    .map((item) => ({
      item,
      score: scoreChoiceCandidate(target, item) + Math.random() * 8,
    }))
    .sort((a, b) => b.score - a.score);

  const selected = ranked.slice(0, 12).sort(() => Math.random() - 0.5).slice(0, 3).map(({ item }) => item);
  const used = new Set([target.id, ...selected.map((item) => item.id)]);

  if (selected.length < 3) {
    for (const item of vocabulary) {
      if (selected.length >= 3) break;
      if (used.has(item.id)) continue;

      used.add(item.id);
      selected.push(item);
    }
  }

  return [...selected, target].sort(() => Math.random() - 0.5);
};

const compareText = (a: string, b: string) => a.localeCompare(b, 'ja');

const shuffleWords = (items: VocabularyItem[]) => {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
};

const parseAccentRanges = (accent: string, length: number) => {
  if (!accent) return [];

  return accent
    .split('|')
    .map((part) => part.split(',').map((value) => Number(value)))
    .filter((range) => range.every((value) => Number.isFinite(value)))
    .map(([start, end]) => {
      const safeStart = Math.max(0, Math.min(start, Math.max(length - 1, 0)));
      const safeEnd = end === undefined ? length - 1 : Math.max(0, Math.min(end, Math.max(length - 1, 0)));
      return {
        start: Math.min(safeStart, safeEnd),
        end: Math.max(safeStart, safeEnd),
      };
    });
};

const isAccentIndex = (index: number, ranges: Array<{ start: number; end: number }>) =>
  ranges.some((range) => index >= range.start && index <= range.end);

const familiarityKey = (item: VocabularyItem, progress: Record<string, Progress>): FamiliarityFilter =>
  progress[item.id]?.familiarity ?? 'untagged';

const vocabularyIds = new Set(vocabulary.map((item) => item.id));
const vocabularyById = new Map(vocabulary.map((item) => [item.id, item]));

const isFamiliarity = (value: unknown): value is Familiarity =>
  value === 'red' || value === 'yellow' || value === 'green';

const readProgressFile = (raw: string) => {
  const parsed = JSON.parse(raw) as Partial<UserProgressFile>;
  if (parsed.app !== 'Japanese-learning' || parsed.kind !== 'user-progress' || parsed.version !== 1 || !parsed.progress) {
    throw new Error('invalid-progress-file');
  }

  const nextProgress: Record<string, Progress> = {};

  Object.entries(parsed.progress).forEach(([id, item]) => {
    if (!vocabularyIds.has(id) || !item || typeof item !== 'object') return;

    const progressItem = item as Partial<Progress>;
    const familiarity = isFamiliarity(progressItem.familiarity) ? progressItem.familiarity : undefined;

    nextProgress[id] = {
      correct: Number.isFinite(progressItem.correct) ? Number(progressItem.correct) : 0,
      wrong: Number.isFinite(progressItem.wrong) ? Number(progressItem.wrong) : 0,
      dueAt: Number.isFinite(progressItem.dueAt) ? Number(progressItem.dueAt) : 0,
      ...(familiarity ? { familiarity } : {}),
      ...(Number.isFinite(progressItem.lastSeenAt) ? { lastSeenAt: Number(progressItem.lastSeenAt) } : {}),
    };
  });

  return nextProgress;
};

export default function App() {
  const [view, setView] = useState<ViewName>('home');
  const [level, setLevel] = useState<Level>('beginner');
  const [book, setBook] = useState<Book>('upper');
  const [lesson, setLesson] = useState<number | 'all'>('all');
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizMode, setQuizMode] = useState<QuizMode>('choice');
  const [quizScope, setQuizScope] = useState<QuizScope>('unseen');
  const [sessionWordIds, setSessionWordIds] = useState<string[]>([]);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('lesson');
  const [showRomaji, setShowRomaji] = useState(false);
  const [choiceKanaOnly, setChoiceKanaOnly] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [practiceFamiliarities, setPracticeFamiliarities] =
    useState<FamiliarityFilter[]>(allFamiliarityFilters);
  const sortProgress = sortMode === 'mistakes' ? progress : undefined;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setProgress(JSON.parse(raw));
      })
      .catch(() => {
        Alert.alert('读取进度失败', '本次会先用临时进度继续。');
      })
      .finally(() => {
        setProgressLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!progressLoaded) return undefined;

    const handle = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress)).catch(() => undefined);
    }, 250);

    return () => clearTimeout(handle);
  }, [progress, progressLoaded]);

  const selectedWords = useMemo(
    () => getVocabularyByScope(level, book, lesson),
    [book, lesson, level],
  );

  const visibleWords = useMemo(() => {
    if (view !== 'browse') return [];

    const query = normalize(search);
    const filtered = query
      ? selectedWords.filter((item) =>
          [
            item.japanese,
            item.kana,
            item.meaning,
            item.raw,
            item.sourceBook,
            item.sourceLesson,
            romanizeKana(item.kana),
          ].some((value) => normalize(value).includes(query)),
        )
      : selectedWords;

    return [...filtered].sort((a, b) => {
      if (sortMode === 'kana') return compareText(a.kana, b.kana);
      if (sortMode === 'japanese') return compareText(a.japanese, b.japanese);
      if (sortMode === 'meaning') return compareText(a.meaning, b.meaning);
      if (sortMode === 'mistakes') {
        const wrongDiff = (progress[b.id]?.wrong ?? 0) - (progress[a.id]?.wrong ?? 0);
        if (wrongDiff !== 0) return wrongDiff;
      }
      return a.lesson - b.lesson || compareText(a.kana, b.kana);
    });
  }, [search, selectedWords, sortMode, sortProgress, view]);

  const practiceWords = useMemo(() => {
    if (practiceFamiliarities.length === allFamiliarityFilters.length) return selectedWords;

    return selectedWords.filter((item) => practiceFamiliarities.includes(familiarityKey(item, progress)));
  }, [practiceFamiliarities, progress, selectedWords]);

  const unpracticedWords = useMemo(
    () =>
      practiceWords.filter((item) => {
        const itemProgress = progress[item.id];
        return !itemProgress || ((itemProgress.correct ?? 0) === 0 && (itemProgress.wrong ?? 0) === 0 && !itemProgress.lastSeenAt);
      }),
    [practiceWords, progress],
  );

  const quizCandidateWords = useMemo(() => {
    if (quizScope === 'all') return practiceWords;
    return unpracticedWords.length > 0 ? unpracticedWords : practiceWords;
  }, [practiceWords, quizScope, unpracticedWords]);

  const dueWords = useMemo(() => {
    if (view !== 'home' && view !== 'review') return practiceWords;

    const now = Date.now();
    const due = practiceWords.filter((item) => !progress[item.id] || progress[item.id].dueAt <= now);
    return due.length > 0 ? due : practiceWords;
  }, [practiceWords, progress, view]);

  const sessionWords = useMemo(
    () => sessionWordIds.map((id) => vocabularyById.get(id)).filter((item): item is VocabularyItem => Boolean(item)),
    [sessionWordIds],
  );

  const currentDeck = view === 'review' ? dueWords : view === 'quiz' ? (sessionWords.length > 0 ? sessionWords : quizCandidateWords) : practiceWords;
  const currentWord = currentDeck[currentIndex % Math.max(currentDeck.length, 1)];
  const choices = useMemo(() => {
    if (!currentWord || quizMode !== 'choice' || (view !== 'quiz' && view !== 'review')) return [];

    return pickChoices(currentWord, getVocabularyByScope(currentWord.level, currentWord.book, 'all'));
  }, [currentWord, quizMode, view]);

  const stats = useMemo(() => {
    const entries = Object.values(progress);
    const correct = entries.reduce((sum, item) => sum + item.correct, 0);
    const learnedFuture = entries.filter((item) => item.dueAt > Date.now()).length;
    return { seen: entries.length, correct, due: vocabulary.length - learnedFuture };
  }, [progress]);

  const lessons = useMemo(() => getLessonsForScope(level, book), [book, level]);

  const familiarityCounts = useMemo(() => {
    const counts: Record<FamiliarityFilter, number> = {
      green: 0,
      red: 0,
      untagged: 0,
      yellow: 0,
    };

    selectedWords.forEach((item) => {
      counts[familiarityKey(item, progress)] += 1;
    });

    return counts;
  }, [progress, selectedWords]);

  const saveAnswer = (word: VocabularyItem, isCorrect: boolean) => {
    setProgress((old) => {
      const previous = old[word.id] ?? { correct: 0, wrong: 0, dueAt: 0 };
      const nextCorrect = isCorrect ? previous.correct + 1 : 0;
      const nextWrong = isCorrect ? previous.wrong : previous.wrong + 1;
      const delayDays = isCorrect ? getDelayDays(nextCorrect) : 0;
      return {
        ...old,
        [word.id]: {
          ...previous,
          correct: nextCorrect,
          familiarity: isCorrect ? 'green' : 'red',
          wrong: nextWrong,
          dueAt: Date.now() + delayDays * 24 * 60 * 60 * 1000,
          lastSeenAt: Date.now(),
        },
      };
    });
  };

  const setWordFamiliarity = (word: VocabularyItem, familiarity: Familiarity) => {
    setProgress((old) => {
      const previous = old[word.id] ?? { correct: 0, wrong: 0, dueAt: 0 };
      return {
        ...old,
        [word.id]: {
          ...previous,
          familiarity,
          lastSeenAt: Date.now(),
        },
      };
    });
  };

  const resetPracticeState = () => {
    setAnswer('');
    setCurrentIndex(0);
    setResult(null);
    setSessionWordIds([]);
  };

  const changeLevel = (nextLevel: Level) => {
    resetPracticeState();
    setLevel(nextLevel);
    setLesson('all');
  };

  const changeBook = (nextBook: Book) => {
    resetPracticeState();
    setBook(nextBook);
    setLesson('all');
  };

  const changeLesson = (nextLesson: number | 'all') => {
    resetPracticeState();
    setLesson(nextLesson);
  };

  const selectAllFamiliarities = () => {
    resetPracticeState();
    setPracticeFamiliarities(allFamiliarityFilters);
  };

  const togglePracticeFamiliarity = (target: FamiliarityFilter) => {
    resetPracticeState();
    setPracticeFamiliarities((old) => {
      if (old.length === allFamiliarityFilters.length) return [target];

      const next = old.includes(target) ? old.filter((item) => item !== target) : [...old, target];
      return next.length > 0 ? next : allFamiliarityFilters;
    });
  };

  const changeQuizScope = (nextScope: QuizScope) => {
    resetPracticeState();
    setQuizScope(nextScope);
  };

  const moveNext = () => {
    setAnswer('');
    setResult(null);
    setCurrentIndex((index) => (index + 1) % Math.max(currentDeck.length, 1));
  };

  const gradeCurrentWord = (isCorrect: boolean) => {
    if (!currentWord || result) return;

    saveAnswer(currentWord, isCorrect);
    setResult(isCorrect ? 'correct' : 'wrong');
  };

  const checkInput = () => {
    if (!currentWord) return;
    const normalizedAnswer = normalize(answer);
    const accepted = [currentWord.japanese, currentWord.kana].map(normalize);
    const isCorrect = accepted.includes(normalizedAnswer);
    gradeCurrentWord(isCorrect);
  };

  const openPractice = (targetView: ViewName, mode: QuizMode = 'choice') => {
    setQuizMode(mode);
    setCurrentIndex(0);
    setAnswer('');
    setResult(null);
    setSessionWordIds(targetView === 'quiz' ? shuffleWords(quizCandidateWords).map((item) => item.id) : []);
    setView(targetView);
  };

  const exportProgress = async () => {
    try {
      const targetDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!targetDirectory) {
        Alert.alert('导出失败', '当前设备没有可写入的本地目录。');
        return;
      }

      const payload: UserProgressFile = {
        app: 'Japanese-learning',
        exportedAt: new Date().toISOString(),
        kind: 'user-progress',
        progress,
        version: 1,
      };
      const timestamp = payload.exportedAt.replace(/[:.]/g, '-');
      const fileUri = `${targetDirectory}${EXPORT_FILE_PREFIX}-${timestamp}.json`;

      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          dialogTitle: '导出日语学习记录',
          mimeType: 'application/json',
        });
      } else {
        Alert.alert('导出完成', `记录文件已生成：${fileUri}`);
      }
    } catch {
      Alert.alert('导出失败', '没有成功生成用户记录文件，请稍后再试。');
    }
  };

  const importProgress = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: '*/*',
      });
      if (result.canceled) return;

      const fileUri = result.assets[0]?.uri;
      if (!fileUri) {
        Alert.alert('导入失败', '没有读取到文件。');
        return;
      }

      const raw = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const importedProgress = readProgressFile(raw);
      const importedCount = Object.keys(importedProgress).length;

      setProgress((old) => ({
        ...old,
        ...importedProgress,
      }));

      Alert.alert('导入完成', `已导入 ${importedCount} 个单词记录。`);
    } catch {
      Alert.alert('导入失败', '请选择本 App 导出的用户记录 JSON 文件。');
    }
  };

  const allFamiliaritiesSelected = practiceFamiliarities.length === allFamiliarityFilters.length;
  const isPracticeView = view === 'study' || view === 'quiz' || view === 'review';

  return (
    <SafeAreaView style={styles.safe}>
      <ExpoStatusBar style="dark" />
      <View style={styles.app}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Japanese Learning</Text>
            <Text style={styles.subtitle}>标准日本语词汇练习</Text>
          </View>
          {view !== 'home' ? (
            <Pressable style={styles.iconButton} onPress={() => setView('home')}>
              <Text style={styles.iconButtonText}>⌂</Text>
            </Pressable>
          ) : null}
        </View>

        {view === 'home' ? (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.statsRow}>
              <Stat label="已练" value={String(stats.seen)} />
              <Stat label="答对" value={String(stats.correct)} />
              <Stat label="待复习" value={String(stats.due)} />
            </View>

            <Panel title="范围">
              <Segment
                options={[
                  { label: '初级', value: 'beginner' },
                  { label: '中级', value: 'intermediate' },
                ]}
                value={level}
                onChange={(value) => changeLevel(value as Level)}
              />
              <Segment
                options={[
                  { label: '上册', value: 'upper' },
                  { label: '下册', value: 'lower' },
                ]}
                value={book}
                onChange={(value) => changeBook(value as Book)}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lessonRow}>
                <Chip active={lesson === 'all'} label="全部课" onPress={() => changeLesson('all')} />
                {lessons.map((item) => (
                  <Chip
                    key={item}
                    active={lesson === item}
                    label={`第${item}课`}
                    onPress={() => changeLesson(item)}
                  />
                ))}
              </ScrollView>
              <View style={styles.filterBlock}>
                <Text style={styles.filterTitle}>练习标签</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lessonRow}>
                  <Chip active={allFamiliaritiesSelected} label="全部" onPress={selectAllFamiliarities} />
                  {familiarityFilterOptions.map((option) => (
                    <Chip
                      key={option.value}
                      active={!allFamiliaritiesSelected && practiceFamiliarities.includes(option.value)}
                      label={`${option.label} ${familiarityCounts[option.value]}`}
                      onPress={() => togglePracticeFamiliarity(option.value)}
                    />
                  ))}
                </ScrollView>
              </View>
              <View style={styles.filterBlock}>
                <Text style={styles.filterTitle}>测验范围</Text>
                <View style={styles.scopeRow}>
                  <Chip
                    active={quizScope === 'unseen'}
                    label={`只考没练过 ${unpracticedWords.length}`}
                    onPress={() => changeQuizScope('unseen')}
                  />
                  <Chip
                    active={quizScope === 'all'}
                    label={`全部 ${practiceWords.length}`}
                    onPress={() => changeQuizScope('all')}
                  />
                </View>
                <Text style={styles.mutedText}>
                  选择题、输入测验和手写题会按这个范围随机出题。
                </Text>
              </View>
              <Text style={styles.mutedText}>
                当前范围有 {selectedWords.length} 个词，练习筛选后有 {practiceWords.length} 个词。
              </Text>
            </Panel>

            <Panel title="用户记录">
              <Text style={styles.mutedText}>导出标签、答题次数和复习时间；换版本后可从文件导入恢复。</Text>
              <View style={styles.recordActions}>
                <Pressable style={[styles.secondaryButton, styles.recordButton]} onPress={exportProgress}>
                  <Text style={styles.secondaryButtonText}>导出记录</Text>
                </Pressable>
                <Pressable style={[styles.secondaryButton, styles.recordButton]} onPress={importProgress}>
                  <Text style={styles.secondaryButtonText}>导入记录</Text>
                </Pressable>
              </View>
            </Panel>

            <View style={styles.actionGrid}>
              <Action title="背卡片" detail="看日语、假名、声调" onPress={() => openPractice('study')} />
              <Action title="选择题" detail="看到日语选中文" onPress={() => openPractice('quiz', 'choice')} />
              <Action title="输入测验" detail="看到中文输入日语或假名" onPress={() => openPractice('quiz', 'input')} />
              <Action title="手写题" detail="看中文，手写日语或假名" onPress={() => openPractice('quiz', 'handwriting')} />
              <Action title="今日复习" detail={`${dueWords.length} 个到期词`} onPress={() => openPractice('review', 'input')} />
              <Action title="五十音图" detail="假名、片假名、罗马音" onPress={() => setView('kana')} />
              <Action title="浏览词库" detail="搜索、排序、看声调" onPress={() => setView('browse')} />
            </View>
          </ScrollView>
        ) : null}

        {view === 'browse' ? (
          <FlatList
            contentContainerStyle={styles.content}
            data={visibleWords}
            extraData={{ progress, showRomaji }}
            initialNumToRender={12}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.id}
            maxToRenderPerBatch={12}
            removeClippedSubviews
            renderItem={({ item }: ListRenderItemInfo<VocabularyItem>) => (
              <VocabularyRow
                item={item}
                onSetFamiliarity={setWordFamiliarity}
                progress={progress[item.id]}
                showRomaji={showRomaji}
              />
            )}
            updateCellsBatchingPeriod={30}
            windowSize={9}
            ListHeaderComponent={
              <Panel title="查词">
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="搜索日语、假名、中文或 romaji"
                  style={styles.input}
                  value={search}
                  onChangeText={setSearch}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lessonRow}>
                  {(Object.keys(sortLabel) as SortMode[]).map((mode) => (
                    <Chip
                      key={mode}
                      active={sortMode === mode}
                      label={`按${sortLabel[mode]}`}
                      onPress={() => setSortMode(mode)}
                    />
                  ))}
                </ScrollView>
                <Pressable style={styles.secondaryButton} onPress={() => setShowRomaji((value) => !value)}>
                  <Text style={styles.secondaryButtonText}>{showRomaji ? '隐藏罗马音' : '显示罗马音'}</Text>
                </Pressable>
                <Text style={styles.mutedText}>
                  找到 {visibleWords.length} / {selectedWords.length} 个词。假名中的蓝色底线表示词库给出的声调范围。
                </Text>
              </Panel>
            }
          />
        ) : null}

        {view === 'kana' ? (
          <ScrollView contentContainerStyle={styles.content}>
            <Panel title="五十音图">
              <Pressable style={styles.secondaryButton} onPress={() => setShowRomaji((value) => !value)}>
                <Text style={styles.secondaryButtonText}>{showRomaji ? '隐藏罗马音' : '显示罗马音'}</Text>
              </Pressable>
              <Text style={styles.mutedText}>每格上方是假名，下方是片假名。打开罗马音后会显示读音。</Text>
            </Panel>
            <KanaTable title="清音" rows={basicKanaRows} showRomaji={showRomaji} />
            <KanaTable title="浊音 / 半浊音" rows={markKanaRows} showRomaji={showRomaji} />
          </ScrollView>
        ) : null}

        {view === 'study' && currentWord ? (
          <PracticeShell deck={currentDeck} currentIndex={currentIndex}>
            <Text style={styles.cardJapanese}>{currentWord.japanese}</Text>
            <AccentKana value={currentWord.kana} accent={currentWord.accent} showRomaji={showRomaji} large />
            <Text style={styles.cardMeaning}>{currentWord.meaning}</Text>
            <View style={styles.exampleBox}>
              <Text style={styles.example}>{currentWord.raw}</Text>
              <Text style={styles.mutedText}>{currentWord.sourceBook} · {currentWord.sourceLesson}</Text>
              {currentWord.accent ? <Text style={styles.mutedText}>声调位置：{currentWord.accent}</Text> : null}
            </View>
            <FamiliaritySelector
              onSelect={(value) => setWordFamiliarity(currentWord, value)}
              value={progress[currentWord.id]?.familiarity}
            />
            <Pressable style={styles.secondaryButton} onPress={() => setShowRomaji((value) => !value)}>
              <Text style={styles.secondaryButtonText}>{showRomaji ? '隐藏罗马音' : '显示罗马音'}</Text>
            </Pressable>
            <View style={styles.twoButtons}>
              <Pressable
                style={[styles.answerButton, styles.wrongButton]}
                onPress={() => {
                  saveAnswer(currentWord, false);
                  moveNext();
                }}
              >
                <Text style={styles.answerButtonText}>没记住</Text>
              </Pressable>
              <Pressable
                style={[styles.answerButton, styles.correctButton]}
                onPress={() => {
                  saveAnswer(currentWord, true);
                  moveNext();
                }}
              >
                <Text style={styles.answerButtonText}>记住了</Text>
              </Pressable>
            </View>
          </PracticeShell>
        ) : null}

        {(view === 'quiz' || view === 'review') && currentWord ? (
          <PracticeShell deck={currentDeck} currentIndex={currentIndex}>
            {quizMode === 'choice' ? (
              <>
                <Text style={styles.prompt}>这个词是什么意思？</Text>
                <View style={styles.quizToggleRow}>
                  <Pressable style={[styles.secondaryButton, styles.quizToggleButton]} onPress={() => setChoiceKanaOnly((value) => !value)}>
                    <Text style={styles.secondaryButtonText}>{choiceKanaOnly ? '显示日语汉字' : '只看假名'}</Text>
                  </Pressable>
                  <Pressable style={[styles.secondaryButton, styles.quizToggleButton]} onPress={() => setShowRomaji((value) => !value)}>
                    <Text style={styles.secondaryButtonText}>{showRomaji ? '隐藏罗马音' : '显示罗马音'}</Text>
                  </Pressable>
                </View>
                {choiceKanaOnly ? null : <Text style={styles.cardJapanese}>{currentWord.japanese}</Text>}
                <AccentKana value={currentWord.kana} accent={currentWord.accent} showRomaji={showRomaji} large />
                <View style={styles.choiceList}>
                  {choices.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.choiceButton}
                      onPress={() => {
                        gradeCurrentWord(item.id === currentWord.id);
                      }}
                    >
                      <Text style={styles.choiceText}>{item.meaning}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : quizMode === 'input' ? (
              <>
                <Text style={styles.prompt}>输入对应的日语或假名</Text>
                <Text style={styles.cardMeaning}>{currentWord.meaning}</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="例如：がくせい / 学生"
                  style={styles.input}
                  value={answer}
                  onChangeText={setAnswer}
                  onSubmitEditing={checkInput}
                />
                <Pressable style={styles.primaryButton} onPress={checkInput}>
                  <Text style={styles.primaryButtonText}>检查</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.prompt}>看中文，手写对应的日语汉字或假名</Text>
                <Text style={styles.cardMeaning}>{currentWord.meaning}</Text>
                <HandwritingPrompt word={currentWord} onGrade={gradeCurrentWord} result={result} />
              </>
            )}

            {result ? (
              <View style={[styles.resultBox, result === 'correct' ? styles.resultOk : styles.resultBad]}>
                <Text style={styles.resultText}>{result === 'correct' ? '答对了' : '这次不算会'}</Text>
                <Text style={styles.resultDetail}>
                  {currentWord.japanese} · {currentWord.kana} · {currentWord.meaning}
                </Text>
                {currentWord.accent ? <Text style={styles.resultDetail}>声调位置：{currentWord.accent}</Text> : null}
                <FamiliaritySelector
                  onSelect={(value) => setWordFamiliarity(currentWord, value)}
                  value={progress[currentWord.id]?.familiarity}
                />
                <Pressable style={styles.nextButton} onPress={moveNext}>
                  <Text style={styles.nextButtonText}>下一题</Text>
                </Pressable>
              </View>
            ) : null}
          </PracticeShell>
        ) : null}

        {isPracticeView && !currentWord ? (
          <ScrollView contentContainerStyle={styles.content}>
            <Panel title="当前没有可练习的词">
              <Text style={styles.mutedText}>请调整教材、课次或练习标签筛选。</Text>
            </Panel>
          </ScrollView>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function AccentKana({
  accent,
  large = false,
  showRomaji,
  value,
}: {
  accent: string;
  large?: boolean;
  showRomaji: boolean;
  value: string;
}) {
  const chars = Array.from(value);
  const ranges = parseAccentRanges(accent, chars.length);

  return (
    <View style={large ? styles.accentLargeWrap : styles.accentWrap}>
      <Text style={large ? styles.cardKana : styles.kana}>
        {chars.map((char, index) => (
          <Text key={`${char}-${index}`} style={isAccentIndex(index, ranges) ? styles.kanaAccent : undefined}>
            {char}
          </Text>
        ))}
      </Text>
      {showRomaji ? <Text style={large ? styles.romajiLarge : styles.romaji}>{romanizeKana(value)}</Text> : null}
    </View>
  );
}

function VocabularyRow({
  item,
  onSetFamiliarity,
  progress,
  showRomaji,
}: {
  item: VocabularyItem;
  onSetFamiliarity: (word: VocabularyItem, familiarity: Familiarity) => void;
  progress?: Progress;
  showRomaji: boolean;
}) {
  return (
    <View style={styles.wordRow}>
      <View style={styles.wordMain}>
        <Text style={styles.word}>{item.japanese}</Text>
        <AccentKana value={item.kana} accent={item.accent} showRomaji={showRomaji} />
      </View>
      <View style={styles.wordMeta}>
        <Text style={styles.meaning}>{item.meaning}</Text>
        <Text style={styles.mutedText}>
          {levelLabel[item.level]} {bookLabel[item.book]} 第{item.lesson}课
          {item.accent ? ` · 声调 ${item.accent}` : ''}
        </Text>
        <Text style={styles.mutedText}>
          已对 {progress?.correct ?? 0} · 错 {progress?.wrong ?? 0}
        </Text>
        <FamiliaritySelector
          compact
          onSelect={(value) => onSetFamiliarity(item, value)}
          value={progress?.familiarity}
        />
      </View>
    </View>
  );
}

function FamiliaritySelector({
  compact = false,
  onSelect,
  value,
}: {
  compact?: boolean;
  onSelect: (value: Familiarity) => void;
  value?: Familiarity;
}) {
  return (
    <View style={compact ? styles.tagRowCompact : styles.tagPanel}>
      {!compact ? <Text style={styles.tagPanelTitle}>熟悉度标签</Text> : null}
      <View style={styles.tagButtons}>
        {familiarityOptions.map((option) => {
          const active = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[
                compact ? styles.tagButtonCompact : styles.tagButton,
                { borderColor: option.color },
                active && { backgroundColor: option.color },
              ]}
            >
              <View style={[styles.tagDot, { backgroundColor: active ? '#FFFFFF' : option.color }]} />
              <Text style={[styles.tagButtonText, active && styles.tagButtonTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function KanaTable({ rows, showRomaji, title }: { rows: typeof basicKanaRows; showRomaji: boolean; title: string }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      <View style={styles.kanaHeaderRow}>
        <Text style={styles.kanaRowLabel} />
        {kanaColumns.map((column) => (
          <Text key={column} style={styles.kanaColumnLabel}>
            {column}
          </Text>
        ))}
      </View>
      {rows.map((row) => (
        <View key={row.label} style={styles.kanaTableRow}>
          <Text style={styles.kanaRowLabel}>{row.label}</Text>
          {row.cells.map((cell, index) => (
            <View key={`${row.label}-${index}`} style={styles.kanaCell}>
              {cell ? (
                <>
                  <Text style={styles.kanaCellMain}>{cell.hiragana}</Text>
                  <Text style={styles.kanaCellSub}>{cell.katakana}</Text>
                  {showRomaji ? <Text style={styles.kanaCellRomaji}>{cell.romaji}</Text> : null}
                </>
              ) : (
                <Text style={styles.kanaCellEmpty}>-</Text>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function HandwritingPrompt({
  onGrade,
  result,
  word,
}: {
  onGrade: (isCorrect: boolean) => void;
  result: 'correct' | 'wrong' | null;
  word: VocabularyItem;
}) {
  const [fullScreen, setFullScreen] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const disabled = result !== null;

  useEffect(() => {
    setFullScreen(false);
    setStrokes([]);
  }, [word.id]);

  const clear = () => {
    if (disabled) return;
    setStrokes([]);
  };

  return (
    <View style={styles.handwritingWrap}>
      <HandwritingBoard strokes={strokes} setStrokes={setStrokes} disabled={disabled} />
      <View style={styles.handwritingActions}>
        <Pressable style={[styles.secondaryButton, styles.handwritingButton]} onPress={clear}>
          <Text style={styles.secondaryButtonText}>清空</Text>
        </Pressable>
        <Pressable style={[styles.secondaryButton, styles.handwritingButton]} onPress={() => setFullScreen(true)}>
          <Text style={styles.secondaryButtonText}>横屏全屏</Text>
        </Pressable>
      </View>
      <View style={styles.twoButtons}>
        <Pressable
          disabled={disabled}
          style={[styles.answerButton, styles.wrongButton, disabled && styles.disabledButton]}
          onPress={() => onGrade(false)}
        >
          <Text style={styles.answerButtonText}>写错了</Text>
        </Pressable>
        <Pressable
          disabled={disabled}
          style={[styles.answerButton, styles.correctButton, disabled && styles.disabledButton]}
          onPress={() => onGrade(true)}
        >
          <Text style={styles.answerButtonText}>写对了</Text>
        </Pressable>
      </View>
      <Text style={styles.mutedText}>
        先在区域里手写，写完后自己对照判定。当前离线版不上传笔迹。
      </Text>
      <Modal animationType="slide" visible={fullScreen} onRequestClose={() => setFullScreen(false)}>
        <FullScreenHandwriting
          disabled={disabled}
          onClose={() => setFullScreen(false)}
          onGrade={onGrade}
          setStrokes={setStrokes}
          strokes={strokes}
          word={word}
        />
      </Modal>
    </View>
  );
}

function FullScreenHandwriting({
  disabled,
  onClose,
  onGrade,
  setStrokes,
  strokes,
  word,
}: {
  disabled: boolean;
  onClose: () => void;
  onGrade: (isCorrect: boolean) => void;
  setStrokes: Dispatch<SetStateAction<Stroke[]>>;
  strokes: Stroke[];
  word: VocabularyItem;
}) {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => undefined);

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
    };
  }, []);

  return (
    <SafeAreaView style={styles.handwritingFullScreen}>
      <View style={styles.handwritingFullHeader}>
        <View style={styles.handwritingFullTitle}>
          <Text style={styles.prompt}>手写题</Text>
          <Text style={styles.handwritingMeaning}>{word.meaning}</Text>
        </View>
        <Pressable style={styles.iconButton} onPress={onClose}>
          <Text style={styles.iconButtonText}>×</Text>
        </Pressable>
      </View>
      <View style={styles.handwritingFullBody}>
        <HandwritingBoard fullScreen strokes={strokes} setStrokes={setStrokes} disabled={disabled} />
        <View style={styles.handwritingSideActions}>
          <Pressable
            disabled={disabled}
            style={[styles.secondaryButton, styles.handwritingSideButton, disabled && styles.disabledButton]}
            onPress={() => setStrokes([])}
          >
            <Text style={styles.secondaryButtonText}>清空</Text>
          </Pressable>
          <Pressable
            disabled={disabled}
            style={[styles.answerButton, styles.wrongButton, styles.handwritingSideButton, disabled && styles.disabledButton]}
            onPress={() => {
              onGrade(false);
              onClose();
            }}
          >
            <Text style={styles.answerButtonText}>写错了</Text>
          </Pressable>
          <Pressable
            disabled={disabled}
            style={[styles.answerButton, styles.correctButton, styles.handwritingSideButton, disabled && styles.disabledButton]}
            onPress={() => {
              onGrade(true);
              onClose();
            }}
          >
            <Text style={styles.answerButtonText}>写对了</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function HandwritingBoard({
  disabled,
  fullScreen = false,
  setStrokes,
  strokes,
}: {
  disabled: boolean;
  fullScreen?: boolean;
  setStrokes: Dispatch<SetStateAction<Stroke[]>>;
  strokes: Stroke[];
}) {
  const currentStroke = useRef<Stroke>([]);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => !disabled,
        onStartShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (event) => {
          const point = {
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
          };
          currentStroke.current = [point];
          setStrokes((old) => [...old, currentStroke.current]);
        },
        onPanResponderMove: (event) => {
          const previous = currentStroke.current[currentStroke.current.length - 1];
          if (!previous) return;

          const point = {
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
          };
          const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
          if (distance < 3) return;

          currentStroke.current = [...currentStroke.current, point];
          setStrokes((old) => [...old.slice(0, -1), currentStroke.current]);
        },
        onPanResponderRelease: () => {
          currentStroke.current = [];
        },
      }),
    [disabled, setStrokes],
  );

  return (
    <View
      {...panResponder.panHandlers}
      style={[styles.handwritingBoard, fullScreen && styles.handwritingBoardFull]}
    >
      {strokes.length === 0 ? (
        <Text style={styles.handwritingPlaceholder}>在这里手写</Text>
      ) : null}
      {strokes.map((stroke, strokeIndex) =>
        stroke.slice(1).map((point, pointIndex) => (
          <StrokeLine
            key={`${strokeIndex}-${pointIndex}`}
            from={stroke[pointIndex]}
            to={point}
          />
        )),
      )}
    </View>
  );
}

function StrokeLine({ from, to }: { from: StrokePoint; to: StrokePoint }) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length < 1) return null;

  const angle = Math.atan2(to.y - from.y, to.x - from.x);

  return (
    <View
      style={[
        styles.strokeLine,
        {
          left: (from.x + to.x) / 2 - length / 2,
          top: (from.y + to.y) / 2 - 2,
          transform: [{ rotateZ: `${angle}rad` }],
          width: length,
        },
      ]}
    />
  );
}

function Panel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Segment({
  onChange,
  options,
  value,
}: {
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <View style={styles.segment}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={[styles.segmentOption, option.value === value && styles.segmentActive]}
          onPress={() => onChange(option.value)}
        >
          <Text style={[styles.segmentText, option.value === value && styles.segmentTextActive]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Action({ detail, onPress, title }: { detail: string; onPress: () => void; title: string }) {
  return (
    <Pressable style={styles.action} onPress={onPress}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDetail}>{detail}</Text>
    </Pressable>
  );
}

function PracticeShell({
  children,
  currentIndex,
  deck,
}: {
  children: ReactNode;
  currentIndex: number;
  deck: VocabularyItem[];
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.practiceTop}>
        <Text style={styles.mutedText}>
          {deck.length === 0 ? 0 : currentIndex + 1} / {deck.length}
        </Text>
      </View>
      <View style={styles.practiceCard}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  accentLargeWrap: {
    alignItems: 'center',
    gap: 4,
  },
  accentWrap: {
    gap: 2,
  },
  action: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE3EA',
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '48%',
    minHeight: 92,
    padding: 14,
  },
  actionDetail: {
    color: '#5C6672',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionTitle: {
    color: '#141A21',
    fontSize: 18,
    fontWeight: '700',
  },
  answerButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  answerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  app: {
    flex: 1,
  },
  cardJapanese: {
    color: '#111827',
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 52,
    textAlign: 'center',
  },
  cardKana: {
    color: '#2563EB',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 34,
    textAlign: 'center',
  },
  cardMeaning: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
    textAlign: 'center',
  },
  chip: {
    borderColor: '#D4DAE2',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: '#14213D',
    borderColor: '#14213D',
  },
  chipText: {
    color: '#3F4853',
    fontSize: 14,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  choiceButton: {
    backgroundColor: '#F8FAFC',
    borderColor: '#DDE3EA',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  choiceList: {
    gap: 10,
    marginTop: 24,
  },
  choiceText: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  content: {
    gap: 16,
    padding: 18,
    paddingBottom: 32,
  },
  correctButton: {
    backgroundColor: '#15803D',
  },
  disabledButton: {
    opacity: 0.55,
  },
  example: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 25,
  },
  exampleBox: {
    backgroundColor: '#F7F7F5',
    borderRadius: 8,
    gap: 6,
    marginTop: 10,
    padding: 14,
  },
  filterBlock: {
    gap: 8,
    marginTop: 4,
  },
  filterTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E4E8EE',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  handwritingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  handwritingBoard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#AAB4C0',
    borderRadius: 8,
    borderWidth: 1,
    height: 260,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  handwritingBoardFull: {
    flex: 1,
    height: undefined,
  },
  handwritingButton: {
    flex: 1,
  },
  handwritingFullBody: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  handwritingFullHeader: {
    alignItems: 'center',
    borderBottomColor: '#DDE3EA',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  handwritingFullScreen: {
    backgroundColor: '#F3F5F7',
    flex: 1,
  },
  handwritingFullTitle: {
    flex: 1,
  },
  handwritingMeaning: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
  },
  handwritingPlaceholder: {
    color: '#A0A8B3',
    fontSize: 16,
    fontWeight: '700',
  },
  handwritingSideActions: {
    gap: 10,
    justifyContent: 'center',
    width: 132,
  },
  handwritingSideButton: {
    minHeight: 54,
  },
  handwritingWrap: {
    gap: 10,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#14213D',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  iconButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#AAB4C0',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 18,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  kana: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  kanaAccent: {
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
    textDecorationLine: 'underline',
  },
  kanaCell: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E1E6ED',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 68,
    paddingVertical: 6,
  },
  kanaCellEmpty: {
    color: '#A0A8B3',
    fontSize: 18,
  },
  kanaCellMain: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  kanaCellRomaji: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  kanaCellSub: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  kanaColumnLabel: {
    color: '#667085',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  kanaHeaderRow: {
    flexDirection: 'row',
    gap: 6,
  },
  kanaRowLabel: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
    width: 38,
  },
  kanaTableRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  lessonRow: {
    gap: 8,
    paddingVertical: 2,
  },
  meaning: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
  },
  mutedText: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
  },
  nextButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    marginTop: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE3EA',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  panelTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  practiceCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE3EA',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  practiceTop: {
    alignItems: 'flex-end',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#14213D',
    borderRadius: 8,
    minHeight: 50,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  prompt: {
    color: '#667085',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  quizToggleButton: {
    flex: 1,
    minWidth: 120,
  },
  quizToggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  recordActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  recordButton: {
    flex: 1,
    minWidth: 120,
  },
  resultBad: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FDA4AF',
  },
  resultBox: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    padding: 14,
  },
  resultDetail: {
    color: '#303946',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  resultOk: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  resultText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  romaji: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  romajiLarge: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  safe: {
    backgroundColor: '#F3F5F7',
    flex: 1,
    paddingTop: RNStatusBar.currentHeight ?? 0,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#14213D',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#14213D',
    fontSize: 16,
    fontWeight: '800',
  },
  scopeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segment: {
    backgroundColor: '#EDF1F5',
    borderRadius: 8,
    flexDirection: 'row',
    padding: 3,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  segmentOption: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  segmentText: {
    color: '#5C6672',
    fontSize: 15,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#111827',
  },
  stat: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE3EA',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  statLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  statValue: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  strokeLine: {
    backgroundColor: '#111827',
    borderRadius: 2,
    height: 4,
    position: 'absolute',
  },
  subtitle: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  tagButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  tagButtonCompact: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 8,
  },
  tagButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  tagButtonTextActive: {
    color: '#FFFFFF',
  },
  tagDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  tagPanel: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E1E6ED',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  tagPanelTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  tagRowCompact: {
    marginTop: 4,
  },
  title: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  twoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  word: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 30,
  },
  wordMain: {
    width: 112,
  },
  wordMeta: {
    flex: 1,
    gap: 4,
  },
  wordRow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE3EA',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  wrongButton: {
    backgroundColor: '#C2410C',
  },
});
