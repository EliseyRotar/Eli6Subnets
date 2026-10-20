# HANDOFF — Eli6Subnets: ripresa su altro PC (opencode)

> **Uso**: apri opencode nella cartella del progetto a casa e incolla questo prompt:
> *"Leggi `HANDOFF-continue.md` e riprendi il lavoro dalla fase indicata in §5 esattamente
> dove siamo arrivati, seguendo le convenzioni elencate."*
>
> File creato: 02/10/2026, sessione opencode (modello: opencode/mimo-v2.6-flash-free).
> Ultimo aggiornamento: 16/10/2026 — **Fase 5 completata e pushata** (vedi §3/§7).

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

**(Sessione 16/10/2026 — ripresa)** Utente: "continue" → eseguita **Fase 5 per intero**:
persist topology + projects storage, 4 viste (guide/classes/projects/topology), CSS,
73 chiavi i18n, wiring main, test (281 verdi, axe 0), 13 commit one-file, push
`7e48da6..343145d`, handoff aggiornato.

**(Sessione 20/10/2026 — ripresa)** Utente: "continue" → eseguita **Fase 6 per intero**:
`bitViewer` 32 bit interattivo montato nella vista `single`, hint "?" didattici sui campi
del risultato, 13 chiavi i18n, CSS, 3 test nuovi (**284 verdi**, axe 0), 6 commit
one-file `0348083..a1e9ad5`.

---

## 3. Cosa è stato FATTO (Fase 1 ✅ + Fase 2/3 ✅ + Fase 4 ✅ + Fase 5 ✅ + Fase 6 ✅)

### Fase 6 ✅ — visualizzatore 32 bit + copy didattico (commit `0348083..a1e9ad5`)

Verifiche: `tsc --noEmit` 0 errori · `npm.cmd test` → **284 test / 15 file verdi** ·
axe 0 violazioni · `npm.cmd run build` ok (`index.js 127.18 kB / 35.97 gzip` +
`echarts.js 493.10 kB` separato, css 24.59 kB).

