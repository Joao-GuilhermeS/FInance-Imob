import { useEffect, useRef, useState } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { check } from '../lib/api'
export function Documents({ entity, id, title, onClose }: { entity: string; id: string; title: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [files, setFiles] = useState<{ name: string }[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const prefix = `${entity}/${id}`
  async function load() {
    const { data, error: failure } = await supabase.storage.from('documents').list(prefix, { limit: 100, sortBy: { column: 'name', order: 'asc' } })
    check(failure); setFiles(data || [])
  }
  useEffect(() => {
    ref.current?.showModal()
    let current = true
    void supabase.storage.from('documents').list(prefix, { limit: 100, sortBy: { column: 'name', order: 'asc' } }).then(({ data, error: failure }) => {
      if (!current) return
      if (failure) setError(failure.message)
      else setFiles(data || [])
    }).catch(err => { if (current) setError(err.message) })
    const node = ref.current
    return () => { current = false; node?.close() }
    // Prefix identifies the immutable record for this dialog.
  }, [prefix])
  async function upload(file?: File) {
    if (!file) return
    setError(''); setBusy(true)
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('O limite por arquivo é 10 MB.')
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) throw new Error('Use um arquivo PDF, JPG ou PNG.')
      const name = `${crypto.randomUUID()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: failure } = await supabase.storage.from('documents').upload(`${prefix}/${name}`, file, { contentType: file.type, upsert: false })
      check(failure); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível anexar o arquivo.') }
    finally { setBusy(false) }
  }
  async function open(name: string) {
    setError('')
    const { data, error: failure } = await supabase.storage.from('documents').createSignedUrl(`${prefix}/${name}`, 60)
    if (failure) { setError('Não foi possível abrir o documento.'); return }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }
  return <dialog ref={ref} aria-labelledby="documents-title" onCancel={e => { e.preventDefault(); if (!busy) onClose() }}><div className="dialog-heading"><div><p className="eyebrow">DOCUMENTOS PRIVADOS</p><h2 id="documents-title">{title}</h2></div><button className="icon-button" disabled={busy} onClick={onClose} aria-label="Fechar documentos"><X /></button></div><p className="form-hint">Contratos, notas e comprovantes. PDF, JPG ou PNG, até 10 MB por arquivo.</p><label className="upload-label"><Upload size={18} />{busy ? 'Enviando…' : 'Anexar documento'}<input type="file" aria-label="Selecionar documento" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={event => { void upload(event.target.files?.[0]); event.target.value = '' }} /></label>{error ? <p className="notice error" role="alert">{error}</p> : null}<ul className="document-list">{files.map(file => <li key={file.name}><FileText size={18} /><button className="text-button" onClick={() => void open(file.name)}>{file.name.slice(37)}</button></li>)}</ul>{!files.length ? <p className="muted">Nenhum documento anexado.</p> : null}<button className="secondary" disabled={busy} onClick={onClose}>Concluir</button></dialog>
}
