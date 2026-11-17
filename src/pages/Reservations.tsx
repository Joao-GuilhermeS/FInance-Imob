import type { Data, Reservation } from '../lib/domain'
import { dateLabel, today } from '../lib/domain'
import { FinanceTable } from '../components/FinanceUI'
export function Reservations({ data, canManage, onRelease, onConvert, onHistory }: { data: Data; canManage: boolean; onRelease: (reservation: Reservation) => void; onConvert: (reservation: Reservation) => void; onHistory: (reservation: Reservation) => void }) {
  const items = [...(data.reservations || [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const labels: Record<string, string> = { active: 'Ativa', expired: 'Expirada', released: 'Liberada', converted: 'Convertida em venda' }
  return <section className="panel"><div className="panel-heading"><div><h2>Reservas e disponibilidade</h2><p>O vencimento é considerado no horário de São Paulo. Consultas sempre refletem a disponibilidade atual.</p></div></div><FinanceTable headers={['Imóvel', 'Cliente', 'Reservado até', 'Situação', 'Ações']} empty={!items.length ? 'Nenhuma reserva registrada' : undefined}>
    {items.map(item => { const state = item.status === 'active' && item.expires_on < today() ? 'expired' : item.effective_status || item.status; return <tr key={item.id}><td><strong>{item.property_code}</strong><small>{item.property_name}</small></td><td>{item.client_name}</td><td>{dateLabel(item.expires_on)}</td><td><span className={`badge ${state === 'active' ? 'warning' : 'neutral'}`}>{labels[state] || state}</span></td><td><div className="row-actions">{canManage && state === 'active' ? <><button className="small secondary" onClick={() => onConvert(item)}>Converter em venda</button><button className="small secondary" onClick={() => onRelease(item)}>Liberar</button></> : null}<button className="small secondary" onClick={() => onHistory(item)}>Histórico</button></div></td></tr> })}
  </FinanceTable></section>
}
