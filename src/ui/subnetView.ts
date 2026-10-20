/**
 * Shared result rendering: field tables, flag chips, special-case notes.
 *
 * Every tool renders subnet data through these helpers so the visual
 * hierarchy stays identical everywhere — primary value large, secondary
 * fields in the table, metadata reduced to a chip row.
 */

import { formatNumber, t } from '../i18n'
import type { SubnetInfo } from '../calc/subnet'
import { escapeHtml, html } from './dom'
import { IconError, IconSuccess, IconWarning } from './icons'

function row(labelKey: string, value: string, primary = false, hintKey?: string): string {
  const hint = hintKey
    ? `<span class="field-hint">
         <button type="button" class="field-hint__btn"
                 aria-label="${escapeHtml(t(hintKey))}"><span aria-hidden="true">?</span></button>
         <span class="field-hint__bubble" aria-hidden="true">${escapeHtml(t(hintKey))}</span>
       </span>`
    : ''
  return `<tr${primary ? ' class="is-primary"' : ''}>
      <th scope="row">${escapeHtml(t(labelKey))}${hint}</th>
      <td class="mono">${escapeHtml(value)}</td>
    </tr>`
}

/** All FR-01 output fields as a two-column table. */
export function subnetFields(info: SubnetInfo): HTMLElement {
  return html(`
    <table class="result-table">
      <tbody>
        ${row('label.networkAddress', `${info.networkAddress}/${info.prefix}`, true, 'hint.network')}
        ${row('label.broadcastAddress', info.broadcastAddress, false, 'hint.broadcast')}
        ${row('label.subnetMask', info.subnetMask, false, 'hint.mask')}
        ${row('label.wildcardMask', info.wildcardMask, false, 'hint.wildcard')}
        ${row('label.firstHost', info.firstHost, false, 'hint.hostRange')}
        ${row('label.lastHost', info.lastHost)}
        ${row('label.totalAddresses', formatNumber(info.totalAddresses), false, 'hint.total')}
        ${row('label.usableHosts', formatNumber(info.usableHosts), false, 'hint.usable')}
      </tbody>
    </table>`)
}

function chip(text: string, accent = false): string {
  return `<span class="chip${accent ? ' chip--accent' : ''}">${escapeHtml(text)}</span>`
}

/** Class and address-type flags for one subnet. */
export function flagChips(info: SubnetInfo): HTMLElement {
  const chips = [
    chip(t('flag.class', info.historicalClass), true),
    chip(info.isPrivate ? t('flag.private') : t('flag.public')),
  ]
  if (info.isLoopback)     chips.push(chip(t('flag.loopback')))
  if (info.isLinkLocal)    chips.push(chip(t('flag.linkLocal')))
  if (info.isMulticast)    chips.push(chip(t('flag.multicast')))
  if (info.isPointToPoint) chips.push(chip(t('flag.pointToPoint')))
  if (info.isHostRoute)    chips.push(chip(t('flag.hostRoute')))
  return html(`<div class="chip-row">${chips.join('')}</div>`)
}

/** RFC 3021 explanatory note for /31 and /32, null for every other prefix. */
export function specialNote(info: SubnetInfo): HTMLElement | null {
  if (info.isPointToPoint) {
    return html(`<p class="result-note">${escapeHtml(t('note.rfc3021_31'))}</p>`)
  }
  if (info.isHostRoute) {
    return html(`<p class="result-note">${escapeHtml(t('note.rfc3021_32'))}</p>`)
  }
  return null
}

/** Heading + full field table + chips + note for a single subnet. */
export function subnetSection(heading: string | null, info: SubnetInfo): HTMLElement {
  const section = html('<div class="result-section"></div>')
  if (heading !== null) {
    section.appendChild(html(
      `<h2 class="result-section__subheading">${escapeHtml(heading)}</h2>`,
    ))
  }
  section.appendChild(subnetFields(info))
  section.appendChild(flagChips(info))
  const note = specialNote(info)
  if (note) section.appendChild(note)
  return section
}

const LIST_COLUMNS = [
  'label.networkAddress',
  'label.broadcastAddress',
  'label.subnetMask',
  'label.wildcardMask',
  'label.firstHost',
  'label.lastHost',
  'label.totalAddresses',
  'label.usableHosts',
] as const

const LIST_VALUES = (info: SubnetInfo): string[] => [
  `${info.networkAddress}/${info.prefix}`,
  info.broadcastAddress,
  info.subnetMask,
  info.wildcardMask,
  info.firstHost,
  info.lastHost,
  formatNumber(info.totalAddresses),
  formatNumber(info.usableHosts),
]

/** Wide, horizontally scrollable table used for list results (split, VLSM, inputs). */
export function subnetListTable(subnets: SubnetInfo[], showIndex = true): HTMLElement {
  const headers = LIST_COLUMNS.map(key => `<th scope="col">${escapeHtml(t(key))}</th>`).join('')
  const indexHeader = showIndex ? `<th scope="col">${escapeHtml(t('label.index'))}</th>` : ''

  const body = subnets.map((info, i) => {
    const indexCell = showIndex ? `<td class="mono">${i + 1}</td>` : ''
    const cells = LIST_VALUES(info).map(value => `<td class="mono">${escapeHtml(value)}</td>`).join('')
    return `<tr>${indexCell}${cells}</tr>`
  }).join('')

  return html(`
    <div class="card card--flush">
      <table class="result-table">
        <thead><tr>${indexHeader}${headers}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`)
}

/**
 * Generic columnar table for tool-specific results (range entries,
 * overlap pairs, reserved cloud addresses). Headers and cell values
 * are rendered as plain text — callers pre-format numbers themselves.
 */
export function simpleTable(headers: string[], rows: string[][]): HTMLElement {
  const head = headers
    .map(value => `<th scope="col">${escapeHtml(value)}</th>`)
    .join('')
  const body = rows
    .map(cells => `<tr>${cells
      .map(value => `<td class="mono">${escapeHtml(value)}</td>`)
      .join('')}</tr>`)
    .join('')
  return html(`
    <div class="card card--flush">
      <table class="result-table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`)
}

export type AlertKind = 'warning' | 'error' | 'success'

const ALERT_ICONS: Record<AlertKind, string> = {
  warning: IconWarning,
  error:   IconError,
  success: IconSuccess,
}

/** Coloured block with an icon — colour is never the only signal (NFR-03). */
export function alertBlock(kind: AlertKind, message: string): HTMLElement {
  const element = html(`<div class="alert alert--${kind}">${ALERT_ICONS[kind]}<span></span></div>`)
  element.querySelector('span')!.textContent = message
  return element
}

/** Placeholder shown before the first calculation. */
export function emptyState(key: string): HTMLElement {
  return html(`<div class="empty-state">${escapeHtml(t(key))}</div>`)
}
