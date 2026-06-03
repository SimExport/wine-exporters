import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { US_STATES, normalizeUsState } from '@/lib/us-states';

interface Props {
  countryNames: string[]; // possible DB names for the country
  value: string[];
  onChange: (states: string[]) => void;
  max?: number;
}

export function StatesMultiSelect({ countryNames, value, onChange, max = 3 }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!countryNames.length) { setOptions([]); return; }
      setLoading(true);
      const { data, error } = await supabase
        .from('buyer_contacts')
        .select('state')
        .in('country', countryNames)
        .not('state', 'is', null);
      if (cancelled) return;
      if (error) {
        console.error(error);
        setOptions([]);
      } else {
        // Normalize raw states to canonical US state names; only keep
        // canonical states that actually have at least one contact.
        const available = new Set<string>();
        for (const r of (data || []) as { state: string | null }[]) {
          const canon = normalizeUsState(r.state);
          if (canon) available.add(canon);
        }
        const ordered = US_STATES.filter((s) => available.has(s));
        setOptions(ordered);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [countryNames.join('|')]);

  const toggle = (s: string) => {
    if (value.includes(s)) onChange(value.filter(v => v !== s));
    else if (value.length < max) onChange([...value, s]);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between">
            <span className="text-sm">
              {value.length === 0
                ? t('sourcing.states.placeholder')
                : t('sourcing.states.selected', { count: value.length, max })}
            </span>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronsUpDown className="h-4 w-4 opacity-50" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder={t('sourcing.states.search')} />
            <CommandList>
              <CommandEmpty>{t('sourcing.states.empty')}</CommandEmpty>
              <CommandGroup>
                {options.map(s => {
                  const selected = value.includes(s);
                  const disabled = !selected && value.length >= max;
                  return (
                    <CommandItem
                      key={s}
                      onSelect={() => !disabled && toggle(s)}
                      className={cn(disabled && 'opacity-40 cursor-not-allowed')}
                    >
                      <Check className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                      {s}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(s => (
            <Badge key={s} variant="secondary" className="gap-1">
              {s}
              <button onClick={() => toggle(s)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t('sourcing.states.max', { max })}</p>
    </div>
  );
}