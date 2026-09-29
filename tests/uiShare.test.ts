// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest'

/**
 * Shared-link boot: the payload in `?s=…` must win over the (empty) saved
 * session, hydrate the inputs, activate the right tool and then be stripped
 * so the next reload reads localStorage again.
 */
beforeAll(async () => {
  document.documentElement.dataset['theme'] = 'light'
  document.body.innerHTML = '<div id="app"></div>'
  localStorage.setItem('eli6subnets_lang', 'it')

  const { defaultState } = await import('../src/state/persist')
  const { encodeStateToUrl } = await import('../src/state/url')

  const shared = defaultState()
  shared.activeTool = 'split'
  shared.tools.single.cidr = '172.16.0.0/16'
  shared.tools.split.cidr = '10.10.0.0/20'
  shared.tools.split.count = '8'
  shared.cisco.interfaceName = 'GigabitEthernet0/2'

  history.replaceState(null, '', `${location.pathname}${encodeStateToUrl(shared)}`)
  await import('../src/main')
})

const value = (selector: string): string =>
  (document.querySelector(selector) as HTMLInputElement | null)?.value ?? ''

describe('shared URL boot', () => {
  it('activates the tool carried by the link', () => {
    expect(document.querySelector('#panel-split')?.classList.contains('is-active')).toBe(true)
    expect(document.querySelector('#tab-split')?.getAttribute('aria-selected')).toBe('true')
  })

  it('hydrates every tool input from the payload', () => {
    expect(value('#split-cidr')).toBe('10.10.0.0/20')
    expect(value('#split-count')).toBe('8')
    expect(value('#single-cidr')).toBe('172.16.0.0/16')
    expect(value('#split-iface')).toBe('GigabitEthernet0/2')
  })

  it('calculates immediately after hydration', () => {
    const results = document.querySelector('#panel-split .tool-panel__results')
    expect(results?.textContent).toContain('10.10.0.0/23')
    expect(results?.querySelectorAll('tbody tr')).toHaveLength(8)
  })

  it('keeps the language personal instead of importing it', () => {
    expect(document.querySelector('#tab-single')?.textContent).toBe('Sottorete singola')
    expect(document.documentElement.lang).toBe('it')
  })

  it('strips the query string after consuming the payload', () => {
    expect(location.search).toBe('')
  })
})
