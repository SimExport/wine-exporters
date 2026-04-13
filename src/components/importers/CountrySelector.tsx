import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';

// ─── Country definitions ────────────────────────────────────────────────────
interface CountryDef {
  code: string;       // internal code used in the app
  isoA2: string;      // ISO 3166-1 alpha-2 used by react-simple-maps
  name: string;
  englishName: string;
  continent: string;
}

const COUNTRIES: CountryDef[] = [
  // Europe
  { code: 'DE', isoA2: 'DE', name: 'Allemagne', englishName: 'Germany', continent: 'Europe' },
  { code: 'AT', isoA2: 'AT', name: 'Autriche', englishName: 'Austria', continent: 'Europe' },
  { code: 'BE', isoA2: 'BE', name: 'Belgique', englishName: 'Belgium', continent: 'Europe' },
  { code: 'DK', isoA2: 'DK', name: 'Danemark', englishName: 'Denmark', continent: 'Europe' },
  { code: 'ES', isoA2: 'ES', name: 'Espagne', englishName: 'Spain', continent: 'Europe' },
  { code: 'EE', isoA2: 'EE', name: 'Estonie', englishName: 'Estonia', continent: 'Europe' },
  { code: 'FI', isoA2: 'FI', name: 'Finlande', englishName: 'Finland', continent: 'Europe' },
  { code: 'IE', isoA2: 'IE', name: 'Irlande', englishName: 'Ireland', continent: 'Europe' },
  { code: 'IT', isoA2: 'IT', name: 'Italie', englishName: 'Italy', continent: 'Europe' },
  { code: 'NL', isoA2: 'NL', name: 'Pays-Bas', englishName: 'Netherlands', continent: 'Europe' },
  { code: 'NO', isoA2: 'NO', name: 'Norvège', englishName: 'Norway', continent: 'Europe' },
  { code: 'PL', isoA2: 'PL', name: 'Pologne', englishName: 'Poland', continent: 'Europe' },
  { code: 'PT', isoA2: 'PT', name: 'Portugal', englishName: 'Portugal', continent: 'Europe' },
  { code: 'CZ', isoA2: 'CZ', name: 'République tchèque', englishName: 'Czech Republic', continent: 'Europe' },
  { code: 'UK', isoA2: 'GB', name: 'Royaume-Uni', englishName: 'United Kingdom', continent: 'Europe' },
  { code: 'SE', isoA2: 'SE', name: 'Suède', englishName: 'Sweden', continent: 'Europe' },
  { code: 'CH', isoA2: 'CH', name: 'Suisse', englishName: 'Switzerland', continent: 'Europe' },
  // Amériques
  { code: 'BR', isoA2: 'BR', name: 'Brésil', englishName: 'Brazil', continent: 'Amériques' },
  { code: 'CA', isoA2: 'CA', name: 'Canada', englishName: 'Canada', continent: 'Amériques' },
  { code: 'US', isoA2: 'US', name: 'États-Unis', englishName: 'United States', continent: 'Amériques' },
  { code: 'MX', isoA2: 'MX', name: 'Mexique', englishName: 'Mexico', continent: 'Amériques' },
  // Asie-Pacifique
  { code: 'CN', isoA2: 'CN', name: 'Chine', englishName: 'China', continent: 'Asie-Pacifique' },
  { code: 'KR', isoA2: 'KR', name: 'Corée du Sud', englishName: 'South Korea', continent: 'Asie-Pacifique' },
  { code: 'HK', isoA2: 'HK', name: 'Hong Kong', englishName: 'Hong Kong', continent: 'Asie-Pacifique' },
  { code: 'JP', isoA2: 'JP', name: 'Japon', englishName: 'Japan', continent: 'Asie-Pacifique' },
  { code: 'SG', isoA2: 'SG', name: 'Singapour', englishName: 'Singapore', continent: 'Asie-Pacifique' },
  // Océanie
  { code: 'AU', isoA2: 'AU', name: 'Australie', englishName: 'Australia', continent: 'Océanie' },
  // Afrique
  { code: 'ZA', isoA2: 'ZA', name: 'Afrique du Sud', englishName: 'South Africa', continent: 'Afrique' },
];

const CONTINENT_ORDER = ['Europe', 'Amériques', 'Asie-Pacifique', 'Océanie', 'Afrique'];

// Build lookup maps
const ISO_TO_APP: Record<string, string> = {};
const APP_TO_COUNTRY: Record<string, CountryDef> = {};
COUNTRIES.forEach(c => {
  ISO_TO_APP[c.isoA2] = c.code;
  APP_TO_COUNTRY[c.code] = c;
});

