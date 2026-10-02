# HANDOFF — Eli6Subnets: ripresa su altro PC (opencode)

> **Uso**: apri opencode nella cartella del progetto a casa e incolla questo prompt:
> *"Leggi `HANDOFF-continue.md` e riprendi il lavoro dalla Fase 2 esattamente dove siamo arrivati, seguendo le convenzioni elencate."*
>
> File creato: 02/10/2026, sessione opencode (modello: opencode/mimo-v2.6-flash-free).
> ⚠️ **Le modifiche di questa sessione NON sono ancora state committate/pushate** (vedi §7).

---

## 1. Il progetto

**Eli6Subnets** — calcolatore di sottoreti IPv4, Vite + TypeScript vanilla (no framework),
deploy GitHub Pages su `https://eliseyrotar.github.io/Eli6Subnets/` (repo `EliseyRotar/Eli6Subnets`).

Spec autorevole (DA LEGGERE all'avvio):
- `tasks.md` (traccia attività T-01…T-30, tutte completate nella fase precedente)
- `design.md` (struttura §1, regole design §5, layout §7, Cisco §8, workflow §9)
- `requirements.md`
- `network_planner.html` — riferimento visivo DI PROPRietà dell'utente, riutilizzabile
  (è il "VLSM Slice Planner": pannelli card, pie chart SVG, anello classi A–E con
  drill-down, hash-router `#classes/A`, barra statistiche). **Utile per replicare style/logica.**

### Convenzioni INVARIA (dal prompt originale, non cambiate)
- Utente parla italiano; **codice e commenti in inglese** (terminologia di rete).
- **MAI firme/AI attribution** né nel codice né nell'UI.
- i18n completo `it`/`en`: stringhe solo via `src/i18n/it.json` + `en.json`,
  lookup `t(key, ...args)` con placeholder posizionali `{0}`; shell statica con
  `data-i18n-key` / `data-i18n-aria` / `data-i18n-title` / `data-i18n-placeholder`
  + `applyTranslations()`. **Chiave aggiunta in it deve esistere in en** (i18n.test fa parity check).
- Icone SVG inline (no emoji, no immagini).
- Calc layer puro `src/calc/*`: le funzioni ritornano `T | ValidationFailure`,
  ristrette con `isValidationFailure(value: unknown): value is ValidationFailure`.
- CSV: delimitatore `;`, UTF-8 BOM, quoting RFC 4180; schema per tool (`csvHeader` su `ToolPanel`).
- Stato: store `src/state/store.ts` = single source of truth; `saveState` batched via rAF.
- URL share: `?s=<base64url JSON subset>` (solo input) + **NUOVO: fragment `#/vista`** per la navigazione.
- Theme: script inline in `index.html` anti-FOUT; chiavi `eli6subnets_theme`, `eli6subnets_lang`, `eli6subnets_state`.
- **Git: UN FILE = UN COMMIT con messaggio custom** (regola dell'utente, history già riscritta così:
  56 commit). Qualsiasi push futuro deve rispettare questo.
- tsconfig strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.

### Ambito NUOVO deciso in questa sessione (risposte utente alle domande)
1. **Look**: "Dark dashboard a card" → default tema **scuro**, pannelli con bordo/ombra.
2. **Grafici (tutti e 5)**: donut spazio indirizzi, mappa visiva sottoreti (treemap),
   anello classi IPv4 A–E con drill-down, visualizzatore 32 bit, KPI + barre statistiche.
3. **Libreria grafici: ECharts** (già installata: `echarts ^6.1.0` in dependencies).
4. **Funzioni extra (tutte e 7)**: modalità cloud AWS/Azure, convertitore range→CIDR,
   verifica overlap CIDR, guida+cheat sheet, progetti salvati, IPv6 base, topologia visiva.
5. **Target**: tutti, **maggiorparte studenti (CCNA)** → copy didattico, spiegazioni, glossario.
6. **Layout**: **Sidebar + viste** (niente più tab bar).
7. `network_planner.html` è suo → **riutilizzare codice e design**.
8. **Accento**: teal scuro + **blu secondario** (teal=azioni/stato attivo, blu=link/dati).
9. **Topologia**: **editor drag&drop** (il tipo più complesso: nodi, link, assegnazione sottoreti).
10. **IPv6**: **entrambi** (tool dedicato + validazione nei campi esistenti).

---

## 2. Trascrizione della chat (sessione corrente)

**Utente**: "What did we do so far?" → ho riepilogato il completamento T-08…T-30
(i18n, state, UI, test 186, a11y axe 0 violazioni, build, deploy GitHub Pages,
history riscritta 56 commit, ricerca partita su network_planner.html/cloni GitHub).

**Utente**: "Continue if you have next steps…" → analizzati `network_planner.html`,
clonati in `%TEMP%\opencode`: `cidr.xyz` (844★, Astro+React, bit visualizer interattivo,
share/embed, guide/FAQ) e `visualsubnetcalc` (358★, albero visivo sottoreti, modalità
cloud AWS/Azure/OCI, import/export, URL sharing). Ricerca best-practice dashboard
(Carbon/Tableau/Qlik: max 5–9 visualizzazioni, gerarchia F, colori costanti, KPI alto-sinistra).

Poi ho fatto **10 domande** (question tool). Risposte utente:
- Look → **Dark dashboard a card**
- Grafici → **tutti e 5**
- Libreria → **ECharts**
- Funzioni extra → **tutte e 7**
- Target → "tutti, maggiorparte studenti quindi metti la prima opzione"
- Layout → **Sidebar + viste**
- network_planner → "Mio, riusa pure"

**3 domande di follow-up**, risposte:
- Accento → **Teal scuro + blu secondario**
- Topologia → **Editor drag&drop**
- IPv6 → **Entrambi**

**Utente** (con screenshot delle risposte): "Ecco quello che avevo chiesto, continua:
non mi piace il sito, l'interfaccia è troppo schifo, deve essere professionale con grafici
e tutto, prendi come esempio network_planner.html, ricerca online per altri progetti su
github, clonali e analizza il contenuto, deve avere grafici e tutte le funzioni degli altri
progetti, poi suddividilo bene, ricerca online anche come fare migliore l'interfaccia e
fammi delle domande per avere un context migliore"

→ "Decisioni chiuse: teal + blu secondario, editor drag&drop, IPv6 doppio. Imposto il piano
e inizio dalla fondamenta." → **avviata Fase 1**, creata todo-list a 7 fasi.

**Utente**: "aspetta io ora devo andare fai un file nella cartella con la tua chat e tutto,
continue con opencode ma a casa su un altro pc…" → **questo file**.

---

## 3. Cosa è stato FATTO in questa sessione (Fase 1 ✅ COMPLETA)

Verifiche superate alla fine della Fase 1:
- `.\node_modules\.bin\tsc.cmd --noEmit` → **0 errori**
- `npm.cmd test` → **186 test / 11 file verdi** (a11y axe 0 violazioni incluse)
- `npm.cmd run build` → ok (index 1.16 kB, css 13.95 kB, **js 56.18 kB / 16.93 kB gzip**)

### File NUOVI
| File | Contenuto |
|---|---|
| `src/ui/shell/nav.ts` | Modello navigazione: `NAV_SECTIONS` (tools / planning / reference) con id+icona+labelKey, `NAV_IDS`, `isViewId`. **Aggiungere qui le viste nuove.** |
| `src/ui/shell/sidebar.ts` | Sidebar: brand (h1 "Eli6Subnets"), sezioni, hash-router (`#/vista`), drawer mobile (overlay+Escape), `activate()`, `toggleDrawer()`. Esporta `mountSidebar(app, registered: ViewId[])`, `viewFromHash`, `hashFor`. |
| `src/ui/shell/topbar.ts` | Sostituisce header: bottone menu hamburger `#menu-toggle`, titolo vista `.topbar__view` (h2, `data-i18n-key` dinamico), toggle lingua `#lang-toggle`, tema `#theme-toggle`. Esporta `mountTopbar`. |

### File RISCRITTI
- `src/styles/tokens.css` — dark-first: `:root` = tema scuro (bg `#0a0e14`, surface `#121821`),
  `[data-theme="light"]` = override. Accent teal (`#2dd4bf` scuro / `#0f766e` chiaro),
  secondary blue (`#60a5fa` / `#2563eb`), semantic, `--shadow-sm/md/lg`, `--sidebar-width: 15rem`,
  `--topbar-height: 3.25rem`, radius fino a `--radius-xl`.
- `src/styles/layout.css` — shell a griglia `#app` = sidebar + `.shell`; `.sidebar` sticky,
  `.topbar` sticky con backdrop-blur, `.main`, `.footer`. **Mobile ≤900px**: sidebar off-canvas
  (translateX + `visibility:hidden` per non entrare nel tab-order), `.topbar__menu` visibile,
  overlay `.sidebar-overlay.is-open`. `.tool-panel.is-active` due colonne (sticky input).
- `index.html` — default tema **dark** (niente più prefers-color-scheme).
- `src/main.ts` — ordine bootstrap: shell → topbar → main → 4 pannelli → footer →
  `mountSidebar(app, CALCULATOR_IDS)` → wiring menu-toggle via delegation su `.topbar` →
  hydrate → `?s=` cleanup con `location.pathname + location.hash` (preserva il fragment).

### File MODIFICATI
- `src/state/persist.ts` — **rinomine**: `ToolId`→`CalculatorId` + nuovo `ViewId`
  (`'single'|'vlsm'|'split'|'supernet'|'range'|'overlap'|'ipv6'|'topology'|'classes'|'guide'|'projects'`),
  `VIEW_IDS`, `CALCULATOR_IDS`, campo **`activeTool` → `activeView`**, default `theme: 'dark'`,
  **alias legacy** in `normalizeState` (`raw['activeView'] ?? raw['activeTool']`) così i vecchi
  stati/localStorage continuano a caricarsi. `SCHEMA_VERSION` resta **1**.
- `src/state/store.ts` — `patchTool<K extends CalculatorId>`.
- `src/state/url.ts` — subset con `activeView`.
- `src/theme/index.ts` — fallback default `'dark'`.
- `src/ui/icons.ts` — aggiunte icone: `IconMenu, IconSingle, IconVlsm, IconSplit, IconSupernet,
  IconClasses, IconTopology, IconBook, IconBookmark, IconRange, IconOverlap, IconV6`
  (stile outline 24×24, 1.5px, currentColor).
- `src/ui/footer.ts` / `src/ui/importExport.ts` — tipi `CalculatorId`; `activePanel()` ora
  ritorna `ToolPanel | null` (viste non-calcolatrici → messaggio `export.noCsvView`);
  New Session preserva `location.hash`.
- `src/i18n/it.json` + `en.json` — nuove chiavi: `nav.range, nav.overlap, nav.ipv6, nav.topology,
  nav.classes, nav.guide, nav.projects, nav.main, nav.menu, nav.section.tools,
  nav.section.planning, nav.section.reference, export.noCsvView`.
- 4 tool (`singleSubnet/vlsm/equalSplit/supernet.ts`) — `id="panel-X"` → **`id="view-X"`**,
  rimosso `role="tabpanel"`, `aria-labelledby="nav-X"`, query `#view-X`.
- Test aggiornati: `tests/ui.test.ts` (sidebar/hash al posto delle tab; click+hashchange;
  `.topbar__view` textContent; `activeView`), `tests/state.test.ts` (activeView + test alias legacy),
  `tests/uiShare.test.ts` (`#view-split`, `#nav-split` aria-current), `tests/a11y.test.ts` (`#view-`).
- `package.json` — `echarts ^6.1.0` aggiunta (ancora **non importata** da nessun file!).

### File CANCELLATI
- `src/ui/tabs.ts` (tab bar) e `src/ui/header.ts` (sostituiti da `src/ui/shell/*`).

### Bug evitati (ricordare)
- `applyTranslations` fa `el.textContent = t(key)` → **schiaccia i figli**: il `data-i18n-key`
  sui link sidebar sta sul `<span>` interno, **mai** sull'anchor (altrondere l'icona SVG sparirebbe).
