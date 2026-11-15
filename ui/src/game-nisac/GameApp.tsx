import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Pause,
  RotateCcw,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DETECTIVE_CASES, type DifficultyFilter } from './game/cases';
import { DIFFICULTY_RULES, filterCasesByDifficulty } from './game/quiz';
import {
  generateTimeSeries,
  type CaseScoreBreakdown,
} from './game/statistics';
import { soundEngine } from './game/audio';
import { TitleBackdrop } from './components/TitleBackdrop';
import { CasePlayView } from './components/CasePlayView';
import { QuizPlayView } from './components/QuizPlayView';
import {
  CaseDebriefModal,
  PauseModal,
  VictoryModal,
} from './components/Modals';
import './index.css';

type GameState = 'title' | 'playing' | 'paused' | 'gameover';
type PlayMode = 'quiz' | 'lab';
type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'dd-theme';
const DIFFICULTY_LEVELS: readonly DifficultyFilter[] = [
  'easy',
  'medium',
  'hard',
  'all',
];

export default function App() {
  const initialParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
  const initialAutoStart = initialParams?.get('autostart') === '1';
  const initialMode: PlayMode =
    initialParams?.get('mode') === 'lab' ? 'lab' : 'quiz';

  const urlDiff = initialParams?.get('difficulty');
  const initialDifficulty: DifficultyFilter =
    urlDiff === 'easy' ||
    urlDiff === 'medium' ||
    urlDiff === 'hard' ||
    urlDiff === 'all'
      ? urlDiff
      : 'easy';

  const urlTheme = initialParams?.get('theme');
  const storedTheme =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(THEME_STORAGE_KEY)
      : null;
  const initialTheme: ThemeMode =
    urlTheme === 'light' || urlTheme === 'dark'
      ? urlTheme
      : storedTheme === 'light' || storedTheme === 'dark'
        ? storedTheme
        : 'dark';

  const [gameState, setGameState] = useState<GameState>(
    initialAutoStart ? 'playing' : 'title',
  );
  const [playMode, setPlayMode] = useState<PlayMode>(initialMode);
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>(initialDifficulty);
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const [caseScores, setCaseScores] = useState<Record<string, CaseScoreBreakdown>>({});
  const [quizProgress, setQuizProgress] = useState({
    answeredCount: 0,
    correctCount: 0,
    totalQuestions: filterCasesByDifficulty(DETECTIVE_CASES, initialDifficulty).length,
    score: 0,
    finished: false,
  });
  const [debriefCaseId, setDebriefCaseId] = useState<string | null>(null);
  const [pinnedLabCaseId, setPinnedLabCaseId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [resetEpoch, setResetEpoch] = useState(0);

  const filteredCases = useMemo(() => {
    const base = filterCasesByDifficulty(DETECTIVE_CASES, difficultyFilter);
    if (pinnedLabCaseId && !base.some((c) => c.id === pinnedLabCaseId)) {
      const pinned = DETECTIVE_CASES.find((c) => c.id === pinnedLabCaseId);
      if (
        pinned &&
        (difficultyFilter === 'all' || pinned.difficulty === difficultyFilter)
      ) {
        return [...base.slice(0, base.length - 1), pinned];
      }
    }
    return base;
  }, [difficultyFilter, pinnedLabCaseId]);
  const activeCase =
    filteredCases[activeCaseIndex] ?? filteredCases[0] ?? DETECTIVE_CASES[0];

  const filteredScore = useMemo(
    () =>
      filteredCases.reduce(
        (sum, c) => sum + (caseScores[c.id]?.total ?? 0),
        0,
      ),
    [filteredCases, caseScores],
  );
  const maxPossibleScore = filteredCases.length * 100;
  const solvedCount = useMemo(
    () => filteredCases.filter((c) => Boolean(caseScores[c.id])).length,
    [filteredCases, caseScores],
  );

  const debriefSeries = useMemo(() => {
    const c = DETECTIVE_CASES.find((item) => item.id === debriefCaseId);
    return c ? generateTimeSeries(c.seriesConfig) : null;
  }, [debriefCaseId]);

  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures in restricted contexts
    }
  }, [theme]);

  const handleChangeDifficulty = useCallback((nextDiff: DifficultyFilter) => {
    setDifficultyFilter(nextDiff);
    setPinnedLabCaseId(null);
    setActiveCaseIndex(0);
    setDebriefCaseId(null);
    setQuizProgress({
      answeredCount: 0,
      correctCount: 0,
      totalQuestions: filterCasesByDifficulty(DETECTIVE_CASES, nextDiff).length,
      score: 0,
      finished: false,
    });
  }, []);

  const toggleTheme = useCallback(() => {
    soundEngine.playToggle();
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const startGame = useCallback((mode: PlayMode = 'quiz') => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    soundEngine.playSelect();
    setPlayMode(mode);
    setGameState('playing');
  }, []);

  const restartEntireGame = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    soundEngine.playSelect();
    setCaseScores({});
    setDebriefCaseId(null);
    setActiveCaseIndex(0);
    setResetEpoch((e) => e + 1);
    setGameState('playing');
  }, []);

  const toggleMute = useCallback(() => {
    const next = soundEngine.toggleMute();
    setMuted(next);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (gameState === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (debriefCaseId) return;
        e.preventDefault();
        setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if ((e.key === 'r' || e.key === 'R') && gameState === 'playing' && !debriefCaseId) {
        e.preventDefault();
        setResetEpoch((n) => n + 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, debriefCaseId, startGame, toggleMute]);

  const handleCaseSolved = (score: CaseScoreBreakdown) => {
    setCaseScores((prev) => ({
      ...prev,
      [activeCase.id]: score,
    }));
    setDebriefCaseId(activeCase.id);
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#0b111e] text-slate-100">
      {/* TITLE SCREEN */}
      {gameState === 'title' && (
        <main className="relative flex min-h-screen w-full flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
          <TitleBackdrop active={true} theme={theme} />

          {/* Top subtle brand strip */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-xs tracking-wider text-cyan-400">
              Earth Observation Case Archive · 40 Easy · 40 Medium · 40 Hard
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={
                  theme === 'dark'
                    ? 'Switch to light theme'
                    : 'Switch to dark theme'
                }
                onClick={(e) => {
                  e.currentTarget.blur();
                  toggleTheme();
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0b111e]/85 px-3 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white whitespace-nowrap shrink-0"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4 text-amber-300" aria-hidden="true" />
                    Light
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                    Dark
                  </>
                )}
              </button>
              <button
                type="button"
                tabIndex={-1}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  toggleMute();
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-[#0b111e]/85 text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
              >
                {muted ? (
                  <VolumeX className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Left-third negative-space Title Lockup & Start CTA */}
          <div className="relative z-10 my-auto max-w-xl py-8">
            <svg
              viewBox="0 0 460 118"
              role="img"
              aria-label="Voltz.7: Earth Trends"
              className="h-auto w-full max-w-[440px]"
            >
              {/* Satellite crest emblem */}
              <g transform="translate(4, 10)">
                <circle
                  cx="36"
                  cy="36"
                  r="30"
                  fill={
                    theme === 'light'
                      ? 'rgba(2, 132, 199, 0.1)'
                      : 'rgba(6, 182, 212, 0.1)'
                  }
                  stroke={theme === 'light' ? '#0284c7' : '#06b6d4'}
                  strokeWidth="1.8"
                />
                <path
                  d="M12,42 Q26,22 36,36 T60,26"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                <circle cx="36" cy="36" r="4" fill="#f59e0b" />
                <line
                  x1="14"
                  y1="18"
                  x2="58"
                  y2="54"
                  stroke="rgba(148, 163, 184, 0.4)"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
              </g>

              <text
                x="88"
                y="42"
                fill={theme === 'light' ? '#0369a1' : '#06b6d4'}
                fontSize="14"
                fontWeight="600"
                fontFamily="IBM Plex Mono, monospace"
                letterSpacing="2"
              >
                Voltz.7
              </text>
              <text
                x="86"
                y="84"
                fill={theme === 'light' ? '#0f172a' : '#f8fafc'}
                fontSize="40"
                fontWeight="700"
                fontFamily="Outfit, sans-serif"
              >
                Earth Trends
              </text>
            </svg>

            <h1 className="sr-only">Voltz.7: Earth Trends</h1>

            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
              Play an Earth-science quiz with live satellite charts and maps—choose Easy (20), Medium (20), Hard (20), or Mix (30), with 2 attempts per question.
            </p>

            {/* Manual Difficulty Level Switcher */}
            <div className="mt-5">
              <div className="font-mono text-xs uppercase tracking-wider text-slate-400">
                Choose Difficulty
              </div>
              <div
                role="group"
                aria-label="Choose Difficulty"
                className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0d1526] p-1"
              >
                {DIFFICULTY_LEVELS.map((level) => {
                  const count = filterCasesByDifficulty(
                    DETECTIVE_CASES,
                    level,
                  ).length;
                  const active = difficultyFilter === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        soundEngine.playSelect();
                        handleChangeDifficulty(level);
                      }}
                      className={`min-h-[38px] rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-cyan-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      {DIFFICULTY_RULES[level].shortLabel} ({count})
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 font-mono text-xs text-slate-400">
                {DIFFICULTY_RULES[difficultyFilter].description}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-start="true"
                onClick={() => startGame('quiz')}
                className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-cyan-500 px-7 py-3 text-base font-semibold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 whitespace-nowrap shrink-0"
              >
                Start {DIFFICULTY_RULES[difficultyFilter].shortLabel} Quiz ({filteredCases.length} Questions)
              </button>
              <button
                type="button"
                onClick={() => startGame('lab')}
                className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-slate-700 bg-[#0b111e]/85 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
              >
                Full Lab Mode
              </button>
            </div>
          </div>

          {/* Single flat borderless control-hint line */}
          <div className="relative z-10 font-mono text-xs text-slate-400">
            Enter / Space Start · A–D / 1–4 Answer Quiz · 2 Attempts Max · H 50/50 · P Pause · M Mute
          </div>
        </main>
      )}

      {/* ACTIVE GAME SHELL */}
      {gameState !== 'title' && (
        <div className="flex min-h-screen flex-col">
          {/* Unified Perimeter HUD Strip */}
          <header className="border-b border-slate-800 bg-[#0d1526] px-4 py-2.5 sm:px-6">
            <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3">
              {/* Brand Title + Mode Switcher + Lab Difficulty & Case Selector */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setGameState('title')}
                  className="font-display text-base font-bold tracking-tight text-slate-100 hover:text-cyan-300 whitespace-nowrap shrink-0"
                >
                  Voltz.7
                </button>

                <div
                  role="group"
                  aria-label="Game Mode"
                  className="flex items-center gap-1 rounded-md border border-slate-800 bg-[#0b111e] p-0.5"
                >
                  <button
                    type="button"
                    aria-pressed={playMode === 'quiz'}
                    onClick={() => {
                      soundEngine.playSelect();
                      setDebriefCaseId(null);
                      setPlayMode('quiz');
                      setGameState('playing');
                    }}
                    className={`min-h-[30px] rounded px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      playMode === 'quiz'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Quiz
                  </button>
                  <button
                    type="button"
                    aria-pressed={playMode === 'lab'}
                    onClick={() => {
                      soundEngine.playSelect();
                      setPlayMode('lab');
                      setGameState('playing');
                    }}
                    className={`min-h-[30px] rounded px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      playMode === 'lab'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Lab
                  </button>
                </div>

                {playMode === 'lab' && (
                  <>
                    <div
                      role="group"
                      aria-label="Difficulty Level"
                      className="flex items-center gap-0.5 rounded-md border border-slate-800 bg-[#0b111e] p-0.5"
                    >
                      {DIFFICULTY_LEVELS.map((level) => {
                        const count = filterCasesByDifficulty(
                          DETECTIVE_CASES,
                          level,
                        ).length;
                        const active = difficultyFilter === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            aria-pressed={active}
                            onClick={() => {
                              if (level !== difficultyFilter) {
                                soundEngine.playSelect();
                                handleChangeDifficulty(level);
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

                    <nav
                      aria-label="Case Files"
                      className="flex items-center gap-1.5"
                    >
                      <button
                        type="button"
                        aria-label="Previous case"
                        disabled={activeCaseIndex === 0}
                        onClick={() => {
                          soundEngine.playSelect();
                          setDebriefCaseId(null);
                          setActiveCaseIndex((idx) => Math.max(0, idx - 1));
                          setGameState('playing');
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-800 bg-[#0b111e] text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <label htmlFor="case-select" className="sr-only">
                        Select Case File
                      </label>
                      <select
                        id="case-select"
                        aria-label="Select Case File"
                        value={activeCaseIndex}
                        onChange={(e) => {
                          soundEngine.playSelect();
                          setDebriefCaseId(null);
                          setActiveCaseIndex(Number(e.target.value));
                          setGameState('playing');
                        }}
                        className="h-9 max-w-[220px] truncate rounded-md border border-slate-700 bg-[#0b111e] px-2.5 font-mono text-xs text-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-400 sm:max-w-[310px]"
                      >
                        {filteredCases.map((c, idx) => {
                          const isSolved = Boolean(caseScores[c.id]);
                          return (
                            <option key={c.id} value={idx}>
                              {isSolved ? '✓ ' : ''}
                              {c.caseNumber}: {c.question}
                            </option>
                          );
                        })}
                      </select>

                      <button
                        type="button"
                        aria-label="Next case"
                        disabled={activeCaseIndex >= filteredCases.length - 1}
                        onClick={() => {
                          soundEngine.playSelect();
                          setDebriefCaseId(null);
                          setActiveCaseIndex((idx) =>
                            Math.min(filteredCases.length - 1, idx + 1),
                          );
                          setGameState('playing');
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-800 bg-[#0b111e] text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </nav>
                  </>
                )}
              </div>

              {/* Tabular Score + Utility Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
                  {playMode === 'quiz' ? (
                    <>
                      <span className="text-slate-300">
                        Correct{' '}
                        <strong className="text-emerald-400">
                          {quizProgress.correctCount}/{quizProgress.totalQuestions}
                        </strong>
                      </span>
                      <span className="text-slate-300">
                        Score{' '}
                        <strong className="text-cyan-400">
                          {quizProgress.score} pts
                        </strong>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-300">
                        Solved{' '}
                        <strong className="text-emerald-400">
                          {solvedCount}/{filteredCases.length}
                        </strong>
                      </span>
                      <span className="text-slate-300">
                        Score{' '}
                        <strong className="text-cyan-400">
                          {filteredScore}/{maxPossibleScore}
                        </strong>
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={
                      theme === 'dark'
                        ? 'Switch to light theme'
                        : 'Switch to dark theme'
                    }
                    title={
                      theme === 'dark'
                        ? 'Switch to Light Theme'
                        : 'Switch to Dark Theme'
                    }
                    onClick={(e) => {
                      e.currentTarget.blur();
                      toggleTheme();
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-800 bg-[#0b111e] px-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white whitespace-nowrap shrink-0"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                        Light
                      </>
                    ) : (
                      <>
                        <Moon className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                        Dark
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    title="Mute / Unmute (M)"
                    aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      toggleMute();
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-800 bg-[#0b111e] text-slate-300 hover:border-slate-600 hover:text-white"
                  >
                    {muted ? (
                      <VolumeX className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Volume2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    title="Restart Current Case (R)"
                    aria-label="Restart current case"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      soundEngine.playSelect();
                      setResetEpoch((n) => n + 1);
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-800 bg-[#0b111e] text-slate-300 hover:border-slate-600 hover:text-white"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    title="Pause Investigation (P)"
                    aria-label="Pause investigation"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setGameState('paused');
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-800 bg-[#0b111e] text-slate-300 hover:border-slate-600 hover:text-white"
                  >
                    <Pause className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Active Workbench */}
          <main className="flex-1">
            {playMode === 'quiz' ? (
              <QuizPlayView
                key={`quiz-${difficultyFilter}-${resetEpoch}`}
                cases={DETECTIVE_CASES}
                difficultyFilter={difficultyFilter}
                onChangeDifficulty={handleChangeDifficulty}
                theme={theme}
                onQuizProgressChange={setQuizProgress}
                onSwitchToLab={(caseId) => {
                  if (caseId) {
                    const base = filterCasesByDifficulty(
                      DETECTIVE_CASES,
                      difficultyFilter,
                    );
                    const foundIdx = base.findIndex((c) => c.id === caseId);
                    if (foundIdx >= 0) {
                      setPinnedLabCaseId(null);
                      setActiveCaseIndex(foundIdx);
                    } else {
                      const target = DETECTIVE_CASES.find((c) => c.id === caseId);
                      if (target) {
                        const nextDiff =
                          difficultyFilter === 'all'
                            ? 'all'
                            : target.difficulty;
                        const tierCases = filterCasesByDifficulty(
                          DETECTIVE_CASES,
                          nextDiff,
                        );
                        const tierIdx = tierCases.findIndex((c) => c.id === caseId);
                        if (tierIdx >= 0) {
                          setPinnedLabCaseId(null);
                          setDifficultyFilter(nextDiff);
                          setActiveCaseIndex(tierIdx);
                        } else {
                          setPinnedLabCaseId(target.id);
                          setDifficultyFilter(nextDiff);
                          setActiveCaseIndex(Math.max(0, tierCases.length - 1));
                        }
                      }
                    }
                  }
                  setPlayMode('lab');
                }}
              />
            ) : (
              <CasePlayView
                key={`${activeCase.id}-${resetEpoch}`}
                detectiveCase={activeCase}
                onCaseSolved={handleCaseSolved}
                solvedScore={caseScores[activeCase.id]}
                theme={theme}
              />
            )}
          </main>
        </div>
      )}

      {/* PAUSE MODAL */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={() => setGameState('playing')}
          onRestartCase={() => {
            setResetEpoch((n) => n + 1);
            setGameState('playing');
          }}
          onReturnTitle={() => setGameState('title')}
        />
      )}

      {/* CASE DEBRIEF MODAL */}
      {gameState === 'playing' && debriefCaseId && debriefSeries && (
        <CaseDebriefModal
          detectiveCase={
            DETECTIVE_CASES.find((c) => c.id === debriefCaseId) ?? activeCase
          }
          series={debriefSeries}
          score={caseScores[debriefCaseId]}
          hasNextCase={activeCaseIndex < filteredCases.length - 1}
          isAllSolved={solvedCount === filteredCases.length}
          onNextCase={() => {
            soundEngine.playSelect();
            setDebriefCaseId(null);
            setActiveCaseIndex((idx) =>
              Math.min(filteredCases.length - 1, idx + 1),
            );
          }}
          onFinishMission={() => {
            soundEngine.playCaseSolved();
            setDebriefCaseId(null);
            setGameState('gameover');
          }}
        />
      )}

      {/* FINAL VICTORY / GAMEOVER MODAL */}
      {gameState === 'gameover' && (
        <VictoryModal
          totalScore={filteredScore}
          maxScore={maxPossibleScore}
          solvedCount={solvedCount}
          totalCases={filteredCases.length}
          onPlayAgain={restartEntireGame}
          onReturnToCases={() => setGameState('playing')}
        />
      )}
    </div>
  );
}
