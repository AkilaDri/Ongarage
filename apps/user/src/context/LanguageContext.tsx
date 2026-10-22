import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONTS } from '@ongarage/shared';
import { EN } from '../i18n/en';

export type Lang = 'si' | 'en';

type LanguageState = { lang: Lang; setLang: (l: Lang) => void; tr: (text: string) => string };

const LanguageContext = createContext<LanguageState>({ lang: 'si', setLang: () => {}, tr: (t) => t });
const KEY = 'ongarage.lang';

// Longer phrases first, so a whole sentence wins over the words inside it.
const PHRASES = Object.keys(EN).sort((a, b) => b.length - a.length);
const cache = new Map<string, string>();

/** Sinhala → English: the whole text if it has an entry, else every phrase in it that has one (short entries only count as a whole text). */
export const toEnglish = (text: string): string => {
  const hit = cache.get(text);
  if (hit !== undefined) return hit;
  let out = EN[text.trim()] !== undefined ? text.replace(text.trim(), EN[text.trim()]) : text;
  if (out === text) {
    for (const p of PHRASES) {
      if (p.length >= 8 && p.includes(' ') && out.includes(p)) out = out.split(p).join(EN[p]);
    }
  }
  if (cache.size > 4000) cache.clear();
  cache.set(text, out);
  return out;
};

const translateChildren = (children: React.ReactNode): React.ReactNode => {
  if (typeof children === 'string') return toEnglish(children);
  if (Array.isArray(children)) return children.map((c) => (typeof c === 'string' ? toEnglish(c) : c));
  return children;
};

// Every <Text> reads the language and shows its words in English when English is chosen: one patch here instead of a change in every screen.
const DEFAULT_TEXT = { fontFamily: FONTS.bodyRegular, fontWeight: '400' as const };

const patchable = Text as unknown as { render?: (props: Record<string, unknown>, ref: unknown) => React.ReactElement; __i18n?: boolean };
if (patchable.render && !patchable.__i18n) {
  const original = patchable.render;
  patchable.__i18n = true;
  patchable.render = function render(props, ref) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { lang } = useContext(LanguageContext);
    // A text that names no font of its own gets the app's (a style written without a fontFamily would otherwise fall back to the browser's default face).
    const base = { ...props, style: [DEFAULT_TEXT, props.style] };
    const next = lang === 'en' && props.children !== undefined ? { ...base, children: translateChildren(props.children as React.ReactNode) } : base;
    return original.call(this, next, ref);
  };
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>('si');
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === 'en' || v === 'si') setLangState(v);
      })
      .catch(() => {});
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(KEY, l).catch(() => {});
  }, []);
  const value = useMemo<LanguageState>(() => ({ lang, setLang, tr: (t) => (lang === 'en' ? toEnglish(t) : t) }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLang = () => useContext(LanguageContext);
