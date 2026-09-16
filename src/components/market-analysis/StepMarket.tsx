import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { CheckCard, Field } from "./Field";
import { CountryCombobox } from "./CountryCombobox";
import { IMPORTER_LET_US_CHOOSE, IMPORTER_PREFERENCES, MarketAnalysisForm } from "./options";

interface Props {
  form: MarketAnalysisForm;
  errors: Record<string, string>;
  update: <K extends keyof MarketAnalysisForm>(key: K, value: MarketAnalysisForm[K]) => void;
}

export function StepMarket({ form, errors, update }: Props) {
  const { t } = useTranslation();

  const togglePreference = (value: string) => {
    if (value === IMPORTER_LET_US_CHOOSE) {
      update(
        "importer_preferences",
        form.importer_preferences.includes(IMPORTER_LET_US_CHOOSE) ? [] : [IMPORTER_LET_US_CHOOSE]
      );
      return;
    }
    const next = form.importer_preferences
      .filter((v) => v !== IMPORTER_LET_US_CHOOSE)
      .filter((v) => v !== value);
    update(
      "importer_preferences",
      form.importer_preferences.includes(value) ? next : [...next, value]
    );
  };

  return (
    <div className="space-y-6">
      <Field label={t("marketAnalysis.step3.country")} required error={errors.target_country}>
        <CountryCombobox
          value={form.target_country}
          onChange={(v) => update("target_country", v)}
          invalid={!!errors.target_country}
        />
      </Field>

      <Field
        label={t("marketAnalysis.step3.importerTypes")}
        help={t("marketAnalysis.step3.importerTypesHelp")}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {IMPORTER_PREFERENCES.map((o) => (
            <CheckCard
              key={o.value}
              checked={form.importer_preferences.includes(o.value)}
              onToggle={() => togglePreference(o.value)}
              label={t(`marketAnalysis.step3.importerTypeOptions.${o.key}`)}
            />
          ))}
        </div>
      </Field>

      <Field id="exclusions" label={t("marketAnalysis.step3.exclusions")}>
        <Textarea
          id="exclusions"
          rows={3}
          maxLength={1000}
          placeholder={t("marketAnalysis.step3.exclusionsPh")}
          value={form.exclusions}
          onChange={(e) => update("exclusions", e.target.value)}
        />
      </Field>
    </div>
  );
}
