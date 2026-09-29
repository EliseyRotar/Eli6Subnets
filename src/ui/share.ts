/**
 * Shareable URL button (FR-08 / T-19).
 *
 * The query string encodes inputs only, so the link reproduces what the
 * sender sees without shipping computed results around.
 */

import { t } from '../i18n'
import { getState } from '../state/store'
import { encodeStateToUrl } from '../state/url'
import { copyText } from './clipboard'
import { qs } from './dom'
import { IconShare } from './icons'
import { showToast } from './toast'

export function mountShare(container: HTMLElement): void {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <div class="footer__group">
      <button type="button" class="btn btn--secondary btn--sm" id="share-button">
        ${IconShare}<span data-i18n-key="action.share"></span>
      </button>
    </div>`,
  )

  qs(container, '#share-button').addEventListener('click', () => {
    const search = encodeStateToUrl(getState())
    history.pushState(null, '', search)

    void copyText(location.href).then(copied => {
      showToast(copied ? t('share.copied') : t('share.failed'), copied ? 'success' : 'error')
    })
  })
}
