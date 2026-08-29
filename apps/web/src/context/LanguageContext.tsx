import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { sourceStrings, Language } from '../i18n/sourceStrings';
import { translationService } from '../services/translationService';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translateStatus: (status: string) => string;
  translatePriority: (priority: string) => string;
  translateDepartment: (dept: string) => string;
  formatNumber: (num: number) => string;
  formatTime: (date: Date | string | number) => string;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('queuesense_language');
    if (saved === 'en' || saved === 'hi' || saved === 'mr') {
      return saved as Language;
    }
    return 'en';
  });

  const [translationVersion, setTranslationVersion] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const requestedKeysRef = useRef<Set<string>>(new Set());

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('queuesense_language', lang);
  }, []);

  // Pre-fetch / translate all source strings when language changes to non-English
  useEffect(() => {
    if (language === 'en') return;

    let isMounted = true;
    setIsTranslating(true);

    const stringValues = Object.values(sourceStrings);
    translationService.translateBatch(stringValues, language).then(() => {
      if (isMounted) {
        setTranslationVersion((v) => v + 1);
        setIsTranslating(false);
      }
    }).catch(() => {
      if (isMounted) setIsTranslating(false);
    });

    return () => {
      isMounted = false;
    };
  }, [language]);

  // Main dynamic translation resolver
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const englishText = sourceStrings[key] || key;
      if (language === 'en') {
        let res = englishText;
        if (params) {
          Object.entries(params).forEach(([pKey, pVal]) => {
            res = res.replace(new RegExp(`{${pKey}}`, 'g'), String(pVal));
          });
        }
        return res;
      }

      // Check runtime translation service cache
      let translated = translationService.getCached(englishText, language);

      if (!translated) {
        // Request runtime translation if not already in-flight
        const reqKey = `${language}:${englishText}`;
        if (!requestedKeysRef.current.has(reqKey)) {
          requestedKeysRef.current.add(reqKey);
          translationService.translateText(englishText, language).then(() => {
            setTranslationVersion((v) => v + 1);
          });
        }
        translated = englishText; // graceful fallback while loading
      }

      let text = translated;
      if (params) {
        Object.entries(params).forEach(([pKey, pVal]) => {
          text = text.replace(new RegExp(`{${pKey}}`, 'g'), String(pVal));
        });
      }

      return text;
    },
    [language, translationVersion]
  );

  // Runtime Clinical Status Translation
  const translateStatus = useCallback(
    (status: string): string => {
      const s = (status || '').toLowerCase().replace(/[\s-]+/g, '_');
      if (s === 'waiting') return t('status.waiting');
      if (s === 'in_progress' || s === 'in_consultation') return t('status.in_consultation');
      if (s === 'completed') return t('status.completed');
      if (s === 'no_show') return t('status.no_show');
      if (s === 'available') return t('status.available');
      if (s === 'busy') return t('status.busy');
      if (s === 'on_break') return t('status.on_break');
      if (s === 'offline') return t('status.offline');
      return status;
    },
    [t]
  );

  // Runtime Priority Translation
  const translatePriority = useCallback(
    (priority: string): string => {
      const p = (priority || '').toUpperCase();
      if (p === 'EMERGENCY') return t('priority.emergency');
      if (p === 'URGENT') return t('priority.urgent');
      return t('priority.routine');
    },
    [t]
  );

  // Runtime Medical Department Translation
  const translateDepartment = useCallback(
    (dept: string): string => {
      const d = (dept || '').toLowerCase();
      if (d.includes('general') || d.includes('gm')) return t('dept.general_medicine');
      if (d.includes('cardio') || d.includes('cd')) return t('dept.cardiology');
      if (d.includes('pediat') || d.includes('pd')) return t('dept.pediatrics');
      if (d.includes('ortho') || d.includes('or')) return t('dept.orthopedics');
      if (d.includes('derma') || d.includes('dm')) return t('dept.dermatology');
      return dept;
    },
    [t]
  );

  // Locale-aware number formatting
  const formatNumber = useCallback(
    (num: number): string => {
      try {
        const locale = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
        return new Intl.NumberFormat(locale).format(num);
      } catch {
        return String(num);
      }
    },
    [language]
  );

  // Locale-aware time formatting
  const formatTime = useCallback(
    (date: Date | string | number): string => {
      try {
        const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
        const locale = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-US';
        return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      } catch {
        return String(date);
      }
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        translateStatus,
        translatePriority,
        translateDepartment,
        formatNumber,
        formatTime,
        isTranslating,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
