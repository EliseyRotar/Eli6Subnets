# Eli6Subnets — Requirements

Version: 0.1  
Date: 2026-09-25  
Status: Draft — awaiting validation

---

## 1. Scope

Eli6Subnets is a static, client-only IP subnet calculator.  
It runs entirely in the browser; no backend, no runtime server.  
Output is a single deployable `dist/` folder.

---

## 2. Functional Requirements

### FR-01 — Single Subnet Calculation

Given an IPv4 address and a prefix length (CIDR notation, e.g. `192.168.1.0/24`):

| Output field        | Detail                                                      |
|---------------------|-------------------------------------------------------------|
| Network address     | Host bits zeroed                                            |
| Broadcast address   | Host bits set to 1                                          |
| Subnet mask         | Dotted-decimal (e.g. `255.255.255.0`)                       |
| Wildcard mask       | Bitwise inverse of subnet mask                              |
| First usable host   | Network + 1                                                 |
| Last usable host    | Broadcast − 1                                               |
| Total addresses     | 2^(32−prefix)                                               |
| Usable hosts        | Total − 2 (0 for /31, /32)                                  |
| Historical class    | A (1–126), B (128–191), C (192–223), D/E flagged separately |
| Address type flags  | Private (RFC 1918), Loopback, Link-local, Multicast         |

Special cases: `/31` (point-to-point, RFC 3021) has 2 usable hosts (no network/broadcast
distinction per RFC 3021). `/32` (host route) has 1 usable host. A note is displayed for both.

### FR-02 — VLSM Allocation

Inputs:
- A base network (CIDR)
- An ordered or unordered list of subnet requests: `{ name: string, requiredHosts: number }`

Algorithm:
1. Sort requests by `requiredHosts` descending (largest first).
2. Find the smallest prefix that accommodates `requiredHosts + 2` addresses.
3. Allocate sequentially within the base network, advancing the start pointer after each block.
4. If the base network is exhausted before all requests are satisfied:
   - Display which requests could not be allocated.
   - Calculate and display the minimum base prefix needed to fit all requests.
   - Emit a structured warning (not a silent failure).

Each allocated subnet must display all FR-01 fields plus the original request name.

### FR-03 — Equal Subdivision

Given a base network and N (number of equal subnets):
- Compute the smallest prefix ≥ base_prefix + ⌈log₂(N)⌉.
- List all N resulting subnets with their FR-01 fields.
- Reject if N is not a positive integer or if N × min_block > base_addresses.

### FR-04 — Supernetting / Route Summarisation

Given a list of CIDR prefixes:
1. Find the common bit prefix across all network addresses.
2. Produce the shortest covering supernet.
3. Flag if the supernets are not contiguous or not power-of-two-aligned ("impure summarisation" — the supernet covers addresses outside the input set).
4. Show exactly which addresses fall inside the supernet but outside the input ranges.

### FR-05 — Cisco IOS Configuration Generator

For each calculated subnet (from FR-01 through FR-04), generate:

```
interface <interface_placeholder>
 ip address <network+1> <mask>
 no shutdown
!
ip route <network> <mask> <next_hop_placeholder>
```

- Interface name and next-hop are user-editable fields (defaulting to placeholder strings).
- For VLSM output, also generate a summary route covering the entire base network.
- Output is copyable (one-click clipboard copy per snippet).

### FR-06 — Import / Export

| Format | Export                              | Import                                       |
|--------|-------------------------------------|----------------------------------------------|
| JSON   | Full application state (all tabs)   | Restore any previous JSON export             |
| CSV    | Current active result set only      | Re-populate the active tool's input fields   |

CSV schema per tool:

- Single subnet: `cidr`
- VLSM: `name,requiredHosts`
- Equal split: `cidr,count`
- Supernet: `cidr` (one per line)

CSV files are exported with semicolon (`;`) as delimiter and a UTF-8 BOM (`\uFEFF`) prepended,
so that Excel on Italian (and other European) locales opens them correctly with automatic column
splitting. Import accepts both `;` and `,` as delimiter (auto-detected from the first data line).

Import validation must produce field-level error messages (row, column, reason).

### FR-07 — Local State Persistence

