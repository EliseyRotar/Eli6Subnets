# Eli6Subnets — Implementation Tasks

Version: 0.1  
Date: 2026-09-25  
Status: Pending validation of requirements.md and design.md

Tasks are ordered by dependency. Each task is independently committable.  
Estimated effort is in developer-hours for a single person.

---

## Phase 0 — Project Scaffold

### T-00 · Initialise Vite + TypeScript project
- `npm create vite@latest . -- --template vanilla-ts`
- Add `vitest` and `@vitest/coverage-v8` as dev dependencies.
- Add `vite.config.ts`: set `base: '/Eli6Subnets/'`, configure Vitest.
- Add `tsconfig.json` with `strict: true`, `target: ES2020`.
- Create the directory tree from design.md §1 (empty files with module stubs).
- Add `npm run test`, `npm run build`, `npm run dev` scripts.
- **Done when:** `npm run build` and `npm run test` both exit 0 on the empty scaffold.

### T-01 · CSS design tokens and base styles
- Write `src/styles/tokens.css` with all CSS custom properties from design.md §5.1.
- Write `src/styles/base.css`: CSS reset, body font stack, box-sizing.
- Write `src/styles/layout.css`: header, tab bar, two-column tool panel, responsive breakpoint.
- Write `src/styles/components.css`: inputs, buttons, tables, chip row, warning/error styles.
- Import all four CSS files in `index.html` (or via `main.ts` — Vite handles either).
- **Done when:** opening `npm run dev` shows a blank page with correct background colour in both light and dark mode (toggle via DevTools).

### T-02 · FOUT-prevention script and theme init
- Add the inline `<script>` block to `index.html` (design.md §5.2).
- Write `src/theme/index.ts`: `initTheme()`, `toggleTheme()`, `applyTheme(t)`.
- `initTheme()` reads `localStorage` key `eli6subnets_theme`; falls back to `prefers-color-scheme`.
- **Done when:** hard-refreshing the page with `eli6subnets_theme = 'dark'` in localStorage shows dark theme with zero flash.

---

## Phase 1 — Calculation Layer

> All tasks in Phase 1 must have no DOM imports. Tests are the verification gate.

### T-03 · IP primitives (`src/calc/ip.ts`)
Implement and export:
- `ipToUint32(ip: string): number`
- `uint32ToIp(n: number): string`
- `prefixToMask(prefix: number): number`
- `maskToPrefix(mask: number): number`
- `validateIpCidr(cidr: string): ValidationResult`

Validation must cover all error keys from requirements.md §2 FR-09. When `error.host_bits_set` fires, compute and include the corrected network address as `suggestion`.

Write `tests/ip.test.ts` covering:
- Round-trip `ipToUint32` ↔ `uint32ToIp` for boundary values (0.0.0.0, 255.255.255.255).
- `prefixToMask` for /0, /8, /16, /24, /32.
- `validateIpCidr` for each error condition.
- `error.host_bits_set` suggestion check: `192.168.1.5/24` → suggestion `192.168.1.0/24`.

**Done when:** `npm run test tests/ip.test.ts` exits 0.

### T-04 · Single subnet calculation (`src/calc/subnet.ts`)
Implement `calcSubnet(cidr: string): SubnetInfo | ValidationResult`.

Edge cases to cover:
- `/31`: `usableHosts = 2`, `isPointToPoint = true`, no broadcast in classical sense.
- `/32`: `usableHosts = 1`, `isHostRoute = true`.
- `0.0.0.0/0` (default route).
- RFC 1918 ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
- `127.0.0.1/8` → `isLoopback = true`.
- `169.254.0.0/16` → `isLinkLocal = true`.
- `224.0.0.0/4` → `isMulticast = true`.
- Historical class detection: use first-octet ranges from requirements.md §2 FR-01.

Write `tests/subnet.test.ts`.

**Done when:** `npm run test tests/subnet.test.ts` exits 0.

