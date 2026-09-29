/**
 * Bootstrap: resolve the persisted state, wire the modules together and
 * mount the UI. Load order matters — language first so every component
 * renders with the right dictionary, state next so panels can hydrate.
 */

import './styles/base.css'
import './styles/tokens.css'
import './styles/layout.css'
import './styles/components.css'

import { applyTranslations, getLang, initLang, onLangChange, setLang } from './i18n'
import { loadState, defaultState, type AppState, type ToolId } from './state/persist'
import { decodeStateFromUrl } from './state/url'
import { getState, initStore, patchState, subscribe } from './state/store'
import { applyTheme, initTheme } from './theme'
import { mountFooter } from './ui/footer'
import { mountHeader } from './ui/header'
import { mountTabs } from './ui/tabs'
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
  const header = mountHeader(app)
  const tabs = mountTabs(app)

  const main = document.createElement('main')
  main.className = 'main'
  app.appendChild(main)

  const panels: Record<ToolId, ToolPanel> = {
    single: mountSingleSubnet(main),
    vlsm:   mountVlsm(main),
    split:  mountEqualSplit(main),
    supernet: mountSupernet(main),
  }

  tabs.activate(getState().activeTool)
  for (const panel of Object.values(panels)) panel.hydrate(getState())

  mountFooter(app, panels)
  applyTranslations(document)

  // The shared payload has been consumed; keep localStorage authoritative
  // on the next reload instead of re-applying the same link.
  if (location.search !== '') {
    history.replaceState(null, '', location.pathname)
  }

  // Cross-cutting sync: the store is the single source of truth for theme
  // and language, so imports and New Session travel through the same path
  // as the header toggles.
  subscribe(state => {
    applyTheme(state.theme)
    if (getLang() !== state.lang) setLang(state.lang)
  })

  onLangChange(lang => {
    if (getState().lang !== lang) patchState({ lang })
    for (const panel of Object.values(panels)) panel.refresh()
    header.refresh()
  })
}

bootstrap()
