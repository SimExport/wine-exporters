import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { CheckCard, Field } from "./Field";
import {
  CERTIFICATIONS,
  CERTIFICATION_NONE,
  MarketAnalysisForm,
  PRICE_RANGES,
  WINE_TYPES,
} from "./options";

interface Props {
  form: MarketAnalysisForm;
  errors: Record<string, string>;
  update: <K extends keyof MarketAnalysisForm>(key: K, value: MarketAnalysisForm[K]) => void;
}

export function StepWines({ form, errors, update }: Props) {
  const { t } = useTranslation();

  const toggleWineType = (value: string) => {
    update(
      "wine_types",
      form.wine_types.includes(value)
        ? form.wine_types.filter((v) => v !== value)
        : [...form.wine_types, value]
    );
  };

  const toggleCertification = (value: string) => {
    if (value === CERTIFICATION_NONE) {
      update("certifications", form.certifications.includes(CERTIFICATION_NONE) ? [] : [CERTIFICATION_NONE]);
      return;
    }
    const next = form.certifications
      .filter((v) => v !== CERTIFICATION_NONE)
      .filter((v) => v !== value);
    update("certifications", form.certifications.includes(value) ? next : [...next, value]);
  };

  return (
    <div className="space-y-6">
      <Field label={t("marketAnalysis.step2.wineTypes")} required error={errors.wine_types}>
        <div className="grid gap-2 sm:grid-cols-2">
          {WINE_TYPES.map((o) => (
            <CheckCard
              key={o.value}
              checked={form.wine_types.includes(o.value)}
              onToggle={() => toggleWineType(o.value)}
              label={t(`marketAnalysis.step2.wineTypeOptions.${o.key}`)}
            />
          ))}
        </div>
      </Field>

      <Field
        id="appellations_cuvees"
        label={t("marketAnalysis.step2.appellations")}
        required
        error={errors.appellations_cuvees}
      >
        <Textarea
          id="appellations_cuvees"
          rows={3}
          maxLength={1000}
          placeholder={t("marketAnalysis.step2.appellationsPh")}
          value={form.appellations_cuvees}
          onChange={(e) => update("appellations_cuvees", e.target.value)}
        />
      </Field>

      <Field
        label={t("marketAnalysis.step2.priceRange")}
        required
        help={t("marketAnalysis.step2.priceRangeHelp")}
        error={errors.export_price_range}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {PRICE_RANGES.map((o) => (
            <CheckCard
              key={o.value}
              type="radio"
              checked={form.export_price_range === o.value}
              onToggle={() => update("export_price_range", o.value)}
              label={t(`marketAnalysis.step2.priceRangeOptions.${o.key}`)}
            />
          ))}
        </div>
      </Field>

      <Field label={t("marketAnalysis.step2.certifications")} help={t("common.optional")}>
        <div className="grid gap-2 sm:grid-cols-2">
          {CERTIFICATIONS.map((o) => (
            <CheckCard
              key={o.value}
              checked={form.certifications.includes(o.value)}
              onToggle={() => toggleCertification(o.value)}
              label={t(`marketAnalysis.step2.certificationOptions.${o.key}`)}
            />
          ))}
        </div>
      </Field>
    </div>
  );
}
