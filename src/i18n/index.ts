/**
 * Translation lookup.
 *
 * Static shell markup carries `data-i18n-key` (textContent) plus optional
 * `data-i18n-aria` / `data-i18n-title` / `data-i18n-placeholder` attributes
 * and is refreshed by applyTranslations(). Dynamically built content calls
 * t() directly at build time instead.
 */

import itDict from './it.json'
import enDict from './en.json'

export type Lang = 'it' | 'en'

const LANG_KEY = 'eli6subnets_lang'

const dicts: Record<Lang, Record<string, string>> = {
  it: itDict,
  en: enDict,
}

let current: Lang = resolveInitialLang()
const listeners = new Set<(lang: Lang) => void>()

function readStoredLang(): Lang | null {
  try {
    const raw = localStorage.getItem(LANG_KEY)
    return raw === 'it' || raw === 'en' ? raw : null
  } catch {
    // localStorage unavailable (private mode, non-browser test env)
    return null
  }
}

/** Stored preference wins, otherwise the browser language with Italian fallback. */
export function resolveInitialLang(): Lang {
  const stored = readStoredLang()
  if (stored) return stored
  const nav = typeof navigator !== 'undefined' ? navigator.language : ''
  return nav.toLowerCase().startsWith('it') ? 'it' : 'en'
}

export function getLang(): Lang {
  return current
}

/** Switch language: persists, re-translates the static shell, notifies subscribers. */
export function setLang(lang: Lang): void {
  if (lang !== 'it' && lang !== 'en' || lang === current) return
  current = lang
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {
    // non-fatal: language still switches for this session
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang
    applyTranslations(document)
  }
  for (const listener of listeners) listener(lang)
}

export function onLangChange(listener: (lang: Lang) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Positional placeholder substitution: {0}, {1}, … */
export function t(key: string, ...args: (string | number)[]): string {
  let text: string | undefined = dicts[current][key]
  if (text === undefined) text = key
  for (let i = 0; i < args.length; i++) {
    text = text.split(`{${i}}`).join(String(args[i]))
  }
  return text
}

/** Format a count with locale-aware grouping (4294967296 → 4.294.967.296). */
export function formatNumber(value: number): string {
  return value.toLocaleString(current === 'it' ? 'it-IT' : 'en-US')
}

function readAttr(el: Element, name: string): (string | number)[] {
  const raw = el.getAttribute(name)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as (string | number)[]
  } catch {
    // a single unquoted value is still usable as one argument
    return [raw]
  }
  return []
}

/**
 * Walk a subtree and refresh every element annotated with a translation key.
 * Called after the static shell is mounted and on every language switch.
 */
export function applyTranslations(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n-key]').forEach(el => {
    const key = el.dataset['i18nKey']
    if (!key) return
    el.textContent = t(key, ...readAttr(el, 'data-i18n-args'))
  })
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset['i18nAria'] ?? '', ...readAttr(el, 'data-i18n-args')))
  })
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset['i18nTitle'] ?? '')
  })
  root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset['i18nPlaceholder'] ?? '')
  })
}

/** Sync <html lang> with the resolved language at bootstrap. */
export function initLang(): Lang {
  if (typeof document !== 'undefined') document.documentElement.lang = current
  return current
}
