/**
 * Footer toolbar: import/export, share and New Session (T-20).
 */

import type { CalculatorId } from '../state/persist'
import { clearState } from '../state/persist'
import { getState, resetState } from '../state/store'
import { t } from '../i18n'
import { qs } from './dom'
import { mountImportExport } from './importExport'
import { IconNewSession } from './icons'
import { mountShare } from './share'
import { showToast } from './toast'
import type { ToolPanel } from './tools/types'

export function mountFooter(
  container: HTMLElement,
  panels: Record<CalculatorId, ToolPanel>,
): void {
  container.insertAdjacentHTML('beforeend', '<footer class="footer"></footer>')
  const footer = qs(container, '.footer')

  mountImportExport(footer, panels)
  mountShare(footer)

  footer.insertAdjacentHTML(
    'beforeend',
    `
    <div class="footer__group footer__group--end">
      <button type="button" class="btn btn--danger btn--sm" id="new-session">
        ${IconNewSession}<span data-i18n-key="action.newSession"></span>
      </button>
    </div>`,
  )

  qs(footer, '#new-session').addEventListener('click', () => {
    if (!confirm(t('session.confirm'))) return

    clearState()
    resetState()

    const state = getState()
    for (const panel of Object.values(panels)) panel.hydrate(state)

    // Drop a shared link from the address bar so a reload starts fresh,
    // but keep the `#/view` fragment: it is part of the navigation state.
    history.replaceState(null, '', location.pathname + location.hash)
    showToast(t('session.reset'), 'success')
  })
}
