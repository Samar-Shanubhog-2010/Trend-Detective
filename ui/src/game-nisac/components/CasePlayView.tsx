import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  FlaskConical,
  LineChart,
  Satellite,
  XCircle,
} from 'lucide-react';
import type { DetectiveCase } from '../game/cases';
import {
  formatPValue,
  generateTimeSeries,
  scoreCaseAttempt,
  shuffleOptions,
  type CaseScoreBreakdown,
  type SignificanceVerdict,
  type TrendDirection,
} from '../game/statistics';
import { soundEngine } from '../game/audio';
import { TimeSeriesChart } from './TimeSeriesChart';
import { WorldRegionMap } from './WorldRegionMap';

interface CasePlayViewProps {
  detectiveCase: DetectiveCase;
  onCaseSolved: (score: CaseScoreBreakdown) => void;
  solvedScore?: CaseScoreBreakdown;
  theme?: 'dark' | 'light';
}

type StageId = 1 | 2 | 3 | 4;
type StatMethod = 'ols' | 'mann-kendall';
const MAX_LAB_ATTEMPTS = 2;

export function CasePlayView({
  detectiveCase,
  onCaseSolved,
  solvedScore,
  theme = 'dark',
}: CasePlayViewProps) {
  const [stage, setStage] = useState<StageId>(1);

  // Stage 1: Variable state (max 2 attempts)
  const [selectedVarId, setSelectedVarId] = useState<string | null>(null);
  const [rejectedVarIds, setRejectedVarIds] = useState<string[]>([]);
  const [varAttempts, setVarAttempts] = useState(0);
  const [varConfirmed, setVarConfirmed] = useState(false);
  const [varFailed, setVarFailed] = useState(false);

  // Stage 2: Region state (max 2 attempts)
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [rejectedRegionIds, setRejectedRegionIds] = useState<string[]>([]);
  const [regionAttempts, setRegionAttempts] = useState(0);
  const [regionConfirmed, setRegionConfirmed] = useState(false);
  const [regionFailed, setRegionFailed] = useState(false);

  // Stage 3: Time series toggles & player prediction
  const [showRaw, setShowRaw] = useState(true);
  const [showSeasonal, setShowSeasonal] = useState(false);
  const [showDeseasonalized, setShowDeseasonalized] = useState(false);
  const [showTrendLine, setShowTrendLine] = useState(false);
  const [predictedDirection, setPredictedDirection] = useState<TrendDirection | null>(null);
  const [estimatedSlope, setEstimatedSlope] = useState<number>(0);
  const [slopeTouched, setSlopeTouched] = useState(false);

  // Randomized answer order per case attempt
  const [shuffledVariables, setShuffledVariables] = useState(() =>
    shuffleOptions(detectiveCase.variableOptions),
  );
  const [shuffledRegions, setShuffledRegions] = useState(() =>
    shuffleOptions(detectiveCase.regionOptions),
  );

  // Stage 4: Significance testing & record length explorer (max 2 attempts)
  const [statMethod, setStatMethod] = useState<StatMethod>('ols');
  const [useExtendedRecord, setUseExtendedRecord] = useState(false);
  const [playerVerdict, setPlayerVerdict] = useState<SignificanceVerdict | null>(null);
  const [verdictAttempts, setVerdictAttempts] = useState(0);
  const [verdictFeedback, setVerdictFeedback] = useState<string | null>(null);

  // Reset per-case state when detectiveCase changes
  useEffect(() => {
    setStage(1);
    setSelectedVarId(null);
    setRejectedVarIds([]);
    setVarAttempts(0);
    setVarConfirmed(false);
    setVarFailed(false);

    setSelectedRegionId(null);
    setRejectedRegionIds([]);
    setRegionAttempts(0);
    setRegionConfirmed(false);
    setRegionFailed(false);

    setShuffledVariables(shuffleOptions(detectiveCase.variableOptions));
    setShuffledRegions(shuffleOptions(detectiveCase.regionOptions));

    setShowRaw(true);
    setShowSeasonal(false);
    setShowDeseasonalized(false);
    setShowTrendLine(false);
    setPredictedDirection(null);
    setEstimatedSlope(0);
    setSlopeTouched(false);

    setStatMethod('ols');
    setUseExtendedRecord(false);
    setPlayerVerdict(null);
    setVerdictAttempts(0);
    setVerdictFeedback(null);
  }, [detectiveCase]);

  const activeYears =
    useExtendedRecord && detectiveCase.extendedYears
      ? detectiveCase.extendedYears
      : detectiveCase.seriesConfig.numYears;

  const primarySeries = useMemo(
    () => generateTimeSeries(detectiveCase.seriesConfig),
    [detectiveCase.seriesConfig],
  );

  const displayedSeries = useMemo(
    () => generateTimeSeries(detectiveCase.seriesConfig, activeYears),
    [detectiveCase.seriesConfig, activeYears],
  );

  const selectedVar = detectiveCase.variableOptions.find(
    (v) => v.id === selectedVarId,
  );
  const selectedRegion = detectiveCase.regionOptions.find(
    (r) => r.id === selectedRegionId,
  );

  const handleSelectVariable = (varId: string) => {
    if (varConfirmed || varFailed || rejectedVarIds.includes(varId)) return;
    const option = detectiveCase.variableOptions.find((v) => v.id === varId);
    if (!option) return;

    const nextAttempt = varAttempts + 1;
    setVarAttempts(nextAttempt);

    if (option.quality === 'distractor') {
      soundEngine.playDistractor();
      const nextRejected = [...rejectedVarIds, varId];
      setRejectedVarIds(nextRejected);
      if (nextRejected.length >= MAX_LAB_ATTEMPTS) {
        setVarFailed(true);
        setVarConfirmed(true);
        setSelectedVarId(detectiveCase.targetVariableId);
      } else {
        setSelectedVarId(varId);
        setVarConfirmed(false);
      }
    } else {
      soundEngine.playSuccess();
      setSelectedVarId(varId);
      setVarConfirmed(true);
    }
  };

  const handleSelectRegion = (regionId: string) => {
    if (regionConfirmed || regionFailed || rejectedRegionIds.includes(regionId)) return;
    const region = detectiveCase.regionOptions.find((r) => r.id === regionId);
    if (!region) return;

    const nextAttempt = regionAttempts + 1;
    setRegionAttempts(nextAttempt);

    if (!region.isTarget) {
      soundEngine.playDistractor();
      const nextRejected = [...rejectedRegionIds, regionId];
      setRejectedRegionIds(nextRejected);
      if (nextRejected.length >= MAX_LAB_ATTEMPTS) {
        setRegionFailed(true);
        setRegionConfirmed(true);
        setSelectedRegionId(detectiveCase.targetRegionId);
      } else {
        setSelectedRegionId(regionId);
        setRegionConfirmed(false);
      }
    } else {
      soundEngine.playSuccess();
      setSelectedRegionId(regionId);
      setRegionConfirmed(true);
    }
  };

  const handleSubmitVerdict = () => {
    if (!playerVerdict || !predictedDirection) return;

    const actualSlope = primarySeries.deseasonalizedStats.ols.slopePerYear;
    const isCorrect = playerVerdict === detectiveCase.expectedVerdict;

    if (!isCorrect) {
      const nextAttempts = verdictAttempts + 1;
      setVerdictAttempts(nextAttempts);
      soundEngine.playDistractor();
      if (nextAttempts < MAX_LAB_ATTEMPTS) {
        const pVal = primarySeries.deseasonalizedStats.ols.pValue;
        setVerdictFeedback(
          `1 attempt left (1/2 used)! ${
            pVal < 0.05
              ? `Check the numbers on the left: p = ${formatPValue(pVal)} (< 0.05, green) and the 95% range stays away from 0.`
              : `Check the numbers on the left: p = ${formatPValue(pVal)} (≥ 0.05, yellow) and the 95% range crosses 0.`
          }`,
        );
        return;
      }

      const failScore = scoreCaseAttempt({
        variableAttempts: Math.max(1, varAttempts),
        regionAttempts: Math.max(1, regionAttempts),
        predictedDirection,
        expectedDirection: detectiveCase.expectedDirection,
        estimatedSlope,
        actualSlope,
        slopeTolerance: detectiveCase.slopeTolerance,
        verdict: playerVerdict,
        expectedVerdict: detectiveCase.expectedVerdict,
        variableFailed: varFailed,
        regionFailed,
        verdictFailed: true,
      });
      onCaseSolved(failScore);
      return;
    }

    soundEngine.playCaseSolved();
    const score = scoreCaseAttempt({
      variableAttempts: Math.max(1, varAttempts),
      regionAttempts: Math.max(1, regionAttempts),
      predictedDirection,
      expectedDirection: detectiveCase.expectedDirection,
      estimatedSlope,
      actualSlope,
      slopeTolerance: detectiveCase.slopeTolerance,
      verdict: playerVerdict,
      expectedVerdict: detectiveCase.expectedVerdict,
      variableFailed: varFailed,
      regionFailed,
      verdictFailed: false,
    });
    onCaseSolved(score);
  };

  // Keyboard shortcuts 1-5 for Stage 1/2 option selection
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const num = Number(e.key);
      if (num >= 1 && num <= 5) {
        if (stage === 1 && shuffledVariables[num - 1]) {
          handleSelectVariable(shuffledVariables[num - 1].id);
        } else if (stage === 2 && shuffledRegions[num - 1]) {
          handleSelectRegion(shuffledRegions[num - 1].id);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const statsToDisplay = displayedSeries.deseasonalizedStats;
  const rawStatsDisplay = displayedSeries.rawStats;

  // Compute CI bar bounds for Stage 4 visual gauge
  const ciBounds = useMemo(() => {
    const { ci95Low, ci95High, slopePerYear } = statsToDisplay.ols;
    const maxAbs = Math.max(
      Math.abs(ci95Low),
      Math.abs(ci95High),
      Math.abs(slopePerYear),
      detectiveCase.slopeSliderMax * 0.5,
      0.01,
    );
    const toPct = (v: number) => 50 + (v / (maxAbs * 1.15)) * 45;
    return {
      leftPct: Math.max(3, Math.min(97, toPct(ci95Low))),
      rightPct: Math.max(3, Math.min(97, toPct(ci95High))),
      midPct: Math.max(3, Math.min(97, toPct(slopePerYear))),
      crossesZero: ci95Low <= 0 && ci95High >= 0,
    };
  }, [statsToDisplay.ols, detectiveCase.slopeSliderMax]);

  const stages: Array<{ id: StageId; label: string; icon: typeof Satellite }> = [
    { id: 1, label: '1. Variable', icon: Satellite },
    { id: 2, label: '2. Region', icon: Compass },
    { id: 3, label: '3. Time Series', icon: LineChart },
    { id: 4, label: '4. Significance', icon: FlaskConical },
  ];

  const canReachStage = (target: StageId) => {
    if (target === 1) return true;
    if (target === 2) return varConfirmed;
    if (target === 3) return varConfirmed && regionConfirmed;
    if (target === 4) return varConfirmed && regionConfirmed && predictedDirection !== null;
    return false;
  };

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 pb-6 pt-2.5 sm:px-6">
      {/* Case Briefing & 4-Stage Stepper */}
      <section className="flex flex-col justify-between gap-3 border-b border-slate-800 pb-3 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-mono font-semibold text-cyan-400">
              {detectiveCase.caseNumber}
            </span>
            <span aria-hidden="true">·</span>
            <span>{detectiveCase.difficultyLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{detectiveCase.seriesConfig.numYears}-Year Monthly Satellite Record</span>
            {solvedScore && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono font-semibold text-emerald-400">
                  Solved ({solvedScore.total}/100)
                </span>
              </>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
            {detectiveCase.question}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
            {detectiveCase.briefing}
          </p>
        </div>

        {/* Interactive Stage Stepper */}
        <nav
          aria-label="Investigation Stages"
          className="grid w-full grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-[#11192b] p-1 sm:flex sm:w-auto sm:flex-wrap lg:self-end"
        >
          {stages.map((s) => {
            const Icon = s.icon;
            const unlocked = canReachStage(s.id);
            const active = stage === s.id;
            return (
              <button
                key={s.id}
                type="button"
                disabled={!unlocked}
                onClick={() => {
                  if (unlocked) {
                    soundEngine.playSelect();
                    setStage(s.id);
                  }
                }}
                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : unlocked
                      ? 'text-slate-200 hover:bg-slate-800/80'
                      : 'cursor-not-allowed text-slate-600'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {s.label}
              </button>
            );
          })}
        </nav>
      </section>

      {/* STAGE 1: PICK A VARIABLE */}
      {stage === 1 && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-slate-100">
                Stage 1: Pick What to Measure
              </h2>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                Attempts left: {Math.max(0, MAX_LAB_ATTEMPTS - rejectedVarIds.length)}/{MAX_LAB_ATTEMPTS} · Press 1–{shuffledVariables.length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {shuffledVariables.map((option, idx) => {
                const isSelected = selectedVarId === option.id;
                const isRejected = rejectedVarIds.includes(option.id);
                const isGoodSelected = isSelected && option.quality !== 'distractor';
                const isLockedOut = varConfirmed || varFailed || isRejected;

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isLockedOut}
                    onClick={() => handleSelectVariable(option.id)}
                    className={`flex min-h-[120px] flex-col justify-between rounded-lg border p-4 text-left transition-colors ${
                      isGoodSelected
                        ? 'border-emerald-500/70 bg-emerald-950/25'
                        : isRejected
                          ? 'cursor-not-allowed border-rose-500/50 bg-rose-950/20 opacity-65'
                          : varConfirmed
                            ? 'cursor-not-allowed border-slate-800 bg-[#0d1424] opacity-60'
                            : 'border-slate-800 bg-[#11192b] hover:border-cyan-500/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-cyan-400">
                          {idx + 1}. {option.source} · {option.unit}
                        </span>
                        {isGoodSelected && (
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            {varFailed ? 'Answer Revealed' : 'Valid'}
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-rose-400">
                            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            Wrong
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-base font-semibold text-slate-100">
                        {option.name}
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                        {option.definition}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#11192b] p-5 lg:col-span-4">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-slate-400">
                Instrument Evaluation
              </div>
              {!selectedVar ? (
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Pick the satellite measurement that directly answers the question. You have 2 attempts per question!
                </p>
              ) : (
                <div className="mt-3">
                  <div
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                      varFailed || selectedVar.quality === 'distractor'
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {varFailed ? (
                      <>
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        0/2 Attempts Left · Showing {selectedVar.name}
                      </>
                    ) : selectedVar.quality === 'distractor' ? (
                      <>
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        1 Attempt Left: Not {selectedVar.name}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        {selectedVar.quality === 'optimal'
                          ? 'Optimal Variable'
                          : 'Acceptable Variable'}
                        : {selectedVar.name}
                      </>
                    )}
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-200">
                    {varFailed
                      ? `Out of attempts (2/2 used — 0 pts). Correct Option: ${selectedVar.name} (${selectedVar.source}). ${selectedVar.feedback}`
                      : selectedVar.feedback}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-slate-800 pt-4">
              <button
                type="button"
                disabled={!varConfirmed}
                onClick={() => {
                  soundEngine.playSelect();
                  setStage(2);
                }}
                className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  varConfirmed
                    ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                    : 'cursor-not-allowed bg-slate-800 text-slate-500'
                }`}
              >
                Continue to Region Selection
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </aside>
        </section>
      )}

      {/* STAGE 2: PICK A REGION */}
      {stage === 2 && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-7">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-slate-100">
                Stage 2: Pick the Place on the Map
              </h2>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                Attempts left: {Math.max(0, MAX_LAB_ATTEMPTS - rejectedRegionIds.length)}/{MAX_LAB_ATTEMPTS}
              </span>
            </div>

            <WorldRegionMap
              regions={shuffledRegions}
              selectedRegionId={selectedRegionId}
              rejectedRegionIds={rejectedRegionIds}
              onSelectRegion={handleSelectRegion}
              theme={theme}
            />

            {selectedRegion && (
              <div
                className={`rounded-lg border p-4 ${
                  !regionFailed && selectedRegion.isTarget
                    ? 'border-emerald-500/60 bg-emerald-950/20'
                    : 'border-rose-500/60 bg-rose-950/20'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {regionFailed ? (
                    <span className="inline-flex items-center gap-1.5 text-rose-400">
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      0/2 Attempts Left · Correct Place: {selectedRegion.name} (0 pts)
                    </span>
                  ) : selectedRegion.isTarget ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Target Confirmed: {selectedRegion.name}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-rose-400">
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      1 Attempt Left · Wrong Place: {selectedRegion.name}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
                  {regionFailed
                    ? `Out of attempts (2/2 used — 0 pts). Correct Option: ${selectedRegion.name} (${selectedRegion.coordinatesLabel}). ${selectedRegion.feedback}`
                    : selectedRegion.feedback}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between gap-4 lg:col-span-5">
            <div className="flex flex-col gap-2.5">
              {shuffledRegions.map((region, idx) => {
                const isSelected = selectedRegionId === region.id;
                const isRejected = rejectedRegionIds.includes(region.id);
                const isTargetSelected = isSelected && region.isTarget;
                const isLockedOut = regionConfirmed || regionFailed || isRejected;

                return (
                  <button
                    key={region.id}
                    type="button"
                    disabled={isLockedOut}
                    onClick={() => handleSelectRegion(region.id)}
                    className={`rounded-lg border p-3.5 text-left transition-colors ${
                      isTargetSelected
                        ? 'border-emerald-500/70 bg-emerald-950/25'
                        : isRejected
                          ? 'cursor-not-allowed border-rose-500/50 bg-rose-950/20 opacity-65'
                          : regionConfirmed
                            ? 'cursor-not-allowed border-slate-800 bg-[#0d1424] opacity-60'
                            : 'border-slate-800 bg-[#11192b] hover:border-cyan-500/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-100">
                        {idx + 1}. {region.name}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        {region.coordinatesLabel}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-cyan-400">
                      {region.biomeLabel}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">
                      {region.characteristics}
                    </p>
                    <p className="mt-1 text-xs italic text-slate-400">
                      Hint: {region.hint}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setStage(1)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-700 px-3.5 py-2 text-sm font-medium text-slate-300 hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </button>
              <button
                type="button"
                disabled={!regionConfirmed}
                onClick={() => {
                  soundEngine.playSelect();
                  setStage(3);
                }}
                className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  regionConfirmed
                    ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                    : 'cursor-not-allowed bg-slate-800 text-slate-500'
                }`}
              >
                Inspect Satellite Time Series
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* STAGE 3: READ THE TIME SERIES */}
      {stage === 3 && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-3 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-100">
                Stage 3: Read the Time Chart
              </h2>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  aria-pressed={showRaw}
                  onClick={() => {
                    soundEngine.playToggle();
                    setShowRaw((v) => !v);
                  }}
                  className={`min-h-[36px] rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    showRaw
                      ? 'border-sky-500/70 bg-sky-500/15 text-sky-200'
                      : 'border-slate-800 bg-[#11192b] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Raw Monthly
                </button>
                <button
                  type="button"
                  aria-pressed={showSeasonal}
                  onClick={() => {
                    soundEngine.playToggle();
                    setShowSeasonal((v) => !v);
                  }}
                  className={`min-h-[36px] rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    showSeasonal
                      ? 'border-amber-500/70 bg-amber-500/15 text-amber-200'
                      : 'border-slate-800 bg-[#11192b] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Seasonal Cycle
                </button>
                <button
                  type="button"
                  aria-pressed={showDeseasonalized}
                  onClick={() => {
                    soundEngine.playToggle();
                    setShowDeseasonalized((v) => !v);
                  }}
                  className={`min-h-[36px] rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    showDeseasonalized
                      ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200'
                      : 'border-slate-800 bg-[#11192b] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Deseasonalized Series
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playToggle();
                    setShowRaw(false);
                    setShowSeasonal(false);
                    setShowDeseasonalized(true);
                    setShowTrendLine(true);
                  }}
                  className="min-h-[36px] rounded-md border border-slate-700 bg-[#11192b] px-2.5 py-1 text-xs font-medium text-cyan-300 transition-colors hover:border-cyan-400 whitespace-nowrap shrink-0"
                >
                  Zoom Deseasonalized
                </button>
                <button
                  type="button"
                  aria-pressed={showTrendLine}
                  onClick={() => {
                    soundEngine.playToggle();
                    setShowTrendLine((v) => !v);
                  }}
                  className={`min-h-[36px] rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    showTrendLine
                      ? 'border-rose-500/70 bg-rose-500/15 text-rose-200'
                      : 'border-slate-800 bg-[#11192b] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Fitted Trend Line
                </button>
              </div>
            </div>

            <TimeSeriesChart
              points={primarySeries.points}
              unit={detectiveCase.unit}
              showRaw={showRaw}
              showSeasonal={showSeasonal}
              showDeseasonalized={showDeseasonalized}
              showTrendLine={showTrendLine}
              estimatedSlope={slopeTouched ? estimatedSlope : null}
              actualSlope={primarySeries.deseasonalizedStats.ols.slopePerYear}
              theme={theme}
            />

            <p className="text-xs leading-relaxed text-slate-400">
              Tip: Toggle <strong className="text-amber-300">Seasonal Cycle</strong> and{' '}
              <strong className="text-emerald-300">Deseasonalized Series</strong> to remove repeating summer/winter swings so the true trend is easy to spot.
            </p>
          </div>

          <aside className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#11192b] p-5 lg:col-span-4">
            <div className="space-y-5">
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-slate-400">
                  1. Which way is the line going?
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  After removing seasons, is the overall trend going up, down, or staying flat?
                </p>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {(['rising', 'falling', 'flat'] as const).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      aria-pressed={predictedDirection === dir}
                      onClick={() => {
                        soundEngine.playSelect();
                        setPredictedDirection(dir);
                      }}
                      className={`min-h-[42px] rounded-lg border px-2 py-2 text-xs font-semibold capitalize transition-colors whitespace-nowrap shrink-0 ${
                        predictedDirection === dir
                          ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                          : 'border-slate-800 bg-[#0b111e] text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="slope-estimate-slider"
                    className="font-mono text-xs uppercase tracking-wider text-slate-400"
                  >
                    2. Guess the Yearly Change
                  </label>
                  <span className="font-mono text-sm font-semibold text-violet-300 tabular-nums">
                    {estimatedSlope >= 0 ? '+' : ''}
                    {estimatedSlope.toFixed(
                      detectiveCase.slopeSliderStep < 0.01 ? 3 : 1,
                    )}{' '}
                    {detectiveCase.unitPerYear}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Move the slider to line up your dashed purple line with the trend.
                </p>
                <input
                  id="slope-estimate-slider"
                  type="range"
                  min={detectiveCase.slopeSliderMin}
                  max={detectiveCase.slopeSliderMax}
                  step={detectiveCase.slopeSliderStep}
                  value={estimatedSlope}
                  onChange={(e) => {
                    setSlopeTouched(true);
                    setEstimatedSlope(parseFloat(e.target.value));
                  }}
                  className="lab-slider mt-3 w-full"
                />
                <div className="mt-1.5 flex justify-between font-mono text-[11px] text-slate-500 tabular-nums">
                  <span>{detectiveCase.slopeSliderMin}</span>
                  <span>0</span>
                  <span>+{detectiveCase.slopeSliderMax}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setStage(2)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-700 px-3.5 py-2 text-sm font-medium text-slate-300 hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </button>
              <button
                type="button"
                disabled={predictedDirection === null}
                onClick={() => {
                  soundEngine.playSelect();
                  setShowDeseasonalized(true);
                  setShowTrendLine(true);
                  setStage(4);
                }}
                className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  predictedDirection !== null
                    ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                    : 'cursor-not-allowed bg-slate-800 text-slate-500'
                }`}
              >
                Test Significance
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </aside>
        </section>
      )}

      {/* STAGE 4: TEST SIGNIFICANCE */}
      {stage === 4 && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-100">
                Stage 4: Check If the Trend Is Real
              </h2>

              {/* Test Switcher: OLS t-test vs Mann-Kendall */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#11192b] p-1">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playToggle();
                    setStatMethod('ols');
                  }}
                  className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    statMethod === 'ols'
                      ? 'bg-cyan-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  OLS t-test on Slope
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playToggle();
                    setStatMethod('mann-kendall');
                  }}
                  className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    statMethod === 'mann-kendall'
                      ? 'bg-cyan-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Mann-Kendall Test
                </button>
              </div>
            </div>

            {/* Record Length Simulator when case supports extended record */}
            {detectiveCase.extendedYears && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/35 bg-amber-950/15 px-4 py-3">
                <div>
                  <div className="font-mono text-xs uppercase tracking-wider text-amber-300">
                    Record Length Explorer
                  </div>
                  <p className="mt-0.5 text-xs text-slate-300">
                    Test how adding more years of satellite observations changes statistical power. (Your verdict below still evaluates the official {detectiveCase.seriesConfig.numYears}-year record.)
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0b111e] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playToggle();
                      setUseExtendedRecord(false);
                    }}
                    className={`min-h-[34px] rounded-md px-3 py-1 font-mono text-xs whitespace-nowrap shrink-0 ${
                      !useExtendedRecord
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {detectiveCase.seriesConfig.numYears} yr (Official)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playToggle();
                      setUseExtendedRecord(true);
                    }}
                    className={`min-h-[34px] rounded-md px-3 py-1 font-mono text-xs whitespace-nowrap shrink-0 ${
                      useExtendedRecord
                        ? 'bg-emerald-400 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {detectiveCase.extendedYears} yr (Extended)
                  </button>
                </div>
              </div>
            )}

            {/* Primary Statistics Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-[#11192b] p-4">
                <div className="text-xs text-slate-400">
                  {statMethod === 'ols' ? 'OLS Slope' : "Theil-Sen Median Slope"}
                </div>
                <div className="mt-1 font-mono text-2xl font-semibold text-slate-50 tabular-nums">
                  {(statMethod === 'ols'
                    ? statsToDisplay.ols.slopePerYear
                    : statsToDisplay.mk.senSlopePerYear) >= 0
                    ? '+'
                    : ''}
                  {(statMethod === 'ols'
                    ? statsToDisplay.ols.slopePerYear
                    : statsToDisplay.mk.senSlopePerYear
                  ).toFixed(3)}
                </div>
                <div className="mt-0.5 font-mono text-xs text-slate-400">
                  {detectiveCase.unitPerYear}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#11192b] p-4">
                <div className="text-xs text-slate-400">
                  {statMethod === 'ols' ? 't-test p-value' : 'Mann-Kendall p-value'}
                </div>
                <div
                  className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
                    (statMethod === 'ols'
                      ? statsToDisplay.ols.pValue
                      : statsToDisplay.mk.pValue) < 0.05
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                  }`}
                >
                  {formatPValue(
                    statMethod === 'ols'
                      ? statsToDisplay.ols.pValue
                      : statsToDisplay.mk.pValue,
                  )}
                </div>
                <div className="mt-0.5 font-mono text-xs text-slate-400">
                  {statMethod === 'ols'
                    ? `t = ${statsToDisplay.ols.tStat.toFixed(2)} (df ${statsToDisplay.ols.df})`
                    : `τ = ${statsToDisplay.mk.tau.toFixed(3)}, Z = ${statsToDisplay.mk.zStat.toFixed(2)}`}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#11192b] p-4">
                <div className="text-xs text-slate-400">95% Range (CI)</div>
                <div className="mt-1 font-mono text-base font-semibold text-slate-100 tabular-nums">
                  [{statsToDisplay.ols.ci95Low.toFixed(3)},{' '}
                  {statsToDisplay.ols.ci95High.toFixed(3)}]
                </div>
                <div className="mt-1 font-mono text-xs text-slate-400">
                  {ciBounds.crossesZero
                    ? '▲ Includes 0 (not sure yet)'
                    : '● Away from 0 (real change)'}
                </div>
              </div>
            </div>

            {/* 95% Confidence Interval Visual Gauge */}
            <div className="rounded-lg border border-slate-800 bg-[#11192b] p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-300">
                  95% Slope Range vs. Zero (0 = No Change)
                </span>
                <span className="font-mono text-slate-400 tabular-nums">
                  Raw p = {formatPValue(rawStatsDisplay.ols.pValue)} → Deseasonalized p ={' '}
                  {formatPValue(statsToDisplay.ols.pValue)}
                </span>
              </div>

              <div className="relative mt-4 h-8 rounded bg-[#080d18] px-2">
                {/* Zero vertical reference */}
                <div
                  className="absolute bottom-0 top-0 w-px bg-slate-500"
                  style={{ left: '50%' }}
                />
                <span
                  className="absolute -bottom-5 -translate-x-1/2 font-mono text-[11px] text-slate-400"
                  style={{ left: '50%' }}
                >
                  0 ({detectiveCase.unitPerYear})
                </span>

                {/* Confidence whisker bar */}
                <div
                  className={`absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full ${
                    ciBounds.crossesZero ? 'bg-amber-400/80' : 'bg-emerald-400'
                  }`}
                  style={{
                    left: `${ciBounds.leftPct}%`,
                    width: `${Math.max(2, ciBounds.rightPct - ciBounds.leftPct)}%`,
                  }}
                />
                {/* Point estimate dot */}
                <div
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#080d18] bg-cyan-400"
                  style={{ left: `${ciBounds.midPct}%` }}
                />
              </div>

              <p className="mt-7 text-xs leading-relaxed text-slate-300">
                {detectiveCase.seasonalMaskNote}
              </p>
            </div>

            {/* Compact deseasonalized chart preview */}
            <TimeSeriesChart
              points={displayedSeries.points}
              unit={detectiveCase.unit}
              showRaw={false}
              showSeasonal={false}
              showDeseasonalized={true}
              showTrendLine={true}
              actualSlope={statsToDisplay.ols.slopePerYear}
              compact={true}
              theme={theme}
            />
          </div>

          {/* Decision Column */}
          <aside className="flex flex-col gap-5 self-start rounded-lg border border-slate-800 bg-[#11192b] p-4 lg:col-span-5">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 font-mono text-xs uppercase tracking-wider text-cyan-400">
                  <span>Detective Decision</span>
                  <span className="text-slate-400 tabular-nums">
                    Attempts left: {Math.max(0, MAX_LAB_ATTEMPTS - verdictAttempts)}/{MAX_LAB_ATTEMPTS}
                  </span>
                </div>
                <h3 className="mt-1 text-lg font-semibold text-slate-100">
                  Is there a real trend in this{' '}
                  {detectiveCase.seriesConfig.numYears}-year record?
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                  Quick rule: If <strong className="text-emerald-300">p &lt; 0.05</strong> (green) and the 95% range does not cross 0, the trend is real—not just random luck.
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  aria-pressed={playerVerdict === 'significant'}
                  onClick={() => {
                    soundEngine.playSelect();
                    setPlayerVerdict('significant');
                    setVerdictFeedback(null);
                  }}
                  className={`min-h-[60px] rounded-lg border p-3.5 text-left transition-colors ${
                    playerVerdict === 'significant'
                      ? 'border-cyan-400 bg-cyan-500/15 text-slate-50'
                      : 'border-slate-800 bg-[#0b111e] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-semibold">
                    Yes — Real Trend (p &lt; 0.05)
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    The 95% range stays away from 0, so this change is unlikely to be random luck.
                  </div>
                </button>

                <button
                  type="button"
                  aria-pressed={playerVerdict === 'not_significant'}
                  onClick={() => {
                    soundEngine.playSelect();
                    setPlayerVerdict('not_significant');
                    setVerdictFeedback(null);
                  }}
                  className={`min-h-[60px] rounded-lg border p-3.5 text-left transition-colors ${
                    playerVerdict === 'not_significant'
                      ? 'border-cyan-400 bg-cyan-500/15 text-slate-50'
                      : 'border-slate-800 bg-[#0b111e] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-semibold">
                    No — Not Proven Yet (p ≥ 0.05)
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    The line is flat, or weather swings are too noisy to rule out chance yet.
                  </div>
                </button>
              </div>

              {verdictFeedback && (
                <div className="rounded-lg border border-rose-500/60 bg-rose-950/25 p-3.5 text-xs leading-relaxed text-rose-200">
                  {verdictFeedback}
                </div>
              )}

              <div className="rounded-lg border border-slate-800 bg-[#0b111e] p-3.5 text-xs leading-relaxed text-slate-300">
                <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  Your Stage 3 Prediction Summary
                </div>
                <div className="mt-1.5 flex items-center justify-between font-mono tabular-nums">
                  <span>Predicted Direction:</span>
                  <span className="font-semibold capitalize text-cyan-300">
                    {predictedDirection}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between font-mono tabular-nums">
                  <span>Your Slope Estimate:</span>
                  <span className="font-semibold text-violet-300">
                    {estimatedSlope >= 0 ? '+' : ''}
                    {estimatedSlope.toFixed(
                      detectiveCase.slopeSliderStep < 0.01 ? 3 : 1,
                    )}{' '}
                    {detectiveCase.unitPerYear}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setStage(3)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-700 px-3.5 py-2 text-sm font-medium text-slate-300 hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </button>
              <button
                type="button"
                disabled={playerVerdict === null}
                onClick={() => {
                  setUseExtendedRecord(false);
                  handleSubmitVerdict();
                }}
                className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  playerVerdict !== null
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    : 'cursor-not-allowed bg-slate-800 text-slate-500'
                }`}
              >
                Submit Final Verdict
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}
