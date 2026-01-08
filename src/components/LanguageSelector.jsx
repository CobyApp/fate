import { useI18n } from '../contexts/I18nContext';
import './LanguageSelector.css';

const LanguageSelector = () => {
  const { language, changeLanguage, languages } = useI18n();

  return (
    <div className="language-selector">
      <select
        value={language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="language-select"
        aria-label="Select language"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
