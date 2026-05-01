import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Grape, Globe, Megaphone, CheckCircle2, ArrowRight, Sparkles, X, Wand2, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LS_KEY = "onboarding_completed";

const REGIONS = ["Bordeaux", "Bourgogne", "Alsace", "Rhône", "Loire", "Languedoc", "Provence", "Autres"];
const WINE_TYPES = ["Rouge", "Blanc", "Rosé", "Effervescent", "Liquoreux"];
const VOLUMES = ["< 10 000 btl", "10-50K", "50-100K", "> 100K"];
const CERTIFS = ["Bio", "HVE", "Biodynamie", "Aucune"];
const PRICE_RANGES = ["5-10€", "10-20€", "20€+"];

const MARKETS = [
  { id: "scandinavia", emoji: "🇸🇪", labelKey: "markets.scandinavia" },
  { id: "benelux", emoji: "🇧🇪", labelKey: "markets.benelux" },
  { id: "dach", emoji: "🇩🇪", labelKey: "markets.dach" },
  { id: "uk", emoji: "🇬🇧", labelKey: "markets.uk" },
  { id: "usa_canada", emoji: "🇺🇸", labelKey: "markets.usaCanada" },
  { id: "asia", emoji: "🇯🇵", labelKey: "markets.asia" },
];

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialStep?: number;
}

