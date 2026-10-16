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
import { scheduleRefresh } from './charts'
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
import { mountIpv6 } from './ui/tools/ipv6'
import { mountCloud } from './ui/tools/cloud'
import { mountOverlap } from './ui/tools/overlap'
import { mountRange } from './ui/tools/range'
import { mountSingleSubnet } from './ui/tools/singleSubnet'
import { mountSupernet } from './ui/tools/supernet'
import { mountVlsm } from './ui/tools/vlsm'
import type { ToolPanel } from './ui/tools/types'
import { mountClasses } from './ui/views/classes'
import { mountGuide } from './ui/views/guide'
import { mountProjects } from './ui/views/projects'
import { mountTopology } from './ui/views/topology'
import type { ViewHandle } from './ui/views/types'
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
  single:   mountSingleSubnet(main),
  vlsm:     mountVlsm(main),
  split:    mountEqualSplit(main),
  supernet: mountSupernet(main),
  range:    mountRange(main),
  overlap:  mountOverlap(main),
  ipv6:     mountIpv6(main),
  cloud:    mountCloud(main),
}

  // Reference and planning views (classes, topology, guide, projects) are
  // not calculators — no inputs persisted under `tools`, no CSV — so they
  // mount separately but join the same sidebar registration below.
  const hydrateAll = (): void => {
    for (const panel of Object.values(panels)) panel.hydrate(getState())
    for (const view of views) view.refresh()
  }

  const views: ViewHandle[] = [
    mountClasses(main),
    mountTopology(main),
    mountGuide(main),
    mountProjects(main, hydrateAll),
  ]

  mountFooter(shell, panels)

  // The sidebar last: it resolves `#/view`, activates the panel and wires
  // the mobile drawer trigger living in the topbar. Calculators first,
  // then the static views — sidebar order itself comes from nav.ts.
  const sidebar = mountSidebar(app, [
    ...CALCULATOR_IDS,
    'classes', 'topology', 'guide', 'projects',
  ])
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
  // as the topbar toggles. Charts rebuild when either preference changes —
  // their palette and labels are read from the live CSS tokens.
  let appliedTheme = initial.theme
  subscribe(state => {
    applyTheme(state.theme)
    if (state.theme !== appliedTheme) {
      appliedTheme = state.theme
      scheduleRefresh()
    }
    if (getLang() !== state.lang) setLang(state.lang)
  })

  onLangChange(lang => {
    if (getState().lang !== lang) patchState({ lang })
    for (const panel of Object.values(panels)) panel.refresh()
    for (const view of views) view.refresh()
    topbar.refresh()
    scheduleRefresh()
  })
}

bootstrap()
