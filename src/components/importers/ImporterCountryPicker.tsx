import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { COUNTRIES, CONTINENT_ORDER } from './country-data';
import { normalizeCountrySearch } from './importer-selection';

export function ImporterCountryPicker({value, onChange}: {value: string; onChange: (value: string) => void}) {
  const {t, i18n} = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const english = i18n.language.startsWith('en');
  const label = (country: typeof COUNTRIES[number]) => english ? country.englishName : country.name;
  const selected = COUNTRIES.find(c=>c.code===value);
  const filtered = COUNTRIES.filter(c=>normalizeCountrySearch(`${c.name} ${c.englishName}`).includes(normalizeCountrySearch(search)));
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={open} aria-label={t('importerProfile.countrySelectPlaceholder')} className="w-full justify-between sm:w-64">
      <span className="truncate">{selected ? label(selected) : t('importerProfile.countrySelectPlaceholder')}</span><ChevronDown className="ml-2 h-4 w-4 shrink-0" />
    </Button></PopoverTrigger>
    <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] p-0">
      <Command shouldFilter={false}>
        <CommandInput value={search} onValueChange={setSearch} placeholder={t('importerProfile.countrySearch')} />
        <CommandList><CommandEmpty>{t('importerProfile.countryEmpty')}</CommandEmpty>
          {CONTINENT_ORDER.map(continent => <CommandGroup key={continent} heading={t(`importerProfile.continents.${continent}`)}>
            {filtered.filter(c=>c.continent===continent).sort((a,b)=>label(a).localeCompare(label(b), english?'en':'fr')).map(country=><CommandItem key={country.code} value={country.code} onSelect={()=>{onChange(country.code);setOpen(false);setSearch('');}}>
              <span className="flex-1">{label(country)}</span>{value===country.code && <Check className="h-4 w-4" />}
            </CommandItem>)}
          </CommandGroup>)}
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}