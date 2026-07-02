import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Grape, CheckCircle2 } from "lucide-react";

const INTEREST_SLUGS = [
  "samples",
  "price_list",
  "presentation",
  "technical_sheets",
  "visio_call",
  "phone_call",
] as const;

type InterestSlug = (typeof INTEREST_SLUGS)[number];

interface CampaignInfo {
  campaign_id: string;
  campaign_name: string;
  producer_name: string;
}

export default function CampaignInterestForm() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<CampaignInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [interests, setInterests] = useState<InterestSlug[]>([]);

  useEffect(() => {
    if (!campaignId) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("get_campaign_public_info", {
        _campaign_id: campaignId,
      });
      if (!error && data && data.length > 0) {
        setInfo(data[0] as CampaignInfo);
      }
      setLoading(false);
    })();
  }, [campaignId]);

  const toggleInterest = (slug: InterestSlug, checked: boolean) => {
    setInterests((prev) =>
      checked ? [...prev, slug] : prev.filter((s) => s !== slug),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !info) return;
    setError(null);
    setSubmitting(true);
    const { error } = await (supabase.from as any)("campaign_interest_responses").insert({
      campaign_id: campaignId,
      full_name: fullName.trim().slice(0, 120),
      email: email.trim().toLowerCase().slice(0, 255),
      company: company.trim().slice(0, 200) || null,
      country: country.trim().slice(0, 100) || null,
      interests,
    });
    setSubmitting(false);
    if (error) {
      setError(t("interestForm.errorGeneric"));
      return;
    }
    setSubmitted(true);
  };

  const producerName = info?.producer_name || info?.campaign_name || "";

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Helmet>
        <title>{producerName ? `${producerName} — Interest form` : "Interest form"}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <header className="py-6 px-4 flex items-center justify-center gap-2 text-primary">
        <Grape className="h-6 w-6" />
        <span className="font-bold text-lg tracking-tight">WineExporters</span>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <Card className="w-full max-w-xl">
          {loading ? (
            <CardContent className="py-16 text-center text-muted-foreground">
              {t("interestForm.loading")}
            </CardContent>
          ) : !info ? (
            <CardContent className="py-16 text-center text-muted-foreground">
              {t("interestForm.notFound")}
            </CardContent>
          ) : submitted ? (
            <CardContent className="py-16 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
              <h1 className="text-2xl font-bold">{t("interestForm.success.title")}</h1>
              <p className="text-muted-foreground">
                {t("interestForm.success.message", { name: producerName })}
              </p>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">{producerName}</CardTitle>
                <p className="text-sm text-muted-foreground pt-1">
                  {t("interestForm.subtitle", { name: producerName })}
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">
                      {t("interestForm.fields.fullName")} *
                    </Label>
                    <Input
                      id="fullName"
                      required
                      maxLength={120}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("interestForm.fields.email")} *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      maxLength={255}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">
                        {t("interestForm.fields.company")}
                      </Label>
                      <Input
                        id="company"
                        maxLength={200}
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">
                        {t("interestForm.fields.country")}
                      </Label>
                      <Input
                        id="country"
                        maxLength={100}
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>{t("interestForm.interests.title")}</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {INTEREST_SLUGS.map((slug) => (
                        <label
                          key={slug}
                          className="flex items-center gap-2 rounded-md border border-input p-3 cursor-pointer hover:bg-accent transition-colors"
                        >
                          <Checkbox
                            checked={interests.includes(slug)}
                            onCheckedChange={(c) => toggleInterest(slug, c === true)}
                          />
                          <span className="text-sm">
                            {t(`interestForm.interests.${slug}`)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive" role="alert">
                      {error}
                    </p>
                  )}

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting
                      ? t("interestForm.submitting")
                      : t("interestForm.submit")}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}