- **`src/ui/bitViewer.ts`** (NUOVO) — `bitViewer(info: SubnetInfo): HTMLElement`: card con
  h3 `<cidr> — I 32 bit…`, legenda swatch (rete/accent, host/border-strong), 4 gruppi ottetto
  (`bit-octet-row` dentro `.table-scroll` → scroll mobile); ogni bit = `<button class="bit
  bit--network|bit--host">` con testo 0/1 (bit dell'**indirizzo di rete**, `ipToUint32`), aria-label
  = `t('bits.bitInfo', indice, ottetto, esponente unicode, valore, ruolo)`; primo bit host =
  `is-boundary` (mark blu, solo 0<prefix<32); bottone decimale per ottetto (`bit-octet__dec`,
  aria-label = `t('bits.octetInfo', …, binario 8 cifre)`); click bit/ottetto → aggiorna
  `<p role="status">` (init `t('bits.hint')`). Esponenti con Unicode superscript, niente matematica nuova.
- **`src/ui/tools/singleSubnet.ts`** — `render()` monta `bitViewer(lastInfo)` tra
  `singleDashboard` e `subnetSection` (ricostruito a ogni render → `t()` al build basta).
- **`src/ui/subnetView.ts`** — `row(label, value, primary?, hintKey?)` opzionale; `subnetFields`
  passa `hint.*` su 7 righe (network, broadcast, mask, wildcard, firstHost, total, usable).
  Hint = `<span class="field-hint">` con `<button class="field-hint__btn" aria-label="{hint}">?`
  + `<span class="field-hint__bubble" aria-hidden>`; visibilità **solo CSS** (`:hover`,
  `:focus-visible + bubble`) — nessun JS, **nessun id** (subnetSection è duplicato in split →
  id multipli vietati). L'aria-label sul button porta il testo completo → funziona anche senza hover.
- **i18n** — 13 chiavi ×2: `hint.network|broadcast|mask|wildcard|hostRange|total|usable`,
  `bits.title|hint|network|host|bitInfo|octetInfo`.
- **CSS** (`components.css`) — blocco hint (bubble assoluta max-width 16rem, shadow con fallback)
  + blocco viewer (`.bit` 1.7rem grid, `.bit--network` accent-subtle/border/accent/700,
  `.bit.is-boundary` box-shadow blu, `.bit-viewer__info` min-height anti-layout-jump).
- **Test** — `ui.test.ts` describe `bit viewer` (3 it): /26 → 32 bit / 26 rete / 6 host / 4 ottetti /
  7 hint / boundary al bit 26 e non al 25; click bit 0 → "Bit 0" + 2.147.483.648 + "bit di rete",
  click ottetto 0 → 192 + 11000000; /0 → 0 bit rete, /32 → 32 bit rete.
- **6 commit one-file** `0348083..a1e9ad5` (bitViewer, singleSubnet, subnetView, i18n it+en
  insieme, components.css, ui.test).

### Fase 5 ✅ — 4 viste non-calc: classes, topology, guide, projects (push `7e48da6..343145d`)

Verifiche: `tsc --noEmit` 0 errori · `npm.cmd test` → **281 test / 15 file verdi** ·
axe 0 violazioni (incluse le 4 viste nuove aperte) · `npm.cmd run build` ok
(`index.js 122.98 kB / 34.76 gzip` + `echarts.js 493.10 kB` separato, css 21.81 kB).

- **`src/state/persist.ts`** — nuovo slice `topology` in `AppState`:
  `TopoNode {id, kind:'router'|'switch'|'pc'|'server', name, x, y}`, `TopoLink {id, from, to, label}`,
  `TOPO_CANVAS = {width:680, height:460}` (viewBox), `normalizeState` valida id unici, kind enum,
  coord clampate, link con estremi esistenti; **stato assente → demo** (R1/SW1/PC1/SRV1 già
  collegati, così il canvas insegna al primo apertura), stato presente con `nodes:[]` → vuoto preservato.
  `SCHEMA_VERSION` resta 1. `url.ts` NON serializza topology (share = solo input tool) ✓ voluto.
- **`src/state/projects.ts`** — storage dedicato `eli6subnets_projects`: `ProjectRecord {id, name,
  savedAt, state}`; `loadProjects()` re-normalizza ogni snapshot (scarta corrotti), `saveProjects()`,
  `newProjectId()` (time+random, niente crypto).
- **`src/ui/views/types.ts`** — `ViewHandle {root, refresh}` (contratto delle viste non-calc).
- **`src/ui/views/guide.ts`** — formule (`2^(32−N)` ecc.), RFC 1918, intervalli speciali
  (loopback/link-local/multicast/0.0.0.0/8), 3 esercizi in `<details>`, **tabella /0–/32 calcolata
  a runtime** con `prefixToMask`/`uint32ToIp` (maschera, wildcard, totale, utilizzabili:
  ≤/30 → −2, /31 → 2, /32 → 1). Tabelle costruite via helper locale `blockTable` (con
  `.table-scroll`), ricostruite da `refresh()` perché gli header sono `t()`.
- **`src/ui/views/classes.ts`** — donut ECharts (`donutOption` con quote 50/25/12,5/6,25/6,25,
  centro `formatNumber(2^32)`) + legenda a **bottoni** `.legend-row` (`aria-pressed`, swatch
  `seriesColor(i)` coerente col grafico) + drill-down `.classes-detail` (intervallo/maschera/
  prefisso privato/uso + breakdown pubblico/privato/loopback con conteggi) e bottone "← Indietro".
  Dati statici in `CLASS_DEFS` (range/numeri non traducibili in codice; solo testi in i18n).
- **`src/ui/views/projects.ts`** — salva snapshot (`getState()`), **riapri** (`setState` con
  lang/theme correnti preservati + callback `onOpen` → `hydrate()` di tutti i pannelli + `refresh()`
  delle viste), rinomina inline (input+save/cancel), elimina **armed** (primo click = "Confermi?",
  secondo elimina; timeout 3s). `refresh()` su cambio lingua. Riga dinamica → `applyTranslations(list)`
  dopo il build (applyTranslations parte solo a mount/lang-change).
- **`src/ui/views/topology.ts`** — editor SVG drag&drop:
  nodi con glyph stroke (router/switch/pc/server) + label mono, colori via classe kind
  (accent/secondary/muted/text); link = 2 linee (hit 16px trasparente + linea) + label CIDR con
  `paint-order:stroke`; **selezione** node/link/canvas-vuoto → ispettore (rinomina live, select
  "collega con" + bottone, etichetta link live, delete, empty-state); **drag** pointerdown su svg
  (delegato, `closest('.topo-node')`), `setPointerCapture` con try/catch, `clientToCanvas` usa
  `getBoundingClientRect` e in jsdom (rect 0) cade su coordinate client; move = transform live +
  update geometria link, pointerup = `patchState`; **keyboard**: Enter/Space sul `<g tabindex=0
  role=button aria-label>` seleziona e ripristina il focus dopo il re-render; **add** dalla toolbar
  (nome auto R2/SW2/PC…, posizione a cascata), **clear armed** come projects; `.topo-empty` overlay
  con `hidden` toggle (mai sopra l'SVG quando non serve).
- **CSS**: `layout.css` `.tool-panel--wide.is-active` (una colonna); `components.css` —
  `.view-intro/.view-subheading/.table-scroll`, guide list/exercises, classes legend/detail/sub,
  projects save/list/row + `.btn.is-armed` pulse, topology toolbar/stage/svg/node/link/inspector/chip.
- **main.ts** — `views: ViewHandle[]` (classes, topology, guide, projects con `hydrateAll` callback),
  `mountSidebar(app, [...CALCULATOR_IDS, 'classes','topology','guide','projects'])`,
  `onLangChange` refresha anche `views`.
- **i18n** — 73 nuove chiavi ×2 (guide.×, classes.× incl. use.A–E, projects.×, topology.×,
  empty.projects/topology, **action.save/action.cancel** — non esistevano).
- **Test** — shell test ora **12 sidebar links/12 views**; +4 describe in `ui.test.ts`
  (classes drill-down, guide 33+3+4 righe, projects salva/apri/rinomina/elimina-armata,
  topology demo+keyboard select, drag pointer, add+connect+duplicate toast, clear armed);
  a11y: nuovo `it` che apre le 4 viste e lancia axe su ciascuna (0 violazioni).
- **13 commit one-file-per-commit** pushati `7e48da6..343145d`.

### Fase 4 ✅ — 4 nuovi calcolatori (pushato `7afac97..f6cd764`)

Verifiche: `tsc --noEmit` 0 errori · `npm.cmd test` → **273 test / 15 file verdi** ·
coverage `src/calc` **98.53% lines** (soglia 90) · `npm.cmd run build` ok
(`index.js 88.78 kB / 25.25 gzip` + `echarts.js 493.10 kB` separato).

- **Calc puri** (ognuno con il suo `tests/*.test.ts`):
  - `src/calc/range.ts` — `rangeToCidrs(start, end)` greedy allineato (≤64 blocchi),
    error `error.range_order`; `RangeCidr {cidr, first, last, size}`.
  - `src/calc/overlap.ts` — `findOverlaps(cidrs)` coppie con `relation`
    (`'a-contains-b' | 'b-contains-a' | 'equal'`; nessun `partial`: due blocchi allineati
    sono disgiunti o annidati), `spanToCidr` per l'intersezione; + `overlaps(a, b)` fast path;
    error `error.overlap_min_entries`. **Semantica**: `first/last == estremi di j → a contiene b`.
  - `src/calc/ipv6.ts` — `calcIpv6(cidr)` con **BigInt** (128 bit), parse `::` = head →
    zeri → tail (**attenzione allo shift: shiftare head+tail insieme è SBAGLIATO**), normalise
    RFC 5952 (lowercase, no leading zeros, run ≥2 → `::`, tie → primo a sinistra), flag
    loopback/unspecified/linkLocal/ULA/multicast/global, `totalAddresses` stringa decimale;
    error `error.ipv6_invalid`, `error.ipv6_prefix_range`.
  - `src/calc/cloud.ts` — `calcCloud(cidr, 'aws'|'azure')`: AWS = primi 4 (router + 3 riservati)
    + **ultimo** riservato; Azure = primi 5 (network, gateway, DNS, 2 riservati), ultimo
    utilizzabile. `maxPrefix` (28/29) → `prefixOk = prefix <= maxPrefix` (più corto numerically
    = sottorete più piccola → errore). `rows[].roleKey` = chiavi i18n `cloud.role.*`.
- **Persist**: `CalculatorId`/`CALCULATOR_IDS` estesi a 8 (`+range,overlap,ipv6,cloud`),
  `ViewId` = CalculatorId | topology|classes|guide|projects, `VIEW_IDS` 12 voci,
  `tools.{range,overlap,ipv6,cloud}` + rami in `defaultState()` e `normalizeState()`
  (ancora `SCHEMA_VERSION = 1`, campi mancanti → default).
- **Nav/icone**: `nav.cloud` in sezione **tools** (`src/ui/shell/nav.ts`), `IconCloud` in
  `src/ui/icons.ts`. La sidebar filtra per `registered` → le 4 view nuove appaiono
  perché in `CALCULATOR_IDS`.
- **4 pannelli** `src/ui/tools/{range,overlap,ipv6,cloud}.ts` — stesso contratto
  `ToolPanel` (`root/calculate/refresh/hydrate/exportCsv/csvHeader/importCsv`),
  `#view-X` + `aria-labelledby="nav-X"`, `emptyState('empty.X')`, KPI via `kpiRow`,
  tabelle via **`simpleTable(headers, rows)`** (nuovo helper in `subnetView.ts`),
  `alertBlock` per warning/success. overlap: righe dinamiche `.overlap-row`
  (template + `BLANK_ROWS=2`, pattern simile a VLSM); cloud: `<select id="cloud-provider">`.
- **i18n**: ~50 nuove chiavi ×2 lingue (nav.cloud, field.start/end/provider, action.check,
  empty.×4, label.cidr/address/role/field/value/status/expanded/lastAddress/relation,
  kpi.blocks/range/minPrefix/pairs/compared/span, overlap.×, ipv6.×, cloud.×,
  csv.error.invalid + le 4 error.*).
- **CSS**: `.overlap-rows/.overlap-row`, `select.field__input` cursor+background.
- **main.ts**: `panels` ora `Record<CalculatorId, ToolPanel>` con8 mount.
- **Test**: +8 file? no:4 nuovi file calc + **8 test UI** in `tests/ui.test.ts`
  (range: decomposition + inverted; overlap: pair + disjoint; ipv6: derive + malformed;
  cloud: AWS rows + switch Azure) → shell test ora **8 sidebar links/8 views**.
  a11y: 0 violazioni su tutte le8 view renderizzate.
- **21 commit one-file-per-commit** pushati `7afac97..f6cd764`.
- **Decisione utente**: cloud = **vista dedicata** (scelta durante la sessione).

### Fase 2/3 ✅ — ECharts + dashboard nei 4 tool

### Fase 2/3 ✅ — ECharts + dashboard nei 4 tool (ultimo lavoro, tutto committato e pushato)

Verifiche finali della Fase 2/3:
- `.\node_modules\.bin\tsc.cmd --noEmit` → **0 errori**
- `npm.cmd test` → **188 test / 11 file verdi** (a11y axe 0 violazioni; il rumore
  `[ECharts] Can't get DOM width` è sparito grazie al guard clientWidth/clientHeight)
- `npm.cmd run build` → ok, **chunk split**: `index.js 65.06 kB (19.56 gzip)` +
  `echarts.js 493.10 kB (169.68 gzip)` via `manualChunks` in `vite.config.ts` (era 558 kB monolitico)

Cosa c'è ora:
- **`src/charts/index.ts`** — registry ECharts (import modulare `echarts/core` + PieChart,
  TreemapChart, Tooltip, Legend, SVGRenderer). `renderChart(host, factory)` registra la factory
  in `Map` e **ritorna silenzioso se `host.clientWidth/clientHeight === 0`** (view nascoste +
  jsdom: niente init, niente rumore nei test); `refreshCharts()` (resize + setOption, rilegge i
  token CSS → segue tema/lingua), `scheduleRefresh()` (coalescing rAF), `clearChart`,
  listener `resize`. Palette: `seriesColor(i)` = fan su teal→cyan→blu, `cssVar()`,
  `textColor/mutedColor/surfaceColor/dimColor`.
- **`src/charts/builders.ts`** — `donutOption(slices, centerValue, centerLabel)` (donut con
  centro testo, itemStyle bordo colore surface) e `treemapOption(nodes)` (breadcrumb off,
  bordo surface). Tipi: `EChartsCoreOption` (`ECBasicOption`).
- **`src/ui/kpi.ts`** — `KpiItem {label, value, hint?, percent?}` (**`hint?/percent?` devono
  essere `string | undefined`/`number | undefined` per `exactOptionalPropertyTypes`**) +
  `kpiRow(items)` → `<dl class="kpi-row">` con barra percentuale `aria-hidden`.
- **`src/ui/dashboard.ts`** — 4 builder: `singleDashboard(info)`, `vlsmDashboard(base, result)`,
  `splitDashboard(base, result)`, `supernetDashboard(summary, result)`; helper `dash()`,
  `chartCard(title)` (escapeHtml sui titoli), `appendCharts`, `percentOf`. Ogni builder =
  kpi-row + `.dash__charts` con 1-2 card `chart-card > .chart`.
- **Wiring**: i 4 tool appendono la dashboard in `render()` (single: prima di `subnetSection`;
  vlsm/split: dopo il check empty con `baseInfo`; supernet: prima di `subnetSection`);
  `subnetListTable` è wrappato in `.card.card--flush`; `sidebar.activate()` chiama
  `scheduleRefresh()` (le view partono con width 0); `main.ts` chiama `scheduleRefresh()` su
  cambio tema (variabile `appliedTheme`) e su `onLangChange`.
- **CSS**: `components.css` — `.result-section` ora è una **card** (surface+border+shadow,
  `.chip-row` dentro con border-top), `.empty-state` dashed, `.card/.card__header/.card__title/
  .card__body/.card--flush`, `.js-result-body`, `.dash`, `.dash__charts` (auto-fit minmax 15rem),
  `.chart-card`, `.chart {height:14rem}`, `.kpi-row` (auto-fit minmax 9.5rem), `.kpi-card*`.
- **i18n**: aggiunte 36 chiavi `kpi.*` + `chart.usableSplit/chart.allocation/chart.map` in
  it **e** en (parità test ✓).
- **Test**: `tests/ui.test.ts` +2 (`describe('dashboard')`: single ≥4 KPI + `.chart-card`,
  supernet ≥4 KPI + 2 chart-card + table; VLSM: 2 KPI assertion dentro il 1° test vlsm
  — attenzione: il 2° test vlsm lascia la view in empty state, quindi le assert VLSM
  vanno nel 1º).
- **16 commit one-file-per-commit** pushati: `ffc6019..da66ae9`
  (charts/index → charts/builders → kpi → i18n en → i18n it → components.css → dashboard →
  subnetView → 4 tool → main → sidebar → ui.test → vite.config).

### Fase 1 ✅ (dettaglio storico)

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

## 4. Prossima fase (Fase 7 — chiusura: audit + verifica)

Fase 6 pushata. Prossimo: **Fase 7** = chiusura. Molte cose sono già coperte dalle fasi
precedenti (test, axe, parità i18n, build), quindi sarà soprattutto audit + verifica:

- [ ] **Audit i18n**: grep per testi hardcodati in `src/ui/**` (fuori dalle chiavi `t()`/JSON):
      ogni stringa visibile deve stare in it **e** en (parità già verde col test).
- [ ] **`export.noCsvView`** sulle 4 viste non-calc (footer import/export): già gestito in
      `activePanel()`, controllare solo il messaggio renderizzato quando non c'è CSV.
- [ ] Rivedere la copertura test per ogni modulo (calc già 98.5% lines; ui/a11y verdi).
- [ ] `npm.cmd test` (284) + axe 0 + `npm.cmd run build`; rifinitura copy se emergono buchi.
- [ ] **Verifica deploy Pages**: push → workflow → sito aggiornato (`eliseyrotar.github.io/Eli6Subnets/`).

### Regole sempre valide
- i18n: ogni chiave in **entrambi** i dizionari (`tests/i18n.test.ts` parità);
  `applyTranslations` schiaccia i figli → `data-i18n-key` mai su elementi con figli dinamici;
  righe ricostruite a runtime → `applyTranslations(list)` o `t()` al build (vedi projects.ts,
  bitViewer.ts).
- Viste non-calc: montate come `ViewHandle`, NON in `panels`; `mountSidebar` con spread.
- Topology: modello = `getState().topology` (muta in place + `patchState` per persistere);
  overlay `.topo-empty` sempre con `hidden` toggle; `clientToCanvas` con fallback jsdom.
- CSS-only classi dai token (`--color-*`, `--space-*`, `--radius-*`); niente colori hardcodati.
- Un file = un commit con messaggio custom, `git add <file>` mirato.
- Verifiche obbligatorie: `.\node_modules\.bin\tsc.cmd --noEmit`,
  `npm.cmd test` (284 test, 15 file), `npm.cmd run build`.
- ⚠ Suite jsdom può andare lenta in parallelo la prima volta su OneDrive (hookTimeout 10s):
  se 3 file falliscono con "Hook timed out", **rirun** `npm.cmd test` — di norma passa.

---

## 5. Piano completo (todo-list aggiornata)

- [x] **Fase 1** — Design system dark-first + sidebar/router hash (186 test)
- [x] **Fase 2+3** — ECharts + dashboard KPI/donut/treemap nei 4 tool (188 test, push `ffc6019..da66ae9`)
- [x] **Fase 4** — Nuovi calcoli `range/overlap/ipv6/cloud` + 4 pannelli + persist
      (**273 test / 15 file, coverage calc 98.5%, push `7afac97..f6cd764`**)
- [x] **Fase 5** — Viste non-calc `classes`/`topology`/`guide`/`projects`
      (**COMPLETE: 281 test / 15 file, axe 0, push `7e48da6..343145d`**)
- [x] **Fase 6** — Visualizzatore 32 bit interattivo + copy didattico (hint "?" sui campi)
      (**COMPLETE: 284 test / 15 file, axe 0, commit `0348083..a1e9ad5`**)
- [ ] **Fase 7** — Chiusura: audit i18n (tutte le stringhe visibili in it+en), verifica
      `export.noCsvView` sulle viste non-calc, audit test per ogni modulo, a11y axe,
      build, verifica deploy Pages. (Molto già coperto: sarà soprattutto verifica.)
      ← **Siamo qui**

### Criteri di qualità
- `tsc --noEmit` 0 errori, `npm.cmd test` tutti verdi, axe 0 violazioni, build ok,
  **0 riferimenti esterni** (no CDN: ECharts va bundlata, già in dependencies ✓).
- Ogni vista: stato vuoto (`emptyState`), errori inline, KPI in alto-sinistra, max ~2 grafici/vista.
- i18n: ogni stringa visibile in it **e** en.

---

## 6. Ambiente e comandi (Windows/PowerShell)

```powershell
npm.cmd run dev            # sviluppo
npm.cmd test               # vitest (284 test / 15 file)
npm.cmd test -- --coverage # + coverage src/calc (98.5% lines)
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

## 7. GIT — stato aggiornato

- Repo locale `main`: Fase 6 committata in **6 commit one-file-per-commit**
  (`0348083` bitViewer → `95539f0` singleSubnet → `0bd5c72` subnetView → `2e807fc` i18n
  it+en insieme → `4aa7e2d` components.css → `a1e9ad5` ui.test), poi questo handoff.
  Storico: `74f8969` (handoff Fase 5), `343145d` (Fase 5 axe), `7e48da6..343145d` (Fase 5),
  `f6cd764` (Fase 4), `da66ae9` (Fase 2/3).
- **Working tree PULITA** (verificata dopo i commit).
- Convenzione invariata: **UN FILE = UN COMMIT**, messaggio custom, `git add <file>` mirato,
  mai `git add -A`; i18n it+en committati **insieme** per tenere la parità verde.
- **Prossimo passo git**: verificare `git status`/`git log`, lavorare Fase 7 (audit) e
  committare allo stesso modo, poi push.

---

## 8. Prompt pronto da incollare a casa

```
Apri il progetto Eli6Subnets. Leggi HANDOFF-continue.md per intero: contiene lo storico
della chat, le decisioni prese, cosa è stato fatto (Fase 1 ✅, Fase 2/3 ✅, Fase 4 ✅,
Fase 5 ✅ e Fase 6 ✅ complete, 284 test verdi, tutto pushato) e cosa manca. Verifica lo stato con
git status, tsc --noEmit e npm.cmd test, poi prosegui dalla Fase 7 (chiusura: audit i18n,
verifica export.noCsvView sulle viste non-calc, audit test, deploy Pages — il checklist è
nel §4), rispettando le convenzioni (i18n it/en, nessuna firma AI, un file = un commit,
dark-first con accento teal + blu secondario). Non committare/pushare senza chiedermelo.
```
