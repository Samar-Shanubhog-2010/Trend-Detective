import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Flame,
  RotateCcw,
  Scissors,
  Shuffle,
  XCircle,
  Zap,
} from 'lucide-react';
import type { DetectiveCase, DifficultyFilter } from '../game/cases';
import {
  buildQuizDeck,
  DIFFICULTY_RULES,
  filterCasesByDifficulty,
  MAX_QUIZ_ATTEMPTS,
  pickFiftyFiftyEliminations,
  readSeenQuizCaseIds,
  recordSeenQuizCaseIds,
  scoreQuizAnswer,
  type QuizAnswerScore,
  type QuizQuestion,
} from '../game/quiz';
import {
  formatPValue,
  generateTimeSeries,
  getDetectiveRank,
} from '../game/statistics';
import { soundEngine } from '../game/audio';
import { TimeSeriesChart } from './TimeSeriesChart';
import { WorldRegionMap } from './WorldRegionMap';

interface QuizPlayViewProps {
  cases: readonly DetectiveCase[];
  difficultyFilter: DifficultyFilter;
  onChangeDifficulty: (difficulty: DifficultyFilter) => void;
  theme?: 'dark' | 'light';
  initialShuffleQuestions?: boolean;
  onSwitchToLab?: (caseId?: string) => void;
  onQuizProgressChange?: (stats: {
    answeredCount: number;
    correctCount: number;
    totalQuestions: number;
    score: number;
    finished: boolean;
  }) => void;
}

interface RecordedQuizAnswer {
  choiceId: string;
  isCorrect: boolean;
  points: QuizAnswerScore;
}

const CHOICE_LETTERS = ['A', 'B', 'C', 'D'] as const;
const DIFFICULTY_LEVELS: readonly DifficultyFilter[] = [
  'easy',
  'medium',
  'hard',
  'all',
];

