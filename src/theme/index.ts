// Theme management: light / dark toggle with localStorage persistence.
// The inline script in index.html already applied the saved theme to
// document.documentElement.dataset.theme before first paint; this module
// reads that value and provides the runtime toggle.

const STORAGE_KEY = 'eli6subnets_theme'

export type Theme = 'light' | 'dark'

/** Read the currently applied theme from the DOM attribute. */
export function getTheme(): Theme {
  return (document.documentElement.dataset['theme'] as Theme | undefined) ?? 'dark'
}

/** Apply a theme: sets data-theme attribute and persists to localStorage. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // localStorage may be blocked in some contexts; non-fatal
  }
}

/** Toggle between light and dark, returns the new theme. */
export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}

/**
 * Called during app bootstrap after the inline script has already
 * set the initial theme. This is a no-op if data-theme is already set;
 * it only falls back to the dark default if the attribute is missing
 * (e.g. JS was disabled for the inline script somehow).
 */
export function initTheme(): Theme {
  const current = document.documentElement.dataset['theme'] as Theme | undefined
  if (current === 'light' || current === 'dark') return current
  applyTheme('dark')
  return 'dark'
}
