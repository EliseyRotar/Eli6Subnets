/**
 * Interactive 32-bit viewer for the single-subnet view.
 *
 * Shows the network address as four octet groups of eight bit buttons:
 * network bits use the accent tint, host bits stay neutral, and the first
 * host bit carries a boundary mark. Clicking a bit or an octet updates the
 * live region below with the value, position and role — the didactic core
 * of the reference implementation (cidr.xyz).
 */

import { ipToUint32 } from '../calc/ip'
import type { SubnetInfo } from '../calc/subnet'
import { formatNumber, t } from '../i18n'
import { escapeHtml, html, qs } from './dom'

const SUPERSCRIPTS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹']

/** Render an exponent as Unicode superscript (31 → ³¹). */
function superscript(value: number): string {
  return String(value)
    .split('')
    .map(digit => SUPERSCRIPTS[Number(digit)] ?? '')
    .join('')
}

function bitAria(index: number, prefix: number, value: number): string {
  const roleKey = index < prefix ? 'bits.network' : 'bits.host'
  return t(
    'bits.bitInfo',
    index,
    Math.floor(index / 8),
    superscript(31 - index),
    formatNumber(value),
    t(roleKey),
  )
}

function octetAria(octetIndex: number, network: number): string {
  const dec = (network >>> (24 - octetIndex * 8)) & 0xff
  return t('bits.octetInfo', octetIndex, formatNumber(dec), dec.toString(2).padStart(8, '0'))
}

export function bitViewer(info: SubnetInfo): HTMLElement {
  const network = ipToUint32(info.networkAddress)
  const prefix = info.prefix

  const octets = Array.from({ length: 4 }, (_, octetIndex) => {
    const dec = (network >>> (24 - octetIndex * 8)) & 0xff
    const bits = Array.from({ length: 8 }, (_, offset) => {
      const index = octetIndex * 8 + offset
      const isNetwork = index < prefix
      const boundary = !isNetwork && index === prefix && prefix > 0 && prefix < 32
      const isOne = ((network >>> (31 - index)) & 1) === 1
      const value = Math.pow(2, 31 - index)
      const classes = [
        'bit',
        isNetwork ? 'bit--network' : 'bit--host',
        boundary ? 'is-boundary' : '',
      ].filter(Boolean).join(' ')
      return `<button type="button" class="${classes}" data-index="${index}"
                aria-label="${escapeHtml(bitAria(index, prefix, value))}">${isOne ? '1' : '0'}</button>`
    }).join('')
    return `<div class="bit-octet">
      <button type="button" class="bit-octet__dec mono" data-octet="${octetIndex}"
              aria-label="${escapeHtml(octetAria(octetIndex, network))}">${dec}</button>
      <div class="bit-octet__bits">${bits}</div>
    </div>`
  }).join('')

  const element = html(`
    <section class="card bit-viewer">
      <div class="bit-viewer__head">
        <h3 class="card__title"><span class="mono">${escapeHtml(`${info.networkAddress}/${info.prefix}`)}</span> — ${escapeHtml(t('bits.title'))}</h3>
        <div class="bit-legend">
          <span class="bit-legend__item">
            <i class="bit-swatch bit-swatch--network" aria-hidden="true"></i>${escapeHtml(t('bits.network'))}
          </span>
          <span class="bit-legend__item">
            <i class="bit-swatch bit-swatch--host" aria-hidden="true"></i>${escapeHtml(t('bits.host'))}
          </span>
        </div>
      </div>
      <div class="table-scroll">
        <div class="bit-octet-row">${octets}</div>
      </div>
      <p class="bit-viewer__info" role="status">${escapeHtml(t('bits.hint'))}</p>
    </section>`)

  const live = qs<HTMLElement>(element, '.bit-viewer__info')

  for (const button of Array.from(element.querySelectorAll<HTMLButtonElement>('.bit'))) {
    button.addEventListener('click', () => {
      const index = Number(button.dataset['index'] ?? '0')
      const value = Math.pow(2, 31 - index)
      live.textContent = bitAria(index, prefix, value)
    })
  }

  for (const button of Array.from(element.querySelectorAll<HTMLButtonElement>('.bit-octet__dec'))) {
    button.addEventListener('click', () => {
      const octetIndex = Number(button.dataset['octet'] ?? '0')
      live.textContent = octetAria(octetIndex, network)
    })
  }

  return element
}
