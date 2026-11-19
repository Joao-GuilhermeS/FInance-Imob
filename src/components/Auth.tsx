import { useState } from 'react'
import type { FormEvent } from 'react'
import { AlertCircle, Building2, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { configured, supabase } from '../lib/supabase'
import { ThemeToggle } from './ThemeToggle'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_ROUTE } from '../lib/navigation'
export function Auth() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
  const notice = error || (!configured ? 'A conexão com o serviço de acesso não está configurada. Contate o administrador.' : '')
  return <main className="auth-screen">
    <div className="login-theme"><ThemeToggle /></div>
    <div className="login-container">
      <section className="login-panel" aria-labelledby="login-title">
        <a className="login-brand" href={DEFAULT_ROUTE} aria-label="FinanceImob — início"><span className="login-brand-mark"><Building2 size={20} strokeWidth={1.7} aria-hidden="true" /></span><span>FinanceImob</span></a>
        <header className="login-heading"><h1 id="login-title">Entrar no FinanceImob</h1><p>Insira suas credenciais corporativas para continuar.</p></header>
        {notice ? <div className="login-notice" id="login-notice" role="alert"><AlertCircle size={17} aria-hidden="true" /><p>{notice}</p></div> : null}
        <form className="login-form" onSubmit={login} aria-busy={busy} aria-describedby={notice ? 'login-notice' : undefined}>
          <div className="login-field"><label htmlFor="login-email">E-mail</label><input id="login-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="voce@empresa.com.br" required disabled={busy} /></div>
          <div className="login-field"><label htmlFor="login-password">Senha</label><div className="login-password"><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required disabled={busy} /><button className="login-password-toggle" type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} aria-controls="login-password" disabled={busy} onClick={() => setShowPassword(current => !current)}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div></div>
          <button className="login-submit" type="submit" disabled={busy || !configured}>{busy ? <><LoaderCircle className="spin" size={16} aria-hidden="true" />Entrando…</> : 'Entrar'}</button>
        </form>
      </section>
      <p className="login-access-note">Seu acesso é fornecido pelo administrador.<br />Para recuperar a senha, entre em contato com o responsável.</p>
    </div>
  </main>
}
