import type { RegionOption } from '../game/cases';

interface WorldRegionMapProps {
  regions: RegionOption[];
  selectedRegionId: string | null;
  rejectedRegionIds: string[];
  onSelectRegion: (regionId: string) => void;
  theme?: 'dark' | 'light';
}

export function WorldRegionMap({
  regions,
  selectedRegionId,
  rejectedRegionIds,
  onSelectRegion,
  theme = 'dark',
}: WorldRegionMapProps) {
  const isLight = theme === 'light';
  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-slate-800 bg-[#080d18]">
      <svg
        viewBox="0 0 1000 500"
        role="img"
        aria-label="Global Earth-observation target region map"
        className="block h-auto w-full select-none"
      >
        {/* Ocean background & graticule */}
        <rect
          x="0"
          y="0"
          width="1000"
          height="500"
          fill={isLight ? '#e0f2fe' : '#080d18'}
        />
        {[100, 175, 250, 325, 400].map((y) => (
          <line
            key={`lat-${y}`}
            x1="0"
            y1={y}
            x2="1000"
            y2={y}
            stroke={
              y === 250
                ? isLight
                  ? '#0284c7'
                  : '#1e3a5f'
                : isLight
                  ? '#475569'
                  : '#182744'
            }
            strokeOpacity={y === 250 ? (isLight ? 0.78 : 1) : isLight ? 0.45 : 1}
            strokeWidth={y === 250 ? 1.4 : 1}
            strokeDasharray={y === 250 ? undefined : '4 6'}
          />
        ))}
        {[166, 333, 500, 666, 833].map((x) => (
          <line
            key={`lon-${x}`}
            x1={x}
            y1="0"
            x2={x}
            y2="500"
            stroke={
              x === 500
                ? isLight
                  ? '#0284c7'
                  : '#1e3a5f'
                : isLight
                  ? '#475569'
                  : '#182744'
            }
            strokeOpacity={x === 500 ? (isLight ? 0.72 : 1) : isLight ? 0.45 : 1}
            strokeWidth={x === 500 ? 1.3 : 1}
            strokeDasharray={x === 500 ? undefined : '4 6'}
          />
        ))}

        {/* Simplified stylized continental silhouettes */}
        <g
          fill={isLight ? '#f8fafc' : '#162238'}
          stroke={isLight ? '#94a3b8' : '#243554'}
          strokeWidth="1.2"
        >
          {/* North America */}
          <path d="M90,70 L250,55 L325,95 L290,165 L230,210 L215,245 L175,215 L145,165 L110,120 Z" />
          {/* Greenland */}
          <path d="M335,30 L415,25 L430,78 L365,92 L338,65 Z" />
          {/* South America */}
          <path d="M245,252 L322,250 L372,300 L345,380 L292,455 L268,430 L260,340 L238,285 Z" />
          {/* Europe */}
          <path d="M460,82 L565,70 L595,115 L560,152 L475,152 L455,122 Z" />
          {/* Africa */}
          <path d="M458,168 L560,165 L615,215 L595,295 L548,392 L505,372 L490,290 L445,235 Z" />
          {/* Asia */}
          <path d="M585,68 L845,64 L895,125 L855,205 L780,235 L710,238 L660,212 L610,175 L580,122 Z" />
          {/* Maritime SE Asia */}
          <path d="M760,248 L835,252 L855,282 L780,285 Z" />
          {/* Australia */}
          <path d="M775,322 L878,318 L900,378 L840,408 L772,378 Z" />
          {/* Arctic Sea Ice Zone Band */}
          <path
            d="M80,28 L290,22 L320,52 L115,56 Z"
            fill={isLight ? '#f0f9ff' : '#132b42'}
            stroke={isLight ? '#7dd3fc' : '#1e496e'}
            strokeDasharray="3 3"
          />
          {/* Antarctica Ice Sheet Band */}
          <path
            d="M70,472 L930,472 L960,498 L40,498 Z"
            fill={isLight ? '#f0f9ff' : '#132b42'}
            stroke={isLight ? '#7dd3fc' : '#1e496e'}
          />
        </g>

        {/* Latitude labels */}
        {[
          { y: 94, label: '60° N', primary: false },
          { y: 169, label: '30° N', primary: false },
          { y: 244, label: '0° EQ', primary: true },
          { y: 319, label: '30° S', primary: false },
          { y: 394, label: '60° S', primary: false },
        ].map((latTick) => (
          <text
            key={latTick.label}
            x="12"
            y={latTick.y}
            fill={
              isLight
                ? latTick.primary
                  ? '#0369a1'
                  : '#1e293b'
                : latTick.primary
                  ? '#38bdf8'
                  : '#94a3b8'
            }
            stroke={isLight ? '#e0f2fe' : '#080d18'}
            strokeWidth="3"
            paintOrder="stroke"
            fontSize="11"
            fontWeight={latTick.primary ? '600' : '500'}
            fontFamily="IBM Plex Mono, monospace"
          >
            {latTick.label}
          </text>
        ))}

        {/* Longitude labels */}
        {[
          { x: 166, label: '120° W', primary: false },
          { x: 333, label: '60° W', primary: false },
          { x: 500, label: '0°', primary: true },
          { x: 666, label: '60° E', primary: false },
          { x: 833, label: '120° E', primary: false },
        ].map((lonTick) => (
          <text
            key={lonTick.label}
            x={lonTick.x}
            y="16"
            textAnchor="middle"
            fill={
              isLight
                ? lonTick.primary
                  ? '#0369a1'
                  : '#1e293b'
                : lonTick.primary
                  ? '#38bdf8'
                  : '#94a3b8'
            }
            stroke={isLight ? '#e0f2fe' : '#080d18'}
            strokeWidth="3"
            paintOrder="stroke"
            fontSize="11"
            fontWeight={lonTick.primary ? '600' : '500'}
            fontFamily="IBM Plex Mono, monospace"
          >
            {lonTick.label}
          </text>
        ))}

        {/* Region Markers */}
        {regions.map((region) => {
          const isSelected = selectedRegionId === region.id;
          const isRejected = rejectedRegionIds.includes(region.id);
          const strokeColor = isSelected
            ? region.isTarget
              ? '#10b981'
              : '#f43f5e'
            : isRejected
              ? '#64748b'
              : '#06b6d4';

          return (
            <g
              key={region.id}
              transform={`translate(${region.mapX}, ${region.mapY})`}
              className="cursor-pointer"
              onClick={() => onSelectRegion(region.id)}
            >
              {/* Invisible >= 44px touch target */}
              <circle r="24" fill="transparent" />
              <circle
                r={isSelected ? 15 : 11}
                fill={
                  isSelected
                    ? region.isTarget
                      ? 'rgba(16, 185, 129, 0.22)'
                      : 'rgba(244, 63, 94, 0.22)'
                    : 'rgba(6, 182, 212, 0.14)'
                }
                stroke={strokeColor}
                strokeWidth={isSelected ? 2.2 : 1.5}
              />
              <circle
                r={4.5}
                fill={
                  isSelected
                    ? region.isTarget
                      ? '#10b981'
                      : '#f43f5e'
                    : isRejected
                      ? '#64748b'
                      : '#38bdf8'
                }
              />
              {(() => {
                const boxW = Math.max(130, region.name.length * 6.5 + 18);
                const placeLeft = region.mapX + 16 + boxW > 988;
                const boxX = placeLeft ? -(16 + boxW) : 16;
                return (
                  <>
                    <rect
                      x={boxX}
                      y={-13}
                      width={boxW}
                      height="24"
                      rx="4"
                      fill={
                        isLight
                          ? 'rgba(255, 255, 255, 0.94)'
                          : 'rgba(11, 17, 30, 0.92)'
                      }
                      stroke={
                        isSelected
                          ? strokeColor
                          : isLight
                            ? '#94a3b8'
                            : '#1e293b'
                      }
                      strokeWidth="1"
                    />
                    <text
                      x={boxX + boxW / 2}
                      y={3}
                      textAnchor="middle"
                      fill={
                        isRejected
                          ? isLight
                            ? '#64748b'
                            : '#94a3b8'
                          : isLight
                            ? '#0f172a'
                            : '#f1f5f9'
                      }
                      fontSize="11"
                      fontWeight="600"
                      fontFamily="Plus Jakarta Sans, sans-serif"
                    >
                      {region.name}
                    </text>
                  </>
                );
              })()}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