### T-05 · VLSM allocator (`src/calc/vlsm.ts`)
Implement `allocateVlsm(baseCidr, requests): VlsmResult`.

Test scenarios:
1. Clean allocation: `192.168.1.0/24` with requests `[50, 25, 10, 5]` hosts.
2. Exact fit (all addresses used).
3. Overflow: base `/28` with requests requiring `/24` worth of space → `unallocated` populated, `minBasePrefixNeeded` computed.
4. Single request.
5. Empty request list → returns empty `allocations`.
6. Requests with duplicate names → validation catches before allocation (returns `ValidationResult`).

Write `tests/vlsm.test.ts` covering all scenarios.

**Done when:** `npm run test tests/vlsm.test.ts` exits 0.

### T-06 · Equal split (`src/calc/split.ts`)
Implement `splitEqual(baseCidr, count): SplitResult | ValidationResult`.

Test scenarios:
1. `10.0.0.0/24` into 4 subnets → 4 × `/26`.
2. `10.0.0.0/24` into 3 subnets → 4 × `/26` (rounds up to power of two).
3. `10.0.0.0/30` into 8 subnets → error (subnetPrefix > 32).
4. `count = 0` → error.
5. `count = 1` → returns the original network unchanged.

Write `tests/split.test.ts`.

**Done when:** `npm run test tests/split.test.ts` exits 0.

### T-07 · Supernetting (`src/calc/supernet.ts`)
Implement `summarise(cidrs): SupernetResult | ValidationResult`.

Test scenarios:
1. Pure: `192.168.0.0/24` + `192.168.1.0/24` → `192.168.0.0/23`, `isPure = true`.
2. Impure: `192.168.0.0/24` + `192.168.2.0/24` → supernet covers `/22`, `isPure = false`, `extraAddresses` includes `/24` blocks not in input.
3. Single input → error (`error.supernet_min_entries`).
4. Already-identical inputs → supernet equals input.
5. Mixed prefix lengths.

Write `tests/supernet.test.ts`.

**Done when:** `npm run test tests/supernet.test.ts` exits 0.

---

## Phase 2 — i18n and State Infrastructure

### T-08 · i18n dictionaries and `t()` function
- Write `src/i18n/it.json` with all keys for the Italian locale (all visible strings, all error messages, field labels, button labels, tooltips).
- Write `src/i18n/en.json` with English equivalents.
- Implement `src/i18n/index.ts`: `setLang(l)`, `getLang()`, `t(key, ...args)`.
- Language detection on first load: `navigator.language` prefix match.
- **Done when:** `t('app.title')` returns the correct string in both languages in a manual browser test.

### T-09 · State persistence and URL encoding
- Implement `src/state/persist.ts`: `loadState()`, `saveState()`, `clearState()` with schema version check.
- Implement `src/state/url.ts`: `encodeStateToUrl()`, `decodeStateFromUrl()`.
- `loadState()` must gracefully handle missing keys, invalid JSON, and schema version mismatches (return `null`, not throw).
- **Done when:** a state object round-trips through `saveState` → `loadState` and through `encodeStateToUrl` → `decodeStateFromUrl` without data loss (manual test or lightweight unit test).

---

## Phase 3 — UI Components

### T-10 · SVG icon library (`src/ui/icons.ts`)
- Define all 8 icons from design.md §7.4 as exported string constants.
- Signature: `export const IconCopy: string = '<svg ...>'`.
- Icons must use `currentColor`, 24×24 viewBox, 1.5px stroke, no fill (outline style).
- **Done when:** each icon renders correctly in isolation in the dev server.

### T-11 · Header component (`src/ui/header.ts`)
- Renders the app title, language toggle button, and theme toggle button.
- Language toggle cycles `it` ↔ `en`, updates all `[data-i18n-key]` elements, persists to localStorage.
- Theme toggle calls `toggleTheme()`, updates button icon (sun/moon).
- **Done when:** both toggles work and persist across hard refresh.

