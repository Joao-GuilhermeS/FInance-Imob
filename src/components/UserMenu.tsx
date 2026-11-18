import { LogOut } from 'lucide-react'
import { roleNames } from '../lib/domain'
import type { Profile } from '../lib/domain'
export function UserMenu({ profile, onLogout }: { profile: Profile | null; onLogout: () => void }) {
  return <details className="header-profile user-menu" onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus() } }}><summary aria-label={`Perfil: ${profile?.name || 'Carregando'}, ${profile ? roleNames[profile.role] : ''}`}><span className="user-avatar" aria-hidden="true">{profile?.name.slice(0, 2).toUpperCase() || 'IM'}</span><span className="profile-caption"><strong>{profile?.name}</strong><small>{profile ? roleNames[profile.role] : ''}</small></span></summary><div className="profile-popover"><strong>{profile?.name}</strong><small>{profile ? roleNames[profile.role] : ''}</small><button className="secondary" onClick={onLogout}><LogOut size={16} aria-hidden="true" />Sair da conta</button></div></details>
}
