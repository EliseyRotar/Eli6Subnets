# Eli6Subnets — Design

Version: 0.1  
Date: 2026-09-25  
Status: Draft — awaiting validation

---

## 1. Project Structure

```
Eli6Subnets/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── src/
│   ├── main.ts                  # Bootstrap: theme, i18n, routing, mount
│   ├── calc/
│   │   ├── ip.ts                # Primitive IP ↔ uint32 conversions
│   │   ├── subnet.ts            # Single subnet calculation (FR-01)
│   │   ├── vlsm.ts              # VLSM allocator (FR-02)
│   │   ├── split.ts             # Equal subdivision (FR-03)
│   │   ├── supernet.ts          # Summarisation (FR-04)
│   │   └── index.ts             # Re-export barrel
│   ├── ui/
│   │   ├── header.ts            # App header: title, lang toggle, theme toggle
│   │   ├── tabs.ts              # Tab bar + active panel switching
│   │   ├── tools/
│   │   │   ├── singleSubnet.ts  # Tool panel for FR-01
│   │   │   ├── vlsm.ts          # Tool panel for FR-02
│   │   │   ├── equalSplit.ts    # Tool panel for FR-03
│   │   │   └── supernet.ts      # Tool panel for FR-04
│   │   ├── cisco.ts             # IOS config snippet component (FR-05)
│   │   ├── importExport.ts      # Import/export UI (FR-06)
│   │   ├── share.ts             # Share-URL handler (FR-08)
│   │   └── toast.ts             # Transient notification (clipboard confirm, errors)
│   ├── i18n/
│   │   ├── it.json
│   │   ├── en.json
│   │   └── index.ts             # t(key, ...args) lookup
│   ├── theme/
│   │   └── index.ts             # applyTheme(), toggleTheme(), initTheme()
│   ├── state/
│   │   ├── persist.ts           # localStorage read/write with schema version
│   │   └── url.ts               # URL encode/decode of shareable state
│   └── styles/
│       ├── base.css             # Reset + typography
│       ├── tokens.css           # CSS custom properties (light + dark)
│       ├── layout.css           # Grid, header, tab bar
│       └── components.css       # Inputs, buttons, tables, result cards
├── tests/
│   ├── ip.test.ts
│   ├── subnet.test.ts
│   ├── vlsm.test.ts
│   ├── split.test.ts
│   └── supernet.test.ts
└── .github/
    └── workflows/
        └── deploy.yml
```

---

## 2. Calculation Layer (`src/calc/`)

### 2.1 Primitives (`ip.ts`)

```ts
// All arithmetic uses unsigned 32-bit integers.
function ipToUint32(ip: string): number          // "192.168.1.1" → 0xC0A80101
function uint32ToIp(n: number): string           // 0xC0A80101 → "192.168.1.1"
function prefixToMask(prefix: number): number    // 24 → 0xFFFFFF00
function maskToPrefix(mask: number): number      // 0xFFFFFF00 → 24
function validateIpCidr(cidr: string): ValidationResult
```

`ValidationResult`:
```ts
type ValidationResult =
  | { ok: true; ip: number; prefix: number }
  | { ok: false; errorKey: string; suggestion?: string }
```

### 2.2 Single Subnet (`subnet.ts`)

```ts
interface SubnetInfo {
  networkAddress:   string
  broadcastAddress: string
  subnetMask:       string
  wildcardMask:     string
  firstHost:        string
  lastHost:         string
  totalAddresses:   number
  usableHosts:      number
  prefix:           number
  historicalClass:  'A' | 'B' | 'C' | 'D' | 'E'
  isPrivate:        boolean   // RFC 1918
  isLoopback:       boolean   // 127.0.0.0/8
  isLinkLocal:      boolean   // 169.254.0.0/16
  isMulticast:      boolean   // 224.0.0.0/4
  isPointToPoint:   boolean   // /31
  isHostRoute:      boolean   // /32
}

function calcSubnet(cidr: string): SubnetInfo | ValidationResult
```

### 2.3 VLSM Allocator (`vlsm.ts`)

