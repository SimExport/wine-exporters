import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Country {
  code: string;
  name: string;
  flag: string;
}

interface Continent {
  name: string;
  countries: Country[];
}

export const IMPORTERS_CONTINENTS: Continent[] = [
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

export const ALL_IMPORTER_COUNTRIES = IMPORTERS_CONTINENTS.flatMap(c => c.countries);

export function getCountryByCode(code: string) {
  return ALL_IMPORTER_COUNTRIES.find(c => c.code === code);
}
export function getCountryByName(name: string) {
  return ALL_IMPORTER_COUNTRIES.find(c => c.name === name);
}

interface CountrySingleSelectProps {
  value: string; // country code
  onChange: (code: string) => void;
  placeholder?: string;
  availableCodes?: string[]; // optional: only show these codes
}

export default function CountrySingleSelect({
  value,
  onChange,
  placeholder = 'Choisir un marché',
  availableCodes,
}: CountrySingleSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = value ? ALL_IMPORTER_COUNTRIES.find(c => c.code === value) : null;

  const filterCountries = (countries: Country[]) => {
    const base = availableCodes
      ? countries.filter(c => availableCodes.includes(c.code))
      : countries;
    if (!search.trim()) return base;
    return base.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  };

  const filteredAll = search.trim()
    ? ALL_IMPORTER_COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) &&
        (!availableCodes || availableCodes.includes(c.code))
      )
    : null;

  const select = (code: string) => {
    onChange(code);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full min-w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm',
          'flex items-center gap-2 cursor-pointer hover:bg-accent/30 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          open && 'ring-2 ring-ring ring-offset-2'
        )}
      >
        {selected ? (
          <>
            <span className="text-base leading-none">{selected.flag}</span>
            <span className="flex-1 text-left font-medium">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[260px] rounded-md border border-border bg-popover shadow-xl max-h-80 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 shrink-0">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Rechercher un pays..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Clear option */}
          {value && (
            <button
              type="button"
              onClick={() => select('')}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent text-left border-b border-border"
            >
              ✕ Effacer la sélection
            </button>
          )}

          <div className="overflow-y-auto flex-1">
            {filteredAll ? (
              filteredAll.length === 0 ? (
                <p className="text-sm text-muted-foreground px-3 py-4 text-center">Aucun résultat</p>
              ) : (
                filteredAll.map(c => (
                  <CountryOption key={c.code} country={c} selected={value === c.code} onSelect={select} />
                ))
              )
            ) : (
              IMPORTERS_CONTINENTS.map(continent => {
                const countries = filterCountries(continent.countries);
                if (countries.length === 0) return null;
                return (
                  <div key={continent.name}>
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/60 sticky top-0 z-10">
                      {continent.name}
                    </div>
                    {countries.map(c => (
                      <CountryOption key={c.code} country={c} selected={value === c.code} onSelect={select} />
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CountryOption({
  country,
  selected,
  onSelect,
}: {
  country: Country;
  selected: boolean;
  onSelect: (code: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(country.code)}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left transition-colors',
        selected && 'bg-primary/10 font-medium text-primary'
      )}
    >
      <span className="text-base leading-none">{country.flag}</span>
      <span className="flex-1">{country.name}</span>
      {selected && <span className="text-primary text-xs">✓</span>}
    </button>
  );
}
