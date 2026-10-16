/**
 * Guide view: the didactic cheat sheet (FR-10) — formulas, RFC 1918 and
 * special ranges, worked exercises and the full /0–/32 prefix table.
 *
 * Static copy lives in i18n via data-i18n-key; the three tables are built
 * at render time because their headers are translated.
 */

import { prefixToMask, uint32ToIp } from '../../calc/ip'
import { formatNumber, t } from '../../i18n'
import { clear, escapeHtml, html, qs } from '../dom'
import type { ViewHandle } from './types'

function blockTable(headers: string[], rows: string[][]): HTMLElement {
  const head = headers
    .map(value => `<th scope="col">${escapeHtml(value)}</th>`)
    .join('')
  const body = rows
    .map(cells => `<tr>${cells
      .map(value => `<td class="mono">${escapeHtml(value)}</td>`)
      .join('')}</tr>`)
    .join('')
  return html(`
    <div class="table-scroll">
      <table class="result-table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`)
}

/** One row of the /0–/32 table: mask, wildcard, total and usable sizes. */
function prefixRows(): string[][] {
  const rows: string[][] = []
  for (let prefix = 0; prefix <= 32; prefix++) {
    const mask = prefixToMask(prefix) >>> 0
    const total = Math.pow(2, 32 - prefix)
    const usable = prefix <= 30 ? total - 2 : prefix === 31 ? 2 : 1
    rows.push([
      `/${prefix}`,
      uint32ToIp(mask),
      uint32ToIp((~mask) >>> 0),
      formatNumber(total),
      formatNumber(usable),
    ])
  }
  return rows
}

export function mountGuide(container: HTMLElement): ViewHandle {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <section class="tool-panel tool-panel--wide" id="view-guide" aria-labelledby="nav-guide">
      <div class="view-guide">
        <div class="card">
          <p class="view-intro" data-i18n-key="guide.intro"></p>
        </div>

        <div class="card">
          <h3 class="view-subheading" data-i18n-key="guide.formulas"></h3>
          <ul class="guide-list">
            <li><code>2^(32 − N)</code> — <span data-i18n-key="guide.formula.total"></span></li>
            <li><code>2^(32 − N) − 2</code> — <span data-i18n-key="guide.formula.usable"></span></li>
            <li><code>2^(N − B)</code> — <span data-i18n-key="guide.formula.blocks"></span></li>
            <li><code>32 − log₂(dim)</code> — <span data-i18n-key="guide.formula.prefix"></span></li>
          </ul>
          <p class="result-note" data-i18n-key="guide.formula.legend"></p>
        </div>

        <div class="card">
          <h3 class="view-subheading" data-i18n-key="guide.privateRanges"></h3>
          <div class="js-guide-private"></div>
        </div>

        <div class="card">
          <h3 class="view-subheading" data-i18n-key="guide.specialRanges"></h3>
          <div class="js-guide-special"></div>
        </div>

        <div class="card">
          <h3 class="view-subheading" data-i18n-key="guide.exercises"></h3>
          <ol class="guide-exercises">
            <li>
              <details>
                <summary data-i18n-key="guide.ex1.q"></summary>
                <p data-i18n-key="guide.ex1.a"></p>
              </details>
            </li>
            <li>
              <details>
                <summary data-i18n-key="guide.ex2.q"></summary>
                <p data-i18n-key="guide.ex2.a"></p>
              </details>
            </li>
            <li>
              <details>
                <summary data-i18n-key="guide.ex3.q"></summary>
                <p data-i18n-key="guide.ex3.a"></p>
              </details>
            </li>
          </ol>
        </div>

        <div class="card">
          <h3 class="view-subheading" data-i18n-key="guide.prefixTable"></h3>
          <div class="js-guide-prefixes"></div>
        </div>
      </div>
    </section>`,
  )

  const root        = qs(container, '#view-guide')
  const privateHost = qs(root, '.js-guide-private')
  const specialHost = qs(root, '.js-guide-special')
  const prefixHost  = qs(root, '.js-guide-prefixes')

  const render = (): void => {
    clear(privateHost)
    privateHost.appendChild(blockTable(
      [t('label.cidr'), t('label.subnetMask'), t('label.historicalClass')],
      [
        ['10.0.0.0/8',     '255.0.0.0',     'A'],
        ['172.16.0.0/12',  '255.240.0.0',   'B'],
        ['192.168.0.0/16', '255.255.0.0',   'C'],
      ],
    ))

    clear(specialHost)
    specialHost.appendChild(blockTable(
      [t('label.cidr'), t('guide.note')],
      [
        ['127.0.0.0/8',   t('flag.loopback')],
        ['169.254.0.0/16', t('flag.linkLocal')],
        ['224.0.0.0/4',   t('flag.multicast')],
        ['0.0.0.0/8',     t('guide.unspecified')],
      ],
    ))

    clear(prefixHost)
    prefixHost.appendChild(blockTable(
      [
        t('label.prefix'),
        t('label.subnetMask'),
        t('label.wildcardMask'),
        t('label.totalAddresses'),
        t('label.usableHosts'),
      ],
      prefixRows(),
    ))
  }

  render()

  return { root, refresh: render }
}