```ts
interface VlsmRequest {
  name:          string
  requiredHosts: number
}

interface VlsmAllocation {
  request:    VlsmRequest
  subnet:     SubnetInfo
  cidr:       string
}

interface VlsmResult {
  allocations:      VlsmAllocation[]
  unallocated:      VlsmRequest[]          // empty if all fit
  minBasePrefixNeeded: number | null       // null if all fit
}

function allocateVlsm(baseCidr: string, requests: VlsmRequest[]): VlsmResult
```

**Algorithm detail:**  
1. Parse and validate `baseCidr`.  
2. Sort `requests` by `requiredHosts` descending.  
3. Maintain `cursor: number` (uint32), initialised to the base network address.  
4. For each request, compute `blockSize = nextPowerOfTwo(requiredHosts + 2)`, derive prefix = `32 - log2(blockSize)`.  
5. If `cursor + blockSize - 1 > broadcast`, push to `unallocated`; otherwise allocate and advance `cursor += blockSize`.  
6. If `unallocated` is non-empty, compute minimum base prefix: find smallest prefix such that `2^(32-prefix) >= sum of all block sizes`.

### 2.4 Equal Split (`split.ts`)

```ts
interface SplitResult {
  subnets: SubnetInfo[]
  subnetPrefix: number
}

function splitEqual(baseCidr: string, count: number): SplitResult | ValidationResult
```

Prefix formula: `subnetPrefix = basePref + ceil(log2(count))`.  
Reject if `subnetPrefix > 32`.

### 2.5 Supernetting (`supernet.ts`)

```ts
interface SupernetResult {
  supernet:        string          // CIDR of covering supernet
  isPure:          boolean         // true if supernet exactly covers input set
  extraAddresses:  string[]        // CIDRs covered by supernet but not in input
  inputNetworks:   SubnetInfo[]
}

function summarise(cidrs: string[]): SupernetResult | ValidationResult
```

**Algorithm detail:**  
1. Parse all CIDRs; validate each.  
2. Compute bitwise AND of all network addresses → common bits.  
3. Find the longest common prefix length by XOR-ing the min and max addresses and counting leading zeros.  
4. The supernet is `(minAddr & commonMask) / commonPrefixLen`.  
5. "Pure" if `count of input networks == 2^(supernet.prefix - min_input_prefix)` and they are contiguous.

---

## 3. UI Layer (`src/ui/`)

### 3.1 Component Model

No framework. Each component is a function with this signature:

```ts
// Mount: creates DOM nodes, attaches listeners, returns root element.
function mountComponentName(container: HTMLElement, props: ComponentProps): ComponentHandle

// Handle exposes update and destroy.
interface ComponentHandle {
  update(newProps: Partial<ComponentProps>): void
  destroy(): void
}
```

Components do not re-render wholesale — they surgically update the specific DOM nodes that changed (target element references stored in closure). This avoids virtual DOM overhead while keeping the code predictable.

### 3.2 Tab Routing

The active tool is tracked in a plain `state` object (not a reactive store). Switching tabs:
1. Hides the current panel (`display: none`).
2. Shows the target panel.
3. Updates the active tab indicator.
4. Persists the new active tool to `localStorage`.

No URL hash routing — the shareable state (FR-08) uses query strings only.

### 3.3 Result Tables

Results render into `<table>` elements (not card grids) because the data is inherently tabular. Each tool has its own table schema. Tables are responsive via horizontal scroll on narrow viewports (no column hiding).

### 3.4 Cisco IOS Snippets (`cisco.ts`)

Each snippet renders in a `<pre><code>` block with a copy button (SVG clipboard icon). The copy action uses `navigator.clipboard.writeText`. On failure (insecure context), falls back to `document.execCommand('copy')`.

### 3.5 Toast Notifications (`toast.ts`)

A single floating `<div role="status" aria-live="polite">` at bottom-right. Messages auto-dismiss after 3 s. New messages replace the current one (no queue — prevents pile-up).

---

## 4. Internationalisation (`src/i18n/`)

### 4.1 Dictionary Structure

Both JSON files follow the same flat-ish key schema:

```json
{
  "app.title": "Eli6Subnets",
  "nav.singleSubnet": "Sottorete singola",
  "nav.vlsm": "VLSM",
  "nav.equalSplit": "Suddivisione uguale",
  "nav.supernet": "Supernetting",
  "field.networkAddress": "Indirizzo di rete",
  "field.broadcastAddress": "Indirizzo di broadcast",
  "error.empty": "Il campo non può essere vuoto.",
  "error.octet_range": "Ottetto {0} fuori intervallo (0–255): ricevuto {1}.",
  "error.host_bits_set": "Bit host impostati. Rete corretta: {0}.",
  ...
}
```

