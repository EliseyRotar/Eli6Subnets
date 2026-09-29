/**
 * In-memory application state with change notification.
 *
 * Deliberately not a reactive framework: components own their DOM and read
 * from the store on demand. Subscriptions exist only for cross-cutting
 * concerns (theme/language sync, tab switching, full re-hydration after an
 * import or a New Session).
 */

import { defaultState, saveState, type AppState, type ToolId } from './persist'

let state: AppState = defaultState()
const listeners = new Set<(state: AppState) => void>()

/** Install the initial state without writing it back to storage. */
export function initStore(initial: AppState): void {
  state = initial
}

export function getState(): AppState {
  return state
}

export function setState(next: AppState): void {
  state = next
  saveState(state)
  for (const listener of listeners) listener(state)
}

/** Shallow-merge a top-level slice of the state. */
export function patchState(patch: Partial<AppState>): void {
  setState({ ...state, ...patch })
}

/** Shallow-merge one tool's inputs without touching the other tools. */
export function patchTool<K extends ToolId>(
  tool: K,
  patch: Partial<AppState['tools'][K]>,
): void {
  setState({
    ...state,
    tools: {
      ...state.tools,
      [tool]: { ...state.tools[tool], ...patch },
    },
  })
}

export function subscribe(listener: (state: AppState) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Reset every input to defaults while keeping language and theme, used by
 * New Session after the user confirms.
 */
export function resetState(): void {
  const fresh = defaultState()
  fresh.lang  = state.lang
  fresh.theme = state.theme
  setState(fresh)
}
