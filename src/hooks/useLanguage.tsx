import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translations, type Language, type Translation } from '../i18n/translations';

const STORAGE_KEY = 'wmc-lang';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translation;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'pt';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'en' || stored === 'es' || stored === 'pt' ? stored : 'pt';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage indisponível (modo privado etc.) — a troca de idioma
      // ainda funciona nessa sessão, só não persiste entre visitas
    }
  };

  // mantém o que o navegador e os leitores de tela enxergam alinhado com o
  // idioma na tela: sem isso o <html lang="pt-BR"> ficava mentindo quando o
  // visitante trocava pra inglês, e o leitor de tela lia o texto com o
  // sotaque errado
  useEffect(() => {
    const t = translations[language];
    const htmlLang: Record<Language, string> = { pt: 'pt-BR', en: 'en', es: 'es' };
    document.documentElement.lang = htmlLang[language];
    document.title = t.meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t.meta.description);
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, t: translations[language] }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage precisa estar dentro de um LanguageProvider');
  return ctx;
}
