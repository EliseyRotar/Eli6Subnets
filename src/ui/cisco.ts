/**
 * Cisco IOS snippet block (FR-05).
 *
 * One instance is mounted per tool panel. The interface / next-hop fields
 * are shared application state, so editing them in one panel updates the
 * snippets everywhere.
 */

import { t } from '../i18n'
import type { SubnetInfo } from '../calc/subnet'
import { getState, patchState, subscribe } from '../state/store'
import { copyText } from './clipboard'
import { html, qs } from './dom'
import { IconCopy } from './icons'
import { showToast } from './toast'

const INTERFACE_PLACEHOLDER = '<interface>'
const NEXT_HOP_PLACEHOLDER = '<next-hop>'

/** User-configured interface name, or the documented placeholder. */
export function interfaceName(): string {
  return getState().cisco.interfaceName.trim() || INTERFACE_PLACEHOLDER
}

/** User-configured next hop, or the documented placeholder. */
export function nextHop(): string {
  return getState().cisco.nextHop.trim() || NEXT_HOP_PLACEHOLDER
}

/** Interface configuration block for one subnet. */
export function interfaceBlock(info: SubnetInfo): string {
  return [
    `interface ${interfaceName()}`,
    ` ip address ${info.firstHost} ${info.subnetMask}`,
    ' no shutdown',
    '!',
  ].join('\n')
}

/** Summary route covering the given network. */
export function summaryRoute(info: SubnetInfo): string {
  return `ip route ${info.networkAddress} ${info.subnetMask} ${nextHop()}`
}

/** The comment printed above interface blocks. */
export function interfaceHint(): string {
  return t('cisco.interfaceHint')
}

/** The comment printed above summary routes. */
export function routeHint(): string {
  return t('cisco.routeHint')
}

export interface CiscoHandle {
  /** Re-read the snippet text; call after the tool results change. */
  refresh: () => void
}

export function mountCisco(
  parent: HTMLElement,
  idPrefix: string,
  build: () => string | null,
): CiscoHandle {
  const section = html(`
    <section class="result-section">
      <h2 class="result-section__subheading" data-i18n-key="cisco.heading"></h2>
      <div class="field-pair">
        <div class="field">
          <label class="field__label" for="${idPrefix}-iface" data-i18n-key="field.interface"></label>
          <input class="field__input js-cisco-interface" id="${idPrefix}-iface" type="text"
                 autocomplete="off" spellcheck="false" placeholder="GigabitEthernet0/1">
        </div>
        <div class="field">
          <label class="field__label" for="${idPrefix}-hop" data-i18n-key="field.nextHop"></label>
          <input class="field__input js-cisco-next-hop" id="${idPrefix}-hop" type="text"
                 autocomplete="off" spellcheck="false" placeholder="10.0.0.1">
        </div>
      </div>
      <div class="code-block">
        <pre><code class="js-cisco-code"></code></pre>
        <button type="button" class="btn btn--secondary btn--sm code-block__copy js-cisco-copy"
                data-i18n-aria="action.copy" data-i18n-title="action.copy">${IconCopy}</button>
      </div>
    </section>`)
  parent.appendChild(section)

  const iface = qs<HTMLInputElement>(section, '.js-cisco-interface')
  const hop   = qs<HTMLInputElement>(section, '.js-cisco-next-hop')
  const code  = qs<HTMLElement>(section, '.js-cisco-code')
  const copy  = qs<HTMLButtonElement>(section, '.js-cisco-copy')

  const syncFields = (): void => {
    const saved = getState().cisco
    // Never rewrite the field the user is typing in — it would move the caret.
    if (document.activeElement !== iface) iface.value = saved.interfaceName || INTERFACE_PLACEHOLDER
    if (document.activeElement !== hop)   hop.value   = saved.nextHop || NEXT_HOP_PLACEHOLDER
  }

  const refresh = (): void => {
    const text = build()
    section.hidden = text === null || text === ''
    if (!section.hidden) code.textContent = text ?? ''
    syncFields()
  }

  iface.addEventListener('input', () => {
    patchState({ cisco: { ...getState().cisco, interfaceName: iface.value } })
  })
  hop.addEventListener('input', () => {
    patchState({ cisco: { ...getState().cisco, nextHop: hop.value } })
  })

  copy.addEventListener('click', () => {
    void copyText(code.textContent ?? '').then(copied => {
      showToast(copied ? t('toast.copied') : t('toast.copyFailed'), copied ? 'success' : 'error')
    })
  })

  subscribe(refresh)
  refresh()
  return { refresh }
}

/** Assemble a snippet from a leading comment plus its blocks. */
export function snippet(hint: string, blocks: string[]): string {
  return [hint, ...blocks].join('\n')
}