// TopoJSON world atlas
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ─── Wine color scale (light rose → deep wine) ─────────────────────────────
function getCountryFill(count: number, maxCount: number): string {
  if (count === 0) return 'hsl(345, 8%, 88%)'; // grey
  const ratio = Math.sqrt(count / maxCount);
  const lightness = Math.round(72 - ratio * 50);   // 72% → 22%
  const saturation = Math.round(20 + ratio * 25);   // 20% → 45%
  return `hsl(345, ${saturation}%, ${lightness}%)`;
}

// ─── Component ──────────────────────────────────────────────────────────────
interface CountrySelectorProps {
  selectedCountry: string;
  onSelectCountry: (code: string) => void;
}

export function CountrySelector({ selectedCountry, onSelectCountry }: CountrySelectorProps) {
  const [countryCounts, setCountryCounts] = useState<Record<string, number>>({});
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([10, 20]);

  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
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

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z * 1.5, 8)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z / 1.5, 1)), []);
  const handleReset = useCallback(() => { setZoom(1); setCenter([10, 20]); }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div className="space-y-4">
      {/* World Map */}
      <Card className="overflow-hidden">
        <div className="p-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Sélectionnez un marché</span>
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <span className="text-xs text-muted-foreground mr-2">
                {totalContacts.toLocaleString()} contacts · {Object.values(countryCounts).filter(c => c > 0).length} marchés
              </span>
            )}
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleZoomIn} title="Zoom avant">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleZoomOut} title="Zoom arrière">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleReset} title="Réinitialiser">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="px-4 pb-4">
          <div
            className="relative w-full rounded-lg overflow-hidden bg-muted/10 border border-border/50"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { setHoveredCountry(null); setTooltipContent(''); }}
          >
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 130, center: [0, 30] }}
              style={{ width: '100%', height: 'auto', aspectRatio: '2 / 1' }}
            >
              <ZoomableGroup
                zoom={zoom}
                center={center}
                onMoveEnd={({ coordinates, zoom: z }) => { setCenter(coordinates as [number, number]); setZoom(z); }}
                minZoom={1}
                maxZoom={8}
              >
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const isoCode = geo.properties.ISO_A2 || geo.id?.slice(0, 2);
                      const appCode = ISO_TO_APP[isoCode];
                      const countryDef = appCode ? APP_TO_COUNTRY[appCode] : null;
                      const count = appCode ? (countryCounts[appCode] || 0) : 0;
                      const isSelected = appCode === selectedCountry;
                      const isHovered = appCode === hoveredCountry;
                      const fill = countryDef
                        ? getCountryFill(count, maxCount)
                        : 'hsl(345, 5%, 92%)';

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={isSelected ? 'hsl(345, 55%, 30%)' : isHovered ? 'hsl(345, 50%, 40%)' : fill}
                          stroke={isSelected ? 'hsl(345, 45%, 15%)' : 'hsl(345, 10%, 80%)'}
                          strokeWidth={isSelected ? 1.2 : 0.4}
                          style={{
                            default: { outline: 'none', cursor: countryDef ? 'pointer' : 'default' },
                            hover: { outline: 'none', cursor: countryDef ? 'pointer' : 'default' },
                            pressed: { outline: 'none' },
                          }}
                          onMouseEnter={() => {
                            if (countryDef) {
                              setHoveredCountry(appCode!);
                              setTooltipContent(
                                `${countryDef.name} — ${count > 0 ? `${count.toLocaleString()} contacts` : 'Aucun contact'}`
                              );
                            } else {
                              setTooltipContent(geo.properties.NAME || '');
                            }
                          }}
                          onMouseLeave={() => {
                            setHoveredCountry(null);
                            setTooltipContent('');
                          }}
                          onClick={() => {
                            if (appCode) {
                              onSelectCountry(isSelected ? '' : appCode);
                            }
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>

            {/* Tooltip */}
            {tooltipContent && tooltipPos && (
              <div
                className="fixed z-50 pointer-events-none px-3 py-1.5 rounded-md text-xs font-medium shadow-lg border bg-popover text-popover-foreground border-border"
                style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 30 }}
              >
                {tooltipContent}
              </div>
            )}

            {/* Color legend */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded px-2 py-1 border border-border/50">
              <span>0</span>
              <div
                className="w-20 h-2.5 rounded-full"
                style={{ background: 'linear-gradient(to right, hsl(345, 8%, 88%), hsl(345, 45%, 22%))' }}
              />
              <span>{maxCount.toLocaleString()}</span>
            </div>
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
                    style={{ background: 'hsl(345, 45%, 22%)' }}
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
                      const isHovered = hoveredCountry === country.code;
                      return (
                        <button
                          key={country.code}
                          onClick={() => onSelectCountry(isSelected ? '' : country.code)}
                          onMouseEnter={() => setHoveredCountry(country.code)}
                          onMouseLeave={() => setHoveredCountry(null)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded text-sm transition-colors ${
                            isSelected
                              ? 'bg-primary/10 text-primary font-medium'
                              : isHovered
                                ? 'bg-muted/80 text-foreground'
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
