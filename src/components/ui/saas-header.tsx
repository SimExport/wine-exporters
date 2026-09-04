import * as React from "react";
import { Link } from "react-router-dom";
import { Menu, X, PlayCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";

export interface SaasHeaderProps {
  logoSrc: string;
  onWatchVideo?: () => void;
  className?: string;
}

const NAV_LINKS = [
  { href: "#method", key: "landing.nav.method" },
  { href: "#pricing", key: "landing.nav.pricing" },
  { href: "#faq", key: "landing.nav.faq" },
];

export const SaasHeader = React.memo(({ logoSrc, onWatchVideo, className }: SaasHeaderProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md",
        className
      )}
    >
      <div className="max-w-6xl mx-auto px-6 h-20 sm:h-24 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center shrink-0">
          <img
            src={logoSrc}
            alt="WineExporters"
            className="h-12 sm:h-16 w-auto"
            width={330}
            height={64}
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t(link.key)}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          {onWatchVideo && (
            <Button onClick={onWatchVideo}>
              <PlayCircle className="mr-2 h-4 w-4" />
              {t("landing.hero.ctaVideo")}
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth" className="text-muted-foreground">
              {t("landing.nav.signIn")}
            </Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={t("landing.nav.toggleMenu")}
          aria-expanded={open}
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {t(link.key)}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-3 border-t border-border pt-4">
              <LanguageSwitcher />
              {onWatchVideo && (
                <Button
                  onClick={() => {
                    setOpen(false);
                    onWatchVideo();
                  }}
                  className="w-full"
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {t("landing.hero.ctaVideo")}
                </Button>
              )}
              <Button variant="outline" asChild className="w-full">
                <Link to="/auth" onClick={() => setOpen(false)}>
                  {t("landing.nav.signIn")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

SaasHeader.displayName = "SaasHeader";
