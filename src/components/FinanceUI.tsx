import type { ReactNode } from 'react'
import type { Data, Entry } from '../lib/domain'
import { dateLabel, money } from '../lib/domain'
import { entryDetails, financialCategories, financialIndex } from '../lib/financial'

export function FinanceMetric({ label, value, note, accent = false }: { label: string; value: number; note: string; accent?: boolean }) {
  return <article className={accent ? 'stat accent' : 'stat'}><div className="stat-top">{label}</div><strong>{money(value)}</strong><small>{note}</small></article>
}
export function FinanceTable({ headers, children, empty }: { headers: string[]; children: ReactNode; empty?: string }) {
  return empty ? <div className="empty"><h3>{empty}</h3><p>Confira a seleção ou ajuste os filtros para consultar outros registros.</p></div>
    : <div className="table-wrap"><table><thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}
export function LedgerTable({ entries, data, onReverse }: { entries: Entry[]; data: Data; onReverse?: (entry: Entry) => void }) {
  const index = financialIndex(data)
  return <FinanceTable headers={['Data', 'Referente a quê?', 'Pessoa / imóvel', 'Conta', 'Valor', 'Situação']} empty={!entries.length ? 'Nenhuma movimentação encontrada' : undefined}>
    {entries.map(entry => {
      const detail = entryDetails(entry, index)
      return <tr key={entry.id}><td>{dateLabel(entry.occurred_on)}</td><td><strong>{entry.description}</strong><small>{financialCategories[detail.category] || detail.category} · {entry.method}</small></td>
        <td>{detail.contact?.name || 'Sem vínculo com pessoa'}<small>{detail.property ? `${detail.property.code} · ${detail.property.name}` : 'Despesas gerais da empresa'}</small></td>
        <td>{detail.account?.name || 'Conta não localizada'}</td><td className={entry.amount_cents > 0 ? 'positive' : 'negative'}>{money(entry.amount_cents)}</td>
        <td>{entry.reversal_of ? <span className="badge warning">Estorno</span> : detail.reversed ? <span className="badge neutral">Lançamento estornado</span> : onReverse ? <button className="small secondary" onClick={() => onReverse(entry)}>Estornar</button> : <span className="badge success">Confirmado</span>}</td>
      </tr>
    })}
  </FinanceTable>
}
