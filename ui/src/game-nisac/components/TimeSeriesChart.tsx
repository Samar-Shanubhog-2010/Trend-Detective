import { useCallback, useMemo, useState } from 'react';
import type { MonthlyDataPoint } from '../game/statistics';

interface TimeSeriesChartProps {
  points: MonthlyDataPoint[];
  unit: string;
  showRaw: boolean;
  showSeasonal: boolean;
  showDeseasonalized: boolean;
  showTrendLine: boolean;
  estimatedSlope?: number | null;
  actualSlope: number;
  compact?: boolean;
  theme?: 'dark' | 'light';
}

export function TimeSeriesChart({
  points,
  unit,
  showRaw,
  showSeasonal,
  showDeseasonalized,
  showTrendLine,
  estimatedSlope,
  compact = false,
  theme = 'dark',
}: TimeSeriesChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const isLight = theme === 'light';

  const width = 820;
  const height = compact ? 235 : 325;
  const pad = { top: 22, right: 24, bottom: 38, left: 62 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const { minVal, maxVal, xMin, xMax } = useMemo(() => {
    const vals: number[] = [];
    for (const p of points) {
      if (showRaw) vals.push(p.raw);
      if (showSeasonal) vals.push(p.seasonal);
      if (showDeseasonalized) vals.push(p.deseasonalized);
      if (showTrendLine) {
        vals.push(showDeseasonalized ? p.trendLineDeseasonalized : p.trendLineRaw);
      }
    }
    if (vals.length === 0) {
      for (const p of points) vals.push(p.raw);
    }
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const span = Math.max(1e-4, rawMax - rawMin);
    const margin = span * 0.12;
    return {
      minVal: rawMin - margin,
      maxVal: rawMax + margin,
      xMin: points[0]?.decimalYear ?? 2010,
      xMax: points[points.length - 1]?.decimalYear ?? 2023,
    };
  }, [points, showRaw, showSeasonal, showDeseasonalized, showTrendLine]);

  const toX = useCallback(
    (decimalYear: number) => {
      const t = xMax > xMin ? (decimalYear - xMin) / (xMax - xMin) : 0;
      return pad.left + t * plotW;
    },
    [pad.left, xMax, xMin, plotW],
  );

  const toY = useCallback(
    (val: number) => {
      const t = maxVal > minVal ? (val - minVal) / (maxVal - minVal) : 0.5;
      return pad.top + plotH - t * plotH;
    },
    [maxVal, minVal, pad.top, plotH],
  );

  const buildPath = useCallback(
    (accessor: (p: MonthlyDataPoint) => number) =>
      points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.decimalYear).toFixed(1)},${toY(accessor(p)).toFixed(1)}`)
        .join(' '),
    [points, toX, toY],
  );

  const rawPath = useMemo(() => buildPath((p) => p.raw), [buildPath]);
  const seasonalPath = useMemo(() => buildPath((p) => p.seasonal), [buildPath]);
  const desPath = useMemo(() => buildPath((p) => p.deseasonalized), [buildPath]);

  const yTicks = useMemo(() => {
    const count = 5;
    return Array.from({ length: count }, (_, i) => {
      const val = minVal + (i / (count - 1)) * (maxVal - minVal);
      return { val, y: toY(val) };
    });
  }, [minVal, maxVal, toY]);

  const yearTicks = useMemo(() => {
    const years = Array.from(new Set(points.map((p) => p.year)));
    const step = years.length > 16 ? 3 : years.length > 10 ? 2 : 1;
    return years.filter((_, idx) => idx % step === 0);
  }, [points]);

  const activePoint = hoverIdx !== null ? points[hoverIdx] : null;

  const formatVal = (v: number) => {
    const span = maxVal - minVal;
    if (span < 2) return v.toFixed(2);
    if (span < 15) return v.toFixed(1);
    return v.toFixed(0);
  };

  const firstPt = points[0];
  const lastPt = points[points.length - 1];

  // Optional player-estimated slope preview line pivoted around series midpoint
  const estimateLine = useMemo(() => {
    if (estimatedSlope === undefined || estimatedSlope === null || !firstPt || !lastPt) return null;
    const midIdx = Math.floor(points.length / 2);
    const midPt = points[midIdx];
    const midYVal = showDeseasonalized ? midPt.trendLineDeseasonalized : midPt.trendLineRaw;
    const yStart = midYVal + estimatedSlope * (firstPt.decimalYear - midPt.decimalYear);
    const yEnd = midYVal + estimatedSlope * (lastPt.decimalYear - midPt.decimalYear);
    return {
      x1: toX(firstPt.decimalYear),
      y1: toY(yStart),
      x2: toX(lastPt.decimalYear),
      y2: toY(yEnd),
    };
  }, [estimatedSlope, firstPt, lastPt, points, showDeseasonalized, toX, toY]);

  const trendYStart = firstPt
    ? toY(showDeseasonalized ? firstPt.trendLineDeseasonalized : firstPt.trendLineRaw)
    : 0;
  const trendYEnd = lastPt
    ? toY(showDeseasonalized ? lastPt.trendLineDeseasonalized : lastPt.trendLineRaw)
    : 0;

  return (
    <div className="relative w-full rounded-lg border border-slate-800 bg-[#080d18] p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Monthly Earth-science satellite time series chart"
        data-testid="timeseries-svg"
        className="block h-auto w-full cursor-crosshair select-none"
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / rect.width) * width;
          const t = Math.max(0, Math.min(1, (relX - pad.left) / plotW));
          const idx = Math.round(t * (points.length - 1));
          setHoverIdx(idx);
        }}
      >
        {/* Horizontal Grid */}
        {yTicks.map((tick, idx) => (
          <g key={`ytick-${idx}`}>
            <line
              x1={pad.left}
              y1={tick.y}
              x2={width - pad.right}
              y2={tick.y}
              stroke={isLight ? '#e2e8f0' : '#162033'}
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={tick.y + 4}
              textAnchor="end"
              fill={isLight ? '#475569' : '#94a3b8'}
              fontSize="11"
              fontFamily="IBM Plex Mono, monospace"
            >
              {formatVal(tick.val)}
            </text>
          </g>
        ))}

        {/* Vertical Year Ticks */}
        {yearTicks.map((yr) => {
          const x = toX(yr);
          return (
            <g key={`xtick-${yr}`}>
              <line
                x1={x}
                y1={pad.top}
                x2={x}
                y2={height - pad.bottom}
                stroke={isLight ? '#e2e8f0' : '#111a2c'}
                strokeWidth="1"
              />
              <text
                x={x}
                y={height - pad.bottom + 18}
                textAnchor="middle"
                fill={isLight ? '#475569' : '#94a3b8'}
                fontSize="11"
                fontFamily="IBM Plex Mono, monospace"
              >
                {yr}
              </text>
            </g>
          );
        })}

        {/* Unit label */}
        <text
          x={14}
          y={pad.top + 10}
          fill={isLight ? '#475569' : '#64748b'}
          fontSize="11"
          fontFamily="IBM Plex Mono, monospace"
        >
          {unit}
        </text>

        {/* Plot border */}
        <rect
          x={pad.left}
          y={pad.top}
          width={plotW}
          height={plotH}
          fill="none"
          stroke={isLight ? '#cbd5e1' : '#1e293b'}
          strokeWidth="1"
        />

        {/* Layer 1: Raw Series */}
        {showRaw && (
          <path
            d={rawPath}
            fill="none"
            stroke={
              showDeseasonalized
                ? isLight
                  ? 'rgba(100, 116, 139, 0.35)'
                  : 'rgba(148, 163, 184, 0.35)'
                : isLight
                  ? '#0284c7'
                  : '#38bdf8'
            }
            strokeWidth={showDeseasonalized ? 1.25 : 1.9}
          />
        )}

        {/* Layer 2: Fitted Seasonal Cycle */}
        {showSeasonal && (
          <path
            d={seasonalPath}
            fill="none"
            stroke={isLight ? '#d97706' : '#f59e0b'}
            strokeWidth="1.6"
            strokeDasharray="5 4"
          />
        )}

        {/* Layer 3: Deseasonalized Series */}
        {showDeseasonalized && (
          <path
            d={desPath}
            fill="none"
            stroke={isLight ? '#059669' : '#10b981'}
            strokeWidth="2.1"
          />
        )}

        {/* Layer 4: Player Estimated Slope Preview (if slider used) */}
        {estimateLine && (
          <line
            x1={estimateLine.x1}
            y1={estimateLine.y1}
            x2={estimateLine.x2}
            y2={estimateLine.y2}
            stroke="#a78bfa"
            strokeWidth="1.75"
            strokeDasharray="3 4"
          />
        )}

        {/* Layer 5: Fitted OLS Trend Line */}
        {showTrendLine && firstPt && lastPt && (
          <line
            x1={toX(firstPt.decimalYear)}
            y1={trendYStart}
            x2={toX(lastPt.decimalYear)}
            y2={trendYEnd}
            stroke="#f43f5e"
            strokeWidth="2.4"
          />
        )}

        {/* Hover Crosshair */}
        {activePoint && (
          <g>
            <line
              x1={toX(activePoint.decimalYear)}
              y1={pad.top}
              x2={toX(activePoint.decimalYear)}
              y2={height - pad.bottom}
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {showRaw && (
              <circle
                cx={toX(activePoint.decimalYear)}
                cy={toY(activePoint.raw)}
                r="4"
                fill={isLight ? '#0284c7' : '#38bdf8'}
                stroke={isLight ? '#f8fafc' : '#080d18'}
                strokeWidth="1.5"
              />
            )}
            {showDeseasonalized && (
              <circle
                cx={toX(activePoint.decimalYear)}
                cy={toY(activePoint.deseasonalized)}
                r="4.5"
                fill={isLight ? '#059669' : '#10b981'}
                stroke={isLight ? '#f8fafc' : '#080d18'}
                strokeWidth="1.5"
              />
            )}
          </g>
        )}
      </svg>

      {/* Bottom Legend + Live Crosshair Readout */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-300">
          {showRaw && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4"
                style={{
                  backgroundColor: showDeseasonalized
                    ? 'rgba(148, 163, 184, 0.55)'
                    : '#38bdf8',
                }}
              />
              Raw Monthly
            </span>
          )}
          {showSeasonal && (
            <span className="inline-flex items-center gap-1.5 text-amber-300">
              <span className="inline-block w-4 border-t-2 border-dashed border-amber-400" />
              Seasonal Cycle
            </span>
          )}
          {showDeseasonalized && (
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <span className="inline-block h-0.5 w-4 bg-emerald-400" />
              Deseasonalized
            </span>
          )}
          {showTrendLine && (
            <span className="inline-flex items-center gap-1.5 text-rose-300">
              <span className="inline-block h-0.5 w-4 bg-rose-400" />
              OLS Trend Line
            </span>
          )}
          {estimatedSlope !== undefined && estimatedSlope !== null && (
            <span className="inline-flex items-center gap-1.5 text-violet-300">
              <span className="inline-block w-4 border-t-2 border-dotted border-violet-400" />
              Your Slope Guess
            </span>
          )}
        </div>

        <div className="font-mono text-xs text-slate-300 tabular-nums">
          {activePoint ? (
            <span>
              {activePoint.label} · Raw {formatVal(activePoint.raw)} {unit}
              {showDeseasonalized
                ? ` · Deseas ${formatVal(activePoint.deseasonalized)} ${unit}`
                : ''}
            </span>
          ) : (
            <span className="text-slate-400">Move cursor across chart to inspect monthly values</span>
          )}
        </div>
      </div>
    </div>
  );
}