### T-12 · Tab bar (`src/ui/tabs.ts`)
- Renders 4 tabs; active tab has `aria-selected="true"` and the accent underline.
- Clicking a tab shows the corresponding panel, hides others, persists active tool.
- **Done when:** all 4 tabs switch panels, active state is correct, and the last active tab is restored on reload.

### T-13 · Toast notification (`src/ui/toast.ts`)
- Single `<div role="status" aria-live="polite">` mounted once at app init.
- `showToast(message, type: 'info' | 'success' | 'error')`: sets content, shows, auto-hides after 3 s.
- Subsequent call while visible replaces the current message (no stacking).
- **Done when:** clipboard copy success and validation errors trigger visible toasts.

### T-14 · Single Subnet tool panel (`src/ui/tools/singleSubnet.ts`)
- Input: one text field (CIDR), one "Calculate" button.
- On submit: validate (inline error below field), call `calcSubnet`, render result table.
- Result table: all `SubnetInfo` fields, flag chips row, Cisco IOS snippet component.
- Persists `cidr` input to state on every change (debounced 300 ms).
- **Done when:** `192.168.1.0/24` produces a fully labelled result table in both languages; invalid input shows correct error message.

### T-15 · VLSM tool panel (`src/ui/tools/vlsm.ts`)
- Inputs: base CIDR field, dynamic list of request rows (name + host count), "Add row" / "Remove row" buttons, "Allocate" button.
- On submit: validate, call `allocateVlsm`, render allocation table.
- If `unallocated` is non-empty: show warning block with list of unallocated requests and minimum base prefix suggestion.
- Cisco IOS snippet generated for the full VLSM allocation (all subnets + summary route).
- **Done when:** the scenario from T-05 test 1 renders correctly; overflow scenario shows the warning.

### T-16 · Equal Split tool panel (`src/ui/tools/equalSplit.ts`)
- Inputs: base CIDR, count field (number input), "Split" button.
- Renders a table of N subnets.
- **Done when:** `10.0.0.0/24` split into 4 shows 4 × `/26` rows.

### T-17 · Supernet tool panel (`src/ui/tools/supernet.ts`)
- Inputs: dynamic list of CIDR fields (min 2), "Summarise" button.
- Renders supernet result, purity flag, extra-addresses list if impure.
- **Done when:** both pure and impure scenarios (T-07 tests 1 and 2) render correctly.

### T-18 · Import / Export toolbar (`src/ui/importExport.ts`)
- Export JSON: `JSON.stringify(loadState())` → download via `<a download>` Blob URL.
- Export CSV: serialize current active tool's result set to CSV → download.
- Import JSON: file picker → `FileReader` → `JSON.parse` → `loadState` merge → re-render all panels.
- Import CSV: file picker → parse CSV → validate schema → populate active tool's inputs → trigger recalculation.
- CSV parse must produce field-level error messages (row, column, reason) shown in a modal or inline error block.
- **Done when:** a round-trip export-then-import restores the exact same state for both JSON and CSV.

### T-19 · Share URL button (`src/ui/share.ts`)
- "Share" button calls `encodeStateToUrl(currentState)`, writes to `window.history.pushState`, copies to clipboard, shows success toast.
- On `main.ts` init: if `location.search` contains `?s=`, call `decodeStateFromUrl` and hydrate panels before first render.
- **Done when:** copying a share URL and opening it in a new tab restores the same inputs.

### T-20 · New Session button
- Located in the header or footer (TBD during implementation — pick whichever feels less obtrusive).
- Shows a native `confirm()` dialog or a custom modal.
- On confirm: calls `clearState()`, resets all panel inputs to defaults, removes `?s=` from URL, shows toast.
- **Done when:** confirming "New Session" clears all inputs and localStorage, and cancelling does nothing.

---

## Phase 4 — Integration and Polish

