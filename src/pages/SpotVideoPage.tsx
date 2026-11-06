import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { ArrowRight, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SPOT_VIDEO_SRC } from "@/components/landing/SpotVideo";
import spotPoster from "@/assets/spot-poster.jpg";

const PAGE_URL = "https://wine-exporters.com/video";

const SpotVideoPage = () => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PAGE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Helmet>
        <title>{t("landing.spot.pageTitle")}</title>
        <meta name="description" content={t("landing.spot.pageDescription")} />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:type" content="video.other" />
        <meta property="og:title" content={t("landing.spot.pageTitle")} />
        <meta property="og:description" content={t("landing.spot.pageDescription")} />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:video" content={`https://wine-exporters.com${SPOT_VIDEO_SRC}`} />
        <meta property="og:video:type" content="video/mp4" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-6 py-12 lg:py-20 flex flex-col gap-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← {t("landing.spot.home")}
        </Link>
        <h1 className="font-display text-3xl sm:text-4xl font-bold">{t("landing.spot.title")}</h1>
        <p className="text-muted-foreground">{t("landing.spot.description")}</p>
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-muted shadow-xl ring-1 ring-border">
          <video
            src={SPOT_VIDEO_SRC}
            controls
            playsInline
            preload="metadata"
            poster={spotPoster}
            lang="fr"
            className="h-full w-full"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild size="lg">
            <Link to="/market-analysis">
              {t("landing.spot.cta")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" onClick={copy}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Link2 className="mr-2 h-4 w-4" />}
            {copied ? t("landing.spot.copied") : t("landing.spot.share")}
          </Button>
        </div>
      </div>
    </main>
  );
};

export default SpotVideoPage;
