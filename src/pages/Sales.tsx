import type { Data, Sale } from '../lib/domain'
import { dateLabel, money } from '../lib/domain'
import { saleBalances, saleIsActive } from '../lib/sales-lifecycle'
import { FinanceTable } from '../components/FinanceUI'
export function Sales({ data, search, financial, canEdit, onEdit, onRenegotiate, onCancel, onHistory, onDocuments }: { data: Data; search: string; financial: boolean; canEdit: boolean; onEdit: (sale: Sale) => void; onRenegotiate: (sale: Sale) => void; onCancel: (sale: Sale) => void; onHistory: (sale: Sale) => void; onDocuments: (sale: Sale) => void }) {
  const items = data.sales.filter(sale => `${sale.contacts.name} ${sale.properties.name} ${sale.properties.code}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))
    .sort((a, b) => b.sold_on.localeCompare(a.sold_on) || b.id.localeCompare(a.id))
  return <section className="panel"><div className="panel-heading"><div><h2>Vendas e acordos</h2><p>{data.sales.filter(saleIsActive).length} vendas ativas · {data.sales.filter(sale => !saleIsActive(sale)).length} canceladas no histórico</p></div></div><FinanceTable headers={['Cliente / imóvel', 'Data', 'Valor contratado', ...(financial ? ['Saldo a receber'] : []), 'Situação', 'Ações']} empty={!items.length ? 'Nenhuma venda encontrada' : undefined}>
    {items.map(sale => {
      const balance = saleBalances(data, sale.id)
      const active = saleIsActive(sale)
      return <tr key={sale.id}><td><strong>{sale.contacts.name}</strong><small>{sale.properties.code} · {sale.properties.name}</small></td><td>{dateLabel(sale.sold_on)}</td><td>{money(sale.total_cents)}</td>{financial ? <td>{money(active ? balance.outstanding : 0)}</td> : null}<td><span className={`badge ${active ? 'success' : 'neutral'}`}>{active ? 'Ativa' : 'Cancelada'}</span><small>Cronograma v{sale.schedule_version || 1}</small>{sale.cancellation_reason ? <small>{sale.cancellation_reason}</small> : null}</td><td><div className="row-actions commercial-actions"><button className="small secondary" onClick={() => onDocuments(sale)}>Documentos</button><button className="small secondary" onClick={() => onHistory(sale)}>Histórico</button>{canEdit && active ? <button className="small secondary" onClick={() => onEdit(sale)}>Editar venda</button> : null}{financial && active ? <>{balance.outstanding > 0 ? <button className="small secondary" onClick={() => onRenegotiate(sale)}>Renegociar</button> : null}<button className="small secondary" onClick={() => onCancel(sale)}>Remover / distrato</button></> : null}</div></td></tr>
    })}
  </FinanceTable></section>
}
