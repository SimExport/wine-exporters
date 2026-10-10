import { useTranslation } from 'react-i18next';
import { Lock, Check, Briefcase, Database, Mail, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type PremiumFeature = 'opportunities' | 'importers' | 'campaigns' | 'sourcing';

const ICONS = { opportunities: Briefcase, importers: Database, campaigns: Mail, sourcing: Search };

const PremiumFeaturePreview = ({ feature, discountEligible }: { feature: PremiumFeature; discountEligible: boolean }) => {
  const { t } = useTranslation();
  const Icon = ICONS[feature];
  const benefits = t(`trial.features.${feature}.benefits`, { returnObjects: true }) as string[];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-border bg-card p-8 md:p-10 space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> {t('trial.reserved')}
          </span>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-heading text-foreground">{t(`trial.features.${feature}.title`)}</h1>
          <p className="text-muted-foreground leading-relaxed">{t(`trial.features.${feature}.intro`)}</p>
        </div>
        <ul className="space-y-3">
          {Array.isArray(benefits) && benefits.map((b) => (
            <li key={b} className="flex gap-3 text-foreground">
              <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" /> <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-xl bg-secondary/50 border border-border p-6 space-y-4">
          {discountEligible ? (
            <p className="text-foreground">
              <span className="font-semibold">{t('trial.offerPrice')}</span>{' '}
              <span className="text-muted-foreground line-through">{t('trial.standardPrice')}</span>
              <span className="block text-sm text-muted-foreground mt-1">{t('trial.offerNote')}</span>
            </p>
          ) : (
            <p className="text-foreground">{t('trial.subscribeNote')}</p>
          )}
          <Button asChild><a href="https://calendar.app.google/rfx7N1bBhJcbwyJg9" target="_blank" rel="noopener noreferrer">{t('trial.bookCall')}</a></Button>
          {/* Secondary 'Souscrire directement' intentionally hidden until Stripe link flow is verified */}
        </div>
      </div>
    </div>
  );
};

export default PremiumFeaturePreview;
