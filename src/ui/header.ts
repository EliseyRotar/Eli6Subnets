/**
 * App header: title, language toggle, theme toggle (T-11).
 *
 * Both toggles are plain buttons; the language choice flows through the
 * i18n module and the theme through the theme module, and main.ts mirrors
 * those into the persisted store.
 */

import { getLang, setLang, t } from '../i18n'
import { getTheme, toggleTheme, type Theme } from '../theme'
import { IconGlobe, IconMoon, IconSun } from './icons'
import { qs } from './dom'

export interface HeaderHandle {
  refresh: () => void
}

function themeIcon(theme: Theme): string {
  return theme === 'dark' ? IconMoon : IconSun
}

export function mountHeader(container: HTMLElement): HeaderHandle {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <header class="header">
      <h1 class="header__title">Eli6<span>Subnets</span></h1>
      <div class="header__controls">
        <button type="button" class="btn btn--ghost" id="lang-toggle"
                data-i18n-aria="lang.switch" data-i18n-title="lang.switch">
          ${IconGlobe}
          <span class="header__lang-code"></span>
        </button>
        <button type="button" class="btn btn--ghost" id="theme-toggle"
                data-i18n-aria="theme.switch" data-i18n-title="theme.switch">
          <span id="theme-icon"></span>
        </button>
      </div>
    </header>`,
  )

  const root = qs(container, '.header')
  const langButton = qs(root, '#lang-toggle')
  const langCode = qs(root, '.header__lang-code')
  const themeButton = qs(root, '#theme-toggle')
  const iconSlot = qs(root, '#theme-icon')

  const refresh = (): void => {
    // The button offers the language you would switch *to*.
    langCode.textContent = t(getLang() === 'it' ? 'lang.code.en' : 'lang.code.it')
    iconSlot.innerHTML = themeIcon(getTheme())
    document.title = `${t('app.title')} — ${t('app.subtitle')}`
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
