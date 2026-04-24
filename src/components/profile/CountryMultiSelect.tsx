import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface Country {
  code: string;
  name: string;
  flag: string;
}

interface Continent {
  name: string;
  countries: Country[];
}

const CONTINENTS: Continent[] = [
  {
    name: 'Europe',
    countries: [
      { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧' },
      { code: 'DE', name: 'Allemagne', flag: '🇩🇪' },
      { code: 'BE', name: 'Belgique', flag: '🇧🇪' },
      { code: 'NL', name: 'Pays-Bas', flag: '🇳🇱' },
      { code: 'CH', name: 'Suisse', flag: '🇨🇭' },
      { code: 'SE', name: 'Suède', flag: '🇸🇪' },
      { code: 'NO', name: 'Norvège', flag: '🇳🇴' },
      { code: 'DK', name: 'Danemark', flag: '🇩🇰' },
      { code: 'FI', name: 'Finlande', flag: '🇫🇮' },
      { code: 'PL', name: 'Pologne', flag: '🇵🇱' },
      { code: 'CZ', name: 'République tchèque', flag: '🇨🇿' },
      { code: 'AT', name: 'Autriche', flag: '🇦🇹' },
      { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
      { code: 'IE', name: 'Irlande', flag: '🇮🇪' },
      { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
      { code: 'ES', name: 'Espagne', flag: '🇪🇸' },
      { code: 'IT', name: 'Italie', flag: '🇮🇹' },
      { code: 'GR', name: 'Grèce', flag: '🇬🇷' },
      { code: 'RO', name: 'Roumanie', flag: '🇷🇴' },
      { code: 'HU', name: 'Hongrie', flag: '🇭🇺' },
      { code: 'SK', name: 'Slovaquie', flag: '🇸🇰' },
      { code: 'SI', name: 'Slovénie', flag: '🇸🇮' },
      { code: 'HR', name: 'Croatie', flag: '🇭🇷' },
      { code: 'LV', name: 'Lettonie', flag: '🇱🇻' },
      { code: 'LT', name: 'Lituanie', flag: '🇱🇹' },
      { code: 'EE', name: 'Estonie', flag: '🇪🇪' },
      { code: 'RU', name: 'Russie', flag: '🇷🇺' },
    ],
  },
  {
    name: 'Amérique du Nord',
    countries: [
      { code: 'US', name: 'États-Unis', flag: '🇺🇸' },
      { code: 'CA', name: 'Canada', flag: '🇨🇦' },
      { code: 'MX', name: 'Mexique', flag: '🇲🇽' },
    ],
  },
  {
    name: 'Amérique du Sud',
    countries: [
      { code: 'BR', name: 'Brésil', flag: '🇧🇷' },
      { code: 'AR', name: 'Argentine', flag: '🇦🇷' },
      { code: 'CL', name: 'Chili', flag: '🇨🇱' },
      { code: 'CO', name: 'Colombie', flag: '🇨🇴' },
      { code: 'PE', name: 'Pérou', flag: '🇵🇪' },
    ],
  },
  {
    name: 'Asie',
    countries: [
      { code: 'JP', name: 'Japon', flag: '🇯🇵' },
      { code: 'CN', name: 'Chine', flag: '🇨🇳' },
      { code: 'KR', name: 'Corée du Sud', flag: '🇰🇷' },
      { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
      { code: 'SG', name: 'Singapour', flag: '🇸🇬' },
      { code: 'TW', name: 'Taïwan', flag: '🇹🇼' },
      { code: 'TH', name: 'Thaïlande', flag: '🇹🇭' },
      { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
      { code: 'IN', name: 'Inde', flag: '🇮🇳' },
    ],
  },
  {
    name: 'Moyen-Orient & Afrique',
    countries: [
      { code: 'AE', name: 'Émirats arabes unis', flag: '🇦🇪' },
      { code: 'SA', name: 'Arabie saoudite', flag: '🇸🇦' },
      { code: 'IL', name: 'Israël', flag: '🇮🇱' },
      { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦' },
      { code: 'MA', name: 'Maroc', flag: '🇲🇦' },
    ],
  },
  {
    name: 'Océanie',
    countries: [
      { code: 'AU', name: 'Australie', flag: '🇦🇺' },
      { code: 'NZ', name: 'Nouvelle-Zélande', flag: '🇳🇿' },
    ],
  },
];

const ALL_COUNTRIES = CONTINENTS.flatMap(c => c.countries);

interface CountryMultiSelectProps {
  value: string[];
  onChange: (countries: string[]) => void;
  placeholder?: string;
  hint?: string;
}

// Parse legacy comma-separated string into array of country names
export function parseMarketString(str: string): string[] {
  if (!str || !str.trim()) return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

export default function CountryMultiSelect({ value, onChange, placeholder = 'Sélectionnez des pays...' }: CountryMultiSelectProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (countryName: string) => {
    if (value.includes(countryName)) {
      onChange(value.filter(v => v !== countryName));
    } else {
      onChange([...value, countryName]);
    }
  };

  const remove = (countryName: string) => {
    onChange(value.filter(v => v !== countryName));
  };

  const getFlag = (name: string) => ALL_COUNTRIES.find(c => c.name === name)?.flag ?? '🌍';

  const filtered = search.trim()
    ? ALL_COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <div
        className={cn(
          'min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer flex flex-wrap gap-1.5 items-center',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          open && 'ring-2 ring-ring ring-offset-2'
        )}
        onClick={() => setOpen(o => !o)}
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground flex-1">{placeholder || t('countryMultiSelect.placeholder')}</span>
        ) : (
          value.map(name => (
            <Badge key={name} variant="secondary" className="flex items-center gap-1 text-xs pr-1">
              <span>{getFlag(name)}</span>
              <span>{name}</span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); remove(name); }}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))
        )}
        <ChevronDown className={cn('ml-auto h-4 w-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-72 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder={t('countryMultiSelect.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {filtered ? (
              // Search results
              filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground px-3 py-4 text-center">{t('countryMultiSelect.noResults')}</p>
              ) : (
                <div>
                  {filtered.map(country => (
                    <CountryOption key={country.code} country={country} selected={value.includes(country.name)} onToggle={toggle} />
                  ))}
                </div>
              )
            ) : (
              // Grouped by continent
              CONTINENTS.map(continent => (
                <div key={continent.name}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                    {t(`countryMultiSelect.continents.${continent.name}`, continent.name)}
                  </div>
                  {continent.countries.map(country => (
                    <CountryOption key={country.code} country={country} selected={value.includes(country.name)} onToggle={toggle} />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CountryOption({ country, selected, onToggle }: { country: Country; selected: boolean; onToggle: (name: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(country.name)}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left transition-colors',
        selected && 'bg-primary/10 font-medium'
      )}
    >
      <span className="text-base leading-none">{country.flag}</span>
      <span className="flex-1">{country.name}</span>
      {selected && <span className="text-primary text-xs">✓</span>}
    </button>
  );
}