- Sidebar titolo h1 è l'**unico h1** della pagina (topbar usa h2).
- `location.hash` va preservato nei vari `history.replaceState` (pathname + hash).

---

## 4. Dove ero arrivato ESATTAMENTE (inizio Fase 2)

Stavo per scrivere il modulo grafici. Ricerca tipi ECharts **già fatta**:

- Import modulare consigliato (Vite + tree-shaking):
  ```ts
  import * as echarts from 'echarts/core'
  import { PieChart, TreemapChart, BarGraph?, BarChart, GraphChart } from 'echarts/charts'
  import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
  import { SVGRenderer } from 'echarts/renderers'
  echarts.use([...])
  ```
- `node_modules/echarts/types/dist/core.d.ts` esporta (verificato):
  `EChartsType as ECharts`, **`ECBasicOption as EChartsCoreOption`**, `init`,
  `getInstanceByDom`, `use`, `dispose`, `registerTheme`, …
- `dist/option.d.ts` esporta `EChartsOption`, `PieSeriesOption`, `TreemapSeriesOption`,
  `GraphSeriesOption`, `LegendComponentOption`, `TooltipComponentFormatterCallback`, …
- Renderer: **SVG** (crisp, leggero; i dataset sono piccoli).

### Design previsto modulo grafici (da implementare)
`src/charts/index.ts`:
- `renderChart(host: HTMLElement, factory: () => EChartsCoreOption): void`
  — registra factory in `WeakMap`, `echarts.init(host, undefined, {renderer:'svg'})`, setOption;
  tiene un `Set<HTMLElement>` per il refresh.
