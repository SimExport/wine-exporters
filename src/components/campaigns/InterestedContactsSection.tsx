import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Users, UserPlus, Check, Mail, Search, ChevronDown, Sparkles,
} from 'lucide-react';
import { getCountryFlag } from '@/lib/country-flag';

export interface InterestedContact {
  id: string;
  company_name: string;
  email: string | null;
  contact_name: string | null;
  country: string | null;
  score: number | null;
  description: string | null;
  recommended_actions: string | null;
  added_to_crm_by: string[] | null;
  /** 'form' = interest form respondent (default). 'click' = imported clicker via Brevo sync. */
  origin?: 'form' | 'click';
}

interface Props {
  contacts: InterestedContact[];
  currentUserId: string | undefined;
  addingId: string | null;
  onAdd: (c: InterestedContact) => void;
}

type SortKey = 'score' | 'name' | 'country';
type ScoreFilter = 'all' | '8' | '6';
type SourceFilter = 'all' | 'form' | 'click';

export function InterestedContactsSection({ contacts, currentUserId, addingId, onAdd }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('score');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const isAdded = (c: InterestedContact) =>
    !!currentUserId && (c.added_to_crm_by || []).includes(currentUserId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = contacts.filter((c) => {
      if (sourceFilter !== 'all' && (c.origin ?? 'form') !== sourceFilter) return false;
      if (scoreFilter !== 'all') {
        const min = parseInt(scoreFilter, 10);
        if ((c.score ?? 0) < min) return false;
      }
      if (!q) return true;
      return [c.company_name, c.contact_name, c.email, c.country, c.description]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q));
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return a.company_name.localeCompare(b.company_name);
      if (sortBy === 'country') return (a.country || '').localeCompare(b.country || '');
      return (b.score ?? -1) - (a.score ?? -1);
    });
    return list;
  }, [contacts, query, sortBy, scoreFilter, sourceFilter]);

  const addedCount = contacts.filter(isAdded).length;
  const total = contacts.length;
  const formCount = contacts.filter((c) => (c.origin ?? 'form') === 'form').length;
  const clickCount = contacts.filter((c) => c.origin === 'click').length;
  const progress = total > 0 ? Math.round((addedCount / total) * 100) : 0;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('campaigns.detail.interestedContactsCard')}
            <Badge variant="secondary" className="ml-2">{total}</Badge>
            {clickCount > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                · {t('campaigns.detail.interestedContacts.splitCounts', {
                  form: formCount,
                  click: clickCount,
                  defaultValue: `${formCount} formulaire · ${clickCount} cliqueurs`,
                })}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-3 min-w-[220px]">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {t('campaigns.detail.interestedContacts.progress', {
                added: addedCount, total, defaultValue: `${addedCount} / ${total} ajoutés`,
              })}
            </span>
            <Progress value={progress} className="h-2 flex-1" />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center pt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('campaigns.detail.interestedContacts.searchPlaceholder', {
                defaultValue: 'Rechercher société, contact, email…',
              })}
              className="pl-8"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">{t('campaigns.detail.interestedContacts.sort.score', { defaultValue: 'Score décroissant' })}</SelectItem>
              <SelectItem value="name">{t('campaigns.detail.interestedContacts.sort.name', { defaultValue: 'Nom' })}</SelectItem>
              <SelectItem value="country">{t('campaigns.detail.interestedContacts.sort.country', { defaultValue: 'Pays' })}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={scoreFilter} onValueChange={(v) => setScoreFilter(v as ScoreFilter)}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('campaigns.detail.interestedContacts.filter.all', { defaultValue: 'Tous les scores' })}</SelectItem>
              <SelectItem value="8">{t('campaigns.detail.interestedContacts.filter.gte8', { defaultValue: 'Score ≥ 8' })}</SelectItem>
              <SelectItem value="6">{t('campaigns.detail.interestedContacts.filter.gte6', { defaultValue: 'Score ≥ 6' })}</SelectItem>
            </SelectContent>
          </Select>
          {clickCount > 0 && (
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('campaigns.detail.interestedContacts.filterSource.all', { defaultValue: 'Toutes sources' })}</SelectItem>
                <SelectItem value="form">{t('campaigns.detail.interestedContacts.filterSource.form', { defaultValue: 'Formulaire' })}</SelectItem>
                <SelectItem value="click">{t('campaigns.detail.interestedContacts.filterSource.click', { defaultValue: 'Cliqueurs' })}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {t('campaigns.detail.interestedContacts.noResults', { defaultValue: 'Aucun prospect ne correspond à votre recherche.' })}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((c) => (
              <ProspectCard
                key={c.id}
                c={c}
                added={isAdded(c)}
                adding={addingId === c.id}
                onAdd={onAdd}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProspectCard({
  c, added, adding, onAdd,
}: {
  c: InterestedContact; added: boolean; adding: boolean; onAdd: (c: InterestedContact) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const flag = getCountryFlag(c.country);
  const origin = c.origin ?? 'form';

  const scoreVariant: 'default' | 'secondary' | 'outline' = c.score != null
    ? (c.score >= 8 ? 'default' : c.score >= 6 ? 'secondary' : 'outline')
    : 'outline';

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-base truncate">{c.company_name}</h3>
            <Badge
              variant={origin === 'form' ? 'default' : 'outline'}
              className="shrink-0 text-[10px] uppercase tracking-wide"
            >
              {origin === 'form'
                ? t('campaigns.detail.interestedContacts.origin.form', { defaultValue: 'Formulaire' })
                : t('campaigns.detail.interestedContacts.origin.click', { defaultValue: 'Cliqueur' })}
            </Badge>
          </div>
          {(c.contact_name || c.email) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {c.contact_name && <span>{c.contact_name}</span>}
              {c.email && (
                <a
                  href={`mailto:${c.email}`}
                  className="flex items-center gap-1 text-primary hover:underline min-w-0"
                >
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{c.email}</span>
                </a>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {c.score != null && (
            <Badge variant={scoreVariant}>{c.score}/10</Badge>
          )}
          {c.country && (
            <Badge variant="outline" className="gap-1 font-normal">
              {flag && <span>{flag}</span>}
              <span>{c.country}</span>
            </Badge>
          )}
        </div>
      </div>

      {c.description && (
        <div className="text-sm text-foreground/80">
          <p className={expanded ? 'whitespace-pre-wrap' : 'whitespace-pre-wrap line-clamp-3'}>
            {c.description}
          </p>
          {c.description.length > 180 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs font-medium text-primary hover:underline"
            >
              {expanded
                ? t('campaigns.detail.interestedContacts.seeLess', { defaultValue: 'Voir moins' })
                : t('campaigns.detail.interestedContacts.seeMore', { defaultValue: 'Voir plus' })}
            </button>
          )}
        </div>
      )}

      {c.recommended_actions && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground group">
            <Sparkles className="h-3.5 w-3.5" />
            {t('campaigns.detail.interestedContacts.actions')}
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
              {c.recommended_actions}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="mt-auto flex justify-end pt-1">
        {added ? (
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" />
            {t('campaigns.detail.interestedContacts.added')}
          </Badge>
        ) : (
          <Button size="sm" variant="outline" disabled={adding} onClick={() => onAdd(c)}>
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            {t('campaigns.detail.interestedContacts.addToCrm')}
          </Button>
        )}
      </div>
    </div>
  );
}
