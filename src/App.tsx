import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter, NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, Bell, Building2, CircleHelp, ClipboardList, HardHat, LayoutDashboard, LogOut, Menu, RefreshCw, Settings, Users, Wallet, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import { check, loadData } from './lib/api'
import { emptyData, roleNames } from './lib/domain'
import type { Data, Profile } from './lib/domain'
import { Auth } from './components/Auth'
const Workspace = lazy(() => import('./pages/Workspace').then(module => ({ default: module.Workspace })))
const FinancialRecords = lazy(() => import('./pages/FinancialRecords').then(module => ({ default: module.FinancialRecords })))
const navigation = [
  { path: '/', label: 'Visão geral', icon: LayoutDashboard, roles: ['admin','finance','sales','works'] },
  { path: '/imoveis', label: 'Imóveis', icon: Building2, roles: ['admin','finance','sales','works'] },
  { path: '/pessoas', label: 'Clientes e fornecedores', icon: Users, roles: ['admin','finance','sales','works'] },
  { path: '/vendas', label: 'Vendas e contratos', icon: ClipboardList, roles: ['admin','finance','sales'] },
  { path: '/reservas', label: 'Reservas', icon: Building2, roles: ['admin','finance','sales'] },
  { path: '/parcelas', label: 'Parcelas e recebimentos', icon: ArrowDownLeft, roles: ['admin','finance'] },
  { path: '/financeiro', label: 'Financeiro', icon: Wallet, roles: ['admin','finance'] },
  { path: '/fichas', label: 'Fichas financeiras', icon: ClipboardList, roles: ['admin','finance'] },
  { path: '/obras', label: 'Obras e custos', icon: HardHat, roles: ['admin','finance','works'] },
  { path: '/alertas', label: 'Central de alertas', icon: Bell, roles: ['admin','finance'] },
  { path: '/configuracoes', label: 'Configurações', icon: Settings, roles: ['admin','finance','sales','works'] },
]
function Shell({ session }: { session: Session }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [data, setData] = useState<Data>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [noAccess, setNoAccess] = useState(false)
  const [menu, setMenu] = useState(false)
  const location = useLocation()
  const reload = useCallback(async () => {
    setLoading(true); setError(''); setNoAccess(false)
    try {
      const { data: user, error: failure } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      check(failure)
      if (!user || !user.active) { setNoAccess(true); setProfile(null); setData(emptyData); return }
      setProfile(user as Profile); setData(await loadData(user.role))
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao carregar os dados.') }
    finally { setLoading(false) }
  }, [session.user.id])
  useEffect(() => { void reload() }, [reload])
  useEffect(() => { setMenu(false) }, [location.pathname])
  async function logout() { const { error: failure } = await supabase.auth.signOut({ scope: 'local' }); if (failure) setError('Não foi possível sair. Tente novamente.') }
  if (noAccess) return <div className="access-state"><Building2 size={36} /><h1>Acesso aguardando liberação</h1><p>Seu login está válido, mas ainda não há um perfil autorizado para este usuário.</p><p>Peça ao administrador para liberar seu acesso.</p><button onClick={() => void reload()}>Verificar novamente</button><button className="secondary" onClick={() => void logout()}>Sair</button></div>
  return <div className="app-shell"><aside className={menu ? 'sidebar open' : 'sidebar'}><a className="brand" href="/"><span className="brand-symbol"><Building2 size={23} /></span>finance<span className="brand-light">imob</span></a><button className="mobile-close icon-button" aria-label="Fechar menu" onClick={() => setMenu(false)}><X /></button>
    <div className="company"><span className="company-avatar">IM</span><div><strong>IMOB</strong><small>Gestão da empresa</small></div><span className="company-dot" /></div><p className="nav-label">ESPAÇO DE TRABALHO</p>
    <nav aria-label="Menu principal">{navigation.filter(item => profile && item.roles.includes(profile.role)).map(item => <NavLink end={item.path === '/'} to={item.path} key={item.path}><item.icon size={19} /><span>{item.label}</span></NavLink>)}</nav>
    <div className="sidebar-bottom"><div className="support"><CircleHelp size={20} /><div><strong>Tudo conectado.</strong><small>Uma operação, uma visão.</small></div></div><div className="user"><span className="user-avatar">{profile?.name.slice(0, 2).toUpperCase() || 'IM'}</span><div><strong>{profile?.name || 'Carregando…'}</strong><small>{profile ? roleNames[profile.role] : ''}</small></div><button className="icon-button" aria-label="Sair da conta" onClick={() => void logout()}><LogOut size={18} /></button></div></div>
  </aside>{menu ? <button className="menu-overlay" aria-label="Fechar menu" onClick={() => setMenu(false)} /> : null}
  <div className="main-wrap"><header className="topbar"><div><button className="mobile-menu icon-button" aria-label="Abrir menu" onClick={() => setMenu(true)}><Menu /></button><span className="breadcrumb">Workspace <span>/</span> <strong>{navigation.find(item => item.path === location.pathname)?.label || 'Visão geral'}</strong></span></div><div className="topbar-right"><span className="live"><i />Dados centralizados</span><button className="icon-button" onClick={() => void reload()} disabled={loading} aria-label="Atualizar dados"><RefreshCw size={18} className={loading ? 'spin' : ''} /></button><NavLink className="icon-button" to={profile?.role === 'works' || profile?.role === 'sales' ? '/' : '/alertas'} aria-label="Ver alertas"><Bell size={19} /></NavLink></div></header>
    <main id="main" className="content" aria-busy={loading}>{error ? <div role="alert" className="notice error">Não foi possível atualizar os dados: {error}<button className="secondary" onClick={() => void reload()}>Tentar novamente</button></div> : null}
      {loading && !profile ? <div className="loading" role="status"><RefreshCw className="spin" />Carregando sua operação…</div> : profile ? <Routes>{navigation.filter(item => item.roles.includes(profile.role)).map(item => <Route key={item.path} path={item.path} element={item.path === '/fichas' ? <FinancialRecords data={data} /> : <Workspace key={item.path} path={item.path} data={data} profile={profile} refresh={reload} />} />)}<Route path="*" element={<Navigate to="/" replace />} /></Routes> : null}
      <footer className="page-footer"><span>Finance Imob</span><span>Organização para crescer <ArrowUpRight size={13} /></span></footer>
    </main></div></div>
}
export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    void supabase.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); setLoading(false) } }).catch(() => { if (active) setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, current) => { setSession(current); setLoading(false) })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])
  if (loading) return <div className="loading full-screen" role="status">Preparando seu espaço…</div>
  return <BrowserRouter><Suspense fallback={<div className="loading" role="status">Carregando seu espaço…</div>}>{session ? <Shell key={session.user.id} session={session} /> : <Auth />}</Suspense></BrowserRouter>
}
