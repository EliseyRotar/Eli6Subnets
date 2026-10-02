/**
 * Bootstrap: resolve the persisted state, wire the modules together and
 * mount the UI. Load order matters — language first so every component
 * renders with the right dictionary, state next so panels can hydrate,
 * shell before panels (views need a host), sidebar last (it activates the
 * view and mirrors the URL fragment).
 */

import './styles/base.css'
import './styles/tokens.css'
import './styles/layout.css'
import './styles/components.css'

import { applyTranslations, getLang, initLang, onLangChange, setLang } from './i18n'
import {
  CALCULATOR_IDS,
  loadState,
  defaultState,
  type AppState,
  type CalculatorId,
} from './state/persist'
import { decodeStateFromUrl } from './state/url'
import { getState, initStore, patchState, subscribe } from './state/store'
import { applyTheme, initTheme } from './theme'
import { mountFooter } from './ui/footer'
import { mountSidebar } from './ui/shell/sidebar'
import { mountTopbar } from './ui/shell/topbar'
import { initToast } from './ui/toast'
import { mountEqualSplit } from './ui/tools/equalSplit'
import { mountSingleSubnet } from './ui/tools/singleSubnet'
import { mountSupernet } from './ui/tools/supernet'
import { mountVlsm } from './ui/tools/vlsm'
import type { ToolPanel } from './ui/tools/types'
import { qs } from './ui/dom'

/**
 * A shared link wins over localStorage for the inputs, while language and
 * theme stay personal preferences taken from the saved session.
 */
function resolveInitialState(): AppState {
  const saved = loadState() ?? defaultState()
  const shared = decodeStateFromUrl(location.search)
  return shared ? { ...saved, ...shared } : saved
}

function bootstrap(): void {
  initTheme()
  initLang()
  initToast()

  const initial = resolveInitialState()
  setLang(initial.lang)
  applyTheme(initial.theme)
  initStore(initial)

  const app = qs('#app')

  // Shell first so panels and the sidebar have their hosts in place.
  const shell = document.createElement('div')
  shell.className = 'shell'
  app.appendChild(shell)

  const topbar = mountTopbar(shell)

  const main = document.createElement('main')
  main.className = 'main'
  shell.appendChild(main)

  const panels: Record<CalculatorId, ToolPanel> = {
    single: mountSingleSubnet(main),
    vlsm:   mountVlsm(main),
    split:  mountEqualSplit(main),
    supernet: mountSupernet(main),
  }

  mountFooter(shell, panels)

  // The sidebar last: it resolves `#/view`, activates the panel and wires
  // the mobile drawer trigger living in the topbar.
  const sidebar = mountSidebar(app, CALCULATOR_IDS)
  qs('.topbar').addEventListener('click', event => {
    if ((event.target as Element).closest('#menu-toggle')) sidebar.toggleDrawer()
  })

  for (const panel of Object.values(panels)) panel.hydrate(getState())

  applyTranslations(document)

  // The shared payload has been consumed; keep localStorage authoritative
  // on the next reload instead of re-applying the same link. The `#/view`
  // fragment is navigation state and stays.
  if (location.search !== '') {
    history.replaceState(null, '', location.pathname + location.hash)
  }

  // Cross-cutting sync: the store is the single source of truth for theme
  // and language, so imports and New Session travel through the same path
  // as the topbar toggles.
  subscribe(state => {
    applyTheme(state.theme)
    if (getLang() !== state.lang) setLang(state.lang)
  })

  onLangChange(lang => {
    if (getState().lang !== lang) patchState({ lang })
    for (const panel of Object.values(panels)) panel.refresh()
    topbar.refresh()
  })
}

bootstrap()