export function OnboardingWizard({ open, onClose, onComplete, initialStep = 0 }: OnboardingWizardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);

  // Form state
  const [domainName, setDomainName] = useState("");
  const [region, setRegion] = useState("");
  const [wineTypes, setWineTypes] = useState<string[]>([]);
  const [volume, setVolume] = useState("");
  const [certifs, setCertifs] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState("");
  const [markets, setMarkets] = useState<string[]>([]);
  const [otherMarket, setOtherMarket] = useState("");

  // Pre-fill from profile
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("domain_name, location, wine_types, certifications, bottles_per_year, priority_markets")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) return;
      if (data.domain_name) setDomainName(data.domain_name);
      if (data.location && REGIONS.includes(data.location)) setRegion(data.location);
      if (data.wine_types?.length) setWineTypes(data.wine_types as string[]);
      if (data.certifications?.length) setCertifs(data.certifications as string[]);
      if (data.bottles_per_year) {
        const b = data.bottles_per_year;
        if (b < 10000) setVolume("< 10 000 btl");
        else if (b < 50000) setVolume("10-50K");
        else if (b < 100000) setVolume("50-100K");
        else setVolume("> 100K");
      }
      if (data.priority_markets) {
        const csv = data.priority_markets.split(",").map(s => s.trim()).filter(Boolean);
        setMarkets(csv.filter(m => MARKETS.some(opt => opt.id === m)));
        const other = csv.find(m => !MARKETS.some(opt => opt.id === m));
        if (other) setOtherMarket(other);
      }
    })();
  }, [open, user]);

  if (!open) return null;

  const totalSteps = 4;
  const progress = ((step + 1) / totalSteps) * 100;

  const toggle = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const persistStep2 = async () => {
    if (!user) return false;
    const bottles = volume === "< 10 000 btl" ? 5000
      : volume === "10-50K" ? 30000
      : volume === "50-100K" ? 75000
      : volume === "> 100K" ? 150000 : null;
    const { error } = await supabase.from("profiles").update({
      domain_name: domainName || null,
      location: region || null,
      wine_types: wineTypes,
      certifications: certifs,
      bottles_per_year: bottles,
    }).eq("user_id", user.id);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  };

  const persistStep3 = async () => {
    if (!user) return false;
    const all = [...markets, otherMarket.trim()].filter(Boolean).join(", ");
    const { error } = await supabase.from("profiles").update({
      priority_markets: all || null,
    }).eq("user_id", user.id);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  };

  const markCompleted = async () => {
    if (!user) return;
    localStorage.setItem(LS_KEY, "true");
    await supabase.from("profiles").update({
      onboarding_completed: true,
      onboarding_dismissed_at: null,
    }).eq("user_id", user.id);
  };

  const dismiss = async () => {
    if (user) {
      await supabase.from("profiles").update({
        onboarding_dismissed_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    }
    onClose();
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      if (step === 1) {
        if (!(await persistStep2())) return;
      } else if (step === 2) {
        if (markets.length === 0 && !otherMarket.trim()) {
          toast({ title: t("onboarding.step3.minMarketTitle"), description: t("onboarding.step3.minMarketDesc"), variant: "destructive" });
          return;
        }
        if (!(await persistStep3())) return;
      }
      setStep(s => Math.min(s + 1, totalSteps - 1));
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async (goToCampaign: boolean) => {
    setSaving(true);
    try {
      await markCompleted();
      onComplete();
      if (goToCampaign) navigate("/create-campaign");
      else navigate("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen flex flex-col">
        {/* Top progress bar */}
        <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Grape className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">{t("onboarding.brand")}</span>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("onboarding.stepCounter", { current: step + 1, total: totalSteps })}
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-2xl">
            {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
            {step === 1 && (
              <StepDomain
                domainName={domainName} setDomainName={setDomainName}
                region={region} setRegion={setRegion}
                wineTypes={wineTypes} toggleWine={(v) => toggle(wineTypes, v, setWineTypes)}
                volume={volume} setVolume={setVolume}
                certifs={certifs} toggleCertif={(v) => toggle(certifs, v, setCertifs)}
                priceRange={priceRange} setPriceRange={setPriceRange}
              />
            )}
            {step === 2 && (
              <StepMarkets
                markets={markets}
                toggleMarket={(v) => toggle(markets, v, setMarkets)}
                otherMarket={otherMarket} setOtherMarket={setOtherMarket}
              />
            )}
            {step === 3 && (
              <StepCampaign onChoose={handleFinish} saving={saving} summary={{ domainName, region, wineTypes, markets: [...markets, otherMarket].filter(Boolean) }} />
            )}
          </div>
        </div>

        {/* Footer actions */}
        {step < 3 && (
          <div className="border-t bg-background/80 backdrop-blur sticky bottom-0">
            <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
              <button
                onClick={dismiss}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                {t("onboarding.skip")}
              </button>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={saving}>
                    {t("common.back")}
                  </Button>
                )}
                <Button onClick={step === 0 ? () => setStep(1) : handleNext} disabled={saving}>
                  {step === 0 ? t("onboarding.start") : t("onboarding.nextStep")}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Close X */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-2 rounded-md hover:bg-muted text-muted-foreground"
          aria-label={t("common.close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ---------- Step components ---------- */

function StepWelcome({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation();
  const items = [
    { icon: Grape, label: t("onboarding.welcome.s1") },
    { icon: Globe, label: t("onboarding.welcome.s2") },
    { icon: Megaphone, label: t("onboarding.welcome.s3") },
    { icon: CheckCircle2, label: t("onboarding.welcome.s4") },
  ];
  return (
    <div className="text-center space-y-8">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("onboarding.welcome.title")} 🍷</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">{t("onboarding.welcome.subtitle")}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 flex flex-col items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <it.icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground/80 text-center">{it.label}</span>
          </div>
        ))}
      </div>
      <Button size="lg" onClick={onNext} className="px-8">
        {t("onboarding.start")}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function StepDomain(p: {
  domainName: string; setDomainName: (v: string) => void;
  region: string; setRegion: (v: string) => void;
  wineTypes: string[]; toggleWine: (v: string) => void;
  volume: string; setVolume: (v: string) => void;
  certifs: string[]; toggleCertif: (v: string) => void;
  priceRange: string; setPriceRange: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold tracking-tight">{t("onboarding.step2.title")}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t("onboarding.step2.subtitle")}</p>
      </header>
      <div className="space-y-5">
        <div>
          <Label>{t("onboarding.step2.domainName")}</Label>
          <Input value={p.domainName} onChange={e => p.setDomainName(e.target.value)} className="mt-1.5" placeholder="Château ..." />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>{t("onboarding.step2.region")}</Label>
            <Select value={p.region} onValueChange={p.setRegion}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder={t("onboarding.step2.regionPh")} /></SelectTrigger>
              <SelectContent>
                {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("onboarding.step2.volume")}</Label>
            <Select value={p.volume} onValueChange={p.setVolume}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder={t("onboarding.step2.volumePh")} /></SelectTrigger>
              <SelectContent>
                {VOLUMES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="mb-2 block">{t("onboarding.step2.wineTypes")}</Label>
          <div className="flex flex-wrap gap-2">
            {WINE_TYPES.map(w => (
              <button
                key={w}
                type="button"
                onClick={() => p.toggleWine(w)}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-sm transition",
                  p.wineTypes.includes(w)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted"
                )}
              >{w}</button>
            ))}
          </div>
        </div>
        <div>
          <Label className="mb-2 block">{t("onboarding.step2.certifs")}</Label>
          <div className="flex flex-wrap gap-2">
            {CERTIFS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => p.toggleCertif(c)}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-sm transition",
                  p.certifs.includes(c)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted"
                )}
              >{c}</button>
            ))}
          </div>
        </div>
        <div>
          <Label>{t("onboarding.step2.priceRange")}</Label>
          <Select value={p.priceRange} onValueChange={p.setPriceRange}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder={t("onboarding.step2.priceRangePh")} /></SelectTrigger>
            <SelectContent>
              {PRICE_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function StepMarkets(p: {
  markets: string[]; toggleMarket: (v: string) => void;
  otherMarket: string; setOtherMarket: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold tracking-tight">{t("onboarding.step3.title")}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t("onboarding.step3.subtitle")}</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MARKETS.map(m => {
          const active = p.markets.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => p.toggleMarket(m.id)}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border text-left transition",
                active ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"
              )}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-sm font-medium flex-1">{t(`onboarding.${m.labelKey}`)}</span>
              <Checkbox checked={active} className="pointer-events-none" />
            </button>
          );
        })}
      </div>
      <div>
        <Label>{t("onboarding.step3.other")}</Label>
        <Input
          value={p.otherMarket}
          onChange={e => p.setOtherMarket(e.target.value)}
          className="mt-1.5"
          placeholder={t("onboarding.step3.otherPh")}
        />
      </div>
    </div>
  );
}