- On every meaningful state change, serialize the full application state to `localStorage` under key `eli6subnets_state`.
- On load, restore the last saved state automatically.
- A "New Session" button clears `localStorage` and resets to defaults. It must show a confirmation dialog before clearing.
- Persisted fields: active tool, all input values, language, theme, Cisco IOS interface/next-hop overrides.

### FR-08 — Shareable URL

- Encode the current tool + its inputs as a URL query string (base64-encoded JSON to keep URLs clean).
- A "Share" button copies the URL to the clipboard and shows a transient confirmation.
- On load, if a query string is present, it takes precedence over `localStorage` state (but does not overwrite it).
- The URL must be bookmarkable and must not encode results (inputs only).

### FR-09 — Input Validation

All IP/CIDR inputs must be validated before any calculation:

| Error condition                      | Specific message key              |
|--------------------------------------|-----------------------------------|
| Empty input                          | `error.empty`                     |
| Invalid IP octet (out of 0–255)      | `error.octet_range`               |
| IP has fewer/more than 4 octets      | `error.octet_count`               |
| Prefix < 0 or > 32                   | `error.prefix_range`              |
| Host bits set in network address     | `error.host_bits_set` + suggestion|
| Non-integer or negative host count   | `error.host_count_invalid`        |
| VLSM list empty                      | `error.vlsm_empty`                |
| Duplicate subnet names in VLSM list  | `error.vlsm_duplicate_name`       |
| N ≤ 0 or non-integer in equal split  | `error.split_count_invalid`       |
| Supernet input fewer than 2 entries  | `error.supernet_min_entries`      |

When `error.host_bits_set` fires, suggest the corrected network address (e.g. user typed `192.168.1.5/24`, suggest `192.168.1.0/24`).

---

## 3. Non-Functional Requirements

### NFR-01 — Performance
- All calculations complete synchronously; no async needed for inputs up to `/8` base networks.
- First Contentful Paint < 1 s on a mid-range device (local network, no CDN).

### NFR-02 — Correctness
- `src/calc/` must be covered by unit tests (Vitest).
- VLSM allocation must be verified against known RFC examples.
- All bit-arithmetic operations must use unsigned 32-bit integer semantics (`>>> 0` in JS).

### NFR-03 — Accessibility
- All interactive controls have ARIA labels or associated `<label>` elements.
- Color is never the sole indicator of state (add icons or text).
- Keyboard-navigable: tab order follows visual order; no keyboard traps.
- Minimum contrast ratio 4.5:1 (WCAG AA) for both themes.

### NFR-04 — Browser Support
- Last 2 versions of Chrome, Firefox, Safari, Edge.
- No IE11. No polyfills for modern JS syntax.

### NFR-05 — Build
- `npm run build` produces a self-contained `dist/` with no external runtime dependencies.
- `npm run test` runs all unit tests and exits non-zero on failure.
- `npm run dev` starts Vite dev server.

---

## 4. Internationalisation (i18n)

- All visible strings live in `src/i18n/it.json` (Italian) and `src/i18n/en.json` (English).
- No hardcoded user-visible strings in component files.
- Language is detected from `navigator.language` on first visit (prefix match: `it` → Italian, else English).
- Language selection is persisted in `localStorage` under key `eli6subnets_lang`.
- The `t(key)` lookup function returns the key itself if a translation is missing (fail-visible, not silent).

---

## 5. Theme

- CSS custom properties on `:root` (light defaults) and `[data-theme="dark"]` override block.
- Accent colour: **`#2563eb`** (blue-600 equivalent) — chosen because it reads as a technical/network tool colour, maintains AA contrast on both white and near-black backgrounds, and avoids the cliché cyan-violet gradient.
- Theme default: `prefers-color-scheme` media query.
- Theme toggle persisted under `eli6subnets_theme` in `localStorage`.
- A minimal `<script>` placed before any CSS link in `<head>` reads `localStorage` and sets `document.documentElement.dataset.theme` before first paint, eliminating flash-of-wrong-theme (FOUT).

---

## 6. Out of Scope (v1)

- IPv6 support
- Routing protocol simulation
- Drag-and-drop VLSM block visualisation
- Multi-user / cloud sync
- Server-side rendering
