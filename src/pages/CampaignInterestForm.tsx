import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Grape, CheckCircle2 } from "lucide-react";

const INTEREST_OPTIONS = [
  { slug: "samples", label: "Receive samples" },
  { slug: "price_list", label: "Request price list" },
  { slug: "presentation", label: "Receive presentation deck" },
  { slug: "technical_sheets", label: "Receive technical sheets" },
  { slug: "visio_call", label: "Schedule a video call" },
  { slug: "phone_call", label: "Schedule a phone call" },
] as const;

type InterestSlug = (typeof INTEREST_OPTIONS)[number]["slug"];

interface CampaignInfo {
  campaign_id: string;
  campaign_name: string;
  producer_name: string;
}

export default function CampaignInterestForm() {
  const { campaignId } = useParams<{ campaignId: string }>();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<CampaignInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
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
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "submit-campaign-interest",
        {
          body: {
            campaign_id: campaignId,
            full_name: fullName.trim().slice(0, 120),
            email: email.trim().toLowerCase().slice(0, 255),
            company: company.trim().slice(0, 200) || null,
            phone: phone.trim().slice(0, 40) || null,
            country: country.trim().slice(0, 100) || null,
            interests,
          },
        },
      );
      if (fnError || (data && (data as any).error)) {
        setError("Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch (err) {
      console.error("submit interest failed", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
              Loading…
            </CardContent>
          ) : !info ? (
            <CardContent className="py-16 text-center text-muted-foreground">
              This campaign link is invalid or no longer available.
            </CardContent>
          ) : submitted ? (
            <CardContent className="py-16 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
              <h1 className="text-2xl font-bold">Thank you!</h1>
              <p className="text-muted-foreground">
                {producerName} will be in touch shortly.
              </p>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">{producerName}</CardTitle>
                <p className="text-sm text-muted-foreground pt-1">
                  Fill in your details and {producerName} will get back to you directly within a few days.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name *</Label>
                    <Input
                      id="fullName"
                      required
                      maxLength={120}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
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
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        maxLength={200}
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        maxLength={40}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        maxLength={100}
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                      />
                  </div>

                  <div className="space-y-3">
                    <Label>What are you interested in?</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {INTEREST_OPTIONS.map(({ slug, label }) => (
                        <label
                          key={slug}
                          className="flex items-center gap-2 rounded-md border border-input p-3 cursor-pointer hover:bg-accent transition-colors"
                        >
                          <Checkbox
                            checked={interests.includes(slug)}
                            onCheckedChange={(c) => toggleInterest(slug, c === true)}
                          />
                          <span className="text-sm">{label}</span>
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
                    {submitting ? "Sending…" : "Send my interest"}
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