Placeholders use `{0}`, `{1}` etc. — the `t()` function performs simple positional replacement.

### 4.2 `t()` Function

```ts
function t(key: string, ...args: (string | number)[]): string
```

- Looks up in the active dictionary.
- Replaces `{0}`, `{1}`, … with `args`.
- If key not found, returns the key string (fail-visible).
- Language switching calls `t` on every rendered string element via stored element references; no full re-render.

### 4.3 Language Switching

Each localised DOM element stores its translation key in `dataset.i18nKey` and optional args in `dataset.i18nArgs` (JSON-encoded array). On language switch, `applyTranslations()` iterates `document.querySelectorAll('[data-i18n-key]')` and updates `textContent`.

---

## 5. Theme (`src/theme/`)

### 5.1 CSS Tokens

```css
/* src/styles/tokens.css */
:root {
  /* Accent: blue-600 — technical, network-tool feel, AA-compliant on white and #1a1a2e */
  --color-accent:        #2563eb;
  --color-accent-hover:  #1d4ed8;
  --color-accent-text:   #ffffff;

  /* Neutrals (light) */
  --color-bg:            #ffffff;
  --color-surface:       #f4f4f5;
  --color-border:        #d4d4d8;
  --color-text:          #18181b;
  --color-text-muted:    #71717a;

  /* Semantic */
  --color-success:       #16a34a;
  --color-warning:       #d97706;
  --color-error:         #dc2626;
}

[data-theme="dark"] {
  --color-bg:            #0f0f13;
  --color-surface:       #1c1c23;
  --color-border:        #3f3f46;
  --color-text:          #fafafa;
  --color-text-muted:    #a1a1aa;
}
```

No gradient backgrounds. Depth is achieved through `--color-surface` vs `--color-bg` and border weight, not shadows or gradients.

### 5.2 FOUT Prevention

`index.html` contains this script inline, before any stylesheet link:

```html
<script>
  (function () {
    var saved = localStorage.getItem('eli6subnets_theme');
    var preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = saved || preferred;
  })();
</script>
```

This runs synchronously before CSSOM construction, so the correct theme is set before the first paint.

---

## 6. State Management

### 6.1 Application State Shape

```ts
interface AppState {
  version:     1                        // schema version for future migrations
  activeTool:  'single' | 'vlsm' | 'split' | 'supernet'
  lang:        'it' | 'en'
  theme:       'light' | 'dark'
  tools: {
    single:    { cidr: string }
    vlsm:      { baseCidr: string; requests: { name: string; hosts: string }[] }
    split:     { cidr: string; count: string }
    supernet:  { cidrs: string[] }
  }
  cisco: {
    interfaceName: string               // default "GigabitEthernet0/0"
    nextHop:       string               // default "0.0.0.0"
  }
}
```

### 6.2 Persistence (`persist.ts`)

```ts
const STATE_KEY  = 'eli6subnets_state'
const LANG_KEY   = 'eli6subnets_lang'
const THEME_KEY  = 'eli6subnets_theme'

function loadState(): AppState | null
function saveState(state: AppState): void
function clearState(): void
```

`saveState` is called in a `requestAnimationFrame` callback to batch rapid successive updates into a single write.

### 6.3 URL Encoding (`url.ts`)

```ts
function encodeStateToUrl(state: Partial<AppState>): string
function decodeStateFromUrl(search: string): Partial<AppState> | null
```

Encoding: `JSON.stringify(inputs-only subset)` → `btoa` → set as `?s=<value>`.  
Decoding on load: `atob` → `JSON.parse` → validate shape → merge over defaults.  
If decoding fails (malformed URL), silently fall back to `localStorage` state.

---

## 7. Visual Design System

### 7.1 Typography

Font stack: `system-ui, -apple-system, 'Segoe UI', sans-serif`  
Numeric and code values (IP addresses, masks, CIDR notation): `'Cascadia Code', 'Fira Code', 'Consolas', monospace`  
System fonts are a deliberate choice — zero extra bytes, consistent with the OS the user already knows,
and avoids the homogenised look of Inter (used by default in most AI-generated UIs).

