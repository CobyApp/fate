import { createContext, useContext, useState, useEffect } from 'react';
import { getLanguage, setLanguage as setLang, t as translate, languages } from '../i18n';

const I18nContext = createContext(null);

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

export const I18nProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => getLanguage());
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // 초기 로드 시 localStorage에서 언어 가져오기
  useEffect(() => {
    const storedLang = getLanguage();
    if (storedLang !== language) {
      setLanguageState(storedLang);
    }
  }, []);

  const changeLanguage = (lang) => {
    setLang(lang);
    setLanguageState(lang);
    setUpdateTrigger(prev => prev + 1);
    // 강제 리렌더링을 위해 window 이벤트 발생
    window.dispatchEvent(new Event('languagechange'));
  };

  // 언어 변경 이벤트 리스너
  useEffect(() => {
    const handleLanguageChange = () => {
      setLanguageState(getLanguage());
      setUpdateTrigger(prev => prev + 1);
    };
    
    window.addEventListener('languagechange', handleLanguageChange);
    return () => {
      window.removeEventListener('languagechange', handleLanguageChange);
    };
  }, []);

  const t = (key, params) => {
    return translate(key, params);
  };

  return (
    <I18nContext.Provider value={{ language, changeLanguage, t, languages }}>
      {children}
    </I18nContext.Provider>
  );
};