- `refreshCharts(): void` — per ogni host: `getInstanceByDom(host)?.resize()` + `setOption(factory())`
  (ri-legge i token CSS → tema dark/light aggiornato). **Chiamare da `sidebar.activate()` con
  `requestAnimationFrame`** (i pannelli sono `display:none` finché non attivi → size 0).
- `clearChart(host)` — dispose quando i risultati vengono azzerati (empty state).
- `try/catch` sull'init: in jsdom deve fallire silenziosamente (test non devono rompersi).
- Palette dai token CSS: teal `--color-accent`, blue `--color-secondary`, muted, surface…
  Lettura con `getComputedStyle(document.documentElement).getPropertyValue('--color-accent')`.

`src/ui/kpi.ts`: `kpiRow(items: {label,value,hint?}[])` → HTML `.kpi-row > .kpi-card` (card con label, valore mono grande, hint).

### Integrazione prevista nei 4 tool (risultati già renderizzati via `subnetView.ts`)
Prependere al `.js-result-body` un blocco dashboard:
```html
<div class="dash">
  <div class="kpi-row">…4 KPI…</div>
  <div class="dash__charts">
    <div class="card chart-card"><div class="chart" data-chart></div></div>  ← donut
    <div class="card chart-card"><div class="chart" data-chart></div></div>  ← treemap
  </div>
</div>
```
- **single**: KPI (prefisso, host utilizzabili, classe, tipo) + donut "utilizzabili vs riservati"
  (dati: `SubnetInfo.totalAddresses`, `usableHosts`).
