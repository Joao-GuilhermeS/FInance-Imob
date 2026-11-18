import { useState } from 'react'
import { Download } from 'lucide-react'
import { exportReport } from '../lib/report-export'
import type { Report } from '../lib/report-export'

export function ReportExport({ report }: { report: Report }) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  async function download(format: 'pdf' | 'xlsx' | 'csv') {
    if (busy) return
    setBusy(format); setError('')
    try { await exportReport(report, format) } catch { setError('Não foi possível gerar o arquivo. Tente novamente.') } finally { setBusy('') }
  }
  return <div><div className="row-actions">{(['pdf', 'xlsx', 'csv'] as const).map(format => <button key={format} className="secondary small" disabled={Boolean(busy) || !report.rows.length} onClick={() => void download(format)}><Download size={15} aria-hidden="true" />{busy === format ? 'Gerando…' : `Exportar ${format.toUpperCase()}`}</button>)}</div>{error ? <p className="field-error" role="alert">{error}</p> : null}</div>
}
