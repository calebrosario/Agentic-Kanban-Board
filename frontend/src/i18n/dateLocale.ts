import { enUS, zhCN, zhTW, es, ja, pt } from 'date-fns/locale';

export const getDateLocale = (lang: string) => {
  const localeMap: any = {
    en: enUS,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    es: es,
    ja: ja,
    pt: pt,
  };

  return localeMap[lang] || enUS;
};
