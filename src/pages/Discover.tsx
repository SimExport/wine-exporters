import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import heroAsset from "@/assets/decouvrir-export.jpg.asset.json";

const SUPADEMO_ID = "cmsisxkjk2b9wqmaa2mnkakvr";

const COPY = {
  fr: {
    seoTitle: "Trouvez vos importateurs de vin | WineExporters",
    seoDesc:
      "Recevez la brochure WineExporters et la vidéo de la plateforme utilisée par les domaines viticoles pour trouver leurs importateurs.",
    eyebrow: "21 000+ importateurs vérifiés dans 140+ pays",
    title: "Découvrez comment les domaines viticoles trouvent leurs importateurs.",
    subtitle:
      "La brochure et la vidéo de démonstration, dans votre boîte mail en un clic. De quoi voir concrètement comment fonctionne la plateforme avant d'aller plus loin.",
    firstName: "Prénom",
    domain: "Nom du domaine",
    email: "Email professionnel",
    phone: "Téléphone",
    optional: "facultatif",
    submit: "Recevoir la brochure et la vidéo",
    submitting: "Envoi en cours",
    error: "L'envoi a échoué. Réessayez dans un instant.",
    successTitle: "C'est envoyé.",
    successBody:
      "La vidéo de démonstration vient de partir sur votre email. Vous pouvez aussi la découvrir tout de suite.",
    videoCta: "Voir la plateforme en vidéo",
    bookLink: "Prendre un rendez-vous avec Simon, le fondateur",
    legal: "Vos informations servent uniquement à vous envoyer ces documents et à vous recontacter.",
  },
  en: {
    seoTitle: "Find your wine importers | WineExporters",
    seoDesc:
      "Get the WineExporters brochure and the platform video used by wine estates to find their importers.",
    eyebrow: "21,000+ verified importers across 140+ countries",
    title: "See how wine estates find their importers.",
    subtitle:
      "The brochure and the demo video, in your inbox in one click. Enough to see concretely how the platform works before going further.",
    firstName: "First name",
    domain: "Estate name",
    email: "Work email",
    phone: "Phone",
    optional: "optional",
    submit: "Get the brochure and the video",
    submitting: "Sending",
    error: "Sending failed. Please try again in a moment.",
    successTitle: "It's on its way.",
    successBody:
      "The demo video has just been sent to your email. You can also watch it right now.",
    videoCta: "Watch the platform video",
    bookLink: "Book a meeting with Simon, the founder",
    legal: "Your details are only used to send these documents and to get back to you.",
  },
} as const;

declare global {
  interface Window {
    Supademo?: { open: (id: string) => void };
  }
}

const Discover = () => {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || i18n.language || "fr").startsWith("en") ? "en" : "fr";
  const t = COPY[lang];

  const [firstName, setFirstName] = useState("");
  const [domainName, setDomainName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (document.querySelector('script[src="https://script.supademo.com/supademo.js"]')) return;
    const script = document.createElement("script");
    script.src = "https://script.supademo.com/supademo.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const openVideo = () => {
    if (window.Supademo?.open) {
      window.Supademo.open(SUPADEMO_ID);
    } else {
      window.open(`https://app.supademo.com/demo/${SUPADEMO_ID}`, "_blank", "noopener");
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: fnError } = await supabase.functions.invoke("submit-brochure-request", {
      body: {
        first_name: firstName,
        domain_name: domainName,
        email,
        phone,
        locale: lang,
        source: "emelia",
      },
    });
    setLoading(false);
    if (fnError) {
      setError(t.error);
      return;
    }
    setDone(true);
  };

  const fieldClass =
    "w-full rounded-lg border border-[#e0d3c2] bg-[#fffdfa] px-4 py-3 text-[15px] text-[#1a1a1a] placeholder-[#a89685] outline-none transition-colors focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/25";
  const labelClass = "mb-1.5 block text-[13px] font-medium tracking-wide text-[#6b5346]";

  return (
    <div className="min-h-screen bg-[#faf6f0] font-[Rubik,Arial,sans-serif] text-[#1a1a1a]">
      <SEO title={t.seoTitle} description={t.seoDesc} path="/decouvrir" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-7">
        <div className="leading-tight">
          <div className="font-serif text-xl font-bold text-[#59191F]">WineExporters</div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#9c8877]">by ExportVins</div>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-20 pt-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <section>
          <p className="mb-6 inline-flex items-center gap-2 border-l-2 border-[#C9A84C] pl-3 text-[13px] font-medium uppercase tracking-[0.12em] text-[#8a6b3e]">
            {t.eyebrow}
          </p>
          <h1 className="font-serif text-[2.4rem] font-semibold leading-[1.12] text-[#59191F] sm:text-[3.1rem]">
            {t.title}
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-[#5c4a41]">{t.subtitle}</p>

          <div className="relative mt-12 hidden lg:block">
            <img
              src={heroAsset.url}
              width={1400}
              height={1000}
              alt="Bouteilles de vin soigneusement rangées dans une caisse d'export"
              className="w-full rounded-2xl object-contain saturate-[0.85]"
            />
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[#59191F]/10" />
          </div>
        </section>

        <section className="rounded-2xl border border-[#e7dccd] bg-[#fffdfa] p-7 shadow-[0_18px_50px_-30px_rgba(89,25,31,0.55)] sm:p-9">
          {done ? (
            <div>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[#59191F]">
                <Check className="h-5 w-5 text-[#faf6f0]" strokeWidth={2.5} />
              </div>
              <h2 className="font-serif text-2xl font-semibold text-[#59191F]">{t.successTitle}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#5c4a41]">{t.successBody}</p>
              <div className="mt-7">
                <button
                  type="button"
                  onClick={openVideo}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#59191F] px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#43121a]"
                >
                  <Play className="h-4 w-4" />
                  {t.videoCta}
                </button>
              </div>
              <p className="mt-4 text-center text-[13px] text-[#6b5346]">
                <a
                  href="https://calendar.app.google/xPLu8ru2PpdC2uoG8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-[#C9A84C] underline-offset-4 transition-colors hover:text-[#59191F]"
                >
                  {t.bookLink}
                </a>
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className={labelClass} htmlFor="firstName">
                  {t.firstName}
                </label>
                <input
                  id="firstName"
                  className={fieldClass}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="domainName">
                  {t.domain}
                </label>
                <input
                  id="domainName"
                  className={fieldClass}
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  maxLength={200}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="email">
                  {t.email}
                </label>
                <input
                  id="email"
                  type="email"
                  className={fieldClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="phone">
                  {t.phone}{" "}
                  <span className="font-normal normal-case text-[#a89685]">({t.optional})</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  className={fieldClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={40}
                />
              </div>

              {error && <p className="text-[13px] font-medium text-[#be2d2d]">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#59191F] px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#43121a] disabled:opacity-70"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? t.submitting : t.submit}
              </button>
              <p className="text-[12px] leading-relaxed text-[#9c8877]">{t.legal}</p>
            </form>
          )}
        </section>
      </main>

      <footer className="bg-[#2a0d0f] px-6 py-6 text-center text-[12px] text-[#d8c6b6]">
        WineExporters by ExportVins © 2026
      </footer>
    </div>
  );
};

export default Discover;