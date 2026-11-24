import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EMPTY_TENDER_FILTERS, type TenderFilters as Filters } from '@/lib/tender-discovery';
import type { FilterOption } from '@/lib/opportunity-filters';

export function TenderFilters({ filters, onChange, markets, wines, count, total }: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  markets: FilterOption[];
  wines: FilterOption[];
  count: number;
  total: number;
}) {
  const { t } = useTranslation();
  const text = (key: string) => t(`opportunitiesUi.tenderControls.${key}`);
  const dirty = Object.keys(EMPTY_TENDER_FILTERS).some(key => filters[key as keyof Filters] !== EMPTY_TENDER_FILTERS[key as keyof Filters]);
  const selector = (field: 'market' | 'wine' | 'deadline', label: string, all: string, options: FilterOption[]) => (
    <Select value={filters[field] || '__all'} onValueChange={value => onChange({ ...filters, [field]: value === '__all' ? '' : value })}>
      <SelectTrigger className="h-10 min-w-0 text-sm [&>span]:truncate" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="__all">{all}</SelectItem>{options.map(option => <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>)}</SelectContent>
    </Select>
  );
  return <div className="mt-4 space-y-2">
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={filters.q} onChange={event => onChange({ ...filters, q: event.target.value })} placeholder={text('search')} aria-label={text('search')} className="h-10 pl-9 text-sm" />
      </div>
      <Button variant="ghost" className="h-10 shrink-0 gap-2 px-2 sm:px-3" title={t('opportunitiesUi.reset')} aria-label={t('opportunitiesUi.reset')} disabled={!dirty} onClick={() => onChange({ ...EMPTY_TENDER_FILTERS })}>
        <RotateCcw className="h-4 w-4" /><span className="hidden sm:inline">{t('opportunitiesUi.reset')}</span>
      </Button>
    </div>
    <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:grid-cols-4">
      {selector('market', text('market'), text('allMarkets'), markets)}
      {selector('wine', text('wine'), text('allWines'), wines)}
      {selector('deadline', text('deadline'), text('allDeadlines'), ['open', 'unconfirmed', 'expired'].map(key => ({ key, label: text(key) })))}
      <Select value={filters.sort} onValueChange={value => onChange({ ...filters, sort: value as Filters['sort'] })}>
        <SelectTrigger className="h-10 min-w-0 text-sm [&>span]:truncate" aria-label={text('sort')}><SelectValue /></SelectTrigger>
        <SelectContent>{['deadline_asc', 'deadline_desc'].map(key => <SelectItem key={key} value={key}>{text(key)}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <p className="text-sm text-muted-foreground" role="status" aria-live="polite">{t('opportunitiesUi.tenderControls.results', { count, total })}</p>
  </div>;
}

export function TenderPagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  const { t } = useTranslation();
  if (pages <= 1) return null;
  return <nav className="mt-5 flex items-center justify-center gap-3" aria-label={t('opportunitiesUi.tenderControls.pagination')}>
    <Button variant="outline" size="icon" aria-label={t('opportunitiesUi.tenderControls.previous')} title={t('opportunitiesUi.tenderControls.previous')} disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
    <span className="min-w-32 text-center text-sm tabular-nums text-muted-foreground">{t('opportunitiesUi.tenderControls.page', { page, pages })}</span>
    <Button variant="outline" size="icon" aria-label={t('opportunitiesUi.tenderControls.next')} title={t('opportunitiesUi.tenderControls.next')} disabled={page >= pages} onClick={() => onChange(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
  </nav>;
}