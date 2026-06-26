import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { vocabulary, type Book, type Level, type VocabularyItem } from './src/data/vocabulary';

type ViewName = 'home' | 'browse' | 'study' | 'quiz' | 'review';
type QuizMode = 'choice' | 'input';

type Progress = {
  correct: number;
  wrong: number;
  dueAt: number;
  lastSeenAt?: number;
};

const STORAGE_KEY = 'jp-learning-progress-v1';

const levelLabel: Record<Level, string> = {
  beginner: '初级',
  intermediate: '中级',
};

const bookLabel: Record<Book, string> = {
  upper: '上册',
  lower: '下册',
};

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

const pickChoices = (target: VocabularyItem) => {
  const pool = vocabulary.filter((item) => item.id !== target.id);
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  return [...shuffled, target].sort(() => Math.random() - 0.5);
};

export default function App() {
  const [view, setView] = useState<ViewName>('home');
  const [level, setLevel] = useState<Level>('beginner');
  const [book, setBook] = useState<Book>('upper');
  const [lesson, setLesson] = useState<number | 'all'>('all');
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizMode, setQuizMode] = useState<QuizMode>('choice');
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setProgress(JSON.parse(raw));
      })
      .catch(() => {
        Alert.alert('读取进度失败', '本次会先用临时进度继续。');
      });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress)).catch(() => undefined);
  }, [progress]);

  const selectedWords = useMemo(
    () =>
      vocabulary.filter(
        (item) =>
          item.level === level &&
          item.book === book &&
          (lesson === 'all' || item.lesson === lesson),
      ),
    [book, lesson, level],
  );

  const dueWords = useMemo(() => {
    const now = Date.now();
    const due = selectedWords.filter((item) => !progress[item.id] || progress[item.id].dueAt <= now);
    return due.length > 0 ? due : selectedWords;
  }, [progress, selectedWords]);

  const currentDeck = view === 'review' ? dueWords : selectedWords;
  const currentWord = currentDeck[currentIndex % Math.max(currentDeck.length, 1)];
  const choices = useMemo(() => (currentWord ? pickChoices(currentWord) : []), [currentWord]);

  const stats = useMemo(() => {
    const seen = vocabulary.filter((item) => progress[item.id]);
    const correct = seen.reduce((sum, item) => sum + (progress[item.id]?.correct ?? 0), 0);
    const wrong = seen.reduce((sum, item) => sum + (progress[item.id]?.wrong ?? 0), 0);
    const due = vocabulary.filter((item) => !progress[item.id] || progress[item.id].dueAt <= Date.now()).length;
    return { seen: seen.length, correct, wrong, due };
  }, [progress]);

  const lessons = useMemo(() => {
    const values = vocabulary
      .filter((item) => item.level === level && item.book === book)
      .map((item) => item.lesson);
    return Array.from(new Set(values)).sort((a, b) => a - b);
  }, [book, level]);

  const saveAnswer = (word: VocabularyItem, isCorrect: boolean) => {
    setProgress((old) => {
      const previous = old[word.id] ?? { correct: 0, wrong: 0, dueAt: 0 };
      const nextCorrect = isCorrect ? previous.correct + 1 : 0;
      const nextWrong = isCorrect ? previous.wrong : previous.wrong + 1;
      const delayDays = isCorrect ? getDelayDays(nextCorrect) : 0;
      return {
        ...old,
        [word.id]: {
          correct: nextCorrect,
          wrong: nextWrong,
          dueAt: Date.now() + delayDays * 24 * 60 * 60 * 1000,
          lastSeenAt: Date.now(),
        },
      };
    });
  };

  const moveNext = () => {
    setAnswer('');
    setResult(null);
    setCurrentIndex((index) => (index + 1) % Math.max(currentDeck.length, 1));
  };

  const checkInput = () => {
    if (!currentWord) return;
    const normalizedAnswer = normalize(answer);
    const accepted = [currentWord.japanese, currentWord.kana].map(normalize);
    const isCorrect = accepted.includes(normalizedAnswer);
    saveAnswer(currentWord, isCorrect);
    setResult(isCorrect ? 'correct' : 'wrong');
  };

  const openPractice = (targetView: ViewName, mode: QuizMode = 'choice') => {
    setQuizMode(mode);
    setCurrentIndex(0);
    setAnswer('');
    setResult(null);
    setView(targetView);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.app}>
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
                onChange={(value) => {
                  setLevel(value as Level);
                  setLesson('all');
                }}
              />
              <Segment
                options={[
                  { label: '上册', value: 'upper' },
                  { label: '下册', value: 'lower' },
                ]}
                value={book}
                onChange={(value) => {
                  setBook(value as Book);
                  setLesson('all');
                }}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lessonRow}>
                <Chip active={lesson === 'all'} label="全部课" onPress={() => setLesson('all')} />
                {lessons.map((item) => (
                  <Chip
                    key={item}
                    active={lesson === item}
                    label={`第${item}课`}
                    onPress={() => setLesson(item)}
                  />
                ))}
              </ScrollView>
              <Text style={styles.mutedText}>当前范围有 {selectedWords.length} 个示例词。完整词库会通过可授权数据导入。</Text>
            </Panel>

            <View style={styles.actionGrid}>
              <Action title="背卡片" detail="看日语、假名、例句" onPress={() => openPractice('study')} />
              <Action title="选择题" detail="看到日语选中文" onPress={() => openPractice('quiz', 'choice')} />
              <Action title="输入测验" detail="看到中文输入日语或假名" onPress={() => openPractice('quiz', 'input')} />
              <Action title="今日复习" detail={`${dueWords.length} 个到期词`} onPress={() => openPractice('review', 'input')} />
            </View>

            <Pressable style={styles.secondaryButton} onPress={() => setView('browse')}>
              <Text style={styles.secondaryButtonText}>浏览词库</Text>
            </Pressable>
          </ScrollView>
        ) : null}

        {view === 'browse' ? (
          <ScrollView contentContainerStyle={styles.content}>
            {selectedWords.map((item) => (
              <View key={item.id} style={styles.wordRow}>
                <View style={styles.wordMain}>
                  <Text style={styles.word}>{item.japanese}</Text>
                  <Text style={styles.kana}>{item.kana}</Text>
                </View>
                <View style={styles.wordMeta}>
                  <Text style={styles.meaning}>{item.meaning}</Text>
                  <Text style={styles.mutedText}>
                    {levelLabel[item.level]} {bookLabel[item.book]} 第{item.lesson}课
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {view === 'study' && currentWord ? (
          <PracticeShell deck={currentDeck} currentIndex={currentIndex}>
            <Text style={styles.cardJapanese}>{currentWord.japanese}</Text>
            <Text style={styles.cardKana}>{currentWord.kana}</Text>
            <Text style={styles.cardMeaning}>{currentWord.meaning}</Text>
            <View style={styles.exampleBox}>
              <Text style={styles.example}>{currentWord.raw}</Text>
              <Text style={styles.mutedText}>{currentWord.sourceBook} · {currentWord.sourceLesson}</Text>
              {currentWord.accent ? <Text style={styles.mutedText}>声调位置：{currentWord.accent}</Text> : null}
            </View>
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
                <Text style={styles.cardJapanese}>{currentWord.japanese}</Text>
                <Text style={styles.cardKana}>{currentWord.kana}</Text>
                <View style={styles.choiceList}>
                  {choices.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.choiceButton}
                      onPress={() => {
                        saveAnswer(currentWord, item.id === currentWord.id);
                        setResult(item.id === currentWord.id ? 'correct' : 'wrong');
                      }}
                    >
                      <Text style={styles.choiceText}>{item.meaning}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
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
            )}

            {result ? (
              <View style={[styles.resultBox, result === 'correct' ? styles.resultOk : styles.resultBad]}>
                <Text style={styles.resultText}>{result === 'correct' ? '答对了' : '这次不算会'}</Text>
                <Text style={styles.resultDetail}>
                  {currentWord.japanese} · {currentWord.kana} · {currentWord.meaning}
                </Text>
                <Pressable style={styles.nextButton} onPress={moveNext}>
                  <Text style={styles.nextButtonText}>下一题</Text>
                </Pressable>
              </View>
            ) : null}
          </PracticeShell>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    marginTop: 8,
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
    marginTop: 22,
    padding: 14,
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
    fontSize: 20,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  kana: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
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
  safe: {
    backgroundColor: '#F3F5F7',
    flex: 1,
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
  subtitle: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
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
    width: 104,
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
