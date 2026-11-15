import { CheckCircle2, ArrowRight, RotateCcw, Award, Play } from 'lucide-react';
import type { DetectiveCase } from '../game/cases';
import {
  formatPValue,
  getDetectiveRank,
  type CaseScoreBreakdown,
  type GeneratedTimeSeries,
} from '../game/statistics';

interface PauseModalProps {
  onResume: () => void;
  onRestartCase: () => void;
  onReturnTitle: () => void;
}

export function PauseModal({
  onResume,
  onRestartCase,
  onReturnTitle,
}: PauseModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#11192b] p-6 shadow-2xl">
        <p className="font-mono text-xs uppercase tracking-wider text-cyan-400">
          Game Paused
        </p>
        <h2
          id="pause-title"
          className="mt-1 text-2xl font-semibold text-slate-100"
        >
          Take a Quick Break
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Your score and solved cases are saved. Jump back in whenever you are ready!
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 whitespace-nowrap shrink-0"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Resume Investigation
          </button>
          <button
            type="button"
            onClick={onRestartCase}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Restart Current Case
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200 whitespace-nowrap shrink-0"
          >
            Return to Title Screen
          </button>
        </div>
      </div>
    </div>
  );
}

interface CaseDebriefModalProps {
  detectiveCase: DetectiveCase;
  series: GeneratedTimeSeries;
  score: CaseScoreBreakdown;
  hasNextCase: boolean;
  isAllSolved: boolean;
  onNextCase: () => void;
  onFinishMission: () => void;
}

