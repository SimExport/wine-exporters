import { useState } from 'react';
import { ALL_IMPORTER_COUNTRIES } from './CountrySingleSelect';
import { cn } from '@/lib/utils';

// Approximate [cx, cy] on a 1000×500 projection for the countries in our COUNTRIES list
const COUNTRY_COORDS: Record<string, [number, number]> = {
  GB: [445, 168], DE: [490, 175], BE: [466, 179], NL: [470, 170], CH: [477, 190],
  SE: [500, 140], NO: [490, 130], DK: [488, 155], FI: [520, 130], PL: [510, 170],
  CZ: [500, 177], AT: [498, 183], LU: [471, 181], IE: [435, 168], PT: [435, 220],
  ES: [448, 215], IT: [490, 210], GR: [523, 207], RO: [527, 185], HU: [510, 183],
  SK: [510, 178], SI: [496, 188], HR: [503, 193], LV: [520, 153], LT: [520, 160],
  EE: [522, 147], RU: [600, 155],
  US: [175, 210], CA: [175, 170], MX: [150, 250],
  BR: [265, 335], AR: [240, 400], CL: [225, 380], CO: [220, 295],
  JP: [790, 210], CN: [720, 215], KR: [775, 210], HK: [748, 245], SG: [730, 310],
  TW: [760, 245], TH: [720, 270], VN: [735, 270], IN: [660, 260],
  AE: [598, 258], IL: [553, 232], ZA: [520, 410], MA: [450, 240],
  AU: [750, 380], NZ: [840, 420],
};

interface ImportersMapProps {
  selectedCode: string;
  onSelect: (code: string) => void;
  /** optional: highlight only codes with data */
  availableCodes?: string[];
}

export function ImportersMap({ selectedCode, onSelect, availableCodes }: ImportersMapProps) {
  const [tooltip, setTooltip] = useState<{ code: string; name: string; flag: string; cx: number; cy: number } | null>(null);

  const countries = ALL_IMPORTER_COUNTRIES.filter(c => COUNTRY_COORDS[c.code]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border bg-muted/10">
      <svg
        viewBox="0 0 1000 500"
        className="w-full"
        style={{ aspectRatio: '2 / 1' }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Ocean background */}
        <rect width="1000" height="500" fill="hsl(210, 35%, 96%)" />
        <ellipse cx="500" cy="250" rx="490" ry="240" fill="hsl(210, 45%, 93%)" opacity="0.7" />

        {/* Render all country dots */}
        {countries.map(country => {
          const [cx, cy] = COUNTRY_COORDS[country.code];
          const isSelected = selectedCode === country.code;
          const hasData = !availableCodes || availableCodes.includes(country.code);
          const isHovered = tooltip?.code === country.code;

          return (
            <g
              key={country.code}
              onMouseEnter={() => setTooltip({ code: country.code, name: country.name, flag: country.flag, cx, cy })}
              onClick={() => hasData && onSelect(isSelected ? '' : country.code)}
              className={cn(hasData ? 'cursor-pointer' : 'cursor-default')}
            >
              {/* Pulse ring for selected */}
              {isSelected && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={18}
                  fill="hsl(var(--primary) / 0.15)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? 11 : isHovered && hasData ? 10 : 7}
                fill={
                  isSelected
                    ? 'hsl(var(--primary))'
                    : hasData
                    ? isHovered
                      ? 'hsl(var(--primary) / 0.75)'
                      : 'hsl(var(--primary) / 0.45)'
                    : 'hsl(var(--muted-foreground) / 0.2)'
                }
                stroke={
                  isSelected
                    ? 'hsl(0, 0%, 98%)'
                    : hasData
                    ? 'hsl(var(--primary) / 0.6)'
                    : 'hsl(var(--border))'
                }
                strokeWidth={isSelected ? 2 : 1}
                style={{ transition: 'r 0.15s, fill 0.15s' }}
              />
              {/* Country code label for selected */}
              {isSelected && (
                <text
                  x={cx}
                  y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="7"
                  fontWeight="700"
                  fill="hsl(0, 0%, 98%)"
                  pointerEvents="none"
                >
                  {country.code}
                </text>
              )}
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (() => {
          const tipX = Math.min(tooltip.cx - 5, 860);
          const tipY = Math.max(tooltip.cy - 44, 4);
          const hasData = !availableCodes || availableCodes.includes(tooltip.code);
          return (
            <g pointerEvents="none">
              <rect x={tipX} y={tipY} width={120} height={34} rx="6"
                fill="hsl(var(--popover))" stroke="hsl(var(--border))" strokeWidth="1" />
              <text x={tipX + 60} y={tipY + 13} textAnchor="middle" fontSize="11" fontWeight="600"
                fill="hsl(var(--foreground))">
                {tooltip.flag} {tooltip.name}
              </text>
              <text x={tipX + 60} y={tipY + 26} textAnchor="middle" fontSize="9"
                fill="hsl(var(--muted-foreground))">
                {hasData ? 'Cliquer pour sélectionner' : 'Non disponible'}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 right-3 flex items-center gap-3 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 border border-border/50">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-primary/45 border border-primary/60" />
          Disponible
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-primary border-2 border-white" />
          Sélectionné
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-muted-foreground/20 border border-border" />
          Non disponible
        </span>
      </div>
    </div>
  );
}
