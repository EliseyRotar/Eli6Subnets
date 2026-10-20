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
  it('mounts sidebar, topbar, thirteen views and footer', () => {
    expect(document.querySelector('.sidebar')).not.toBeNull()
    expect(document.querySelector('.topbar')).not.toBeNull()
    expect(document.querySelectorAll('.sidebar__link')).toHaveLength(13)
    for (const id of ['home', 'single', 'vlsm', 'split', 'supernet', 'range', 'overlap', 'ipv6', 'cloud', 'topology', 'classes', 'guide', 'projects']) {
      expect(document.querySelector(`#view-${id}`)).not.toBeNull()
    }
    expect(document.querySelector('.footer')).not.toBeNull()
    expect(document.querySelector('.toast')).not.toBeNull()
  })

  it('shows the home view first', () => {
    expect(q('#view-home').classList.contains('is-active')).toBe(true)
    expect(q('#nav-home').getAttribute('aria-current')).toBe('page')
    expect(q('.topbar__view').textContent).toBe('Home')
    expect(location.hash).toBe('#/home')
  })

  it('renders Italian labels', () => {
    expect(q('#nav-single').textContent?.trim()).toBe('Sottorete singola')
    expect(document.title).toContain('Calcolatore di sottoreti IPv4')
  })
})

