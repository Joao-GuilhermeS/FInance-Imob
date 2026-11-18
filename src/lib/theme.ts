import { useSyncExternalStore } from 'react'
export type Theme = 'light' | 'dark'
const key = 'financeimob.theme'
const eventName = 'financeimob:theme'
export function resolveTheme(saved: string | null, prefersDark: boolean): Theme {
  return saved === 'light' || saved === 'dark' ? saved : prefersDark ? 'dark' : 'light'
}
function savedTheme() { try { return localStorage.getItem(key) } catch { return null } }
function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0B0F19' : '#FAFAFA')
  window.dispatchEvent(new Event(eventName))
}
function subscribe(listener: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const changeSystem = () => { if (!['light', 'dark'].includes(savedTheme() || '')) apply(resolveTheme(null, media.matches)) }
  const changeStorage = (event: StorageEvent) => { if (event.key === key || event.key === null) apply(resolveTheme(savedTheme(), media.matches)) }
  window.addEventListener(eventName, listener)
  window.addEventListener('storage', changeStorage)
  media.addEventListener('change', changeSystem)
  return () => { window.removeEventListener(eventName, listener); window.removeEventListener('storage', changeStorage); media.removeEventListener('change', changeSystem) }
}
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light', () => 'light')
  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem(key, next) } catch { /* Session theme still works when storage is unavailable. */ }
    apply(next)
  }
  return { theme, toggle }
}
