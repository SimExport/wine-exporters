import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import fr from "./locales/fr.json";
import en from "./locales/en.json";
import { importerProfileFr, importerProfileEn } from "./locales/importer-profile";
import { campaignEmailEditorFr, campaignEmailEditorEn } from "./locales/campaign-email-editor";
import { publicDirectoryFr, publicDirectoryEn } from "./locales/public-directory";
import { opportunitiesUiFr, opportunitiesUiEn } from "./locales/opportunities-ui";
import { submitOpportunityFr, submitOpportunityEn } from "./locales/submit-opportunity";

// The public importer form targets international buyers: default to EN there
// only when the visitor never chose a language. Not cached, so the rest of the
// site keeps its usual default; an explicit switch is persisted below.
const SUBMIT_ROUTES = ["/submit-opportunity", "/publier-opportunite"];
let storedLng: string | null = null;
try { storedLng = typeof window !== "undefined" ? window.localStorage.getItem("i18nextLng") : null; } catch { /* ignore */ }
const forceEnOnRoute =
  typeof window !== "undefined" &&
  !storedLng &&
  SUBMIT_ROUTES.some((r) => window.location.pathname.replace(/\/+$/, "") === r);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    ...(forceEnOnRoute ? { lng: "en" } : {}),
    resources: {
      fr: { common: { ...fr, importerProfile: importerProfileFr, emailEditor: campaignEmailEditorFr, publicDirectory: publicDirectoryFr, opportunitiesUi: opportunitiesUiFr, submitOpportunity: submitOpportunityFr } },
      en: { common: { ...en, importerProfile: importerProfileEn, emailEditor: campaignEmailEditorEn, publicDirectory: publicDirectoryEn, opportunitiesUi: opportunitiesUiEn, submitOpportunity: submitOpportunityEn } },
    },
    fallbackLng: "fr",
    supportedLngs: ["fr", "en"],
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: forceEnOnRoute ? [] : ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
    returnNull: false,
  });

// Keep <html lang> in sync with current language
if (typeof document !== "undefined") {
  const setLang = (lng: string) => {
    document.documentElement.setAttribute("lang", lng.split("-")[0]);
  };
  setLang(i18n.language || "fr");
  i18n.on("languageChanged", setLang);
}

export default i18n;