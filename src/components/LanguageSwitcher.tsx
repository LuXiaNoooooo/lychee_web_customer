import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { LuGlobe, LuChevronDown } from 'react-icons/lu';

const languages = {
  en: { short: 'EN', full: 'English' },
  zh: { short: '中文', full: '中文' },
  it: { short: 'IT', full: 'Italiano' },
};

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCurrentLanguage = () => {
    return i18n.language === "zh" ? "中文" : 
           i18n.language === "it" ? "IT" : "EN";
  };

  return (
    <div ref={dropdownRef} className="dropdown">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        title={t('language.switch')}
        className="small-button small-button--dropdown"
      >
        <LuGlobe />
        <span>{getCurrentLanguage()}</span>
        <LuChevronDown />
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          {Object.entries(languages).map(([code, lang]) => (
            <button
              key={code}
              className={`dropdown-option ${i18n.language === code ? 'active' : ''}`}
              onClick={() => {
                i18n.changeLanguage(code);
                setIsOpen(false);
              }}
            >
              {lang.full}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 