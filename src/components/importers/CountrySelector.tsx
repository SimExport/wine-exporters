import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, MapPin } from 'lucide-react';

interface CountryDef {
  code: string;
  name: string;
  englishName: string;
  continent: string;
}

const COUNTRIES: CountryDef[] = [
  // Europe
  { code: 'DE', name: 'Allemagne', englishName: 'Germany', continent: 'Europe' },
  { code: 'AT', name: 'Autriche', englishName: 'Austria', continent: 'Europe' },
  { code: 'BE', name: 'Belgique', englishName: 'Belgium', continent: 'Europe' },
  { code: 'DK', name: 'Danemark', englishName: 'Denmark', continent: 'Europe' },
  { code: 'ES', name: 'Espagne', englishName: 'Spain', continent: 'Europe' },
  { code: 'EE', name: 'Estonie', englishName: 'Estonia', continent: 'Europe' },
  { code: 'FI', name: 'Finlande', englishName: 'Finland', continent: 'Europe' },
  { code: 'IE', name: 'Irlande', englishName: 'Ireland', continent: 'Europe' },
  { code: 'IT', name: 'Italie', englishName: 'Italy', continent: 'Europe' },
  { code: 'NL', name: 'Pays-Bas', englishName: 'Netherlands', continent: 'Europe' },
  { code: 'NO', name: 'Norvège', englishName: 'Norway', continent: 'Europe' },
  { code: 'PL', name: 'Pologne', englishName: 'Poland', continent: 'Europe' },
  { code: 'PT', name: 'Portugal', englishName: 'Portugal', continent: 'Europe' },
  { code: 'CZ', name: 'République tchèque', englishName: 'Czech Republic', continent: 'Europe' },
  { code: 'UK', name: 'Royaume-Uni', englishName: 'United Kingdom', continent: 'Europe' },
  { code: 'SE', name: 'Suède', englishName: 'Sweden', continent: 'Europe' },
  { code: 'CH', name: 'Suisse', englishName: 'Switzerland', continent: 'Europe' },
  // Amériques
  { code: 'BR', name: 'Brésil', englishName: 'Brazil', continent: 'Amériques' },
  { code: 'CA', name: 'Canada', englishName: 'Canada', continent: 'Amériques' },
  { code: 'US', name: 'États-Unis', englishName: 'United States', continent: 'Amériques' },
  { code: 'MX', name: 'Mexique', englishName: 'Mexico', continent: 'Amériques' },
  // Asie-Pacifique
  { code: 'CN', name: 'Chine', englishName: 'China', continent: 'Asie-Pacifique' },
  { code: 'KR', name: 'Corée du Sud', englishName: 'South Korea', continent: 'Asie-Pacifique' },
  { code: 'HK', name: 'Hong Kong', englishName: 'Hong Kong', continent: 'Asie-Pacifique' },
  { code: 'JP', name: 'Japon', englishName: 'Japan', continent: 'Asie-Pacifique' },
  { code: 'SG', name: 'Singapour', englishName: 'Singapore', continent: 'Asie-Pacifique' },
  // Océanie
  { code: 'AU', name: 'Australie', englishName: 'Australia', continent: 'Océanie' },
  // Afrique
  { code: 'ZA', name: 'Afrique du Sud', englishName: 'South Africa', continent: 'Afrique' },
];

// Approximate positions on 1000x500 mercator projection
const COUNTRY_COORDS: Record<string, [number, number]> = {
  DE: [495, 175], AT: [498, 185], BE: [468, 180], DK: [490, 155], ES: [448, 215],
  EE: [522, 147], FI: [525, 130], IE: [435, 168], IT: [492, 210], NL: [472, 172],
  NO: [492, 130], PL: [512, 172], PT: [435, 220], CZ: [502, 178], UK: [452, 170],
  SE: [505, 140], CH: [480, 190], BR: [270, 340], CA: [180, 165], US: [175, 210],
  MX: [150, 255], CN: [720, 220], KR: [778, 210], HK: [750, 248], JP: [795, 205],
  SG: [732, 310], AU: [760, 385], ZA: [525, 405],
};

const CONTINENT_ORDER = ['Europe', 'Amériques', 'Asie-Pacifique', 'Océanie', 'Afrique'];

const CONTINENT_COLORS: Record<string, string> = {
  'Europe': 'hsl(var(--primary))',
  'Amériques': 'hsl(210, 60%, 50%)',
  'Asie-Pacifique': 'hsl(150, 50%, 40%)',
  'Océanie': 'hsl(30, 60%, 50%)',
  'Afrique': 'hsl(45, 70%, 45%)',
};

