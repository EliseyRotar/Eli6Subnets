/**
 * IPv6 base tool panel: network, range and size of a prefixed address.
 */

import { calcIpv6, type Ipv6Info } from '../../calc/ipv6'
import { isValidationFailure } from '../../calc/ip'
import { t } from '../../i18n'
import type { AppState } from '../../state/persist'
import { patchTool } from '../../state/store'
import { clear, qs, setFieldError } from '../dom'
import { kpiRow } from '../kpi'
import { alertBlock, emptyState, simpleTable } from '../subnetView'
import type { ToolPanel } from './types'

export function mountIpv6(container: HTMLElement): ToolPanel {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <section class="tool-panel" id="view-ipv6" aria-labelledby="nav-ipv6">
      <div class="tool-panel__input">
        <form class="tool-form" id="ipv6-form" novalidate>
          <div class="field">
            <label class="field__label" for="ipv6-cidr" data-i18n-key="field.cidr"></label>
            <input class="field__input" id="ipv6-cidr" type="text" autocomplete="off"
                   spellcheck="false" placeholder="2001:db8::/64">
            <p class="field__error" id="ipv6-error" role="alert"></p>
          </div>
          <button type="submit" class="btn btn--primary" data-i18n-key="action.calculate"></button>
        </form>
      </div>
      <div class="tool-panel__results" role="region" data-i18n-aria="label.results">
        <div class="js-result-body"></div>
      </div>
    </section>`,
  )

  const root    = qs(container, '#view-ipv6')
  const form    = qs(root, '#ipv6-form')
  const input   = qs<HTMLInputElement>(root, '#ipv6-cidr')
  const error   = qs(root, '#ipv6-error')
  const body    = qs(root, '.js-result-body')

  let lastInfo: Ipv6Info | null = null
  let lastError: { key: string; suggestion: string | null } | null = null
  let errorVisible = false

  const showError = (key: string, suggestion: string | null): void => {
    lastError = { key, suggestion }
    errorVisible = true
    setFieldError(error, t(key, suggestion ?? ''))
  }

  const hideError = (): void => {
    lastError = null
    errorVisible = false
    setFieldError(error, null)
  }

  const flagRows = (info: Ipv6Info): string[][] => {
    const rows: string[][] = [
      [t('label.address'), info.address],
      [t('label.expanded'), info.expanded],
      [t('label.networkAddress'), `${info.network}/${info.prefix}`],
      [t('label.lastAddress'), info.lastAddress],
      [t('label.totalAddresses'), `${info.totalAddresses} (2^${128 - info.prefix})`],
    ]
    if (info.isLoopback)     rows.push([t('flag.loopback'), '::1'])
    if (info.isUnspecified)  rows.push([t('label.status'), t('ipv6.unspecified')])
    if (info.isLinkLocal)    rows.push([t('label.status'), t('flag.linkLocal')])
    if (info.isUniqueLocal)  rows.push([t('label.status'), t('ipv6.ula')])
    if (info.isMulticast)    rows.push([t('label.status'), t('flag.multicast')])
    if (info.isGlobalUnicast) rows.push([t('label.status'), t('ipv6.global')])
    return rows
  }

  const render = (): void => {
    clear(body)
    if (!lastInfo) {
      body.appendChild(emptyState('empty.ipv6'))
      return
    }
    body.appendChild(
      kpiRow([
        { label: t('label.address'), value: lastInfo.address },
        { label: t('kpi.prefix'), value: `/${lastInfo.prefix}` },
        { label: t('label.networkAddress'), value: lastInfo.network },
        { label: t('label.totalAddresses'), value: `2^${128 - lastInfo.prefix}` },
      ]),
    )
    body.appendChild(simpleTable([t('label.field'), t('label.value')], flagRows(lastInfo)))
    if (lastInfo.isUniqueLocal) {
      body.appendChild(alertBlock('warning', t('ipv6.ulaNote')))
    }
  }

  const calculate = (options?: { silent?: boolean }): void => {
    const silent = options?.silent ?? false
    const value = input.value.trim()

    if (value === '') {
      lastInfo = null
      if (silent) {
        lastError = { key: 'error.empty', suggestion: null }
        errorVisible = false
        setFieldError(error, null)
      } else {
        showError('error.empty', null)
      }
      render()
      return
    }

    const result = calcIpv6(value)
    if (isValidationFailure(result)) {
      lastInfo = null
      if (silent) {
        lastError = { key: result.errorKey, suggestion: result.suggestion ?? null }
        errorVisible = false
        setFieldError(error, null)
      } else {
        showError(result.errorKey, result.suggestion ?? null)
      }
      render()
      return
    }

    lastInfo = result
    hideError()
    render()
  }

  form.addEventListener('submit', event => {
    event.preventDefault()
    patchTool('ipv6', { cidr: input.value })
    calculate()
  })
  input.addEventListener('input', () => patchTool('ipv6', { cidr: input.value }))

  const panel: ToolPanel = {
    root,
    calculate,
    refresh() {
      if (lastError && errorVisible) {
        setFieldError(error, t(lastError.key, lastError.suggestion ?? ''))
      } else {
        setFieldError(error, null)
      }
      render()
    },
    hydrate(state: AppState) {
      input.value = state.tools.ipv6.cidr
      calculate({ silent: true })
    },
    exportCsv() {
      const rows: string[][] = [['cidr']]
      const value = input.value.trim()
      if (value !== '') rows.push([value])
      return rows
    },
    csvHeader: ['cidr'],
    importCsv(rows) {
      const row = rows[0]
      if (!row || row.length !== 1) {
        return t('csv.error.row', 1, 1, t('csv.error.columnCount', 1, row?.length ?? 0))
      }
      if (rows.length > 1) return t('csv.error.extraRows', rows.length)
      const value = (row[0] ?? '').trim()
      if (value === '') return t('csv.error.row', 1, 1, t('csv.error.required'))

      const validation = calcIpv6(value)
      if (isValidationFailure(validation)) {
        return t('csv.error.row', 1, 1, t(validation.errorKey, validation.suggestion ?? ''))
      }
      input.value = value
      patchTool('ipv6', { cidr: value })
      calculate()
      return null
    },
  }

  calculate({ silent: true })
  return panel
}
