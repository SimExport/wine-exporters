import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "./Field";
import { MarketAnalysisForm } from "./options";

interface Props {
  form: MarketAnalysisForm;
  update: <K extends keyof MarketAnalysisForm>(key: K, value: MarketAnalysisForm[K]) => void;
}

export function StepDetails({ form, update }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Field id="additional_context" label={t("marketAnalysis.step4.context")}>
        <Textarea
          id="additional_context"
          rows={5}
          maxLength={2000}
          placeholder={t("marketAnalysis.step4.contextPh")}
          value={form.additional_context}
          onChange={(e) => update("additional_context", e.target.value)}
        />
      </Field>

      <p className="rounded-md bg-cream p-4 text-sm text-cream-foreground">
        {t("marketAnalysis.step4.recap")}
      </p>
    </div>
  );
}
