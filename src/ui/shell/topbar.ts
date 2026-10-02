/**
 * Top bar: mobile menu button, active view title, language and theme
 * toggles (T-11, reworked for the sidebar shell).
 *
 * The app title lives in the sidebar (single h1); this bar only names the
 * current view and hosts the personal-preference controls.
 */

import { applyTranslations, getLang, setLang, t } from '../../i18n'
import { getTheme, toggleTheme, type Theme } from '../../theme'
import { IconGlobe, IconMenu, IconMoon, IconSun } from '../icons'
import { qs } from '../dom'

export interface TopbarHandle {
  refresh: () => void
}

function themeIcon(theme: Theme): string {
  return theme === 'dark' ? IconMoon : IconSun
}

export function mountTopbar(container: HTMLElement): TopbarHandle {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <header class="topbar">
      <button type="button" class="btn btn--ghost topbar__menu" id="menu-toggle"
              data-i18n-aria="nav.menu" data-i18n-title="nav.menu">
        ${IconMenu}
      </button>
      <h2 class="topbar__view" data-i18n-key="nav.single"></h2>
      <div class="topbar__controls">
        <button type="button" class="btn btn--ghost" id="lang-toggle"
                data-i18n-aria="lang.switch" data-i18n-title="lang.switch">
          ${IconGlobe}
          <span class="topbar__lang-code"></span>
        </button>
        <button type="button" class="btn btn--ghost" id="theme-toggle"
                data-i18n-aria="theme.switch" data-i18n-title="theme.switch">
          <span id="theme-icon"></span>
        </button>
      </div>
    </header>`,
  )

  const root = qs(container, '.topbar')
  const langButton = qs(root, '#lang-toggle')
  const langCode = qs(root, '.topbar__lang-code')
  const themeButton = qs(root, '#theme-toggle')
  const iconSlot = qs(root, '#theme-icon')

  const refresh = (): void => {
    // The button offers the language you would switch *to*.
    langCode.textContent = t(getLang() === 'it' ? 'lang.code.en' : 'lang.code.it')
    iconSlot.innerHTML = themeIcon(getTheme())
    document.title = `${t('app.title')} — ${t('app.subtitle')}`
    applyTranslations(root)
  }

  langButton.addEventListener('click', () => {
    setLang(getLang() === 'it' ? 'en' : 'it')
    refresh()
  })

  themeButton.addEventListener('click', () => {
    toggleTheme()
    refresh()
  })

  refresh()
  return { refresh }
}