- **vlsm**: KPI (sottoreti allocate, % efficienza, indirizzi liberi, richieste) +
  donut (una fetta per allocazione + libero nel base) + treemap (allocazioni dentro la rete base).
  Dati da `VlsmResult`/`VlsmAllocation` (`src/calc/vlsm.ts:17-28` — leggere i campi).
- **split**: KPI (n sottoreti, prefisso figlio, efficienza) + donut + treemap da `SplitResult`.
- **supernet**: KPI (reti riassunte, prefisso sommario, copertura) + treemap dei child nel summary.
  Dati da `SupernetResult` (`src/calc/supernet.ts:18`).
- Classi di servizio da `src/calc/{vlsm,split,supernet}.ts`: **leggere le interfacce prima**.
- CSS: aggiungere `.card`, `.kpi-row`, `.kpi-card`, `.chart-card`, `.chart` in `components.css`
  (token già pronti: `--radius-lg/xl`, `--shadow-sm/md`, `--color-surface`, `--color-border`).

---

## 5. Piano completo (todo-list aggiornata)

- [x] **Fase 1** — Design system dark-first + sidebar/router hash (COMPLETE, 186 test verdi)
- [ ] **Fase 2+3** — ECharts (`src/charts/index.ts`, `src/ui/kpi.ts`) + dashboard KPI/donut/treemap
      nei 4 tool esistenti. ← **Siamo qui**
- [ ] **Fase 4** — Nuovi calcoli in `src/calc/`: `range.ts` (IP range→CIDR set ottimale),
      `overlap.ts` (due CIDR → sovrapposizione/intersezione), `ipv6.ts` (prefisso, range, /64),
      `cloud.ts` (IP riservati AWS/Azure: gateway+2, DNS, prefix min; opzione cloud nei tool),
      estendere `persist.tools` (nuovi slice: `range`, `overlap`, `ipv6`, `cloud`) + id in
      `ViewId`/`CALCULATOR_IDS`/`NAV_SECTIONS` già pronti.
