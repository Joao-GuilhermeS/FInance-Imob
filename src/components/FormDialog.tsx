import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { X } from 'lucide-react'
import { FieldErrors } from '../lib/form-errors'
export type Field = { name: string; label: string; type?: string; value?: string; required?: boolean; min?: string; max?: string; step?: string; options?: { value: string; label: string }[]; hint?: string; section?: string; readOnly?: boolean; maxLength?: number }
export function FormDialog({ title, fields, onClose, onSave, children, submitLabel = 'Salvar', preview }: { title: string; fields: Field[]; onClose: () => void; onSave: (values: Record<string, string>) => Promise<void>; children?: ReactNode; submitLabel?: string; preview?: (values: Record<string, string>) => ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const requestId = useRef(crypto.randomUUID())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const errorRef = useRef<HTMLDivElement>(null)
  const prefix = useId()
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(field => [field.name, field.value || ''])))
  const groups = new Map<string, Field[]>()
  for (const field of fields) groups.set(field.section || '', [...(groups.get(field.section || '') || []), field])
  useEffect(() => { const node = dialog.current!; node.showModal(); return () => node.close() }, [])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>
    setBusy(true); setError(''); setFieldErrors({})
    try { await onSave({ ...values, request_id: requestId.current }); onClose() }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar. Tente novamente.')
      setFieldErrors(err instanceof FieldErrors ? err.fields : {})
      setBusy(false)
      requestAnimationFrame(() => errorRef.current?.focus())
    }
  }
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); if (!busy) onClose() }} aria-labelledby="dialog-title">
    <div className="dialog-heading"><div><p className="eyebrow">FINANCE IMOB</p><h2 id="dialog-title">{title}</h2></div><button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Fechar"><X size={20} /></button></div>
    <form onSubmit={submit} onChange={preview ? event => setValues(Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>) : undefined}>
      {error ? <div ref={errorRef} tabIndex={-1} role="alert" className="notice error"><strong>{error}</strong>{Object.entries(fieldErrors).map(([name, message]) => <a className="field-error-link" key={name} href={`#${prefix}-${name}`} onClick={event => { event.preventDefault(); document.getElementById(`${prefix}-${name}`)?.focus() }}>{fields.find(field => field.name === name)?.label || name}: {message}</a>)}</div> : null}
      {[...groups].map(([section, group]) => <fieldset key={section} className="form-fieldset" disabled={busy}>{section ? <legend>{section}</legend> : null}<div className="form-grid">{group.map(field => {
        const shared = { id: `${prefix}-${field.name}`, name: field.name, defaultValue: field.value || '', required: field.required !== false, 'aria-invalid': Boolean(fieldErrors[field.name]), 'aria-describedby': [field.hint ? `${prefix}-${field.name}-hint` : '', fieldErrors[field.name] ? `${prefix}-${field.name}-error` : ''].filter(Boolean).join(' ') || undefined }
        return <label key={field.name} className={field.type === 'textarea' ? 'full' : ''}>{field.label}{field.options ? <><select {...shared} disabled={field.readOnly}><option value="">Selecione</option>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{field.readOnly ? <input type="hidden" name={field.name} value={field.value || ''} /> : null}</>
          : field.type === 'textarea' ? <textarea {...shared} readOnly={field.readOnly} maxLength={field.maxLength || 2000} />
            : <input {...shared} type={field.type || 'text'} readOnly={field.readOnly} min={field.min} max={field.max} step={field.step} maxLength={field.maxLength || (field.type === 'text' || !field.type ? 160 : undefined)} />}
          {field.hint ? <small id={`${prefix}-${field.name}-hint`}>{field.hint}</small> : null}{fieldErrors[field.name] ? <small className="field-error" id={`${prefix}-${field.name}-error`}>{fieldErrors[field.name]}</small> : null}</label>
      })}</div></fieldset>)}{preview?.(values)}{children}
      <div className="dialog-actions"><button className="secondary" type="button" disabled={busy} onClick={onClose}>Cancelar</button><button disabled={busy}>{busy ? 'Processando…' : submitLabel}</button></div>
    </form>
  </dialog>
}
