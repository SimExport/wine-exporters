import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Grape, ArrowLeft, CheckCircle2 } from "lucide-react";

const REGIONS = [
  "Alsace", "Beaujolais", "Bordeaux", "Bourgogne", "Champagne",
  "Corse", "Jura", "Languedoc-Roussillon", "Loire", "Provence",
  "Rhône", "Savoie", "Sud-Ouest", "Autre",
];

const VOLUMES = [
  "< 20 000 bouteilles",
  "20 000 – 50 000 bouteilles",
  "50 000 – 100 000 bouteilles",
  "100 000 – 250 000 bouteilles",
  "> 250 000 bouteilles",
];

const schema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  domain_name: z.string().trim().min(1).max(200),
  region: z.string().max(100).optional(),
  annual_volume: z.string().max(50).optional(),
  message: z.string().max(2000).optional(),
  consent: z.literal(true),
});

const DemoRequest = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const location = useLocation();
  const fromRedirect = (location.state as any)?.fromRegister === true;

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    domain_name: "",
    region: "",
    annual_volume: "",
    message: "",
    consent: false,
  });

  const update = (k: keyof typeof form, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({
        title: t("demoRequest.errorTitle"),
        description: t("demoRequest.errorValidation"),
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("submit-demo-request", {
        body: parsed.data,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast({
        title: t("demoRequest.errorTitle"),
        description: err?.message || t("demoRequest.errorGeneric"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title={t("seo.demo.title")} description={t("seo.demo.description")} path="/demande-demo" />
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-primary rounded-lg p-1.5 flex items-center justify-center">
              <Grape className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-base text-foreground">WineExporters</span>
              <span className="text-xs text-muted-foreground">by ExportVins</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">{t("demoRequest.haveAccount")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />{t("common.back")}</Link>
        </Button>

        {submitted ? (
          <Card>
            <CardContent className="p-10 text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">
                {t("demoRequest.thanksTitle", { name: form.first_name })}
              </h1>
              <p className="text-muted-foreground">{t("demoRequest.thanksBody")}</p>
              <Button asChild className="mt-4">
                <Link to="/">{t("demoRequest.backHome")}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{t("demoRequest.title")}</CardTitle>
              <CardDescription>
                {fromRedirect ? t("demoRequest.subtitleRedirect") : t("demoRequest.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">{t("demoRequest.firstName")} *</Label>
                    <Input id="first_name" required maxLength={100}
                      value={form.first_name} onChange={(e) => update("first_name", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">{t("demoRequest.lastName")} *</Label>
                    <Input id="last_name" required maxLength={100}
                      value={form.last_name} onChange={(e) => update("last_name", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("demoRequest.email")} *</Label>
                  <Input id="email" type="email" required maxLength={255}
                    value={form.email} onChange={(e) => update("email", e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domain_name">{t("demoRequest.domainName")} *</Label>
                  <Input id="domain_name" required maxLength={200}
                    value={form.domain_name} onChange={(e) => update("domain_name", e.target.value)} />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("demoRequest.region")}</Label>
                    <Select value={form.region} onValueChange={(v) => update("region", v)}>
                      <SelectTrigger><SelectValue placeholder={t("demoRequest.regionPh")} /></SelectTrigger>
                      <SelectContent>
                        {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("demoRequest.volume")}</Label>
                    <Select value={form.annual_volume} onValueChange={(v) => update("annual_volume", v)}>
                      <SelectTrigger><SelectValue placeholder={t("demoRequest.volumePh")} /></SelectTrigger>
                      <SelectContent>
                        {VOLUMES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{t("demoRequest.message")}</Label>
                  <Textarea id="message" rows={4} maxLength={2000}
                    placeholder={t("demoRequest.messagePh")}
                    value={form.message} onChange={(e) => update("message", e.target.value)} />
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox id="consent" checked={form.consent}
                    onCheckedChange={(v) => update("consent", v === true)} />
                  <Label htmlFor="consent" className="text-sm font-normal leading-snug cursor-pointer">
                    {t("demoRequest.consent")}
                  </Label>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {submitting ? t("demoRequest.submitting") : t("demoRequest.submit")}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default DemoRequest;