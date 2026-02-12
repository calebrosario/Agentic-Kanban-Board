import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useI18nContext } from '../../contexts/I18nContext';

export const LanguageToggle: React.FC = () => {
  const { language, changeLanguage, isLoading, t } = useI18nContext();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh-CN', name: t('session.languageNames.zh-CN'), flag: '🇨🇳' },
    { code: 'zh-TW', name: t('session.languageNames.zh-TW'), flag: '🇹🇼' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'ja', name: t('session.languageNames.ja'), flag: '🇯🇵' },
    { code: 'pt', name: t('session.languageNames.pt'), flag: '🇧🇷' },
  ];
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = async (langCode: string) => {
    await changeLanguage(langCode);
    setIsOpen(false);
  };

  const currentLanguage = languages.find(lang => lang.code === language) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        disabled={isLoading}
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="font-medium">{currentLanguage.name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors ${
                language === lang.code ? 'bg-blue-100' : ''
              }`}
              disabled={isLoading}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className={`font-medium ${language === lang.code ? 'text-blue-600' : 'text-gray-900'}`}>
                {lang.name}
              </span>
              {language === lang.code && (
                <span className="ml-auto text-blue-600">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
