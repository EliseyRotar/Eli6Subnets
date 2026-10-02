// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest'
import { parseCsv, toCsv } from '../src/ui/importExport'

beforeAll(async () => {
  document.documentElement.dataset['theme'] = 'light'
  document.body.innerHTML = '<div id="app"></div>'
  // Deterministic language regardless of the host machine's locale.
  localStorage.setItem('eli6subnets_lang', 'it')
  await import('../src/main')
})

const q = <T extends Element = HTMLElement>(selector: string): T => {
  const found = document.querySelector<T>(selector)
  if (!found) throw new Error(`missing element: ${selector}`)
  return found
}

function submit(selector: string): void {
  q(selector).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

function type(selector: string, value: string): void {
  const input = q<HTMLInputElement>(selector)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('app shell', () => {
  it('mounts sidebar, topbar, four views and footer', () => {
    expect(document.querySelector('.sidebar')).not.toBeNull()
    expect(document.querySelector('.topbar')).not.toBeNull()
    expect(document.querySelectorAll('.sidebar__link')).toHaveLength(4)
    for (const id of ['single', 'vlsm', 'split', 'supernet']) {
      expect(document.querySelector(`#view-${id}`)).not.toBeNull()
    }
    expect(document.querySelector('.footer')).not.toBeNull()
    expect(document.querySelector('.toast')).not.toBeNull()
  })

  it('shows the single-subnet view first', () => {
    expect(q('#view-single').classList.contains('is-active')).toBe(true)
    expect(q('#nav-single').getAttribute('aria-current')).toBe('page')
    expect(q('.topbar__view').textContent).toBe('Sottorete singola')
    expect(location.hash).toBe('#/single')
  })

  it('renders Italian labels', () => {
    expect(q('#nav-single').textContent?.trim()).toBe('Sottorete singola')
    expect(document.title).toContain('Calcolatore di sottoreti IPv4')
  })
})

describe('single subnet tool', () => {
  it('calculates a network and renders every field', () => {
    type('#single-cidr', '192.168.1.0/24')
    submit('#single-form')

    const results = q('#view-single .tool-panel__results')
    expect(results.textContent).toContain('192.168.1.0/24')
    expect(results.textContent).toContain('192.168.1.255')
    expect(results.textContent).toContain('255.255.255.0')
    expect(results.textContent).toContain('254')
    expect(results.textContent).toContain('Classe C')
    expect(results.textContent).toContain('Privata (RFC 1918)')
    expect(results.querySelector('.code-block')?.textContent).toContain('ip address 192.168.1.1')
  })

  it('shows a specific inline error for host bits set', () => {
    type('#single-cidr', '192.168.1.5/24')
    submit('#single-form')

    expect(q('#single-error').textContent).toContain('192.168.1.0/24')
    expect(q('#single-cidr').classList.contains('has-error')).toBe(true)
    expect(q('#view-single .tool-panel__results').textContent).toContain('Inserisci una rete CIDR')
  })

  it('renders the RFC 3021 note for a /31', () => {
    type('#single-cidr', '10.0.0.0/31')
    submit('#single-form')
    expect(q('#view-single .result-note').textContent).toContain('RFC 3021')
  })
})

describe('sidebar navigation', () => {
  it('switches views on click and mirrors the hash', () => {
    q<HTMLAnchorElement>('#nav-vlsm').click()
    expect(q('#view-vlsm').classList.contains('is-active')).toBe(true)
    expect(q('#view-single').classList.contains('is-active')).toBe(false)
    expect(q('#nav-vlsm').getAttribute('aria-current')).toBe('page')
    expect(q('#nav-single').getAttribute('aria-current')).toBeNull()
    expect(location.hash).toBe('#/vlsm')
    expect(q('.topbar__view').textContent).toBe('VLSM')
  })

  it('follows an external hash change', () => {
    location.hash = '#/split'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(q('#view-split').classList.contains('is-active')).toBe(true)
    expect(q('#nav-split').getAttribute('aria-current')).toBe('page')
    expect(q('.topbar__view').textContent).toBe('Suddivisione uguale')
  })
})

describe('vlsm tool', () => {
  it('allocates requests largest-first', () => {
    q<HTMLButtonElement>('#nav-vlsm').click()

    type('#vlsm-base', '192.168.1.0/24')
    const names = document.querySelectorAll<HTMLInputElement>('#view-vlsm .js-row-name')
    const hosts = document.querySelectorAll<HTMLInputElement>('#view-vlsm .js-row-hosts')
    expect(names.length).toBeGreaterThanOrEqual(2)

    names[0]!.value = 'Engineering'
    hosts[0]!.value = '50'
    names[1]!.value = 'Lab'
    hosts[1]!.value = '10'

    submit('#vlsm-form')

    const results = q('#view-vlsm .tool-panel__results')
    expect(results.textContent).toContain('Allocazione')
    expect(results.textContent).toContain('Engineering — 192.168.1.0/26')
    expect(results.textContent).toContain('Lab — 192.168.1.64/28')
    expect(results.textContent).toContain('ip route 192.168.1.0 255.255.255.0')
  })

  it('warns when the base network is too small', () => {
    type('#vlsm-base', '192.168.1.0/28')
    submit('#vlsm-form')

    const results = q('#view-vlsm .tool-panel__results')
    expect(results.querySelector('.alert--warning')).not.toBeNull()
    expect(results.textContent).toContain('Richieste non allocate')
    expect(results.textContent).toContain('la rete di partenza deve essere almeno /25')
  })
})

describe('equal split tool', () => {
  it('splits a /24 into four /26 subnets', () => {
    q<HTMLButtonElement>('#nav-split').click()

    type('#split-cidr', '10.0.0.0/24')
    type('#split-count', '4')
    submit('#split-form')

    const table = q('#view-split .result-table')
    expect(table.querySelectorAll('tbody tr')).toHaveLength(4)
    expect(table.textContent).toContain('10.0.0.64/26')
    expect(q('#view-split .tool-panel__results').textContent).toContain('interface <interface>')
  })

  it('reports the rounded-up subnet count', () => {
    type('#split-count', '3')
    submit('#split-form')
    expect(q('#view-split .result-note').textContent).toContain('generate 4 sottoreti')
  })
})

describe('supernet tool', () => {
  it('summarises two contiguous /24s into a /23', () => {
    q<HTMLButtonElement>('#nav-supernet').click()

    const inputs = document.querySelectorAll<HTMLInputElement>('#view-supernet .js-row-cidr')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
    inputs[0]!.value = '192.168.0.0/24'
    inputs[1]!.value = '192.168.1.0/24'

    submit('#supernet-form')

    const results = q('#view-supernet .tool-panel__results')
    expect(results.textContent).toContain('192.168.0.0/23')
    expect(results.textContent).toContain('Sommarizzazione pulita')
    expect(results.textContent).toContain('ip route 192.168.0.0 255.255.254.0')
  })

  it('flags an impure summarisation', () => {
    const inputs = document.querySelectorAll<HTMLInputElement>('#view-supernet .js-row-cidr')
    inputs[1]!.value = '192.168.2.0/24'
    submit('#supernet-form')

    const results = q('#view-supernet .tool-panel__results')
    expect(results.querySelector('.alert--warning')).not.toBeNull()
    expect(results.textContent).toContain('Sommarizzazione impura')
    expect(results.textContent).toContain('192.168.3.0/24')
  })
})

describe('language switch', () => {
  it('re-renders static shell and dynamic results', () => {
    q<HTMLButtonElement>('#lang-toggle').click()

    expect(q('#nav-single').textContent?.trim()).toBe('Single subnet')
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toContain('IPv4 subnet calculator')

    q<HTMLButtonElement>('#nav-supernet').click()
    expect(q('#view-supernet .tool-panel__results').textContent).toContain('Impure summarisation')
  })
})

describe('state persistence', () => {
  it('writes the inputs to localStorage', async () => {
    // saveState batches writes on the next animation frame when one exists.
    if (typeof requestAnimationFrame === 'function') {
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
    }

    const raw = localStorage.getItem('eli6subnets_state')
    expect(raw).not.toBeNull()
    const state = JSON.parse(raw ?? '{}') as { activeView: string; lang: string }
    expect(state.activeView).toBe('supernet')
    expect(state.lang).toBe('en')
  })
})

describe('csv helpers', () => {
  it('round-trips rows through export and import', () => {
    const rows = [
      ['name', 'requiredHosts'],
      ['Core; DMZ', '12'],
      ['Quote "inside"', '300'],
    ]
    expect(parseCsv(toCsv(rows))).toEqual(rows)
  })

  it('auto-detects the comma delimiter', () => {
    expect(parseCsv('cidr,count\n10.0.0.0/8,4\n')).toEqual([
      ['cidr', 'count'],
      ['10.0.0.0/8', '4'],
    ])
  })

  it('ignores blank trailing lines', () => {
    expect(parseCsv('cidr\n10.0.0.0/8\n\n')).toEqual([['cidr'], ['10.0.0.0/8']])
  })
})
