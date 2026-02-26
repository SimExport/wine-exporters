import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe } from 'lucide-react';

// Country ISO 2-letter code → display name (French)
const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France', DE: 'Allemagne', GB: 'Royaume-Uni', US: 'États-Unis', CN: 'Chine',
  JP: 'Japon', BE: 'Belgique', NL: 'Pays-Bas', CH: 'Suisse', CA: 'Canada',
  AU: 'Australie', SE: 'Suède', DK: 'Danemark', NO: 'Norvège', FI: 'Finlande',
  IT: 'Italie', ES: 'Espagne', PT: 'Portugal', PL: 'Pologne', CZ: 'Rép. Tchèque',
  AT: 'Autriche', HU: 'Hongrie', RO: 'Roumanie', UA: 'Ukraine', RU: 'Russie',
  BR: 'Brésil', MX: 'Mexique', AR: 'Argentine', CO: 'Colombie', CL: 'Chili',
  ZA: 'Afrique du Sud', NG: 'Nigeria', KE: 'Kenya', EG: 'Égypte', MA: 'Maroc',
  IN: 'Inde', KR: 'Corée du Sud', SG: 'Singapour', HK: 'Hong Kong', TW: 'Taïwan',
  TH: 'Thaïlande', VN: 'Vietnam', MY: 'Malaisie', ID: 'Indonésie', PH: 'Philippines',
  NZ: 'Nouvelle-Zélande', IE: 'Irlande', LU: 'Luxembourg', SK: 'Slovaquie',
  HR: 'Croatie', SI: 'Slovénie', BG: 'Bulgarie', GR: 'Grèce', RS: 'Serbie',
  LT: 'Lituanie', LV: 'Lettonie', EE: 'Estonie', IS: 'Islande', CY: 'Chypre',
  MT: 'Malte', TR: 'Turquie', IL: 'Israël', SA: 'Arabie Saoudite', AE: 'Émirats',
};

// Approximate [cx, cy] positions on a 1000×500 mercator-like projection
const COUNTRY_COORDS: Record<string, [number, number]> = {
  FR: [470, 195], DE: [490, 175], GB: [450, 170], US: [175, 210], CN: [720, 215],
  JP: [790, 210], BE: [465, 178], NL: [470, 170], CH: [477, 190], CA: [175, 170],
  AU: [750, 380], SE: [500, 140], DK: [488, 155], NO: [490, 130], FI: [520, 130],
  IT: [490, 210], ES: [448, 215], PT: [435, 220], PL: [510, 170], CZ: [500, 177],
  AT: [498, 183], HU: [510, 183], RO: [527, 185], UA: [540, 175], RU: [600, 155],
  BR: [265, 335], MX: [150, 250], AR: [240, 400], CO: [220, 295], CL: [225, 380],
  ZA: [520, 410], NG: [480, 295], KE: [550, 310], EG: [540, 235], MA: [450, 240],
  IN: [660, 260], KR: [775, 210], SG: [730, 310], HK: [748, 245], TW: [760, 245],
  TH: [720, 270], VN: [735, 270], MY: [730, 305], ID: [745, 330], PH: [765, 280],
  NZ: [840, 420], IE: [435, 168], LU: [471, 181], SK: [510, 178], HR: [503, 193],
  SI: [496, 188], BG: [530, 193], GR: [523, 207], RS: [518, 190], LT: [520, 160],
  LV: [520, 153], EE: [522, 147], IS: [425, 128], CY: [545, 222], MT: [492, 222],
  TR: [557, 210], IL: [553, 232], SA: [575, 255], AE: [598, 258],
};

function getHeatColor(count: number, maxCount: number): string {
  if (count === 0) return 'hsl(345, 15%, 92%)';
  const ratio = Math.sqrt(count / maxCount); // sqrt for better visual spread
  // Interpolate from light wine to deep wine
  const lightness = Math.round(75 - ratio * 55); // 75% → 20%
  const saturation = Math.round(25 + ratio * 25); // 25% → 50%
  return `hsl(345, ${saturation}%, ${lightness}%)`;
}

interface CountryBubble {
  code: string;
  name: string;
  count: number;
  cx: number;
  cy: number;
}

interface LeadsWorldMapProps {
  campaignIds: string[];
}