### T-21 · Wire everything in `main.ts`
- Load theme (FOUT script already ran; `initTheme()` just reads the current value).
- Load language (`setLang` with persisted or detected lang).
- Load state (`loadState()` or URL decode).
- Mount header, tabs, all tool panels, import/export toolbar.
- Hydrate each panel with saved state.
- **Done when:** full app loads, all panels work, state persists across reload.

### T-22 · Accessibility pass
- Add `aria-label` / `<label for>` to all inputs, buttons, and icon-only buttons.
- Verify tab order is logical.
- Verify no keyboard traps (modal closes on Escape, focus returns to trigger).
- Run axe-core (CLI or browser extension) against both light and dark themes.
- Fix all violations before proceeding.
- **Done when:** axe-core reports zero critical or serious violations.

### T-23 · Full test suite pass
- Run `npm run test` — all tests must pass.
- Check coverage report: `src/calc/` must be ≥ 90% line coverage.
- Fix any failing tests before proceeding to Phase 5.

### T-24 · Production build verification
- Run `npm run build`.
- Serve `dist/` locally with `npx serve dist/` and verify all features work at the `/Eli6Subnets/` sub-path.
- Check network tab: no 404s, no external runtime requests.
- **Done when:** `npm run build` exits 0 and the app is fully functional from `dist/`.

---

## Phase 5 — Deploy

### T-25 · GitHub CLI check and auth
1. Check if `gh` is installed: `gh --version`.
2. If missing on Windows: `winget install --id GitHub.cli`.
3. Run `gh auth login --web` (device flow). **Pause and display the code + URL for the user to confirm manually before proceeding.** Do not continue until the user confirms the browser step is complete.

### T-26 · Git identity and repository initialisation
```bash
git config user.name "EliseyRotar"
git config user.email "nutellaelik@gmail.com"
git init                     # if not already a git repo
git add .
git commit -m "feat: initial implementation of Eli6Subnets"
```

### T-27 · Create or push GitHub repository
- If the repo does not exist:
  ```bash
  gh repo create Eli6Subnets --public --source=. --remote=origin --push
  ```
- If it already exists:
  ```bash
  git remote add origin https://github.com/EliseyRotar/Eli6Subnets.git  # if missing
  git push -u origin main
  ```

### T-28 · Create deploy workflow
- Write `.github/workflows/deploy.yml` (full content in design.md §9).
- Commit and push.

### T-29 · Enable GitHub Pages via API
```bash
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  /repos/EliseyRotar/Eli6Subnets/pages \
  -f source='{"branch":"main","path":"/"}' \
  --field build_type=workflow
```
If Pages is already enabled, skip without error.

### T-30 · Verify deploy
```bash
gh run list --repo EliseyRotar/Eli6Subnets --limit 5
gh run watch   # wait for the Pages deploy workflow to complete
```
Print the final GitHub Pages URL:  
`https://eliseyrotar.github.io/Eli6Subnets/`

---

## Dependency Map

```
T-00 → T-01 → T-02
T-00 → T-03 → T-04 → T-14
               T-04 → T-05 → T-15
               T-04 → T-06 → T-16
               T-04 → T-07 → T-17
T-00 → T-08
T-00 → T-09
T-08 + T-09 → T-10 → T-11 → T-12 → T-13 → T-14..T-17 → T-18 → T-19 → T-20
All of the above → T-21 → T-22 → T-23 → T-24
T-24 → T-25 → T-26 → T-27 → T-28 → T-29 → T-30
```

---

## Questions — Resolved 2026-09-25

| # | Question | Decision |
|---|----------|----------|
| Q1 | VLSM sort order | Automatic largest-first |
| Q2 | Impure supernet | Warning (result shown) |
| Q3 | CSV delimiter | Semicolon `;` + UTF-8 BOM on export; auto-detect on import |
| Q4 | Cisco IOS interface | `<interface>` placeholder with comment — not a fixed device name |
| Q5 | Font | `system-ui` prose + system monospace for IP/numeric values |
| Q6 | /31 and /32 | RFC 3021: /31 → 2 usable, /32 → 1 usable |
