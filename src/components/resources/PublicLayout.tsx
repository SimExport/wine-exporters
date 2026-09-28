import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/** Mise en page publique légère pour les visiteurs non connectés. */
const PublicLayout = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="WineExporters">
            <BrandLogo className="h-9 w-auto" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link to="/ressources" className="hidden text-sm font-medium text-foreground/80 hover:text-foreground sm:inline">
              {t("seoArticles.nav.resources")}
            </Link>
            <LanguageSwitcher />
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">{t("seoArticles.nav.login")}</Link>
            </Button>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/market-analysis">{t("seoArticles.nav.analysis")}</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} WineExporters by ExportVins</span>
          <div className="flex gap-4">
            <Link to="/ressources" className="hover:text-foreground">{t("seoArticles.nav.resources")}</Link>
            <Link to="/market-analysis" className="hover:text-foreground">{t("seoArticles.nav.analysis")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
