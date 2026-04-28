import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/lib/format';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import {
  COUNTRIES,
  CONTINENT_ORDER,
  DB_NAME_TO_CODE,
  ISO3_TO_CODE,
  APP_TO_COUNTRY,
} from './country-data';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Wine color scale
function getCountryFill(count: number, maxCount: number): string {
  if (count === 0) return 'hsl(345, 5%, 90%)';
  const ratio = Math.sqrt(count / maxCount);
  const lightness = Math.round(75 - ratio * 53);
  const saturation = Math.round(18 + ratio * 27);
  return `hsl(345, ${saturation}%, ${lightness}%)`;
}

interface CountrySelectorProps {
  selectedCountry: string;
  onSelectCountry: (code: string) => void;
  onTotalCountChange?: (total: number) => void;
}

// Additional mapping for topojson NAME property → ISO A3 for countries where ISO_A2/ISO_A3 may be -99
const NAME_TO_ISO3: Record<string, string> = {
  'France': 'FRA', 'Norway': 'NOR', 'Kosovo': 'XKX', 'Somaliland': 'SOL',
  'N. Cyprus': 'CYN',
};

// ISO 3166-1 numeric → app code for world-atlas topojson (which uses numeric IDs)
const NUMERIC_TO_CODE: Record<string, string> = {
  '004':'AF','008':'AL','012':'DZ','020':'AD','024':'AO','028':'AG','032':'AR','036':'AU',
  '040':'AT','044':'BS','048':'BH','050':'BD','051':'AM','052':'BB','056':'BE','060':'BM',
  '064':'BT','068':'BO','070':'BA','072':'BW','076':'BR','084':'BZ','090':'SB','096':'BN',
  '100':'BG','104':'MM','108':'BI','112':'BY','116':'KH','120':'CM','124':'CA','132':'CV',
  '140':'CF','144':'LK','148':'TD','152':'CL','156':'CN','158':'TW','170':'CO','174':'KM',
  '178':'CG','180':'CD','188':'CR','191':'HR','192':'CU','196':'CY','203':'CZ','204':'BJ',
  '208':'DK','212':'DM','214':'DO','218':'EC','222':'SV','226':'GQ','231':'ET','232':'ER',
  '233':'EE','242':'FJ','246':'FI','250':'FR','258':'PF','262':'DJ','266':'GA','268':'GE',
  '270':'GM','275':'PS','276':'DE','288':'GH','300':'GR','308':'GD','316':'GU','320':'GT',
  '324':'GN','328':'GY','332':'HT','340':'HN','344':'HK','348':'HU','352':'IS','356':'IN',
  '360':'ID','364':'IR','368':'IQ','372':'IE','376':'IL','380':'IT','384':'CI','388':'JM',
  '392':'JP','398':'KZ','400':'JO','404':'KE','408':'KP','410':'KR','414':'KW','417':'KG',
  '418':'LA','422':'LB','426':'LS','428':'LV','430':'LR','434':'LY','438':'LI','440':'LT',
  '442':'LU','450':'MG','454':'MW','458':'MY','462':'MV','466':'ML','470':'MT','478':'MR',
  '480':'MU','484':'MX','492':'MC','496':'MN','498':'MD','504':'MA','508':'MZ','512':'OM',
  '516':'NA','524':'NP','528':'NL','540':'NC','554':'NZ','558':'NI','562':'NE','566':'NG',
  '578':'NO','586':'PK','591':'PA','598':'PG','600':'PY','604':'PE','608':'PH','616':'PL',
  '620':'PT','624':'GW','626':'TL','630':'PR','634':'QA','642':'RO','643':'RU','646':'RW',
  '659':'KN','662':'LC','670':'VC','682':'SA','686':'SN','688':'RS','694':'SL','702':'SG',
  '703':'SK','704':'VN','705':'SI','706':'SO','710':'ZA','716':'ZW','720':'YE','724':'ES',
  '728':'SS','736':'SD','740':'SR','748':'SZ','752':'SE','756':'CH','760':'SY','762':'TJ',
  '764':'TH','768':'TG','780':'TT','784':'AE','788':'TN','792':'TR','795':'TM','800':'UG',
  '804':'UA','807':'MK','818':'EG','826':'GB','834':'TZ','840':'US','854':'BF','858':'UY',
  '860':'UZ','862':'VE','887':'YE','894':'ZM',
};