| Role           | Size    | Weight |
|----------------|---------|--------|
| App title      | 1.25rem | 600    |
| Section header | 1rem    | 600    |
| Body           | 0.875rem| 400    |
| Code/mono      | 0.813rem| 400    |
| Label          | 0.75rem | 500    |

### 7.2 Layout

```
┌──────────────────────────────────────────────────────┐
│  HEADER: title | lang toggle | theme toggle          │
├──────────────────────────────────────────────────────┤
│  TAB BAR: [Single] [VLSM] [Equal Split] [Supernet]   │
├──────────────────────────────────────────────────────┤
│  TOOL PANEL                                          │
│  ┌───────────────────┐  ┌──────────────────────────┐ │
│  │  INPUT FORM       │  │  RESULT PANEL            │ │
│  │  (left, ~40%)     │  │  (right, ~60%)           │ │
│  └───────────────────┘  └──────────────────────────┘ │
├──────────────────────────────────────────────────────┤
│  FOOTER: import/export toolbar + share button        │
└──────────────────────────────────────────────────────┘
```

On viewports < 768px, the two-column tool panel stacks vertically (input above results).

### 7.3 Component Hierarchy

Results are NOT all identical cards. Visual weight follows data importance:

- **Primary result** (network address, prefix): large, `--color-text`, `font-weight: 600`.
- **Secondary fields** (mask, wildcard, hosts): normal size, `--color-text`.
- **Metadata / flags** (class, private, loopback): small, `--color-text-muted`, displayed as a horizontal chip row.
- **Warnings** (VLSM overflow, impure supernet): `--color-warning` left border accent + icon.
- **Errors**: `--color-error` inline, adjacent to the field.

### 7.4 SVG Icon Set

Minimal, 24×24 viewBox, 1.5px stroke, `currentColor`. Icons used:

| Usage           | Icon description         |
|-----------------|--------------------------|
| Copy to clipboard | Two overlapping squares |
| Theme toggle    | Sun / Moon (two variants)|
| Language        | Globe outline            |
| Share           | Arrow-up-from-box        |
| Export          | Arrow-down to tray       |
| Import          | Arrow-up from tray       |
| Warning         | Triangle with ! inside   |
| New session     | X in circle              |

All icons are inline SVG strings exported from `src/ui/icons.ts` — no icon font, no external sprite.

---

## 8. Cisco IOS Config Generator (FR-05) — Detail

For a single subnet with network `N`, mask `M`, the generated block is:

```
! Sostituisci <interface> con il nome reale, es. GigabitEthernet0/1
interface <interface>
 ip address <firstHost> <subnetMask>
 no shutdown
!
```

The interface placeholder is the literal string `<interface>` — not a pre-filled device name.
Using a specific name like `GigabitEthernet0/0` on every generated block would mislead anyone
who copies the output verbatim (two subnets cannot share an interface). The comment above each
block makes the placeholder intent explicit.

For VLSM, a trailing summary route is appended:

```
ip route <baseNetwork> <baseMask> <nextHop>
```

The next-hop is read from `AppState.cisco.nextHop` (default `<next-hop>`). It is editable directly
in the footer of the Cisco panel.

---

## 9. Deploy Workflow (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages:    write
  id-token: write

concurrency:
  group:    pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

`vite.config.ts` must set `base: '/Eli6Subnets/'` for the GitHub Pages sub-path.

---

## 10. Decisions (resolved 2026-09-25)

| # | Question | Decision |
|---|----------|----------|
| Q1 | VLSM sort order | Automatic largest-first — no manual reordering UI |
| Q2 | Impure supernet | Warning (result shown with highlighted extra-address list) |
| Q3 | CSV delimiter | Semicolon `;` + UTF-8 BOM on export; auto-detect `;`/`,` on import |
| Q4 | Cisco interface placeholder | Generic `<interface>` string with explanatory comment — not a device name |
| Q5 | Font | `system-ui` stack for prose, system monospace stack for IP/numeric values |
| Q6 | /31 and /32 usable hosts | RFC 3021: /31 → 2 usable, /32 → 1 usable |
