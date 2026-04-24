import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "sidebar" | "inline";
}

const LANGS = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
] as const;

export function LanguageSwitcher({ className, variant = "inline" }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "fr").split("-")[0];

  const change = (code: string) => {
    if (code !== current) {
      i18n.changeLanguage(code);
    }
  };

  if (variant === "sidebar") {
    return (
      <div
        className={cn(
          "flex items-center gap-1 rounded-lg bg-sidebar-accent/40 p-1",
          className,
        )}
        role="group"
        aria-label={t("common.language")}
      >
        <Languages className="h-3.5 w-3.5 text-sidebar-foreground/70 ml-1 shrink-0 group-data-[collapsible=icon]:hidden" />
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => change(l.code)}
            aria-pressed={current === l.code}
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
              current === l.code
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border bg-background p-1",
        className,
      )}
      role="group"
      aria-label={t("common.language")}
    >
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => change(l.code)}
          aria-pressed={current === l.code}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
            current === l.code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;