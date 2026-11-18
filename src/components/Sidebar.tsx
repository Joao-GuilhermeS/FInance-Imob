import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Building2, ChevronDown, LogOut, X } from 'lucide-react'
import type { Profile } from '../lib/domain'
import { useMobileNavigation } from '../lib/use-mobile-navigation'
import { appRoutes, navigationGroups } from '../lib/navigation'
export function Sidebar({ profile, open, onClose, onLogout }: { profile: Profile | null; open: boolean; onClose: () => void; onLogout: () => void }) {
  const [closed, setClosed] = useState<string[]>([])
  const ref = useRef<HTMLElement>(null)
  const mobile = useMobileNavigation()
  const location = useLocation()
  useEffect(() => {
    if (!open || !mobile) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const node = ref.current!
    const focusable = () => [...node.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')].filter(item => item.getClientRects().length)
    const frame = requestAnimationFrame(() => focusable()[0]?.focus())
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (event.key !== 'Tab') return
      const items = focusable(); const first = items[0]; const last = items.at(-1)
      if (!node.contains(document.activeElement)) { event.preventDefault(); first?.focus(); return }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', key)
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus() }
  }, [mobile, open, onClose])
  return <>
    <aside ref={ref} id="app-sidebar" className={`sidebar v2-sidebar ${open ? 'open' : ''}`} role={mobile ? 'dialog' : undefined} aria-modal={mobile && open ? true : undefined} aria-label="Navegação principal" aria-hidden={mobile && !open ? true : undefined} inert={mobile && !open}>
      <div className="sidebar-brand"><NavLink className="brand" to="/" onClick={onClose}><span className="brand-symbol"><Building2 size={21} aria-hidden="true" /></span>finance<span className="brand-light">imob</span><span className="brand-version">GESTÃO</span></NavLink><button className="mobile-close icon-button" onClick={onClose} aria-label="Fechar menu"><X size={21} aria-hidden="true" /></button></div>
      <nav aria-label="Menu principal">{navigationGroups.map((group, index) => {
        const items = appRoutes.filter(item => item.group === group && profile && item.roles.includes(profile.role))
        if (!items.length) return null
        const expanded = !closed.includes(group)
        return <section className="nav-group" key={group}><button className="nav-group-toggle" aria-expanded={expanded} aria-controls={`nav-group-${index}`} onClick={() => setClosed(current => current.includes(group) ? current.filter(item => item !== group) : [...current, group])}><span>{group}</span><ChevronDown size={13} className={expanded ? '' : 'collapsed'} aria-hidden="true" /></button><div id={`nav-group-${index}`} hidden={!expanded}>{items.map(item => {
          const active = location.pathname === item.path || item.aliases?.includes(location.pathname)
          return <NavLink key={item.path} to={item.path} end aria-current={active ? 'page' : undefined} className={active ? 'active' : ''} onClick={onClose}><item.icon size={17} aria-hidden="true" /><span>{item.label}</span></NavLink>
        })}</div></section>
      })}</nav>
      <div className="sidebar-footer"><span><i />Ambiente conectado</span><button className="icon-button" aria-label="Sair da conta" onClick={onLogout}><LogOut size={18} aria-hidden="true" /></button></div>
    </aside>
    {mobile && open ? <button className="menu-overlay" onClick={onClose} aria-label="Fechar navegação" tabIndex={-1} /> : null}
  </>
}