export function LeadsWorldMap({ campaignIds }: LeadsWorldMapProps) {
  const { user } = useAuth();
  const [bubbles, setBubbles] = useState<CountryBubble[]>([]);
  const [maxCount, setMaxCount] = useState(1);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; count: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || campaignIds.length === 0) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from('leads')
        .select('market')
        .in('campaign_id', campaignIds);

      if (!data) { setLoading(false); return; }

      // Aggregate by market (ISO code or country name)
      const counts: Record<string, number> = {};
      data.forEach(lead => {
        if (!lead.market) return;
        const key = lead.market.trim().toUpperCase();
        counts[key] = (counts[key] || 0) + 1;
      });

      const max = Math.max(1, ...Object.values(counts));
      setMaxCount(max);

      const result: CountryBubble[] = Object.entries(counts)
        .filter(([code]) => COUNTRY_COORDS[code])
        .map(([code, count]) => ({
          code,
          name: COUNTRY_NAMES[code] || code,
          count,
          cx: COUNTRY_COORDS[code][0],
          cy: COUNTRY_COORDS[code][1],
        }))
        .sort((a, b) => b.count - a.count);

      setBubbles(result);
      setLoading(false);
    };

    load();
  }, [user, campaignIds]);

  const topCountries = bubbles.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-base">Répartition géographique des leads</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : bubbles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Globe className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Aucun lead géolocalisé pour l'instant</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Les pays apparaîtront ici dès que des leads seront reçus</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* SVG Map */}
            <div className="relative w-full rounded-lg overflow-hidden bg-muted/20 border border-border/50">
              <svg
                viewBox="0 0 1000 500"
                className="w-full"
                style={{ aspectRatio: '2 / 1' }}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Simplified world silhouette background */}
                <rect width="1000" height="500" fill="hsl(var(--muted) / 0.3)" rx="8" />

                {/* Ocean */}
                <ellipse cx="500" cy="250" rx="490" ry="240" fill="hsl(210, 40%, 94%)" opacity="0.6" />

                {/* Render all known country positions as faint dots */}
                {Object.entries(COUNTRY_COORDS).map(([code, [cx, cy]]) => {
                  const bubble = bubbles.find(b => b.code === code);
                  const count = bubble?.count || 0;
                  const color = getHeatColor(count, maxCount);
                  const r = count > 0 ? Math.max(8, Math.min(28, 6 + Math.sqrt(count / maxCount) * 22)) : 4;
                  return (
                    <g
                      key={code}
                      onMouseEnter={(e) => {
                        if (count > 0) {
                          const rect = (e.currentTarget as SVGElement).closest('svg')!.getBoundingClientRect();
                          setTooltip({ x: cx, y: cy, name: COUNTRY_NAMES[code] || code, count });
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill={color}
                        stroke={count > 0 ? 'hsl(345, 45%, 22%)' : 'hsl(345, 15%, 80%)'}
                        strokeWidth={count > 0 ? 1.5 : 0.5}
                        opacity={count > 0 ? 0.9 : 0.4}
                      />
                      {count > 0 && r >= 12 && (
                        <text
                          x={cx}
                          y={cy + 1}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={count >= 10 ? '9' : '8'}
                          fontWeight="600"
                          fill={count / maxCount > 0.5 ? 'hsl(0, 0%, 98%)' : 'hsl(345, 45%, 22%)'}
                          pointerEvents="none"
                        >
                          {count}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Tooltip */}
                {tooltip && (
                  <g>
                    <rect
                      x={Math.min(tooltip.x - 5, 900)}
                      y={Math.max(tooltip.y - 38, 5)}
                      width={110}
                      height={28}
                      rx="5"
                      fill="hsl(345, 45%, 22%)"
                      opacity="0.95"
                    />
                    <text
                      x={Math.min(tooltip.x, 960) + 50}
                      y={Math.max(tooltip.y - 38, 5) + 10}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="600"
                      fill="hsl(0, 0%, 98%)"
                      pointerEvents="none"
                    >
                      {tooltip.name}
                    </text>
                    <text
                      x={Math.min(tooltip.x, 960) + 50}
                      y={Math.max(tooltip.y - 38, 5) + 21}
                      textAnchor="middle"
                      fontSize="8"
                      fill="hsl(0, 0%, 85%)"
                      pointerEvents="none"
                    >
                      {tooltip.count} lead{tooltip.count > 1 ? 's' : ''}
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Legend + Top countries */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Gradient legend */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>0</span>
                <div
                  className="w-24 h-3 rounded-full"
                  style={{
                    background: 'linear-gradient(to right, hsl(345, 15%, 92%), hsl(345, 45%, 22%))',
                  }}
                />
                <span>{maxCount} lead{maxCount > 1 ? 's' : ''}</span>
              </div>

              {/* Top 5 countries */}
              {topCountries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {topCountries.map((c, i) => (
                    <div key={c.code} className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground/60">#{i + 1}</span>
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full border border-primary/30"
                        style={{ background: getHeatColor(c.count, maxCount) }}
                      />
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground">({c.count})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
