import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Building2, ShieldCheck } from 'lucide-react'
import { configured, supabase } from '../lib/supabase'
import { ThemeToggle } from './ThemeToggle'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_ROUTE } from '../lib/navigation'
export function Auth() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const values = new FormData(event.currentTarget)
    try {
      const { error: failure } = await supabase.auth.signInWithPassword({ email: String(values.get('email')).trim(), password: String(values.get('password')) })
      if (failure) throw failure
      navigate(DEFAULT_ROUTE, { replace: true })
    } catch { setError('Não foi possível entrar. Confira seu e-mail, senha e conexão.'); }
    finally { setBusy(false) }
  }
  return <main className="auth-page"><div className="auth-theme"><ThemeToggle /></div><section className="auth-story"><a className="brand" href="/"><span className="brand-symbol"><Building2 /></span>finance<span className="brand-light">imob</span></a>
    <div><p className="eyebrow">GESTÃO IMOBILIÁRIA, CONECTADA.</p><h1>Mais clareza.<br />Melhores decisões.</h1><p>Da primeira venda ao resultado de cada obra.<br />Sua operação, em um só lugar.</p><div className="auth-lines"><span>01 <strong>Imóveis e vendas</strong></span><span>02 <strong>Parcelas e recebimentos</strong></span><span>03 <strong>Obras e resultados</strong></span></div></div>
    <small>Organização financeira para construir o próximo passo.</small></section>
    <section className="auth-form"><div className="login-card"><span className="login-icon"><ShieldCheck size={26} /></span><p className="eyebrow">SEU ESPAÇO DE GESTÃO</p><h2>Bem-vindo de volta</h2><p className="muted">Entre com seu acesso individual para continuar.</p>
      {!configured ? <p className="notice error">Configure as variáveis do Supabase em .env.local para acessar.</p> : null}
      <form onSubmit={login}><label>E-mail<input name="email" type="email" autoComplete="username" placeholder="voce@empresa.com.br" required /></label><label>Senha<input name="password" type="password" autoComplete="current-password" placeholder="Sua senha" required /></label>
        {error ? <p role="alert" className="notice error">{error}</p> : null}<button className="wide" disabled={busy || !configured}>{busy ? 'Entrando…' : 'Acessar plataforma'}<ArrowRight size={18} /></button></form>
      <p className="login-help">Seu acesso é fornecido pelo administrador.<br />Se precisar recuperar a senha, solicite ao responsável.</p></div><small className="auth-footer">Finance Imob · Gestão com precisão</small></section></main>
}
