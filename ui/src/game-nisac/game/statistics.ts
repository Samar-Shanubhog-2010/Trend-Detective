export interface MonthlyDataPoint {
  index: number;
  year: number;
  month: number; // 1..12
  decimalYear: number;
  label: string; // e.g. "2008-01"
  raw: number;
  seasonal: number;
  deseasonalized: number;
  trendLineRaw: number;
  trendLineDeseasonalized: number;
}

export interface SeriesConfig {
  seed: number;
  startYear: number;
  numYears: number;
  baseline: number;
  slopePerYear: number;
  seasonalAmplitude: number;
  seasonalHarmonic2?: number; // optional secondary semiannual shape
  seasonalPhaseMonths: number; // month of peak (1..12)
  noiseStd: number;
  autocorrelation?: number; // AR(1) phi in [0, 0.6] for realistic monthly persistence
  minClamp?: number;
}

export interface OlsResult {
  slopePerYear: number;
  intercept: number;
  seSlope: number;
  tStat: number;
  df: number;
  pValue: number;
  ci95Low: number;
  ci95High: number;
  rSquared: number;
}

export interface MannKendallResult {
  sStat: number;
  varS: number;
  zStat: number;
  tau: number;
  pValue: number;
  senSlopePerYear: number;
}

export interface GeneratedTimeSeries {
  points: MonthlyDataPoint[];
  rawStats: {
    ols: OlsResult;
    mk: MannKendallResult;
  };
  deseasonalizedStats: {
    ols: OlsResult;
    mk: MannKendallResult;
  };
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Deterministic 32-bit PRNG (Mulberry32)
 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller standard normal sample
 */
function sampleNormal(rng: () => number): number {
  let u1 = rng();
  const u2 = rng();
  while (u1 <= 1e-12) u1 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Natural log of Gamma function via Lanczos approximation
 */
function logGamma(z: number): number {
  const g = 7;
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  const zm = z - 1;
  let x = p[0];
  for (let i = 1; i < g + 2; i++) {
    x += p[i] / (zm + i);
  }
  const t = zm + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (zm + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Continued fraction for regularized incomplete beta function I_x(a, b)
 */
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

export function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/**
 * Two-tailed p-value from Student's t statistic with df degrees of freedom
 */
export function studentTTwoTailedP(tAbs: number, df: number): number {
  if (df <= 0 || !Number.isFinite(tAbs)) return 1;
  if (tAbs === 0) return 1;
  const x = df / (df + tAbs * tAbs);
  const p = regularizedIncompleteBeta(x, df / 2, 0.5);
  return Math.max(0, Math.min(1, p));
}

/**
 * Inverse critical t-value for 95% two-tailed confidence interval (alpha = 0.05) via bisection
 */
export function studentTCritical95(df: number): number {
  if (df <= 1) return 12.706;
  let lo = 1.9;
  let hi = 4.5;
  if (df < 5) hi = 13.0;
  for (let i = 0; i < 40; i++) {
    const mid = 0.5 * (lo + hi);
    const p = studentTTwoTailedP(mid, df);
    if (p > 0.05) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/**
 * Standard normal error function approximation & two-tailed p-value
 */
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function normalTwoTailedP(zAbs: number): number {
  if (!Number.isFinite(zAbs)) return 1;
  return Math.max(0, Math.min(1, 1 - erf(zAbs / Math.SQRT2)));
}

/**
 * Ordinary Least Squares linear regression on (xYears, values)
 */
export function computeOlsTrend(xYears: number[], values: number[]): OlsResult {
  const n = Math.min(xYears.length, values.length);
  if (n < 3) {
    return {
      slopePerYear: 0,
      intercept: values[0] ?? 0,
      seSlope: 0,
      tStat: 0,
      df: 1,
      pValue: 1,
      ci95Low: 0,
      ci95High: 0,
      rSquared: 0,
    };
  }

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xYears[i];
    sumY += values[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xYears[i] - meanX;
    const dy = values[i] - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }

  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = meanY - slope * meanX;

  let sse = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * xYears[i];
    const err = values[i] - pred;
    sse += err * err;
  }

  const df = n - 2;
  const mse = sse / df;
  const seSlope = sxx > 0 ? Math.sqrt(mse / sxx) : 0;
  let tStat = 0;
  let pValue = 1;
  if (seSlope > 1e-12) {
    tStat = slope / seSlope;
    pValue = studentTTwoTailedP(Math.abs(tStat), df);
  } else if (Math.abs(slope) > 1e-12) {
    tStat = slope > 0 ? 1e9 : -1e9;
    pValue = 0;
  }
  const tCrit = studentTCritical95(df);
  const ci95Low = slope - tCrit * seSlope;
  const ci95High = slope + tCrit * seSlope;
  const rSquared = syy > 1e-12 ? Math.max(0, Math.min(1, 1 - sse / syy)) : 0;

  return {
    slopePerYear: slope,
    intercept,
    seSlope,
    tStat,
    df,
    pValue,
    ci95Low,
    ci95High,
    rSquared,
  };
}

/**
 * Non-parametric Mann-Kendall trend test + Theil-Sen median slope
 */
export function computeMannKendall(xYears: number[], values: number[]): MannKendallResult {
  const n = Math.min(xYears.length, values.length);
  if (n < 4) {
    return {
      sStat: 0,
      varS: 0,
      zStat: 0,
      tau: 0,
      pValue: 1,
      senSlopePerYear: 0,
    };
  }

  let s = 0;
  const pairwiseSlopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const diff = values[j] - values[i];
      if (diff > 1e-12) s += 1;
      else if (diff < -1e-12) s -= 1;

      const dt = xYears[j] - xYears[i];
      if (dt > 0) {
        pairwiseSlopes.push(diff / dt);
      }
    }
  }

  // Tie correction
  const sorted = [...values].sort((a, b) => a - b);
  let tieTerm = 0;
  let i = 0;
  while (i < n) {
    let j = i + 1;
    while (j < n && Math.abs(sorted[j] - sorted[i]) <= 1e-12) j++;
    const t = j - i;
    if (t > 1) {
      tieTerm += t * (t - 1) * (2 * t + 5);
    }
    i = j;
  }

  const varS = (n * (n - 1) * (2 * n + 5) - tieTerm) / 18;
  let z = 0;
  if (varS > 0) {
    if (s > 0) z = (s - 1) / Math.sqrt(varS);
    else if (s < 0) z = (s + 1) / Math.sqrt(varS);
  }
  const pValue = normalTwoTailedP(Math.abs(z));
  const tau = (2 * s) / (n * (n - 1));

  pairwiseSlopes.sort((a, b) => a - b);
  const mid = Math.floor(pairwiseSlopes.length / 2);
  const senSlope =
    pairwiseSlopes.length === 0
      ? 0
      : pairwiseSlopes.length % 2 === 1
        ? pairwiseSlopes[mid]
        : 0.5 * (pairwiseSlopes[mid - 1] + pairwiseSlopes[mid]);

  return {
    sStat: s,
    varS,
    zStat: z,
    tau,
    pValue,
    senSlopePerYear: senSlope,
  };
}

/**
 * Generates monthly time series, computes climatological seasonal cycle (mean per calendar month
 * around the overall mean), subtracts it to form deseasonalized anomalies + baseline mean,
 * and computes both raw and deseasonalized OLS + Mann-Kendall statistics.
 */
export function generateTimeSeries(
  config: SeriesConfig,
  overrideYears?: number,
): GeneratedTimeSeries {
  const numYears = overrideYears ?? config.numYears;
  const totalMonths = numYears * 12;
  const rng = createRng(config.seed);
  const phi = config.autocorrelation ?? 0.2;

  const rawValues: number[] = [];
  const xYears: number[] = [];
  let prevEps = 0;

  for (let idx = 0; idx < totalMonths; idx++) {
    const monthIndex = idx % 12; // 0..11
    const tYears = idx / 12;

    const angle = (2 * Math.PI * (monthIndex + 1 - config.seasonalPhaseMonths)) / 12;
    const harmonic2 = config.seasonalHarmonic2 ?? 0;
    const seasonalSignal =
      config.seasonalAmplitude * Math.cos(angle) +
      harmonic2 * config.seasonalAmplitude * Math.cos(2 * angle);

    const innovation = sampleNormal(rng) * config.noiseStd;
    const eps = phi * prevEps + Math.sqrt(1 - phi * phi) * innovation;
    prevEps = eps;

    let value = config.baseline + config.slopePerYear * tYears + seasonalSignal + eps;
    if (config.minClamp !== undefined) {
      value = Math.max(config.minClamp, value);
    }

    rawValues.push(value);
    xYears.push(config.startYear + tYears);
  }

  // Compute empirical 12-month climatology (detrended slightly or mean-centered per month)
  const overallMean = rawValues.reduce((acc, v) => acc + v, 0) / rawValues.length;
  const monthSums = new Array<number>(12).fill(0);
  const monthCounts = new Array<number>(12).fill(0);

  // Use rough initial slope to avoid biasing monthly means when trend is strong
  const roughOls = computeOlsTrend(xYears, rawValues);
  const meanX = xYears.reduce((a, b) => a + b, 0) / xYears.length;

  for (let idx = 0; idx < totalMonths; idx++) {
    const m = idx % 12;
    const detrended = rawValues[idx] - roughOls.slopePerYear * (xYears[idx] - meanX);
    monthSums[m] += detrended;
    monthCounts[m] += 1;
  }

  const monthMeans = monthSums.map((s, m) => s / Math.max(1, monthCounts[m]));
  const meanOfMonthMeans = monthMeans.reduce((a, b) => a + b, 0) / 12;
  const seasonalAnomalyByMonth = monthMeans.map((m) => m - meanOfMonthMeans);

  const deseasonalizedValues = rawValues.map(
    (v, idx) => v - seasonalAnomalyByMonth[idx % 12],
  );

  const rawOls = computeOlsTrend(xYears, rawValues);
  const rawMk = computeMannKendall(xYears, rawValues);

  const desOls = computeOlsTrend(xYears, deseasonalizedValues);
  const desMk = computeMannKendall(xYears, deseasonalizedValues);

  const points: MonthlyDataPoint[] = rawValues.map((raw, idx) => {
    const year = config.startYear + Math.floor(idx / 12);
    const month = (idx % 12) + 1;
    const decimalYear = xYears[idx];
    const seasonal = overallMean + seasonalAnomalyByMonth[idx % 12];
    const deseasonalized = deseasonalizedValues[idx];

    return {
      index: idx,
      year,
      month,
      decimalYear,
      label: `${MONTH_NAMES[month - 1]} ${year}`,
      raw,
      seasonal,
      deseasonalized,
      trendLineRaw: rawOls.intercept + rawOls.slopePerYear * decimalYear,
      trendLineDeseasonalized: desOls.intercept + desOls.slopePerYear * decimalYear,
    };
  });

  return {
    points,
    rawStats: { ols: rawOls, mk: rawMk },
    deseasonalizedStats: { ols: desOls, mk: desMk },
  };
}

export type TrendDirection = 'rising' | 'falling' | 'flat';
export type SignificanceVerdict = 'significant' | 'not_significant';

export interface CaseScoreBreakdown {
  variableScore: number;
  regionScore: number;
  directionScore: number;
  rateScore: number;
  significanceScore: number;
  total: number;
  maxTotal: number;
}

export function scoreCaseAttempt(params: {
  variableAttempts: number;
  regionAttempts: number;
  predictedDirection: TrendDirection;
  expectedDirection: TrendDirection;
  estimatedSlope: number;
  actualSlope: number;
  slopeTolerance: number;
  verdict: SignificanceVerdict;
  expectedVerdict: SignificanceVerdict;
  variableFailed?: boolean;
  regionFailed?: boolean;
  verdictFailed?: boolean;
}): CaseScoreBreakdown {
  const variableScore = params.variableFailed
    ? 0
    : params.variableAttempts === 1
      ? 20
      : params.variableAttempts === 2
        ? 12
        : 6;
  const regionScore = params.regionFailed
    ? 0
    : params.regionAttempts === 1
      ? 20
      : params.regionAttempts === 2
        ? 12
        : 6;
  const directionScore = params.predictedDirection === params.expectedDirection ? 20 : 0;

  const slopeError = Math.abs(params.estimatedSlope - params.actualSlope);
  let rateScore = 0;
  if (slopeError <= params.slopeTolerance * 0.5) rateScore = 20;
  else if (slopeError <= params.slopeTolerance) rateScore = 14;
  else if (slopeError <= params.slopeTolerance * 1.75) rateScore = 8;

  const significanceScore =
    !params.verdictFailed && params.verdict === params.expectedVerdict ? 20 : 0;

  return {
    variableScore,
    regionScore,
    directionScore,
    rateScore,
    significanceScore,
    total: variableScore + regionScore + directionScore + rateScore + significanceScore,
    maxTotal: 100,
  };
}

export function formatPValue(p: number): string {
  if (p < 0.0001) return '< 0.0001';
  if (p < 0.01) return p.toFixed(4);
  return p.toFixed(3);
}

export function getDetectiveRank(totalScore: number, maxScore: number): string {
  const ratio = maxScore > 0 ? totalScore / maxScore : 0;
  if (ratio >= 0.9) return 'Lead Earth Systems Investigator';
  if (ratio >= 0.75) return 'Senior Trend Analyst';
  if (ratio >= 0.55) return 'Field Data Detective';
  return 'Junior Satellite Observer';
}

export function shuffleOptions<T>(
  items: readonly T[],
  rng: () => number = Math.random,
): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