export function CaseDebriefModal({
  detectiveCase,
  series,
  score,
  hasNextCase,
  isAllSolved,
  onNextCase,
  onFinishMission,
}: CaseDebriefModalProps) {
  const { ols, mk } = series.deseasonalizedStats;
  const isSignificant = ols.pValue < 0.05;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="debrief-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-4"
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-[#11192b] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-emerald-400">
              {detectiveCase.caseNumber} · Case File Closed
            </p>
            <h2
              id="debrief-title"
              className="mt-1 text-2xl font-semibold text-slate-100"
            >
              {detectiveCase.question}
            </h2>
          </div>
          <div className="text-right font-mono tabular-nums">
            <div className="text-xs uppercase tracking-wider text-slate-400">
              Case Score
            </div>
            <div className="text-3xl font-bold text-cyan-400">
              {score.total}
              <span className="text-base font-normal text-slate-400">
                /{score.maxTotal}
              </span>
            </div>
          </div>
        </div>

        {/* Quantitative Metrics Strip */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-[#0b111e] p-3">
            <div className="text-xs text-slate-400">Yearly Change</div>
            <div className="mt-1 font-mono text-lg font-semibold text-slate-100 tabular-nums">
              {ols.slopePerYear >= 0 ? '+' : ''}
              {ols.slopePerYear.toFixed(3)}{' '}
              <span className="text-xs font-normal text-slate-400">
                {detectiveCase.unitPerYear}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0b111e] p-3">
            <div className="text-xs text-slate-400">OLS / Mann-Kendall p</div>
            <div className="mt-1 font-mono text-lg font-semibold text-slate-100 tabular-nums">
              {formatPValue(ols.pValue)} / {formatPValue(mk.pValue)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0b111e] p-3">
            <div className="text-xs text-slate-400">Result</div>
            <div
              className={`mt-1 inline-flex items-center gap-1.5 text-sm font-semibold ${
                isSignificant ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {isSignificant ? 'Real Trend (p < 0.05)' : 'Not Proven Yet'}
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="mt-4 grid grid-cols-5 gap-2 border-y border-slate-800 py-3 text-center font-mono text-xs tabular-nums">
          <div>
            <div className="text-slate-400">Variable</div>
            <div className="mt-0.5 font-semibold text-slate-100">
              {score.variableScore}/20
            </div>
          </div>
          <div>
            <div className="text-slate-400">Region</div>
            <div className="mt-0.5 font-semibold text-slate-100">
              {score.regionScore}/20
            </div>
          </div>
          <div>
            <div className="text-slate-400">Direction</div>
            <div className="mt-0.5 font-semibold text-slate-100">
              {score.directionScore}/20
            </div>
          </div>
          <div>
            <div className="text-slate-400">Rate Est.</div>
            <div className="mt-0.5 font-semibold text-slate-100">
              {score.rateScore}/20
            </div>
          </div>
          <div>
            <div className="text-slate-400">Verdict</div>
            <div className="mt-0.5 font-semibold text-slate-100">
              {score.significanceScore}/20
            </div>
          </div>
        </div>

        {/* Key Earth-Science Takeaway */}
        <div className="mt-4 rounded-lg border border-slate-800 bg-[#0b111e] p-4">
          <div className="font-mono text-xs uppercase tracking-wider text-cyan-400">
            What the Data Shows · {detectiveCase.keyInsightTag}
          </div>
          {score.significanceScore === 0 && (
            <div className="mt-2 rounded-md border border-emerald-500/50 bg-emerald-950/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-200">
              Your verdict was incorrect (0/20 pts) — Correct Option:{' '}
              {detectiveCase.expectedVerdict === 'significant'
                ? 'Yes — Real Trend (p < 0.05)'
                : 'No — Not Proven Yet (p ≥ 0.05)'}
            </div>
          )}
          <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
            {detectiveCase.debriefTakeaway}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {hasNextCase && (
            <button
              type="button"
              onClick={onNextCase}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 whitespace-nowrap shrink-0"
            >
              Open Next Case
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {(isAllSolved || !hasNextCase) && (
            <button
              type="button"
              onClick={onFinishMission}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-500/15 px-5 py-2.5 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25 whitespace-nowrap shrink-0"
            >
              <Award className="h-4 w-4" aria-hidden="true" />
              View Final Dossier
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface VictoryModalProps {
  totalScore: number;
  maxScore: number;
  solvedCount: number;
  totalCases: number;
  onPlayAgain: () => void;
  onReturnToCases: () => void;
}

export function VictoryModal({
  totalScore,
  maxScore,
  solvedCount,
  totalCases,
  onPlayAgain,
  onReturnToCases,
}: VictoryModalProps) {
  const rank = getDetectiveRank(totalScore, maxScore);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/88 p-4"
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-[#11192b] p-6 shadow-2xl">
        <p className="font-mono text-xs uppercase tracking-wider text-emerald-400">
          Earth Trends Investigation Complete
        </p>
        <h2
          id="victory-title"
          className="mt-1 text-2xl font-semibold text-slate-100"
        >
          {rank}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          You checked satellite charts across deserts, oceans, forests, ice sheets, and big cities!
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3 font-mono tabular-nums">
          <div className="rounded-lg border border-slate-800 bg-[#0b111e] p-3">
            <div className="text-xs text-slate-400">Total Score</div>
            <div className="mt-1 text-2xl font-bold text-cyan-400">
              {totalScore}
              <span className="text-sm font-normal text-slate-400">/{maxScore}</span>
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0b111e] p-3">
            <div className="text-xs text-slate-400">Cases Solved</div>
            <div className="mt-1 text-2xl font-bold text-emerald-400">
              {solvedCount}/{totalCases}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0b111e] p-3">
            <div className="text-xs text-slate-400">Accuracy</div>
            <div className="mt-1 text-2xl font-bold text-slate-100">
              {Math.round((totalScore / Math.max(1, maxScore)) * 100)}%
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2 rounded-lg border border-slate-800 bg-[#0b111e] p-4 text-sm text-slate-300">
          <div className="font-semibold text-slate-100">
            Key Ideas You Tested
          </div>
          <p>
            · Opposite Places: Air haze went down in Beijing while rising in Delhi.
          </p>
          <p>
            · Hidden by Seasons: Removing summer/winter swings uncovered drying in the Amazon and thinning sea ice in the Arctic.
          </p>
          <p>
            · More Years Help: In the Sahel, 12 noisy years weren’t enough to prove rain was rising—but 24 years made it clear!
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onReturnToCases}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
          >
            Review Cases
          </button>
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
