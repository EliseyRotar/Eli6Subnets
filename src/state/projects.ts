/**
 * Saved projects: named snapshots of the whole application state (FR-09).
 *
 * Kept under their own storage key so New Session and the shareable URL
 * (which only carries tool inputs) never touch them. Every load re-runs
 * the state normaliser, so a snapshot written by an older schema is
 * dropped instead of crashing the list.
 */

import { normalizeState, type AppState } from './persist'

export const PROJECTS_KEY = 'eli6subnets_projects'

export interface ProjectRecord {
  id: string
  name: string
  /** ISO timestamp of the last save. */
  savedAt: string
  state: AppState
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A fresh unique id for a project (time + randomness, no crypto dependency). */
export function newProjectId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/** Read the saved project list; unreadable entries are dropped silently. */
export function loadProjects(): ProjectRecord[] {
  let raw: string | null
  try {
    raw = localStorage.getItem(PROJECTS_KEY)
  } catch {
    return []
  }
  if (raw === null) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const projects: ProjectRecord[] = []
    const seen = new Set<string>()
    for (const item of parsed) {
      if (!isRecord(item)) continue
      const id   = typeof item['id'] === 'string' ? item['id'] : ''
      const name = typeof item['name'] === 'string' ? item['name'].trim().slice(0, 60) : ''
      if (id === '' || name === '' || seen.has(id)) continue
      const state = normalizeState(item['state'])
      if (!state) continue
      seen.add(id)
      projects.push({
        id,
        name,
        savedAt: typeof item['savedAt'] === 'string' ? item['savedAt'] : '',
        state,
      })
    }
    return projects
  } catch {
    return []
  }
}

/** Persist the project list (best-effort: quota errors stay silent). */
export function saveProjects(projects: ProjectRecord[]): void {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
  } catch {
    // session continues without persistence
  }
}