export function QuizPlayView({
  cases,
  difficultyFilter,
  onChangeDifficulty,
  theme = 'dark',
  initialShuffleQuestions = true,
  onSwitchToLab,
  onQuizProgressChange,
}: QuizPlayViewProps) {
  const activeRules = DIFFICULTY_RULES[difficultyFilter];
  const [shuffleQuestions, setShuffleQuestions] = useState(initialShuffleQuestions);
  const [deckSeed, setDeckSeed] = useState(0);

  const questions: QuizQuestion[] = useMemo(() => {
    const seenCaseIds = shuffleQuestions ? readSeenQuizCaseIds() : undefined;
    return buildQuizDeck(cases, {
      difficulty: difficultyFilter,
      shuffleQuestions,
      seenCaseIds,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases, difficultyFilter, shuffleQuestions, deckSeed]);

  useEffect(() => {
    if (!shuffleQuestions || questions.length === 0) return;
    recordSeenQuizCaseIds(
      questions.map((q) => q.caseId),
      cases,
      difficultyFilter,
    );
  }, [questions, cases, difficultyFilter, shuffleQuestions]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<
    Record<string, RecordedQuizAnswer>
  >({});
  const [wrongAttemptsByQuestionId, setWrongAttemptsByQuestionId] = useState<
    Record<string, string[]>
  >({});
  const [eliminatedByQuestionId, setEliminatedByQuestionId] = useState<
    Record<string, string[]>
  >({});
  const [fiftyFiftyRemaining, setFiftyFiftyRemaining] = useState(
    activeRules.fiftyFiftyCount,
  );
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [finished, setFinished] = useState(false);

  // Speed-bonus elapsed timer (non-punitive)
  const questionStartRef = useRef<number>(Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);

  // Per-question chart helper toggles
  const [showDeseasonalized, setShowDeseasonalized] = useState(false);
  const [showTrendLine, setShowTrendLine] = useState(false);
  const [useExtendedRecord, setUseExtendedRecord] = useState(false);

  const currentQuestion = questions[currentIndex] ?? questions[0];
  const currentCase = useMemo(
    () => cases.find((c) => c.id === currentQuestion?.caseId) ?? cases[0],
    [cases, currentQuestion],
  );

  const targetVar = useMemo(
    () =>
      currentCase.variableOptions.find(
        (v) => v.id === currentCase.targetVariableId,
      ) ?? currentCase.variableOptions[0],
    [currentCase],
  );
  const targetRegion = useMemo(
    () =>
      currentCase.regionOptions.find((r) => r.isTarget) ??
      currentCase.regionOptions[0],
    [currentCase],
  );

  const activeYears =
    useExtendedRecord && currentCase.extendedYears
      ? currentCase.extendedYears
      : currentCase.seriesConfig.numYears;

  const series = useMemo(
    () => generateTimeSeries(currentCase.seriesConfig, activeYears),
    [currentCase, activeYears],
  );

  const currentAnswer = currentQuestion
    ? answersByQuestionId[currentQuestion.id]
    : undefined;
  const wrongIds = useMemo(
    () =>
      currentQuestion
        ? wrongAttemptsByQuestionId[currentQuestion.id] ?? []
        : [],
    [currentQuestion, wrongAttemptsByQuestionId],
  );
  const eliminatedIds = useMemo(
    () =>
      currentQuestion
        ? eliminatedByQuestionId[currentQuestion.id] ?? []
        : [],
    [currentQuestion, eliminatedByQuestionId],
  );
  const effectiveMaxAttempts = eliminatedIds.length > 0 ? 1 : MAX_QUIZ_ATTEMPTS;
  const attemptsRemaining = currentAnswer
    ? 0
    : Math.max(0, effectiveMaxAttempts - wrongIds.length);

  // Reset chart helpers & speed timer when question changes
  useEffect(() => {
    setShowDeseasonalized(false);
    setShowTrendLine(false);
    setUseExtendedRecord(false);
    questionStartRef.current = Date.now();
    setElapsedSec(0);
  }, [currentQuestion?.id]);

  // Smooth speed bonus meter update while current question is unanswered
  useEffect(() => {
    if (finished || currentAnswer) return;
    const id = window.setInterval(() => {
      const next = (Date.now() - questionStartRef.current) / 1000;
      setElapsedSec(next);
    }, 250);
    return () => window.clearInterval(id);
  }, [finished, currentAnswer]);

  const answeredCount = Object.keys(answersByQuestionId).length;
  const correctCount = Object.values(answersByQuestionId).filter(
    (a) => a.isCorrect,
  ).length;
  const totalScore = Object.values(answersByQuestionId).reduce(
    (sum, a) => sum + a.points.total,
    0,
  );

  useEffect(() => {
    onQuizProgressChange?.({
      answeredCount,
      correctCount,
      totalQuestions: questions.length,
      score: totalScore,
      finished,
    });
  }, [
    answeredCount,
    correctCount,
    questions.length,
    totalScore,
    finished,
    onQuizProgressChange,
  ]);

  const handleUseFiftyFifty = useCallback(() => {
    if (
      !currentQuestion ||
      currentAnswer ||
      fiftyFiftyRemaining <= 0 ||
      eliminatedIds.length > 0 ||
      wrongIds.length > 0
    ) {
      return;
    }
    soundEngine.playToggle();
    const toEliminate = pickFiftyFiftyEliminations(currentQuestion.choices);
    setEliminatedByQuestionId((prev) => ({
      ...prev,
      [currentQuestion.id]: toEliminate,
    }));
    setFiftyFiftyRemaining((n) => Math.max(0, n - 1));
  }, [
    currentQuestion,
    currentAnswer,
    fiftyFiftyRemaining,
    eliminatedIds.length,
    wrongIds.length,
  ]);

  const handleSelectChoice = useCallback(
    (choiceId: string) => {
      if (!currentQuestion || answersByQuestionId[currentQuestion.id]) return;
      if (eliminatedIds.includes(choiceId) || wrongIds.includes(choiceId)) return;

      const choice = currentQuestion.choices.find((c) => c.id === choiceId);
      if (!choice) return;

      const usedFifty = eliminatedIds.length > 0;
      const attemptNumber = wrongIds.length + 1;
      const elapsed = (Date.now() - questionStartRef.current) / 1000;

      if (choice.isCorrect) {
        const nextStreak = attemptNumber <= 1 ? streak + 1 : 0;
        const points = scoreQuizAnswer({
          isCorrect: true,
          streakAfter: nextStreak,
          usedFiftyFifty: usedFifty,
          elapsedSec: elapsed,
          attemptNumber,
          difficulty: currentQuestion.difficulty,
          speedWindowSec: activeRules.speedWindowSec,
          scoreMultiplier: activeRules.scoreMultiplier,
        });
        soundEngine.playCaseSolved();
        setStreak(nextStreak);
        setBestStreak((b) => Math.max(b, nextStreak));
        setAnswersByQuestionId((prev) => ({
          ...prev,
          [currentQuestion.id]: {
            choiceId,
            isCorrect: true,
            points,
          },
        }));
        return;
      }

      // Wrong option chosen
      const nextWrongIds = [...wrongIds, choiceId];
      setWrongAttemptsByQuestionId((prev) => ({
        ...prev,
        [currentQuestion.id]: nextWrongIds,
      }));
      soundEngine.playDistractor();
      setStreak(0);

      if (nextWrongIds.length >= effectiveMaxAttempts) {
        const points = scoreQuizAnswer({
          isCorrect: false,
          streakAfter: 0,
          usedFiftyFifty: usedFifty,
          elapsedSec: elapsed,
          attemptNumber,
          difficulty: currentQuestion.difficulty,
          speedWindowSec: activeRules.speedWindowSec,
          scoreMultiplier: activeRules.scoreMultiplier,
        });
        setAnswersByQuestionId((prev) => ({
          ...prev,
          [currentQuestion.id]: {
            choiceId,
            isCorrect: false,
            points,
          },
        }));
      }
    },
    [
      currentQuestion,
      answersByQuestionId,
      eliminatedIds,
      wrongIds,
      effectiveMaxAttempts,
      streak,
      activeRules.speedWindowSec,
      activeRules.scoreMultiplier,
    ],
  );

  const handleNext = useCallback(() => {
    soundEngine.playSelect();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setFinished(true);
    }
  }, [currentIndex, questions.length]);

  const handleRestartQuiz = useCallback(
    (shouldShuffle: boolean) => {
      soundEngine.playSelect();
      setShuffleQuestions(shouldShuffle);
      setDeckSeed((s) => s + 1);
      setCurrentIndex(0);
      setAnswersByQuestionId({});
      setWrongAttemptsByQuestionId({});
      setEliminatedByQuestionId({});
      setFiftyFiftyRemaining(activeRules.fiftyFiftyCount);
      setStreak(0);
      setBestStreak(0);
      setFinished(false);
    },
    [activeRules.fiftyFiftyCount],
  );

  // Keyboard shortcuts: 1-4 / A-D to answer, H for 50/50, Enter to advance
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (finished) return;

      const keyUpper = e.key.toUpperCase();
      if (keyUpper === 'H') {
        e.preventDefault();
        handleUseFiftyFifty();
        return;
      }

      let idx = -1;
      if (e.key >= '1' && e.key <= '4') {
        idx = Number(e.key) - 1;
      } else if (keyUpper >= 'A' && keyUpper <= 'D') {
        idx = keyUpper.charCodeAt(0) - 65;
      }

      if (idx >= 0 && currentQuestion.choices[idx] && !currentAnswer) {
        e.preventDefault();
        handleSelectChoice(currentQuestion.choices[idx].id);
        return;
      }

      if (e.key === 'Enter' && currentAnswer) {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    finished,
    currentQuestion,
    currentAnswer,
    handleSelectChoice,
    handleUseFiftyFifty,
    handleNext,
  ]);

  if (finished) {
    const accuracy = Math.round(
      (correctCount / Math.max(1, questions.length)) * 100,
    );
    const rank = getDetectiveRank(correctCount, questions.length);

    return (
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-4 py-8 sm:px-6">
        <section className="rounded-xl border border-slate-700 bg-[#11192b] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-emerald-400">
                {activeRules.label} Quiz Complete · {questions.length} Questions Answered
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-50 sm:text-3xl">
                {rank}
              </h1>
              <p className="mt-1.5 text-sm text-slate-300">
                Nice work! Click any question tile below to review its chart, map, or explanation.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 font-mono tabular-nums">
              <Award className="h-5 w-5 text-cyan-400" aria-hidden="true" />
              <span className="text-2xl font-bold text-cyan-300">
                {totalScore}
              </span>
              <span className="text-xs text-slate-400">pts</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 font-mono tabular-nums sm:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-[#0b111e] p-3.5">
              <div className="text-xs text-slate-400">Correct</div>
              <div className="mt-1 text-2xl font-bold text-emerald-400">
                {correctCount}/{questions.length}
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#0b111e] p-3.5">
              <div className="text-xs text-slate-400">Accuracy</div>
              <div className="mt-1 text-2xl font-bold text-slate-100">
                {accuracy}%
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#0b111e] p-3.5">
              <div className="text-xs text-slate-400">Best Streak</div>
              <div className="mt-1 text-2xl font-bold text-amber-300">
                {bestStreak}
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#0b111e] p-3.5">
              <div className="text-xs text-slate-400">50/50s Saved</div>
              <div className="mt-1 text-2xl font-bold text-cyan-400">
                {fiftyFiftyRemaining}/{activeRules.fiftyFiftyCount}
              </div>
            </div>
          </div>

          {/* Question-by-Question Review Grid */}
          <div className="mt-6">
            <div className="font-mono text-xs uppercase tracking-wider text-slate-400">
              Question Review
            </div>
            <div className="mt-2.5 grid grid-cols-5 gap-2 sm:grid-cols-10">
              {questions.map((q, idx) => {
                const ans = answersByQuestionId[q.id];
                const ok = ans?.isCorrect;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setFinished(false);
                      setCurrentIndex(idx);
                    }}
                    className={`flex min-h-[42px] items-center justify-center gap-1 rounded-md border font-mono text-xs font-semibold transition-colors ${
                      ok
                        ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50'
                        : 'border-rose-500/60 bg-rose-950/30 text-rose-300 hover:bg-rose-950/50'
                    }`}
                  >
                    Q{idx + 1}
                    {ok ? '✓' : '✗'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5">
            {onSwitchToLab && (
              <button
                type="button"
                onClick={() => onSwitchToLab(currentCase.id)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
              >
                Explore Full Lab Mode
              </button>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-start="true"
                onClick={() => handleRestartQuiz(true)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 whitespace-nowrap shrink-0"
              >
                <Shuffle className="h-4 w-4" aria-hidden="true" />
                Play Again (Shuffled)
              </button>
              <button
                type="button"
                onClick={() => handleRestartQuiz(false)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#0b111e] px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Replay in Order
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const speedBonusActive =
    !currentAnswer &&
    eliminatedIds.length === 0 &&
    wrongIds.length === 0 &&
    elapsedSec <= activeRules.speedWindowSec;
  const speedPct = Math.max(
    0,
    Math.min(
      100,
      ((activeRules.speedWindowSec - elapsedSec) / activeRules.speedWindowSec) *
        100,
    ),
  );
  const nextComboBonus = streak >= 1 ? Math.min(50, streak * 10) : 0;
  const canUseFiftyFifty =
    !currentAnswer &&
    fiftyFiftyRemaining > 0 &&
    eliminatedIds.length === 0 &&
    wrongIds.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 pb-6 pt-3 sm:px-6">
      {/* Top Quiz Game Telemetry Header & Progress Track */}
      <section className="flex flex-col gap-2.5 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs tabular-nums">
            <span className="font-semibold text-cyan-400">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-300">{currentQuestion.categoryLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Manual Difficulty Level Switcher */}
            <div
              role="group"
              aria-label="Difficulty Level"
              className="flex items-center gap-0.5 rounded-md border border-slate-800 bg-[#11192b] p-0.5"
            >
              {DIFFICULTY_LEVELS.map((level) => {
                const count = filterCasesByDifficulty(cases, level).length;
                const active = difficultyFilter === level;
                return (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      if (level !== difficultyFilter) {
                        soundEngine.playSelect();
                        onChangeDifficulty(level);
                      }
                    }}
                    className={`min-h-[30px] rounded px-2 py-1 font-mono text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {DIFFICULTY_RULES[level].shortLabel} ({count})
                  </button>
                );
              })}
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-[#11192b] px-2.5 py-1 font-mono text-xs text-amber-300 tabular-nums">
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              Streak {streak}
              {nextComboBonus > 0 && (
                <span className="text-emerald-300">
                  (+{nextComboBonus} next)
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={!canUseFiftyFifty}
              onClick={handleUseFiftyFifty}
              title="Eliminate 2 wrong answers (H)"
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                canUseFiftyFifty
                  ? 'border-violet-500/70 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25'
                  : 'cursor-not-allowed border-slate-800 bg-[#0d1526] text-slate-500'
              }`}
            >
              <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
              50/50 · {fiftyFiftyRemaining} left
            </button>

            <button
              type="button"
              onClick={() => handleRestartQuiz(true)}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-slate-700 bg-[#11192b] px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400 hover:text-white whitespace-nowrap shrink-0"
            >
              <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
              Shuffle
            </button>

            <label htmlFor="quiz-jump-select" className="sr-only">
              Jump to Quiz Question
            </label>
            <select
              id="quiz-jump-select"
              aria-label="Jump to Quiz Question"
              value={currentIndex}
              onChange={(e) => {
                soundEngine.playSelect();
                setCurrentIndex(Number(e.target.value));
              }}
              className="h-[34px] max-w-[155px] truncate rounded-md border border-slate-700 bg-[#11192b] px-2 font-mono text-xs text-slate-200"
            >
              {questions.map((q, idx) => {
                const ans = answersByQuestionId[q.id];
                const mark = ans ? (ans.isCorrect ? '✓ ' : '✗ ') : '';
                return (
                  <option key={q.id} value={idx}>
                    {mark}Q{idx + 1}: {q.caseNumber}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Interactive Telemetry Track */}
        <div
          role="progressbar"
          aria-valuenow={answeredCount}
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-label="Quiz progress"
          className={`grid gap-1 ${
            questions.length <= 10
              ? 'grid-cols-5 sm:grid-cols-10'
              : questions.length <= 20
                ? 'grid-cols-10 sm:grid-cols-[repeat(20,minmax(0,1fr))]'
                : 'grid-cols-10 sm:grid-cols-[repeat(15,minmax(0,1fr))] lg:grid-cols-[repeat(30,minmax(0,1fr))]'
          }`}
        >
          {questions.map((q, idx) => {
            const ans = answersByQuestionId[q.id];
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  soundEngine.playSelect();
                  setCurrentIndex(idx);
                }}
                aria-label={`Go to Question ${idx + 1}`}
                className={`h-2.5 rounded-sm transition-colors ${
                  isCurrent
                    ? 'bg-cyan-400 ring-1 ring-cyan-300'
                    : ans?.isCorrect
                      ? 'bg-emerald-500/80 hover:bg-emerald-400'
                      : ans && !ans.isCorrect
                        ? 'bg-rose-500/80 hover:bg-rose-400'
                        : 'bg-slate-800 hover:bg-slate-700'
                }`}
              />
            );
          })}
        </div>
      </section>

      {/* Main 2-Column Quiz Workspace */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT: Live Data Visual Clue (Telemetry Chart / Interactive World Map) */}
        <div className="flex flex-col gap-3 lg:col-span-7">
          {currentQuestion.visualKind === 'chart' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="font-semibold text-cyan-400">
                    {targetVar.source} · {targetVar.name}
                  </span>
                  <span className="text-slate-600" aria-hidden="true">
                    |
                  </span>
                  <span className="text-slate-300">
                    {targetRegion.name} · {currentCase.seriesConfig.startYear}–
                    {currentCase.seriesConfig.startYear + activeYears - 1} ({activeYears} yr)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    aria-pressed={showDeseasonalized}
                    onClick={() => {
                      soundEngine.playToggle();
                      setShowDeseasonalized((v) => !v);
                    }}
                    className={`min-h-[34px] rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      showDeseasonalized
                        ? 'border-emerald-500/80 bg-emerald-500/20 text-emerald-200'
                        : currentQuestion.showSeasonalHelper
                          ? 'border-amber-400/80 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                          : 'border-slate-700 bg-[#11192b] text-slate-300 hover:text-white'
                    }`}
                  >
                    {showDeseasonalized ? 'Seasons Removed ✓' : 'Remove Seasons'}
                  </button>

                  <button
                    type="button"
                    aria-pressed={showTrendLine}
                    onClick={() => {
                      soundEngine.playToggle();
                      setShowTrendLine((v) => !v);
                    }}
                    className={`min-h-[34px] rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      showTrendLine
                        ? 'border-rose-500/80 bg-rose-500/20 text-rose-200'
                        : 'border-slate-700 bg-[#11192b] text-slate-300 hover:text-white'
                    }`}
                  >
                    {showTrendLine ? 'Trend Line On ✓' : 'Show Trend Line'}
                  </button>

                  {currentQuestion.showExtendedHelper && currentCase.extendedYears && (
                    <button
                      type="button"
                      aria-pressed={useExtendedRecord}
                      onClick={() => {
                        soundEngine.playToggle();
                        setUseExtendedRecord((v) => !v);
                      }}
                      className={`min-h-[34px] rounded-md border px-2.5 py-1 font-mono text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        useExtendedRecord
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                          : 'border-amber-400/80 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                      }`}
                    >
                      {useExtendedRecord
                        ? `Showing ${currentCase.extendedYears} yr (Click for ${currentCase.seriesConfig.numYears} yr)`
                        : `Try ${currentCase.extendedYears} yr`}
                    </button>
                  )}
                </div>
              </div>

              <TimeSeriesChart
                points={series.points}
                unit={currentCase.unit}
                showRaw={!showDeseasonalized}
                showSeasonal={false}
                showDeseasonalized={showDeseasonalized}
                showTrendLine={showTrendLine}
                actualSlope={series.deseasonalizedStats.ols.slopePerYear}
                theme={theme}
              />

              {(currentQuestion.showPValueBadge || currentAnswer) && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#11192b] px-4 py-2.5 font-mono text-xs tabular-nums">
                  <span className="text-slate-300">
                    Yearly Change:{' '}
                    <strong className="text-slate-100">
                      {series.deseasonalizedStats.ols.slopePerYear >= 0 ? '+' : ''}
                      {series.deseasonalizedStats.ols.slopePerYear.toFixed(3)}{' '}
                      {currentCase.unitPerYear}
                    </strong>
                  </span>
                  <span>
                    Trend Check:{' '}
                    <strong
                      className={
                        series.deseasonalizedStats.ols.pValue < 0.05
                          ? 'text-emerald-400'
                          : 'text-amber-300'
                      }
                    >
                      {series.deseasonalizedStats.ols.pValue < 0.05
                        ? 'Proven Real'
                        : 'Not Sure Yet'}
                    </strong>{' '}
                    <span className="text-slate-400">
                      (p{' '}
                      {formatPValue(series.deseasonalizedStats.ols.pValue).startsWith('<')
                        ? formatPValue(series.deseasonalizedStats.ols.pValue)
                        : `= ${formatPValue(series.deseasonalizedStats.ols.pValue)}`}
                      )
                    </span>
                  </span>
                </div>
              )}
            </>
          )}

          {currentQuestion.visualKind === 'map' && (
            <div className="flex flex-col gap-3">
              <div className="font-mono text-xs text-slate-300">
                Click a pulsing marker on the map or pick A–D on the right
              </div>
              <WorldRegionMap
                regions={currentCase.regionOptions}
                selectedRegionId={currentAnswer ? targetRegion.id : null}
                rejectedRegionIds={[...eliminatedIds, ...wrongIds]}
                onSelectRegion={(regionId) => handleSelectChoice(regionId)}
                theme={theme}
              />
            </div>
          )}

          {currentQuestion.visualKind === 'variable' && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-slate-800 bg-[#11192b] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-xs uppercase tracking-wider text-cyan-400">
                    Satellite Instrument Telemetry · {targetRegion.name}
                  </div>
                  <span className="font-mono text-xs text-slate-400">
                    {targetRegion.coordinatesLabel}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {currentCase.variableOptions.slice(0, 4).map((v) => (
                    <div
                      key={v.id}
                      className="rounded-lg border border-slate-800 bg-[#0b111e] p-3"
                    >
                      <div className="font-mono text-xs text-cyan-400">
                        {v.source} · {v.unit}
                      </div>
                      <div className="mt-0.5 text-sm font-semibold text-slate-100">
                        {v.name}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300">
                        {v.definition}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <WorldRegionMap
                regions={[targetRegion]}
                selectedRegionId={targetRegion.id}
                rejectedRegionIds={[]}
                onSelectRegion={() => {}}
                theme={theme}
              />
            </div>
          )}
        </div>

        {/* RIGHT: Single-Step Randomized A/B/C/D Quiz Card */}
        <aside className="flex flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-[#11192b] p-5 lg:col-span-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-slate-400">
              <span>
                {currentQuestion.caseNumber} · Attempts left:{' '}
                <strong
                  className={
                    attemptsRemaining === 0
                      ? 'text-slate-400'
                      : attemptsRemaining === 1
                        ? 'text-amber-300'
                        : 'text-cyan-400'
                  }
                >
                  {attemptsRemaining}/{effectiveMaxAttempts}
                </strong>
              </span>
              {speedBonusActive ? (
                <span className="inline-flex items-center gap-1 text-amber-300 tabular-nums">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  +25 Speed Bonus ({Math.ceil(activeRules.speedWindowSec - elapsedSec)}s)
                </span>
              ) : (
                <span>Press A–D or 1–4</span>
              )}
            </div>

            {/* Stable-height speed bonus timer bar */}
            <div className="mt-2 h-1 w-full overflow-hidden rounded bg-slate-800">
              <div
                className={`h-full transition-all duration-200 ${
                  speedBonusActive ? 'bg-amber-400' : 'bg-slate-700'
                }`}
                style={{
                  width:
                    !currentAnswer &&
                    eliminatedIds.length === 0 &&
                    wrongIds.length === 0
                      ? `${speedPct}%`
                      : '0%',
                }}
              />
            </div>

            <h1 className="mt-2.5 text-xl font-semibold leading-snug text-slate-50 sm:text-2xl">
              {currentQuestion.prompt}
            </h1>
            <p className="mt-1.5 text-sm text-slate-300">
              {currentQuestion.helperText}
            </p>

            {/* 4 Randomized Choices */}
            <div className="mt-5 flex flex-col gap-2.5">
              {currentQuestion.choices.map((choice, idx) => {
                const isEliminated = eliminatedIds.includes(choice.id);
                const isWrongPick = wrongIds.includes(choice.id);
                const showCorrect = Boolean(currentAnswer) && choice.isCorrect;
                const showWrong = isWrongPick;

                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={Boolean(currentAnswer) || isEliminated || isWrongPick}
                    onClick={() => handleSelectChoice(choice.id)}
                    className={`flex min-h-[54px] items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                      showCorrect
                        ? 'border-emerald-500/80 bg-emerald-950/35 text-emerald-100'
                        : showWrong
                          ? 'cursor-not-allowed border-rose-500/80 bg-rose-950/30 text-rose-100'
                          : isEliminated
                            ? 'cursor-not-allowed border-slate-800/70 bg-[#080d18] text-slate-600 line-through opacity-45'
                            : currentAnswer
                              ? 'border-slate-800 bg-[#0b111e] text-slate-500'
                              : 'border-slate-700 bg-[#0b111e] text-slate-100 hover:border-cyan-400 hover:bg-[#0e172a]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-bold ${
                          showCorrect
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                            : showWrong
                              ? 'border-rose-400 bg-rose-500/20 text-rose-300'
                              : isEliminated
                                ? 'border-slate-800 bg-[#0b111e] text-slate-600'
                                : 'border-slate-700 bg-[#11192b] text-cyan-300'
                        }`}
                      >
                        {CHOICE_LETTERS[idx]}
                      </span>
                      <span className="text-sm font-medium leading-snug">
                        {choice.label}
                      </span>
                    </div>

                    {showCorrect && (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-emerald-400"
                        aria-hidden="true"
                      />
                    )}
                    {showWrong && (
                      <XCircle
                        className="h-4 w-4 shrink-0 text-rose-400"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* 1st Wrong Attempt Warning (1 attempt left) */}
            {!currentAnswer && wrongIds.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-500/60 bg-amber-950/20 p-3.5 text-sm leading-relaxed text-amber-100">
                <div className="font-semibold">
                  Not quite — 1 attempt left! Pick another option.
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-200">
                  Hint: {currentQuestion.helperText}
                </p>
              </div>
            )}

            {/* Final Quiz Feedback (with Correct Option & Explanation) */}
            {currentAnswer && (() => {
              const correctIdx = currentQuestion.choices.findIndex((c) => c.isCorrect);
              const correctChoice =
                correctIdx >= 0 ? currentQuestion.choices[correctIdx] : null;
              return (
                <div
                  className={`mt-4 rounded-lg border p-3.5 text-sm leading-relaxed ${
                    currentAnswer.isCorrect
                      ? 'border-emerald-500/60 bg-emerald-950/25 text-emerald-100'
                      : 'border-rose-500/60 bg-rose-950/25 text-rose-100'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                    <span>
                      {currentAnswer.isCorrect
                        ? `Correct! +${currentAnswer.points.total} pts`
                        : 'Wrong option — Out of attempts'}
                    </span>
                    {currentAnswer.isCorrect ? (
                      <span className="font-mono text-xs text-emerald-300 tabular-nums">
                        Base {currentAnswer.points.base}
                        {currentAnswer.points.speedBonus > 0
                          ? ` + Speed ${currentAnswer.points.speedBonus}`
                          : ''}
                        {currentAnswer.points.streakBonus > 0
                          ? ` + Streak ${currentAnswer.points.streakBonus}`
                          : ''}
                        {currentAnswer.points.difficultyBonus > 0
                          ? ` + Diff ${currentAnswer.points.difficultyBonus}`
                          : ''}
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-rose-300 tabular-nums">
                        0 pts · Streak reset
                      </span>
                    )}
                  </div>
                  {!currentAnswer.isCorrect && correctChoice && (
                    <div className="mt-2 rounded-md border border-emerald-500/50 bg-emerald-950/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-200">
                      Correct Option: {CHOICE_LETTERS[correctIdx]}. {correctChoice.label}
                    </div>
                  )}
                  <p className="mt-2 text-xs leading-relaxed text-slate-200">
                    {currentQuestion.explanation}
                  </p>
                </div>
              );
            })()}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
            {onSwitchToLab ? (
              <button
                type="button"
                onClick={() => onSwitchToLab(currentCase.id)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
              >
                Open in Lab Mode
              </button>
            ) : (
              <span />
            )}

            <button
              type="button"
              disabled={!currentAnswer}
              onClick={handleNext}
              className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                currentAnswer
                  ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                  : 'cursor-not-allowed bg-slate-800 text-slate-500'
              }`}
            >
              {currentIndex < questions.length - 1
                ? 'Next Question'
                : 'See Quiz Results'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}