describe('home view', () => {
  it('renders the hero, rotating tip and bento grid of cards', () => {
    const view = q('#view-home')
    expect(view.querySelector('.home-hero__title')?.textContent).toBe('Eli6Subnets')
    expect(view.querySelector('.home-hero__sub')?.textContent).toContain('VLSM')
    expect(view.querySelector('.home-tip__text')?.textContent).toContain('RFC')
    const cards = view.querySelectorAll('.home-card')
    expect(cards).toHaveLength(12)
    expect(view.querySelector('.home-card--hero')).not.toBeNull()
    expect(view.querySelector('.home-card--hero')?.getAttribute('data-nav')).toBe('single')
  })

  it('navigates to a tool when a card is clicked', () => {
    q<HTMLAnchorElement>('#view-home .home-card[data-nav="vlsm"]').click()
    expect(location.hash).toBe('#/vlsm')
    expect(q('#view-vlsm').classList.contains('is-active')).toBe(true)
    // Return home for subsequent tests.
    q<HTMLAnchorElement>('#nav-home').click()
    expect(q('#view-home').classList.contains('is-active')).toBe(true)
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

describe('bit viewer', () => {
  it('renders 32 bits split by the prefix into four octet groups', () => {
    type('#single-cidr', '192.168.1.0/26')
    submit('#single-form')

    const view = q('#view-single')
    expect(view.querySelectorAll('.bit')).toHaveLength(32)
    expect(view.querySelectorAll('.bit--network')).toHaveLength(26)
    expect(view.querySelectorAll('.bit--host')).toHaveLength(6)
    expect(view.querySelectorAll('.bit-octet')).toHaveLength(4)
    expect(view.querySelectorAll('.field-hint__btn')).toHaveLength(7)

    const bits = Array.from(view.querySelectorAll('.bit'))
    expect(bits[26]?.classList.contains('is-boundary')).toBe(true)
    expect(bits[25]?.classList.contains('is-boundary')).toBe(false)
  })

  it('explains a bit and an octet on click', () => {
    const view = q('#view-single')
    view.querySelector<HTMLButtonElement>('.bit[data-index="0"]')?.click()

    const bitInfo = q('#view-single .bit-viewer__info').textContent ?? ''
    expect(bitInfo).toContain('Bit 0')
    expect(bitInfo).toContain('2.147.483.648')
    expect(bitInfo).toContain('bit di rete')

    view.querySelector<HTMLButtonElement>('.bit-octet__dec')?.click()

    const octetInfo = q('#view-single .bit-viewer__info').textContent ?? ''
    expect(octetInfo).toContain('192')
    expect(octetInfo).toContain('11000000')
  })

  it('treats every bit as host for /0 and as network for /32', () => {
    type('#single-cidr', '0.0.0.0/0')
    submit('#single-form')
    expect(q('#view-single').querySelectorAll('.bit--network')).toHaveLength(0)

    type('#single-cidr', '192.168.1.1/32')
    submit('#single-form')
    expect(q('#view-single').querySelectorAll('.bit--network')).toHaveLength(32)
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

    // Dashboard: KPI row and the two charts above the allocation list.
    expect(results.querySelectorAll('.kpi-card').length).toBeGreaterThanOrEqual(4)
    expect(results.querySelector('.kpi-card__value')?.textContent).toBe('2/2')
    expect(results.querySelectorAll('.dash__charts .chart-card')).toHaveLength(2)
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

describe('range tool', () => {
  it('decomposes an unaligned range into aligned blocks', () => {
    q<HTMLAnchorElement>('#nav-range').click()
    type('#range-start', '192.168.1.100')
    type('#range-end', '192.168.1.200')
    submit('#range-form')
    const view = q('#view-range')
    expect(view.querySelectorAll('.kpi-card')).toHaveLength(4)
    expect(view.querySelectorAll('.js-result-body tbody tr').length).toBeGreaterThan(1)
    expect(view.textContent).toContain('192.168.1.100/30')
  })

  it('flags an inverted range', () => {
    type('#range-start', '10.0.0.10')
    type('#range-end', '10.0.0.1')
    submit('#range-form')
    expect(q('#range-end-error').textContent).toContain('successivo')
    expect(q('#view-range .empty-state')).not.toBeNull()
  })
})

describe('overlap tool', () => {
  const fill = (values: string[]): void => {
    const inputs = document.querySelectorAll<HTMLInputElement>('#view-overlap .overlap-row__input')
    values.forEach((value, index) => {
      const input = inputs[index]
      if (!input) throw new Error(`missing overlap row ${index}`)
      input.value = value
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  it('reports the overlapping pair', () => {
    q<HTMLAnchorElement>('#nav-overlap').click()
    fill(['10.0.0.0/8', '10.1.0.0/16'])
    submit('#overlap-form')
    const view = q('#view-overlap')
    expect(view.querySelectorAll('.kpi-card')).toHaveLength(4)
    expect(view.querySelector('.kpi-card__value')?.textContent).toBe('1')
    expect(view.textContent).toContain('A contiene B')
    expect(view.textContent).toContain('10.1.0.0/16')
  })

  it('reports disjoint networks as a success', () => {
    fill(['192.168.0.0/24', '192.168.1.0/24'])
    submit('#overlap-form')
    const view = q('#view-overlap')
    expect(view.querySelector('.alert--success')).not.toBeNull()
    expect(view.querySelectorAll('.kpi-card__value')[0]?.textContent).toBe('0')
  })
})

describe('ipv6 tool', () => {
  it('derives network and size', () => {
    q<HTMLAnchorElement>('#nav-ipv6').click()
    type('#ipv6-cidr', '2001:db8::1/64')
    submit('#ipv6-form')
    const view = q('#view-ipv6')
    expect(view.querySelectorAll('.kpi-card')).toHaveLength(4)
    expect(view.textContent).toContain('2001:db8::')
    expect(view.textContent).toContain('2^64')
  })

  it('rejects a malformed address', () => {
    type('#ipv6-cidr', 'zz::1/64')
    submit('#ipv6-form')
    expect(q('#ipv6-error').textContent).not.toBe('')
    expect(q('#view-ipv6 .empty-state')).not.toBeNull()
  })
})

describe('cloud tool', () => {
  it('lists the AWS reserved addresses', () => {
    q<HTMLAnchorElement>('#nav-cloud').click()
    type('#cloud-cidr', '10.0.1.0/24')
    submit('#cloud-form')
    const view = q('#view-cloud')
    expect(view.querySelectorAll('.kpi-card')).toHaveLength(4)
    expect(view.textContent).toContain('10.0.1.255')
    expect(view.textContent).toContain('251')
    expect(view.textContent).toContain('Router di sottorete')
  })

  it('switches to Azure rules', () => {
    const select = q<HTMLSelectElement>('#cloud-provider')
    select.value = 'azure'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    const view = q('#view-cloud')
    expect(view.textContent).toContain('Gateway Azure')
    expect(view.textContent).toContain('10.0.1.5')
  })
})

describe('classes view', () => {
  it('renders the donut legend and drills into a class', () => {
    q<HTMLAnchorElement>('#nav-classes').click()
    const view = q('#view-classes')
    expect(view.classList.contains('is-active')).toBe(true)
    expect(view.querySelectorAll('.legend-row')).toHaveLength(5)
    expect(view.textContent).toContain('0.0.0.0 – 127.255.255.255')

    q<HTMLButtonElement>('#view-classes .legend-row[data-class="A"]').click()
    const detail = q('#view-classes .classes-detail')
    expect(detail.textContent).toContain('10.0.0.0/8')
    expect(detail.textContent).toContain('127.0.0.0/8')
    expect(detail.textContent).toContain('Loopback')

    q<HTMLButtonElement>('#view-classes .js-classes-back').click()
    expect(document.querySelector('#view-classes .classes-detail')).toBeNull()
  })
})

describe('guide view', () => {
  it('lists every prefix from /0 to /32', () => {
    q<HTMLAnchorElement>('#nav-guide').click()
    const view = q('#view-guide')
    expect(view.classList.contains('is-active')).toBe(true)
    // 33 prefix rows plus the three RFC 1918 rows and the four special ones.
    expect(view.querySelectorAll('.js-guide-prefixes tbody tr')).toHaveLength(33)
    expect(view.querySelectorAll('.js-guide-private tbody tr')).toHaveLength(3)
    expect(view.querySelectorAll('.js-guide-special tbody tr')).toHaveLength(4)
    expect(view.textContent).toContain('255.255.255.0')
    expect(view.textContent).toContain('10.0.0.0/8')
    expect(view.textContent).toContain('Reti private (RFC 1918)')
  })
})

describe('projects view', () => {
  it('saves, renames, reopens and deletes a project', () => {
    q<HTMLAnchorElement>('#nav-projects').click()
    expect(q('#view-projects .empty-state')).not.toBeNull()

    // Saving requires a name.
    submit('#projects-form')
    expect(q('#projects-name-error').textContent).not.toBe('')

    // Change a tool input so reopening is observable later.
    type('#single-cidr', '172.16.5.0/24')
    submit('#single-form')

    type('#projects-name', 'Lab demo')
    submit('#projects-form')
    expect(document.querySelectorAll('#view-projects .project-row')).toHaveLength(1)
    expect(q('#view-projects .project-row__name').textContent).toBe('Lab demo')

    // Reopen: the tool inputs come back.
    type('#single-cidr', '10.0.0.0/8')
    submit('#single-form')
    q<HTMLButtonElement>('#view-projects [data-action="open"]').click()
    expect(q<HTMLInputElement>('#single-cidr').value).toBe('172.16.5.0/24')

    // Rename inline.
    q<HTMLButtonElement>('#view-projects [data-action="rename"]').click()
    const rename = q<HTMLInputElement>('#view-projects .project-row__rename')
    rename.value = 'Lab 2'
    q<HTMLButtonElement>('#view-projects [data-action="rename-save"]').click()
    expect(q('#view-projects .project-row__name').textContent).toBe('Lab 2')

    // Deletion is armed: the first click only asks for confirmation.
    q<HTMLButtonElement>('#view-projects [data-action="delete"]').click()
    expect(document.querySelectorAll('#view-projects .project-row')).toHaveLength(1)
    expect(q('#view-projects [data-action="delete"]').textContent).toBe('Confermi?')
    q<HTMLButtonElement>('#view-projects [data-action="delete"]').click()
    expect(document.querySelector('#view-projects .project-row')).toBeNull()
  })
})

describe('topology view', () => {
  it('renders the demo canvas and selects a node with the keyboard', () => {
    q<HTMLAnchorElement>('#nav-topology').click()
    const view = q('#view-topology')
    expect(view.classList.contains('is-active')).toBe(true)
    expect(view.querySelectorAll('.topo-node')).toHaveLength(4)
    expect(view.querySelectorAll('.topo-link')).toHaveLength(3)

    view.querySelector<SVGElement>('.topo-node')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(q<HTMLInputElement>('#view-topology #topo-node-name').value).toBe('R1')
  })

  it('drags a node with pointer events', () => {
    const view = q('#view-topology')
    const svg = q<SVGSVGElement>('#view-topology .js-topo-svg')
    const node = view.querySelector<SVGElement>('.topo-node')
    expect(node).not.toBeNull()
    const before = node?.getAttribute('transform')

    // Regression: pointerdown must NOT replace the node element, otherwise
    // setPointerCapture fails in real browsers and dragging silently breaks.
    node?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }))
    expect(view.querySelector('.topo-node')).toBe(node)

    svg.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 150, clientY: 140 }))
    svg.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))

    expect(view.querySelector('.topo-node')?.getAttribute('transform')).not.toBe(before)
  })

  it('adds a device, links it and reports duplicates', () => {
    const view = q('#view-topology')
    q<HTMLButtonElement>('#view-topology [data-add="router"]').click()
    expect(view.querySelectorAll('.topo-node')).toHaveLength(5)
    expect(view.textContent).toContain('R2')

    // Select the new router (last node) and connect it to PC1.
    const last = view.querySelectorAll<SVGElement>('.topo-node')
    last[last.length - 1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    const target = q<HTMLSelectElement>('#view-topology #topo-connect-target')
    target.value = 'n3'
    q<HTMLButtonElement>('#view-topology .js-topo-connect').click()
    expect(view.querySelectorAll('.topo-link')).toHaveLength(4)

    // Connecting the same pair again is refused with a toast. The inspector
    // re-rendered after the first connect, so the select starts fresh.
    q<HTMLSelectElement>('#view-topology #topo-connect-target').value = 'n3'
    q<HTMLButtonElement>('#view-topology .js-topo-connect').click()
    expect(view.querySelectorAll('.topo-link')).toHaveLength(4)
    expect(q('.toast').textContent).toContain('già collegati')
  })

  it('clears the canvas with the armed toolbar button', () => {
    const view = q('#view-topology')
    // First click only arms the button: the canvas stays untouched.
    q<HTMLButtonElement>('#view-topology .js-topo-clear').click()
    expect(view.querySelectorAll('.topo-node')).toHaveLength(5)

    q<HTMLButtonElement>('#view-topology .js-topo-clear').click()
    expect(view.querySelectorAll('.topo-node')).toHaveLength(0)
    expect(view.querySelector('.topo-empty .empty-state')).not.toBeNull()
    expect(q<SVGSVGElement>('#view-topology .js-topo-svg').hasAttribute('hidden')).toBe(true)
  })
})

describe('dashboard', () => {
  it('shows KPI cards and a chart for the single subnet', () => {
    expect(document.querySelectorAll('#view-single .kpi-card').length).toBeGreaterThanOrEqual(4)
    expect(document.querySelector('#view-single .chart-card')).not.toBeNull()
    expect(document.querySelector('#view-single .chart')).not.toBeNull()
  })

  it('shows coverage KPIs and both charts for supernetting', () => {
    const view = q('#view-supernet')
    expect(view.querySelectorAll('.kpi-card').length).toBeGreaterThanOrEqual(4)
    expect(view.querySelectorAll('.chart-card')).toHaveLength(2)
    expect(view.querySelector('.result-table')).not.toBeNull()
  })
})

describe('footer export guard', () => {
  it('explains that a reference view has no CSV export', () => {
    q<HTMLAnchorElement>('#nav-guide').click()
    expect(q('#view-guide').classList.contains('is-active')).toBe(true)

    q<HTMLButtonElement>('#export-csv').click()
    const alert = q('.footer__alert')
    expect(alert.hidden).toBe(false)
    expect(q('.js-import-error').textContent).toContain("non supporta l'esportazione")

    q<HTMLButtonElement>('.js-dismiss-error').click()
    expect(alert.hidden).toBe(true)
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
