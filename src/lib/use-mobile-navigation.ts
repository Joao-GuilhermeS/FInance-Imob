import { useCallback, useSyncExternalStore } from 'react'
export function useMobileNavigation() {
  const subscribe = useCallback((listener: () => void) => { const media = matchMedia('(max-width: 1023px)'); media.addEventListener('change', listener); return () => media.removeEventListener('change', listener) }, [])
  return useSyncExternalStore(subscribe, () => matchMedia('(max-width: 1023px)').matches, () => false)
}
