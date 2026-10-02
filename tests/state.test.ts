import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AppState } from '../src/state/persist'

const store = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem:    (key: string) => store.get(key) ?? null,
  setItem:    (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
})

const persist = await import('../src/state/persist')
const url     = await import('../src/state/url')

function sampleState(): AppState {
  const state = persist.defaultState()
  state.activeView = 'vlsm'
  state.lang  = 'en'
  state.theme = 'dark'
  state.tools.vlsm.baseCidr = '10.0.0.0/16'
  state.tools.vlsm.requests = [
    { name: 'Rete ospiti al piano 1 — più', hosts: '40' },
    { name: 'Server', hosts: '12' },
  ]
  state.tools.single.cidr = '192.168.1.5/24'
  state.tools.split = { cidr: '172.16.0.0/24', count: '3' }
  state.tools.supernet.cidrs = ['192.168.0.0/24', '192.168.1.0/24']
  state.cisco = { interfaceName: 'GigabitEthernet0/2', nextHop: '10.255.255.1' }
  return state
}

describe('state persistence', () => {
  beforeEach(() => {
    store.clear()
  })

  it('round-trips the full state through localStorage', () => {
    const original = sampleState()
    persist.saveState(original)
    expect(persist.loadState()).toEqual(original)
  })

  it('returns null when nothing has been saved', () => {
    expect(persist.loadState()).toBeNull()
  })

  it('returns null on corrupted JSON', () => {
    store.set(persist.STATE_KEY, '{not json')
    expect(persist.loadState()).toBeNull()
  })

  it('returns null on a schema version mismatch', () => {
    store.set(persist.STATE_KEY, JSON.stringify({ ...sampleState(), version: 99 }))
    expect(persist.loadState()).toBeNull()
  })

  it('fills in missing fields instead of failing', () => {
    // The legacy `activeTool` key must still map onto `activeView`.
    store.set(persist.STATE_KEY, JSON.stringify({ version: 1, activeTool: 'split' }))
    const loaded = persist.loadState()
    expect(loaded).not.toBeNull()
    expect(loaded?.activeView).toBe('split')
    expect(loaded?.tools.split).toEqual({ cidr: '', count: '' })
    expect(loaded?.tools.vlsm.requests).toEqual([])
  })

  it('rejects non-object payloads', () => {
    expect(persist.normalizeState(null)).toBeNull()
    expect(persist.normalizeState('hi')).toBeNull()
    expect(persist.normalizeState([1, 2, 3])).toBeNull()
  })

  it('clearState removes the saved blob', () => {
    persist.saveState(sampleState())
    persist.clearState()
    expect(store.has(persist.STATE_KEY)).toBe(false)
  })
})

describe('share URL', () => {
  it('round-trips inputs without loss', () => {
    const original = sampleState()
    const search   = url.encodeStateToUrl(original)
    const decoded  = url.decodeStateFromUrl(search)
    expect(decoded).not.toBeNull()
    expect(decoded?.activeView).toBe(original.activeView)
    expect(decoded?.tools).toEqual(original.tools)
    expect(decoded?.cisco).toEqual(original.cisco)
  })

  it('produces a URL-safe payload', () => {
    const search = url.encodeStateToUrl(sampleState())
    expect(search.startsWith('?s=')).toBe(true)
    expect(search).toMatch(/^[\?s=A-Za-z0-9\-_]+$/)
  })

  it('never leaks results or personal preferences', () => {
    const decoded = url.decodeStateFromUrl(url.encodeStateToUrl(sampleState()))
    expect(decoded).not.toHaveProperty('lang')
    expect(decoded).not.toHaveProperty('theme')
  })

  it('returns null for a missing or malformed payload', () => {
    expect(url.decodeStateFromUrl('')).toBeNull()
    expect(url.decodeStateFromUrl('?foo=bar')).toBeNull()
    expect(url.decodeStateFromUrl('?s=%%%not-base64%%%')).toBeNull()
    expect(url.decodeStateFromUrl(`?s=${btoa('{"version":99}')}`)).toBeNull()
  })

  it('drops unknown fields from a decoded payload', () => {
    const payload = { version: 1, evil: 'drop me', tools: { single: { cidr: '10.0.0.0/8' } } }
    const decoded = url.decodeStateFromUrl(`?s=${btoa(JSON.stringify(payload))}`)
    expect(decoded).not.toHaveProperty('evil')
    expect(decoded?.tools?.single.cidr).toBe('10.0.0.0/8')
  })
})
