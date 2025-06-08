import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import zhTranslations from './locales/zh.json';
import itTranslations from './locales/it.json';

// Get stored language from sessionStorage or default to English
const storedLanguage = sessionStorage.getItem('i18nextLng') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      zh: { translation: zhTranslations },
      it: { translation: itTranslations }
    },
    lng: storedLanguage, // Use stored language or default to English
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n; 