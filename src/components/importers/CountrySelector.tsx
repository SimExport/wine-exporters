import { useState, useEffect, useMemo, useCallback } from 'react';
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
  code: string;       // internal code used in the app (for filtering)
  isoA2: string;
  isoA3: string;      // ISO 3166-1 alpha-3 used by react-simple-maps topojson
  name: string;       // French display name
  englishName: string; // primary English name in DB
  dbAliases: string[]; // all possible DB values for this country
  continent: string;
}

const COUNTRIES: CountryDef[] = [
  // Europe
  { code: 'DE', isoA2: 'DE', isoA3: 'DEU', name: 'Allemagne', englishName: 'Germany', dbAliases: ['Germany'], continent: 'Europe' },
  { code: 'AT', isoA2: 'AT', isoA3: 'AUT', name: 'Autriche', englishName: 'Austria', dbAliases: ['Austria'], continent: 'Europe' },
  { code: 'BE', isoA2: 'BE', isoA3: 'BEL', name: 'Belgique', englishName: 'Belgium', dbAliases: ['Belgium'], continent: 'Europe' },
  { code: 'DK', isoA2: 'DK', isoA3: 'DNK', name: 'Danemark', englishName: 'Denmark', dbAliases: ['Denmark'], continent: 'Europe' },
  { code: 'ES', isoA2: 'ES', isoA3: 'ESP', name: 'Espagne', englishName: 'Spain', dbAliases: ['Spain'], continent: 'Europe' },
  { code: 'EE', isoA2: 'EE', isoA3: 'EST', name: 'Estonie', englishName: 'Estonia', dbAliases: ['Estonia'], continent: 'Europe' },
  { code: 'FI', isoA2: 'FI', isoA3: 'FIN', name: 'Finlande', englishName: 'Finland', dbAliases: ['Finland'], continent: 'Europe' },
  { code: 'IE', isoA2: 'IE', isoA3: 'IRL', name: 'Irlande', englishName: 'Ireland', dbAliases: ['Ireland'], continent: 'Europe' },
  { code: 'IT', isoA2: 'IT', isoA3: 'ITA', name: 'Italie', englishName: 'Italy', dbAliases: ['Italy'], continent: 'Europe' },
  { code: 'NL', isoA2: 'NL', isoA3: 'NLD', name: 'Pays-Bas', englishName: 'Netherlands', dbAliases: ['Netherlands'], continent: 'Europe' },
  { code: 'NO', isoA2: 'NO', isoA3: 'NOR', name: 'Norvège', englishName: 'Norway', dbAliases: ['Norway'], continent: 'Europe' },
  { code: 'PL', isoA2: 'PL', isoA3: 'POL', name: 'Pologne', englishName: 'Poland', dbAliases: ['Poland'], continent: 'Europe' },
  { code: 'PT', isoA2: 'PT', isoA3: 'PRT', name: 'Portugal', englishName: 'Portugal', dbAliases: ['Portugal'], continent: 'Europe' },
  { code: 'CZ', isoA2: 'CZ', isoA3: 'CZE', name: 'Rép. tchèque', englishName: 'Czech Republic', dbAliases: ['Czech Republic'], continent: 'Europe' },
  { code: 'UK', isoA2: 'GB', isoA3: 'GBR', name: 'Royaume-Uni', englishName: 'United Kingdom', dbAliases: ['United Kingdom', 'England (UK)', 'Scotland (UK)', 'Wales (UK)', 'Northern Ireland (UK)'], continent: 'Europe' },
  { code: 'SE', isoA2: 'SE', isoA3: 'SWE', name: 'Suède', englishName: 'Sweden', dbAliases: ['Sweden'], continent: 'Europe' },
  { code: 'CH', isoA2: 'CH', isoA3: 'CHE', name: 'Suisse', englishName: 'Switzerland', dbAliases: ['Switzerland', 'Switzerland '], continent: 'Europe' },
  { code: 'GR', isoA2: 'GR', isoA3: 'GRC', name: 'Grèce', englishName: 'Greece', dbAliases: ['Greece'], continent: 'Europe' },
  { code: 'HU', isoA2: 'HU', isoA3: 'HUN', name: 'Hongrie', englishName: 'Hungary', dbAliases: ['Hungary'], continent: 'Europe' },
  { code: 'RO', isoA2: 'RO', isoA3: 'ROU', name: 'Roumanie', englishName: 'Romania', dbAliases: ['Romania'], continent: 'Europe' },
  { code: 'BG', isoA2: 'BG', isoA3: 'BGR', name: 'Bulgarie', englishName: 'Bulgaria', dbAliases: ['Bulgaria'], continent: 'Europe' },
  { code: 'HR', isoA2: 'HR', isoA3: 'HRV', name: 'Croatie', englishName: 'Croatia', dbAliases: ['Croatia'], continent: 'Europe' },
  { code: 'SK', isoA2: 'SK', isoA3: 'SVK', name: 'Slovaquie', englishName: 'Slovakia', dbAliases: ['Slovakia', 'Slovakia '], continent: 'Europe' },
  { code: 'SI', isoA2: 'SI', isoA3: 'SVN', name: 'Slovénie', englishName: 'Slovenia', dbAliases: ['Slovenia'], continent: 'Europe' },
  { code: 'LT', isoA2: 'LT', isoA3: 'LTU', name: 'Lituanie', englishName: 'Lithuania', dbAliases: ['Lithuania'], continent: 'Europe' },
  { code: 'LV', isoA2: 'LV', isoA3: 'LVA', name: 'Lettonie', englishName: 'Latvia', dbAliases: ['Latvia'], continent: 'Europe' },
  { code: 'LU', isoA2: 'LU', isoA3: 'LUX', name: 'Luxembourg', englishName: 'Luxembourg', dbAliases: ['Luxembourg'], continent: 'Europe' },
  { code: 'IS', isoA2: 'IS', isoA3: 'ISL', name: 'Islande', englishName: 'Iceland', dbAliases: ['Iceland'], continent: 'Europe' },
  { code: 'RS', isoA2: 'RS', isoA3: 'SRB', name: 'Serbie', englishName: 'Serbia', dbAliases: ['Serbia'], continent: 'Europe' },
  { code: 'CY', isoA2: 'CY', isoA3: 'CYP', name: 'Chypre', englishName: 'Cyprus', dbAliases: ['Cyprus'], continent: 'Europe' },
  { code: 'MT', isoA2: 'MT', isoA3: 'MLT', name: 'Malte', englishName: 'Malta', dbAliases: ['Malta'], continent: 'Europe' },
  { code: 'TR', isoA2: 'TR', isoA3: 'TUR', name: 'Turquie', englishName: 'Turkey', dbAliases: ['Turkey'], continent: 'Europe' },
  // Amériques
  { code: 'BR', isoA2: 'BR', isoA3: 'BRA', name: 'Brésil', englishName: 'Brazil', dbAliases: ['Brazil'], continent: 'Amériques' },
  { code: 'CA', isoA2: 'CA', isoA3: 'CAN', name: 'Canada', englishName: 'Canada', dbAliases: ['Canada'], continent: 'Amériques' },
  { code: 'US', isoA2: 'US', isoA3: 'USA', name: 'États-Unis', englishName: 'United States', dbAliases: ['United States', 'USA'], continent: 'Amériques' },
  { code: 'MX', isoA2: 'MX', isoA3: 'MEX', name: 'Mexique', englishName: 'Mexico', dbAliases: ['Mexico'], continent: 'Amériques' },
  { code: 'AR', isoA2: 'AR', isoA3: 'ARG', name: 'Argentine', englishName: 'Argentina', dbAliases: ['Argentina'], continent: 'Amériques' },
  { code: 'CL', isoA2: 'CL', isoA3: 'CHL', name: 'Chili', englishName: 'Chile', dbAliases: ['Chile'], continent: 'Amériques' },
  { code: 'CO', isoA2: 'CO', isoA3: 'COL', name: 'Colombie', englishName: 'Colombia', dbAliases: ['Colombia'], continent: 'Amériques' },
  // Asie-Pacifique
  { code: 'CN', isoA2: 'CN', isoA3: 'CHN', name: 'Chine', englishName: 'China', dbAliases: ['China'], continent: 'Asie-Pacifique' },
  { code: 'KR', isoA2: 'KR', isoA3: 'KOR', name: 'Corée du Sud', englishName: 'South Korea', dbAliases: ['South Korea'], continent: 'Asie-Pacifique' },
  { code: 'HK', isoA2: 'HK', isoA3: 'HKG', name: 'Hong Kong', englishName: 'Hong Kong', dbAliases: ['Hong Kong'], continent: 'Asie-Pacifique' },
  { code: 'JP', isoA2: 'JP', isoA3: 'JPN', name: 'Japon', englishName: 'Japan', dbAliases: ['Japan'], continent: 'Asie-Pacifique' },
  { code: 'SG', isoA2: 'SG', isoA3: 'SGP', name: 'Singapour', englishName: 'Singapore', dbAliases: ['Singapore', 'Singapore '], continent: 'Asie-Pacifique' },
  { code: 'TW', isoA2: 'TW', isoA3: 'TWN', name: 'Taïwan', englishName: 'Taiwan', dbAliases: ['Taiwan'], continent: 'Asie-Pacifique' },
  { code: 'TH', isoA2: 'TH', isoA3: 'THA', name: 'Thaïlande', englishName: 'Thailand', dbAliases: ['Thailand'], continent: 'Asie-Pacifique' },
  { code: 'IN', isoA2: 'IN', isoA3: 'IND', name: 'Inde', englishName: 'India', dbAliases: ['India'], continent: 'Asie-Pacifique' },
  { code: 'MY', isoA2: 'MY', isoA3: 'MYS', name: 'Malaisie', englishName: 'Malaysia', dbAliases: ['Malaysia'], continent: 'Asie-Pacifique' },
  { code: 'PH', isoA2: 'PH', isoA3: 'PHL', name: 'Philippines', englishName: 'Philippines', dbAliases: ['Philippines'], continent: 'Asie-Pacifique' },
  { code: 'VN', isoA2: 'VN', isoA3: 'VNM', name: 'Vietnam', englishName: 'Vietnam', dbAliases: ['Vietnam'], continent: 'Asie-Pacifique' },
  // Océanie
  { code: 'AU', isoA2: 'AU', isoA3: 'AUS', name: 'Australie', englishName: 'Australia', dbAliases: ['Australia'], continent: 'Océanie' },
  { code: 'NZ', isoA2: 'NZ', isoA3: 'NZL', name: 'Nouvelle-Zélande', englishName: 'New Zealand', dbAliases: ['New Zealand'], continent: 'Océanie' },
  // Afrique
  { code: 'ZA', isoA2: 'ZA', isoA3: 'ZAF', name: 'Afrique du Sud', englishName: 'South Africa', dbAliases: ['South Africa'], continent: 'Afrique' },
  { code: 'NG', isoA2: 'NG', isoA3: 'NGA', name: 'Nigeria', englishName: 'Nigeria', dbAliases: ['Nigeria'], continent: 'Afrique' },
  { code: 'KE', isoA2: 'KE', isoA3: 'KEN', name: 'Kenya', englishName: 'Kenya', dbAliases: ['Kenya'], continent: 'Afrique' },
  { code: 'MA', isoA2: 'MA', isoA3: 'MAR', name: 'Maroc', englishName: 'Morocco', dbAliases: ['Morocco'], continent: 'Afrique' },
  // Moyen-Orient
  { code: 'IL', isoA2: 'IL', isoA3: 'ISR', name: 'Israël', englishName: 'Israel', dbAliases: ['Israel'], continent: 'Moyen-Orient' },
  { code: 'AE', isoA2: 'AE', isoA3: 'ARE', name: 'Émirats arabes unis', englishName: 'United Arab Emirates', dbAliases: ['United Arab Emirates', 'UAE'], continent: 'Moyen-Orient' },
  { code: 'SA', isoA2: 'SA', isoA3: 'SAU', name: 'Arabie Saoudite', englishName: 'Saudi Arabia', dbAliases: ['Saudi Arabia'], continent: 'Moyen-Orient' },
  { code: 'QA', isoA2: 'QA', isoA3: 'QAT', name: 'Qatar', englishName: 'Qatar', dbAliases: ['Qatar'], continent: 'Moyen-Orient' },
  { code: 'LB', isoA2: 'LB', isoA3: 'LBN', name: 'Liban', englishName: 'Lebanon', dbAliases: ['Lebanon'], continent: 'Moyen-Orient' },
  { code: 'RU', isoA2: 'RU', isoA3: 'RUS', name: 'Russie', englishName: 'Russia', dbAliases: ['Russia'], continent: 'Europe' },
];

