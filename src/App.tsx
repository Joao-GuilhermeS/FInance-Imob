import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter, NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom'
import { ArrowUpRight, Bell, Building2, Menu, RefreshCw } from 'lucide-react'
import { supabase } from './lib/supabase'
import { check, loadData, rpc } from './lib/api'
import { emptyData } from './lib/domain'
import type { Data, Profile } from './lib/domain'
import { ThemeToggle } from './components/ThemeToggle'
import { installmentOutstanding, today } from './lib/domain'
import { UserMenu } from './components/UserMenu'
import { Sidebar } from './components/Sidebar'
import { useMobileNavigation } from './lib/use-mobile-navigation'
import { appRoutes } from './lib/navigation'
import { Auth } from './components/Auth'
const Workspace = lazy(() => import('./pages/Workspace').then(module => ({ default: module.Workspace })))
const FinancialRecords = lazy(() => import('./pages/FinancialRecords').then(module => ({ default: module.FinancialRecords })))
function Shell({ session }: { session: Session }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [data, setData] = useState<Data>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [noAccess, setNoAccess] = useState(false)
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const location = useLocation()
  const menu = menuPath === location.pathname
  const mobile = useMobileNavigation()
  const closeMenu = useCallback(() => setMenuPath(null), [])
  const notificationCount = data.installments.filter(item => installmentOutstanding(item) > 0 && item.due_on <= today()).length
  const reload = useCallback(async () => {
    setLoading(true); setError(''); setNoAccess(false)
    try {
      const result = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      check(result.error)
      let user = result.data
      if (!user) {
        await rpc('ensure_profile', {})
        const provisioned = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
        check(provisioned.error); user = provisioned.data
      }
      if (!user || !user.active) { setNoAccess(true); setProfile(null); setData(emptyData); return }
      setProfile(user as Profile); setData(await loadData(user.role))
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao carregar os dados.') }
    finally { setLoading(false) }
  }, [session.user.id])
  useEffect(() => {
    // StrictMode cleanup can cancel the first scheduled startup load.
    let current = true
    queueMicrotask(() => { if (current) void reload() })
    return () => { current = false }
  }, [reload])
  async function logout() { const { error: failure } = await supabase.auth.signOut({ scope: 'local' }); if (failure) setError('Não foi possível sair. Tente novamente.') }
  if (noAccess) return <div className="access-state"><Building2 size={36} /><h1>Conta indisponível</h1><p>Este acesso está desativado ou não pôde ser carregado. Verifique a conta com o responsável pelo sistema.</p><button onClick={() => void reload()}>Verificar novamente</button><button className="secondary" onClick={() => void logout()}>Sair</button></div>
  return <div className="app-shell"><a className="skip-link" href="#main">Ir para o conteúdo</a><Sidebar profile={profile} open={menu} onClose={closeMenu} onLogout={() => void logout()} />
  <div className="main-wrap" inert={mobile && menu}><header className="topbar"><div><button className="mobile-menu icon-button" aria-label="Abrir menu" aria-expanded={menu} aria-controls="app-sidebar" onClick={() => setMenuPath(location.pathname)}><Menu /></button><span className="breadcrumb">Workspace <span>/</span> <strong>{appRoutes.find(item => item.path === location.pathname)?.label || 'Visão geral'}</strong></span></div><div className="topbar-right"><span className="live"><i />Dados centralizados</span><button className="icon-button" onClick={() => void reload()} disabled={loading} aria-label="Atualizar dados"><RefreshCw size={18} className={loading ? 'spin' : ''} /></button><ThemeToggle /><NavLink className="icon-button notification-button" to={profile?.role === 'works' || profile?.role === 'sales' ? '/' : '/alertas'} aria-label={`Ver alertas${notificationCount ? `: ${notificationCount} parcelas vencidas ou vencendo hoje` : ''}`}><Bell size={19} />{notificationCount ? <span className="notification-count" aria-hidden="true">{notificationCount > 99 ? '99+' : notificationCount}</span> : null}</NavLink><UserMenu profile={profile} onLogout={() => void logout()} /></div></header>
    <main id="main" className="content" aria-busy={loading}>{error ? <div role="alert" className="notice error">Não foi possível atualizar os dados: {error}<button className="secondary" onClick={() => void reload()}>Tentar novamente</button></div> : null}
      {loading && !profile ? <div className="loading" role="status"><RefreshCw className="spin" />Carregando sua operação…</div> : profile ? <Routes>{appRoutes.filter(item => item.roles.includes(profile.role)).map(item => <Route key={item.path} path={item.path} element={item.path === '/fichas' ? <FinancialRecords data={data} /> : <Workspace key={item.path} path={item.workspace || item.path} contactScope={item.contactScope} propertyScope={item.propertyScope} expenseScope={item.expenseScope} financialSegment={item.segment} accessPage={item.path === '/usuarios'} data={data} profile={profile} refresh={reload} />} />)}<Route path="*" element={<Navigate to="/" replace />} /></Routes> : null}
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
