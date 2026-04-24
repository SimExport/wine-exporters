import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import fr from "./locales/fr.json";
import en from "./locales/en.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { common: fr },
      en: { common: en },
    },
    fallbackLng: "fr",
    supportedLngs: ["fr", "en"],
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
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