const CONTINENT_ORDER = ['Europe', 'Amériques', 'Asie-Pacifique', 'Moyen-Orient', 'Océanie', 'Afrique'];

// Build lookup: DB country name (lowercase) → app code
const DB_NAME_TO_CODE: Record<string, string> = {};
// Build lookup: ISO A3 → app code
const ISO3_TO_CODE: Record<string, string> = {};
const APP_TO_COUNTRY: Record<string, CountryDef> = {};

COUNTRIES.forEach(c => {
  APP_TO_COUNTRY[c.code] = c;
  ISO3_TO_CODE[c.isoA3] = c.code;
  c.dbAliases.forEach(alias => {
    DB_NAME_TO_CODE[alias.trim().toLowerCase()] = c.code;
  });
});

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Wine color scale
function getCountryFill(count: number, maxCount: number): string {
  if (count === 0) return 'hsl(345, 5%, 90%)';
  const ratio = Math.sqrt(count / maxCount);
  const lightness = Math.round(75 - ratio * 53);  // 75% → 22%
  const saturation = Math.round(18 + ratio * 27);  // 18% → 45%
  return `hsl(345, ${saturation}%, ${lightness}%)`;
}

// ─── Component ──────────────────────────────────────────────────────────────
interface CountrySelectorProps {
  selectedCountry: string;
  onSelectCountry: (code: string) => void;
}