function StepCampaign({ onChoose, saving, summary }: {
  onChoose: (goToCampaign: boolean) => void;
  saving: boolean;
  summary: { domainName: string; region: string; wineTypes: string[]; markets: string[] };
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-7">
      <header className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{t("onboarding.step4.title")}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t("onboarding.step4.subtitle")}</p>
      </header>

      {/* Summary recap */}
      <Card className="p-4 bg-muted/30">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{t("onboarding.step4.recap")}</p>
        <div className="space-y-1.5 text-sm">
          {summary.domainName && <div><span className="text-muted-foreground">{t("onboarding.step2.domainName")}: </span><span className="font-medium">{summary.domainName}</span></div>}
          {summary.region && <div><span className="text-muted-foreground">{t("onboarding.step2.region")}: </span><span className="font-medium">{summary.region}</span></div>}
          {summary.wineTypes.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-muted-foreground">{t("onboarding.step2.wineTypes")}: </span>
              {summary.wineTypes.map(w => <Badge key={w} variant="secondary" className="text-xs">{w}</Badge>)}
            </div>
          )}
          {summary.markets.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-muted-foreground">{t("onboarding.step3.title")}: </span>
              {summary.markets.map(m => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}
            </div>
          )}
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card
          className="p-5 cursor-pointer hover:shadow-md transition border-2 hover:border-primary"
          onClick={() => !saving && onChoose(true)}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
            <Wand2 className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">{t("onboarding.step4.optionA.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("onboarding.step4.optionA.desc")}</p>
        </Card>
        <Card
          className="p-5 cursor-pointer hover:shadow-md transition border-2 hover:border-muted-foreground/30"
          onClick={() => !saving && onChoose(false)}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">{t("onboarding.step4.optionB.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("onboarding.step4.optionB.desc")}</p>
        </Card>
      </div>
    </div>
  );
}