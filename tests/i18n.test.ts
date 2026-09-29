import { describe, it, expect, beforeAll, vi } from 'vitest'

const store = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem:    (key: string) => store.get(key) ?? null,
  setItem:    (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
})

const i18n = await import('../src/i18n/index')

describe('i18n', () => {
  beforeAll(() => {
    i18n.setLang('it')
  })

  it('returns the Italian string for a known key', () => {
    expect(i18n.t('nav.single')).toBe('Sottorete singola')
  })

  it('switches dictionaries when the language changes', () => {
    i18n.setLang('en')
    expect(i18n.t('nav.single')).toBe('Single subnet')
    i18n.setLang('it')
    expect(i18n.t('nav.single')).toBe('Sottorete singola')
  })

  it('substitutes positional placeholders', () => {
    expect(i18n.t('error.host_bits_set', '192.168.1.0/24')).toBe(
      'Bit host impostati. Rete corretta: 192.168.1.0/24.',
    )
    expect(i18n.t('flag.class', 'B')).toBe('Classe B')
  })

  it('returns the key itself when the translation is missing', () => {
    expect(i18n.t('does.not.exist')).toBe('does.not.exist')
  })

  it('persists the language choice', () => {
    i18n.setLang('en')
    expect(store.get('eli6subnets_lang')).toBe('en')
    i18n.setLang('it')
    expect(store.get('eli6subnets_lang')).toBe('it')
  })

  it('notifies subscribers exactly once per actual change', () => {
    const seen: string[] = []
    const unsubscribe = i18n.onLangChange(lang => seen.push(lang))
    i18n.setLang('en')
    i18n.setLang('en')
    i18n.setLang('it')
    unsubscribe()
    i18n.setLang('en')
    expect(seen).toEqual(['en', 'it'])
  })

  it('has an English counterpart for every Italian key', async () => {
    const it = (await import('../src/i18n/it.json')).default as Record<string, string>
    const en = (await import('../src/i18n/en.json')).default as Record<string, string>
    expect(Object.keys(en).sort()).toEqual(Object.keys(it).sort())
    const emptyKeys = Object.entries(it).filter(([, v]) => v === '').map(([k]) => k)
    expect(emptyKeys).toEqual([])
  })

  it('formats numbers with locale grouping', () => {
    i18n.setLang('it')
    expect(i18n.formatNumber(4294967296)).toBe('4.294.967.296')
    i18n.setLang('en')
    expect(i18n.formatNumber(4294967296)).toBe('4,294,967,296')
  })
})
