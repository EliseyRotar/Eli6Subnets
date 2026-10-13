/**
 * KPI cards: the top row of every dashboard view.
 *
 * Rendered as a definition list so screen readers announce label/value
 * pairs; the progress bar is decorative (aria-hidden) — the value next to
 * it is the accessible source of truth.
 */

import { escapeHtml, html } from './dom'

export interface KpiItem {
  label: string
  value: string
  hint?: string | undefined
  /** 0–100: draws the usage/efficiency bar under the value. */
  percent?: number | undefined
}

export function kpiRow(items: KpiItem[]): HTMLElement {
  const cards = items
    .map(item => {
      const hint = item.hint === undefined
        ? ''
        : `<dd class="kpi-card__hint">${escapeHtml(item.hint)}</dd>`
      const bar = item.percent === undefined
        ? ''
        : `<dd class="kpi-card__bar" aria-hidden="true"><span style="width:${
            Math.max(0, Math.min(100, item.percent)).toFixed(1)
          }%"></span></dd>`
      return `<div class="kpi-card">
        <dt class="kpi-card__label">${escapeHtml(item.label)}</dt>
        <dd class="kpi-card__value">${escapeHtml(item.value)}</dd>
        ${hint}${bar}
      </div>`
    })
    .join('')

  return html(`<dl class="kpi-row">${cards}</dl>`)
}