// Additional mapping for topojson NAME property → ISO A3 for countries where ISO_A2/ISO_A3 may be -99
const NAME_TO_ISO3: Record<string, string> = {
  'France': 'FRA', 'Norway': 'NOR', 'Kosovo': 'XKX', 'Somaliland': 'SOL',
  'N. Cyprus': 'CYN',
};

export function CountrySelector({ selectedCountry, onSelectCountry }: CountrySelectorProps) {
  const [countryCounts, setCountryCounts] = useState<Record<string, number>>({});
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([10, 20]);

  // Fetch ALL counts in a single efficient query
  useEffect(() => {
    const fetchCounts = async () => {
      // Get all country counts from DB
      const { data, error } = await supabase
        .from('buyer_contacts')
        .select('country');

      if (error) {
        console.error('Error fetching buyer_contacts:', error);
        setLoading(false);
        return;
      }

      // Aggregate counts by DB country name
      const rawCounts: Record<string, number> = {};
      (data || []).forEach(row => {
        const c = (row.country || '').trim();
        if (c) rawCounts[c] = (rawCounts[c] || 0) + 1;
      });

      console.log('Raw DB country counts:', rawCounts);

      // Map DB names → app codes and sum aliases
      const appCounts: Record<string, number> = {};
      Object.entries(rawCounts).forEach(([dbName, count]) => {
        const appCode = DB_NAME_TO_CODE[dbName.trim().toLowerCase()];
        if (appCode) {
          appCounts[appCode] = (appCounts[appCode] || 0) + count;
        }
      });

      console.log('Mapped app country counts:', appCounts);
      setCountryCounts(appCounts);
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

  // Resolve a topojson geography to an app code
  const resolveGeoToAppCode = useCallback((geo: any): string | null => {
    // Try ISO_A3 first
    const isoA3 = geo.properties?.ISO_A3;
    if (isoA3 && isoA3 !== '-99' && ISO3_TO_CODE[isoA3]) {
      return ISO3_TO_CODE[isoA3];
    }
    // Try ISO_A2
    const isoA2 = geo.properties?.ISO_A2;
    if (isoA2 && isoA2 !== '-99') {
      const found = COUNTRIES.find(c => c.isoA2 === isoA2);
      if (found) return found.code;
    }
    // Try NAME
    const name = geo.properties?.NAME || geo.properties?.name;
    if (name) {
      const mappedIso3 = NAME_TO_ISO3[name];
      if (mappedIso3 && ISO3_TO_CODE[mappedIso3]) return ISO3_TO_CODE[mappedIso3];
      // Try DB name lookup
      const code = DB_NAME_TO_CODE[name.trim().toLowerCase()];
      if (code) return code;
    }
    return null;
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
                      const appCode = resolveGeoToAppCode(geo);
                      const countryDef = appCode ? APP_TO_COUNTRY[appCode] : null;
                      const count = appCode ? (countryCounts[appCode] || 0) : 0;
                      const isSelected = appCode === selectedCountry;
                      const isHovered = appCode != null && appCode === hoveredCountry;

                      let fill: string;
                      if (isSelected) {
                        fill = 'hsl(345, 55%, 28%)';
                      } else if (isHovered && countryDef) {
                        fill = count > 0 ? 'hsl(345, 50%, 38%)' : 'hsl(345, 10%, 78%)';
                      } else {
                        fill = countryDef ? getCountryFill(count, maxCount) : 'hsl(345, 3%, 93%)';
                      }

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={fill}
                          stroke={isSelected ? 'hsl(345, 45%, 15%)' : 'hsl(345, 8%, 82%)'}
                          strokeWidth={isSelected ? 1.5 : 0.4}
                          style={{
                            default: { outline: 'none', cursor: countryDef ? 'pointer' : 'default', transition: 'fill 0.2s' },
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
                              const geoName = geo.properties?.NAME || '';
                              setTooltipContent(geoName);
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
                style={{ background: 'linear-gradient(to right, hsl(345, 5%, 90%), hsl(345, 45%, 22%))' }}
              />
              <span>{maxCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Continent-grouped country list */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {CONTINENT_ORDER.map(continent => {
            const countries = continentGroups[continent];
            if (!countries || countries.length === 0) return null;
            const continentTotal = countries.reduce((s, c) => s + (countryCounts[c.code] || 0), 0);

            return (
              <div key={continent}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
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