interface CountrySelectorProps {
  selectedCountry: string;
  onSelectCountry: (code: string) => void;
}

export function CountrySelector({ selectedCountry, onSelectCountry }: CountrySelectorProps) {
  const [countryCounts, setCountryCounts] = useState<Record<string, number>>({});
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      // Fetch counts for all countries in parallel batches
      const promises = COUNTRIES.map(async (c) => {
        const { count } = await supabase
          .from('buyer_contacts')
          .select('*', { count: 'exact', head: true })
          .eq('country', c.englishName);
        counts[c.code] = count || 0;
      });
      await Promise.all(promises);
      setCountryCounts(counts);
      setLoading(false);
    };
    fetchCounts();
  }, []);

  const continentGroups = useMemo(() => {
    const groups: Record<string, CountryDef[]> = {};
    CONTINENT_ORDER.forEach(c => { groups[c] = []; });
    COUNTRIES.forEach(c => {
      if (groups[c.continent]) groups[c.continent].push(c);
    });
    return groups;
  }, []);

  const totalContacts = useMemo(() =>
    Object.values(countryCounts).reduce((s, c) => s + c, 0),
    [countryCounts]
  );

  const maxCount = useMemo(() =>
    Math.max(1, ...Object.values(countryCounts)),
    [countryCounts]
  );

  const getCountryByCode = (code: string) => COUNTRIES.find(c => c.code === code);

  return (
    <div className="space-y-4">
      {/* World Map */}
      <Card className="overflow-hidden">
        <div className="p-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Sélectionnez un marché</span>
          </div>
          {!loading && (
            <span className="text-xs text-muted-foreground">
              {totalContacts.toLocaleString()} contacts dans {Object.values(countryCounts).filter(c => c > 0).length} marchés
            </span>
          )}
        </div>
        <div className="px-4 pb-4">
          <div className="relative w-full rounded-lg overflow-hidden bg-muted/20 border border-border/50">
            <svg
              viewBox="0 0 1000 500"
              className="w-full"
              style={{ aspectRatio: '2 / 1' }}
              onMouseLeave={() => setHoveredCountry(null)}
            >
              {/* Background */}
              <rect width="1000" height="500" fill="hsl(var(--muted) / 0.15)" rx="8" />

              {/* Simplified continent outlines */}
              {/* Europe */}
              <path d="M430,120 Q480,110 540,120 Q560,150 540,200 Q520,220 490,230 Q450,225 430,210 Q420,180 430,120Z"
                fill="hsl(var(--muted) / 0.2)" stroke="hsl(var(--border))" strokeWidth="0.5" />
              {/* North America */}
              <path d="M80,100 Q200,80 280,120 Q300,180 270,230 Q220,270 150,280 Q100,260 80,220 Q70,160 80,100Z"
                fill="hsl(var(--muted) / 0.2)" stroke="hsl(var(--border))" strokeWidth="0.5" />
              {/* South America */}
              <path d="M200,280 Q280,270 310,300 Q320,360 290,420 Q260,440 230,430 Q200,400 190,350 Q190,310 200,280Z"
                fill="hsl(var(--muted) / 0.2)" stroke="hsl(var(--border))" strokeWidth="0.5" />
              {/* Asia */}
              <path d="M560,100 Q700,90 810,130 Q830,200 810,260 Q760,300 700,320 Q640,310 580,270 Q555,220 560,100Z"
                fill="hsl(var(--muted) / 0.2)" stroke="hsl(var(--border))" strokeWidth="0.5" />
              {/* Africa */}
              <path d="M450,240 Q530,230 560,260 Q570,320 550,400 Q530,430 500,440 Q470,430 460,390 Q440,320 450,240Z"
                fill="hsl(var(--muted) / 0.2)" stroke="hsl(var(--border))" strokeWidth="0.5" />
              {/* Oceania */}
              <path d="M700,340 Q790,330 830,360 Q840,400 810,420 Q760,430 720,420 Q700,400 700,340Z"
                fill="hsl(var(--muted) / 0.2)" stroke="hsl(var(--border))" strokeWidth="0.5" />

              {/* Country dots */}
              {COUNTRIES.map(country => {
                const coords = COUNTRY_COORDS[country.code];
                if (!coords) return null;
                const count = countryCounts[country.code] || 0;
                const isSelected = selectedCountry === country.code;
                const isHovered = hoveredCountry === country.code;
                const ratio = count / maxCount;
                const baseR = count > 0 ? Math.max(6, Math.min(20, 5 + Math.sqrt(ratio) * 15)) : 4;
                const r = (isSelected || isHovered) ? baseR + 3 : baseR;
                const color = CONTINENT_COLORS[country.continent] || 'hsl(var(--primary))';

                return (
                  <g
                    key={country.code}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredCountry(country.code)}
                    onClick={() => onSelectCountry(country.code)}
                  >
                    {/* Pulse ring for selected */}
                    {isSelected && (
                      <circle
                        cx={coords[0]} cy={coords[1]} r={r + 4}
                        fill="none" stroke={color} strokeWidth="2"
                        opacity="0.4"
                      >
                        <animate attributeName="r" from={String(r + 2)} to={String(r + 10)} dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle
                      cx={coords[0]} cy={coords[1]} r={r}
                      fill={count > 0 ? color : 'hsl(var(--muted))'}
                      stroke={isSelected ? 'hsl(var(--foreground))' : isHovered ? color : 'hsl(var(--border))'}
                      strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 0.8}
                      opacity={count > 0 ? (isSelected || isHovered ? 1 : 0.75) : 0.3}
                    />
                    {count > 0 && baseR >= 10 && (
                      <text
                        x={coords[0]} y={coords[1] + 1}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={baseR >= 14 ? '9' : '7'}
                        fontWeight="700"
                        fill="white"
                        pointerEvents="none"
                      >
                        {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Tooltip */}
              {hoveredCountry && (() => {
                const c = getCountryByCode(hoveredCountry);
                const coords = COUNTRY_COORDS[hoveredCountry];
                if (!c || !coords) return null;
                const count = countryCounts[hoveredCountry] || 0;
                const tooltipW = 130;
                const tooltipH = 36;
                const tx = Math.max(5, Math.min(coords[0] - tooltipW / 2, 1000 - tooltipW - 5));
                const ty = Math.max(5, coords[1] - 50);
                return (
                  <g pointerEvents="none">
                    <rect x={tx} y={ty} width={tooltipW} height={tooltipH}
                      rx="6" fill="hsl(var(--popover))" stroke="hsl(var(--border))" strokeWidth="1"
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))" />
                    <text x={tx + tooltipW / 2} y={ty + 14} textAnchor="middle"
                      fontSize="10" fontWeight="600" fill="hsl(var(--foreground))">
                      {c.name}
                    </text>
                    <text x={tx + tooltipW / 2} y={ty + 27} textAnchor="middle"
                      fontSize="9" fill="hsl(var(--muted-foreground))">
                      {count > 0 ? `${count.toLocaleString()} contacts` : 'Aucun contact'}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>
      </Card>

      {/* Continent-grouped country list */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {CONTINENT_ORDER.map(continent => {
            const countries = continentGroups[continent];
            if (!countries || countries.length === 0) return null;
            const continentTotal = countries.reduce((s, c) => s + (countryCounts[c.code] || 0), 0);

            return (
              <div key={continent}>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: CONTINENT_COLORS[continent] }}
                  />
                  <span className="text-sm font-semibold text-foreground">{continent}</span>
                  <span className="text-xs text-muted-foreground">({continentTotal.toLocaleString()})</span>
                </div>
                <div className="space-y-0.5">
                  {countries
                    .sort((a, b) => (countryCounts[b.code] || 0) - (countryCounts[a.code] || 0))
                    .map(country => {
                      const count = countryCounts[country.code] || 0;
                      const isSelected = selectedCountry === country.code;
                      return (
                        <button
                          key={country.code}
                          onClick={() => onSelectCountry(country.code)}
                          onMouseEnter={() => setHoveredCountry(country.code)}
                          onMouseLeave={() => setHoveredCountry(null)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded text-sm transition-colors ${
                            isSelected
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-muted/60 text-foreground'
                          }`}
                        >
                          <span className="truncate">{country.name}</span>
                          {loading ? (
                            <span className="w-6 h-3 bg-muted animate-pulse rounded" />
                          ) : (
                            <Badge
                              variant={count > 0 ? (isSelected ? 'default' : 'secondary') : 'outline'}
                              className="text-[10px] px-1.5 py-0 h-4 min-w-[28px] justify-center"
                            >
                              {count > 0 ? count.toLocaleString() : '0'}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export { COUNTRIES };
