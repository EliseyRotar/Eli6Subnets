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
  it('mounts header, tabs, four panels and footer', () => {
    expect(document.querySelector('.header')).not.toBeNull()
    expect(document.querySelectorAll('.tabbar__tab')).toHaveLength(4)
    for (const id of ['single', 'vlsm', 'split', 'supernet']) {
      expect(document.querySelector(`#panel-${id}`)).not.toBeNull()
    }
    expect(document.querySelector('.footer')).not.toBeNull()
    expect(document.querySelector('.toast')).not.toBeNull()
  })

  it('shows the single-subnet panel first', () => {
    expect(q('#panel-single').classList.contains('is-active')).toBe(true)
    expect(q('#tab-single').getAttribute('aria-selected')).toBe('true')
  })

  it('renders Italian labels', () => {
    expect(q('#tab-single').textContent).toBe('Sottorete singola')
    expect(document.title).toContain('Calcolatore di sottoreti IPv4')
  })
})

describe('single subnet tool', () => {
  it('calculates a network and renders every field', () => {
    type('#single-cidr', '192.168.1.0/24')
    submit('#single-form')

    const results = q('#panel-single .tool-panel__results')
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
    expect(q('#panel-single .tool-panel__results').textContent).toContain('Inserisci una rete CIDR')
  })

  it('renders the RFC 3021 note for a /31', () => {
    type('#single-cidr', '10.0.0.0/31')
    submit('#single-form')
    expect(q('#panel-single .result-note').textContent).toContain('RFC 3021')
  })
})

describe('tabs', () => {
  it('switches panels on click', () => {
    q<HTMLButtonElement>('#tab-vlsm').click()
    expect(q('#panel-vlsm').classList.contains('is-active')).toBe(true)
    expect(q('#panel-single').classList.contains('is-active')).toBe(false)
    expect(q('#tab-vlsm').getAttribute('aria-selected')).toBe('true')
  })

  it('moves selection with arrow keys', () => {
    const tab = q('#tab-vlsm')
    tab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(q('#tab-split').getAttribute('aria-selected')).toBe('true')
    expect(q('#panel-split').classList.contains('is-active')).toBe(true)
  })
})

describe('vlsm tool', () => {
  it('allocates requests largest-first', () => {
    q<HTMLButtonElement>('#tab-vlsm').click()

    type('#vlsm-base', '192.168.1.0/24')
    const names = document.querySelectorAll<HTMLInputElement>('#panel-vlsm .js-row-name')
    const hosts = document.querySelectorAll<HTMLInputElement>('#panel-vlsm .js-row-hosts')
    expect(names.length).toBeGreaterThanOrEqual(2)

    names[0]!.value = 'Engineering'
    hosts[0]!.value = '50'
    names[1]!.value = 'Lab'
    hosts[1]!.value = '10'

    submit('#vlsm-form')

    const results = q('#panel-vlsm .tool-panel__results')
    expect(results.textContent).toContain('Allocazione')
    expect(results.textContent).toContain('Engineering — 192.168.1.0/26')
    expect(results.textContent).toContain('Lab — 192.168.1.64/28')
    expect(results.textContent).toContain('ip route 192.168.1.0 255.255.255.0')
  })

  it('warns when the base network is too small', () => {
    type('#vlsm-base', '192.168.1.0/28')
    submit('#vlsm-form')

    const results = q('#panel-vlsm .tool-panel__results')
    expect(results.querySelector('.alert--warning')).not.toBeNull()
    expect(results.textContent).toContain('Richieste non allocate')
    expect(results.textContent).toContain('la rete di partenza deve essere almeno /25')
  })
})

describe('equal split tool', () => {
  it('splits a /24 into four /26 subnets', () => {
    q<HTMLButtonElement>('#tab-split').click()

    type('#split-cidr', '10.0.0.0/24')
    type('#split-count', '4')
    submit('#split-form')

    const table = q('#panel-split .result-table')
    expect(table.querySelectorAll('tbody tr')).toHaveLength(4)
    expect(table.textContent).toContain('10.0.0.64/26')
    expect(q('#panel-split .tool-panel__results').textContent).toContain('interface <interface>')
  })

  it('reports the rounded-up subnet count', () => {
    type('#split-count', '3')
    submit('#split-form')
    expect(q('#panel-split .result-note').textContent).toContain('generate 4 sottoreti')
  })
})

describe('supernet tool', () => {
  it('summarises two contiguous /24s into a /23', () => {
    q<HTMLButtonElement>('#tab-supernet').click()

    const inputs = document.querySelectorAll<HTMLInputElement>('#panel-supernet .js-row-cidr')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
    inputs[0]!.value = '192.168.0.0/24'
    inputs[1]!.value = '192.168.1.0/24'

    submit('#supernet-form')

    const results = q('#panel-supernet .tool-panel__results')
    expect(results.textContent).toContain('192.168.0.0/23')
    expect(results.textContent).toContain('Sommarizzazione pulita')
    expect(results.textContent).toContain('ip route 192.168.0.0 255.255.254.0')
  })

  it('flags an impure summarisation', () => {
    const inputs = document.querySelectorAll<HTMLInputElement>('#panel-supernet .js-row-cidr')
    inputs[1]!.value = '192.168.2.0/24'
    submit('#supernet-form')

    const results = q('#panel-supernet .tool-panel__results')
    expect(results.querySelector('.alert--warning')).not.toBeNull()
    expect(results.textContent).toContain('Sommarizzazione impura')
    expect(results.textContent).toContain('192.168.3.0/24')
  })
})

describe('language switch', () => {
  it('re-renders static shell and dynamic results', () => {
    q<HTMLButtonElement>('#lang-toggle').click()

    expect(q('#tab-single').textContent).toBe('Single subnet')
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toContain('IPv4 subnet calculator')

    q<HTMLButtonElement>('#tab-supernet').click()
    expect(q('#panel-supernet .tool-panel__results').textContent).toContain('Impure summarisation')
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
    const state = JSON.parse(raw ?? '{}') as { activeTool: string; lang: string }
    expect(state.activeTool).toBe('supernet')
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
