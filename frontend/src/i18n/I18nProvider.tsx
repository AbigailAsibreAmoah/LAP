import type { Lang, Localized } from '@laporte/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readLocal, writeLocal } from '../utils/storage';
import { en, fr, type MessageKey } from './dictionary';

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey) => string;
  l: (value: Localized) => string;
}

// Reused across hot reloads (see AppStore).
const i18nHolder = globalThis as { __laporteI18nContext?: React.Context<I18nValue | null> };
const I18nContext = (i18nHolder.__laporteI18nContext ??= createContext<I18nValue | null>(null));
const dictionaries = { en, fr };

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (readLocal('laporte-lang') === 'fr' ? 'fr' : 'en'));

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    writeLocal('laporte-lang', next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key) => dictionaries[lang][key] ?? key,
      l: (value) => value[lang],
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
