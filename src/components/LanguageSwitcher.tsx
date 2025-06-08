import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { IoLanguage } from 'react-icons/io5';
import { MdArrowDropDown } from 'react-icons/md';
const languages = {
  en: { short: 'EN', full: 'English' },
  zh: { short: '中', full: '中文' },
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

  return (
    <div ref={dropdownRef} className="dropdown">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        title={t('language.switch')}
        className="small-button small-button--dropdown"
      >
        <IoLanguage /> {languages[i18n.language as keyof typeof languages].short}
        <MdArrowDropDown />
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