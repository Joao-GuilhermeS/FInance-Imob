import { useState } from 'react'
import type { Data, Entry } from '../lib/domain'
import { dateLabel, money } from '../lib/domain'
import { entryDetails, financialIndex } from '../lib/financial'
import { exportReport } from '../lib/report-export'

export function ReceiptButton({ entry, data }: { entry: Entry; data: Data }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function download() {
    if (busy) return
    setBusy(true); setError('')
    const detail = entryDetails(entry, financialIndex(data))
    try {
      await exportReport({ title: `Recibo de recebimento ${entry.id}`, notes: ['Recibo individual de uma movimentação registrada. Pagamentos parciais não quitam o saldo integral do contrato.', `Registro: ${entry.id}`], columns: [{ label: 'Campo' }, { label: 'Informação' }], rows: [
        ['Recebido de', detail.contact?.name || 'Pessoa não vinculada'], ['Referente a quê?', entry.description],
        ['Imóvel', detail.property ? `${detail.property.code} · ${detail.property.name}` : 'Sem vínculo com imóvel'],
        ['Data do recebimento', dateLabel(entry.occurred_on)], ['Valor recebido', money(entry.amount_cents)],
        ['Forma de pagamento', entry.method], ['Conta', detail.account?.name || ''], ['Observações', entry.notes || ''],
      ] }, 'pdf')
    } catch { setError('Não foi possível gerar o recibo. Tente novamente.') } finally { setBusy(false) }
  }
  return <><button className="small secondary" disabled={busy} onClick={() => void download()}>{busy ? 'Gerando…' : 'Recibo PDF'}</button>{error ? <small className="field-error" role="alert">{error}</small> : null}</>
}
