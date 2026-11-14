import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { X } from 'lucide-react'
export type Field = { name: string; label: string; type?: string; value?: string; required?: boolean; min?: string; max?: string; step?: string; options?: { value: string; label: string }[]; hint?: string }
export function FormDialog({ title, fields, onClose, onSave, children, submitLabel = 'Salvar' }: { title: string; fields: Field[]; onClose: () => void; onSave: (values: Record<string, string>) => Promise<void>; children?: ReactNode; submitLabel?: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const requestId = useRef(crypto.randomUUID())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { const node = dialog.current!; node.showModal(); return () => node.close() }, [])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>
    setBusy(true); setError('')
    try { await onSave({ ...values, request_id: requestId.current }); onClose() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar. Tente novamente.'); setBusy(false) }
  }
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); if (!busy) onClose() }} aria-labelledby="dialog-title">
    <div className="dialog-heading"><div><p className="eyebrow">FINANCE IMOB</p><h2 id="dialog-title">{title}</h2></div><button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Fechar"><X size={20} /></button></div>
    <form onSubmit={submit}><div className="form-grid">{fields.map(field => <label key={field.name} className={field.type === 'textarea' ? 'full' : ''}>{field.label}
      {field.options ? <select name={field.name} defaultValue={field.value || ''} required={field.required !== false}><option value="">Selecione</option>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        : field.type === 'textarea' ? <textarea name={field.name} defaultValue={field.value} required={field.required !== false} maxLength={2000} />
          : <input name={field.name} type={field.type || 'text'} defaultValue={field.value} required={field.required !== false} min={field.min} max={field.max} step={field.step} maxLength={field.type === 'text' || !field.type ? 160 : undefined} />}
      {field.hint ? <small>{field.hint}</small> : null}</label>)}</div>{children}
      {error ? <p role="alert" className="notice error">{error}</p> : null}
      <div className="dialog-actions"><button className="secondary" type="button" disabled={busy} onClick={onClose}>Cancelar</button><button disabled={busy}>{busy ? 'Processando…' : submitLabel}</button></div>
    </form>
  </dialog>
}
