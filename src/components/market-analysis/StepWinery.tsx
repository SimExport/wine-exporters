import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Field } from "./Field";
import { MarketAnalysisForm } from "./options";

interface Props {
  form: MarketAnalysisForm;
  errors: Record<string, string>;
  update: <K extends keyof MarketAnalysisForm>(key: K, value: MarketAnalysisForm[K]) => void;
}

export function StepWinery({ form, errors, update }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <Field id="winery_name" label={t("marketAnalysis.step1.wineryName")} required error={errors.winery_name}>
        <Input
          id="winery_name"
          maxLength={200}
          placeholder={t("marketAnalysis.step1.wineryNamePh")}
          value={form.winery_name}
          onChange={(e) => update("winery_name", e.target.value)}
        />
      </Field>

      <Field id="contact_name" label={t("marketAnalysis.step1.contactName")} required error={errors.contact_name}>
        <Input
          id="contact_name"
          maxLength={200}
          value={form.contact_name}
          onChange={(e) => update("contact_name", e.target.value)}
        />
      </Field>

      <Field id="email" label={t("marketAnalysis.step1.email")} required error={errors.email}>
        <Input
          id="email"
          type="email"
          maxLength={255}
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
      </Field>

      <Field
        id="website"
        label={t("marketAnalysis.step1.website")}
        required
        help={t("marketAnalysis.step1.websiteHelp")}
        error={errors.website}
      >
        <Input
          id="website"
          type="url"
          maxLength={255}
          placeholder="https://"
          value={form.website}
          onChange={(e) => update("website", e.target.value)}
        />
      </Field>

      <Field
        id="winery_location"
        label={t("marketAnalysis.step1.location")}
        required
        error={errors.winery_location}
      >
        <Input
          id="winery_location"
          maxLength={200}
          placeholder={t("marketAnalysis.step1.locationPh")}
          value={form.winery_location}
          onChange={(e) => update("winery_location", e.target.value)}
        />
      </Field>
    </div>
  );
}
