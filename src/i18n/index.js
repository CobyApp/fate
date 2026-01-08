import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';

const translations = {
  ko,
  en,
  ja,
};

// localStorage에서 언어 가져오기 (브라우저 환경 체크)
const getStoredLanguage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('language') || 'ko';
  }
  return 'ko';
};

let currentLanguage = getStoredLanguage();

export const setLanguage = (lang) => {
  if (translations[lang]) {
    currentLanguage = lang;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('language', lang);
    }
  }
};

export const getLanguage = () => {
  // 항상 최신 localStorage 값 확인
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem('language');
    if (stored && translations[stored]) {
      currentLanguage = stored;
    }
  }
  return currentLanguage;
};

export const t = (key, params = {}) => {
  const keys = key.split('.');
  let value = translations[currentLanguage];
  
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return key;
    }
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  // 파라미터 치환
  return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
    return params[paramKey] !== undefined ? params[paramKey] : match;
  });
};

export const languages = [
  { code: 'ko', name: '한국어' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
];
