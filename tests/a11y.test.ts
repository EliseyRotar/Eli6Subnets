// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import axe from 'axe-core'

beforeAll(async () => {
  // Vitest stubs CSS imports, so the stylesheet is injected manually: without
  // it every hidden panel would look visible and axe would report phantom
  // duplicate landmarks.
  const css = ['tokens', 'base', 'layout', 'components']
    .map(name => readFileSync(resolve(__dirname, `../src/styles/${name}.css`), 'utf8'))
    .join('\n')
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`)

  document.documentElement.dataset['theme'] = 'light'
  document.body.innerHTML = '<div id="app"></div>'
  localStorage.setItem('eli6subnets_lang', 'it')
  await import('../src/main')
})

/**
 * axe rules that need a real rendering engine (pixel contrast, hit targets)
 * cannot run under jsdom; contrast is covered by the token pairs in
 * tokens.css instead. Everything structural — labels, roles, names, ARIA
 * relationships — must pass with zero critical/serious findings.
 */
const DISABLED_RULES = ['color-contrast', 'target-size']

async function runAxe(): Promise<axe.Result[]> {
  const results = await axe.run(document, {
    rules: Object.fromEntries(DISABLED_RULES.map(rule => [rule, { enabled: false }])),
    resultTypes: ['violations'],
  })
  return results.violations
}

function report(violations: axe.Result[]): string {
  return violations
    .map(v => `[${v.impact}] ${v.id}: ${v.help}\n  ${v.nodes.map(n => n.html).join('\n  ')}`)
    .join('\n')
}

describe('accessibility', () => {
  it('has no critical or serious axe violations on first load', async () => {
    const violations = await runAxe()
    const serious = violations.filter(v => v.impact === 'critical' || v.impact === 'serious')
    expect(report(serious)).toBe('')
  })

  it('has no moderate axe violations on first load', async () => {
    expect(report(await runAxe())).toBe('')
  })

  it('stays clean with the results of every tool rendered', async () => {
    const fill = (selector: string, value: string): void => {
      const input = document.querySelector<HTMLInputElement>(selector)
      if (input) input.value = value
    }

    fill('#single-cidr', '192.168.1.0/24')
    fill('#split-cidr', '10.0.0.0/24')
    fill('#split-count', '4')
    fill('#vlsm-base', '192.168.1.0/24')

    const names = document.querySelectorAll<HTMLInputElement>('#panel-vlsm .js-row-name')
    const hosts = document.querySelectorAll<HTMLInputElement>('#panel-vlsm .js-row-hosts')
    if (names[0] && hosts[0]) {
      names[0].value = 'Engineering'
      hosts[0].value = '50'
    }
    if (names[1] && hosts[1]) {
      names[1].value = 'Lab'
      hosts[1].value = '10'
    }

    const rows = document.querySelectorAll<HTMLInputElement>('#panel-supernet .js-row-cidr')
    if (rows[0]) rows[0].value = '192.168.0.0/24'
    if (rows[1]) rows[1].value = '192.168.2.0/24'

    for (const form of document.querySelectorAll('form')) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    }

    const violations = await runAxe()
    expect(report(violations)).toBe('')
  })

  it('stays clean in the dark theme', async () => {
    document.documentElement.dataset['theme'] = 'dark'
    const violations = await runAxe()
    document.documentElement.dataset['theme'] = 'light'
    expect(report(violations)).toBe('')
  })
})
