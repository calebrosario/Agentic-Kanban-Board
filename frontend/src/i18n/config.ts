import i18n from 'i18next';
import { initReactI18next } from 'react-i18next/initReactI18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    common: require('./locales/en/common.json'),
    sidebar: require('./locales/en/sidebar.json'),
    session: require('./locales/en/session.json'),
    workflow: require('./locales/en/workflow.json'),
    auth: require('./locales/en/auth.json'),
    workitem: require('./locales/en/workitem.json'),
    settings: require('./locales/en/settings.json'),
  },
  'zh-CN': {
    common: require('./locales/zh-CN/common.json'),
    sidebar: require('./locales/zh-CN/sidebar.json'),
    session: require('./locales/zh-CN/session.json'),
    workflow: require('./locales/zh-CN/workflow.json'),
    auth: require('./locales/zh-CN/auth.json'),
    workitem: require('./locales/zh-CN/workitem.json'),
    settings: require('./locales/zh-CN/settings.json'),
  },
  'zh-TW': {
    common: require('./locales/zh-TW/common.json'),
    sidebar: require('./locales/zh-TW/sidebar.json'),
    session: require('./locales/zh-TW/session.json'),
    workflow: require('./locales/zh-TW/workflow.json'),
    auth: require('./locales/zh-TW/auth.json'),
    workitem: require('./locales/zh-TW/workitem.json'),
    settings: require('./locales/zh-TW/settings.json'),
  },
  es: {
    common: require('./locales/es/common.json'),
    sidebar: require('./locales/es/sidebar.json'),
    session: require('./locales/es/session.json'),
    workflow: require('./locales/es/workflow.json'),
    auth: require('./locales/es/auth.json'),
    workitem: require('./locales/es/workitem.json'),
    settings: require('./locales/es/settings.json'),
  },
  ja: {
    common: require('./locales/ja/common.json'),
    sidebar: require('./locales/ja/sidebar.json'),
    session: require('./locales/ja/session.json'),
    workflow: require('./locales/ja/workflow.json'),
    auth: require('./locales/ja/auth.json'),
    workitem: require('./locales/ja/workitem.json'),
    settings: require('./locales/ja/settings.json'),
  },
  pt: {
    common: require('./locales/pt/common.json'),
    sidebar: require('./locales/pt/sidebar.json'),
    session: require('./locales/pt/session.json'),
    workflow: require('./locales/pt/workflow.json'),
    auth: require('./locales/pt/auth.json'),
    workitem: require('./locales/pt/workitem.json'),
    settings: require('./locales/pt/settings.json'),
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: 'en',
    debug: false,
    detection: {
      order: ['navigator'],  // Only use browser language, ignore localStorage
      caches: [],  // Don't cache language preference
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