- [ ] **Fase 5** — Nuove viste: `classes` (anello A–E ECharts con drill-down, replicando
      `network_planner.html#classes`), `topology` (**editor drag&drop**: SVG/canvas, nodi
      router/switch/pc, drag con pointer events, zoom/pan, link etichettati con CIDR,
      palette, salvataggio in `persist` → schema state), `guide` (tabella /0…/32, classi,
      RFC1918, formule, esercizi — statica i18n), `projects` (progetti salvati con nome in
      localStorage/`persist.projects[]`: salva/riapri/rinomina/elimina).
- [ ] **Fase 6** — Visualizzatore 32 bit interattivo (click per bit, scroll ottetti,
      stile cidr.xyz) nella vista single + copy didattico (tooltip "?" "perché" sui campi).
- [ ] **Fase 7** — i18n it/en completo per tutto il nuovo, test per ogni modulo nuovo,
      a11y axe, build, **commit one-file-per-commit**, push, deploy Pages, verifica sito.

### Criteri di qualità
- `tsc --noEmit` 0 errori, `npm.cmd test` tutti verdi, axe 0 violazioni, build ok,
  **0 riferimenti esterni** (no CDN: ECharts va bundlata, già in dependencies ✓).
- Ogni vista: stato vuoto (`emptyState`), errori inline, KPI in alto-sinistra, max ~2 grafici/vista.
- i18n: ogni stringa visibile in it **e** en.

---

## 6. Ambiente e comandi (Windows/PowerShell)

```powershell
npm.cmd run dev            # sviluppo
npm.cmd test               # vitest (186 test)
npm.cmd run build          # tsc --noEmit && vite build
.\node_modules\.bin\tsc.cmd --noEmit   # typecheck (npx è BLOCCATO in questa shell)
```
- Powershell mostra mojibake nell'output dei test → i file sono ok, usare il tool Read.
- `gh` non era in PATH: `";$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"`; login già fatto come **EliseyRotar** (scope `repo, workflow, gist, read:org`).
- Cloni di riferimento in `C:\Users\ELISEY~1\AppData\Local\Temp\opencode\` (cidr.xyz,
  visualsubnetcalc) — **temporanei, NON sul repo**: a casa re-clonare se servono.
- Cartella progetto = OneDrive (`…\OneDrive - IIS G. Marconi\Eli6Subnets`) → potrebbe
  già sincronizzare i file, ma **il git no**: serve commit/push (§7).

---

## 7. GIT — stato e prossimo passo obbligato

- Repo locale `main`, remoto `https://github.com/EliseyRotar/Eli6Subnets.git`,
  ultimo commit: `c8d36a7 ci: run the deploy workflow on Node 24 with current action majors`.
- **Working tree attuale**: TUTTE le modifiche della Fase 1 sono non committate
  (nuove: `src/ui/shell/{nav,sidebar,topbar}.ts`; modificate: tokens/layout/index.html/
  main/persist/store/url/theme/footer/importExport/icons/i18n×2/4 tool/4 test/package.json+lock;
  cancellate: `src/ui/tabs.ts`, `src/ui/header.ts`; untracked: `network_planner.html`,
  `HANDOFF-continue.md`).
- **A CASA**: `git pull` (se pushato) → `npm.cmd install` (serve per echarts/jsdom) →
  leggere questo file → continuare Fase 2.
- **Se non pushato prima di partire**: i file esistono solo su questo PC/OneDrive.
- Quando si committerà: **UN FILE = UN COMMIT** con messaggio custom per file
  (usare `git add <file>` mirato, mai `git add -A`), poi push. Non committare
  `network_planner.html` (personale) salvo esplicita richiesta, né `HANDOFF-continue.md`
  se non richiesto.

---

## 8. Prompt pronto da incollare a casa

```
Apri il progetto Eli6Subnets. Leggi HANDOFF-continue.md per intero: contiene lo storico
della chat, le decisioni prese, cosa è stato fatto (Fase 1 completa) e cosa manca.
Verifica lo stato con git status, tsc --noEmit e npm.cmd test, poi prosegui dalla Fase 2
(Integrazione ECharts + dashboard KPI nei 4 tool) seguendo il design previsto nel §4,
rispettando le convenzioni (i18n it/en, nessuna firma AI, un file = un commit, dark-first
con accento teal + blu secondario). Non committare/pushare senza chiedermelo.
```