export function CountrySelector({ selectedCountry, onSelectCountry, onTotalCountChange }: CountrySelectorProps) {
  const { t } = useTranslation();
  const [countryCounts, setCountryCounts] = useState<Record<string, number>>({});
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([10, 20]);

  // Fetch counts using paginated approach to bypass 1000-row limit
  useEffect(() => {
    const fetchCounts = async () => {
      const PAGE_SIZE = 1000;
      const rawCounts: Record<string, number> = {};
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('buyer_contacts')
          .select('country')
          .range(from, from + PAGE_SIZE - 1);

        if (error) {
          console.error('Error fetching buyer_contacts:', error);
          break;
        }

        (data || []).forEach(row => {
          const c = (row.country || '').trim();
          if (c) rawCounts[c] = (rawCounts[c] || 0) + 1;
        });

        if (!data || data.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          from += PAGE_SIZE;
        }
      }

      console.log('Raw DB country counts:', rawCounts);
      const totalRaw = Object.values(rawCounts).reduce((s, c) => s + c, 0);
      console.log('Total raw contacts fetched:', totalRaw);

      // Map DB names → app codes and sum aliases
      const appCounts: Record<string, number> = {};
      let unmapped = 0;
      Object.entries(rawCounts).forEach(([dbName, count]) => {
        const appCode = DB_NAME_TO_CODE[dbName.trim().toLowerCase()];
        if (appCode) {
          appCounts[appCode] = (appCounts[appCode] || 0) + count;
        } else {
          unmapped += count;
          console.warn('Unmapped DB country value:', dbName, '→', count, 'contacts');
        }
      });

      const distinctMarkets = Object.keys(appCounts).filter(k => appCounts[k] > 0);
      console.log('Mapped app country counts:', appCounts);
      console.log(`Total mapped: ${Object.values(appCounts).reduce((s, c) => s + c, 0)} | Unmapped: ${unmapped} | Distinct markets: ${distinctMarkets.length}`);
      console.log('Distinct market codes:', distinctMarkets.sort());
      
      // Log unmapped DB values for debugging
      const unmappedValues: string[] = [];
      Object.entries(rawCounts).forEach(([dbName]) => {
        const appCode = DB_NAME_TO_CODE[dbName.trim().toLowerCase()];
        if (!appCode) unmappedValues.push(dbName);
      });
      if (unmappedValues.length > 0) {
        console.warn('⚠️ Unmapped DB country values (not counted in markets):', unmappedValues);
      } else {
        console.log('✅ All DB country values are mapped');
      }
      
      setCountryCounts(appCounts);
      setLoading(false);
    };
    fetchCounts();
  }, []);

  const continentGroups = useMemo(() => {
    const groups: Record<string, typeof COUNTRIES[number][]> = {};
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

  // Notify parent of total count
  useEffect(() => {
    if (!loading && onTotalCountChange) {
      onTotalCountChange(totalContacts);
    }
  }, [totalContacts, loading, onTotalCountChange]);

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
    // world-atlas topojson uses numeric IDs
    const numericId = geo.id || geo.properties?.id;
    if (numericId) {
      const code = NUMERIC_TO_CODE[String(numericId)];
      if (code) return code;
    }
    const isoA3 = geo.properties?.ISO_A3;
    if (isoA3 && isoA3 !== '-99' && ISO3_TO_CODE[isoA3]) {
      return ISO3_TO_CODE[isoA3];
    }
    const isoA2 = geo.properties?.ISO_A2;
    if (isoA2 && isoA2 !== '-99') {
      const found = COUNTRIES.find(c => c.isoA2 === isoA2);
      if (found) return found.code;
    }
    const name = geo.properties?.NAME || geo.properties?.name;
    if (name) {
      const mappedIso3 = NAME_TO_ISO3[name];
      if (mappedIso3 && ISO3_TO_CODE[mappedIso3]) return ISO3_TO_CODE[mappedIso3];
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
            <span className="text-sm font-medium">{t('countrySelector.selectMarket')}</span>
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <span className="text-xs text-muted-foreground mr-2">
                {t('countrySelector.contactsMarkets', { contacts: formatNumber(totalContacts), markets: Object.values(countryCounts).filter(c => c > 0).length })}
              </span>
            )}
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleZoomIn} title={t('countrySelector.zoomIn')}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleZoomOut} title={t('countrySelector.zoomOut')}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleReset} title={t('countrySelector.reset')}>
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
                                count > 0
                                  ? t('countrySelector.tooltipContacts', { name: countryDef.name, count: formatNumber(count) })
                                  : t('countrySelector.tooltipNoContact', { name: countryDef.name })
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
