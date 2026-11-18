import type { Data, Expense, Property } from '../lib/domain'
import { money } from '../lib/domain'
import { FinanceTable } from './FinanceUI'
export function Acquisitions({ data, onStart, onPay, onDocuments }: { data: Data; onStart: (property: Property) => void; onPay: (expense: Expense) => void; onDocuments: (expense: Expense) => void }) {
  const items = data.properties.filter(property => property.acquisition_cents > 0)
  return <section className="panel record-section"><div className="panel-heading"><div><h2>Pagamentos de aquisição de imóveis</h2><p>O custo já integra o imóvel. Aqui é controlado somente o pagamento.</p></div></div><p className="notice">Imóveis sem controle iniciado não entram automaticamente nas contas a pagar. Confira o que já foi pago antes de iniciar. O reconhecimento inicial não movimenta caixa nem duplica custos.</p><FinanceTable headers={['Imóvel', 'Custo de aquisição', 'Já pago antes do controle', 'Pago neste controle', 'Saldo a pagar', 'Ações']} empty={!items.length ? 'Nenhum imóvel com custo de aquisição positivo' : undefined}>{items.map(property => {
    const expense = data.expenses.find(item => item.category === 'acquisition' && item.property_id === property.id)
    const opening = expense?.opening_paid_cents || 0
    const pending = expense ? Math.max(expense.amount_cents - expense.paid_cents, 0) : null
    return <tr key={property.id}><td>{property.code}<small>{property.name}</small></td><td>{money(property.acquisition_cents)}</td><td>{expense ? money(opening) : 'Não informado'}</td><td>{expense ? money(expense.paid_cents - opening) : 'Controle não iniciado'}</td><td>{pending === null ? 'A conferir' : money(pending)}</td><td><div className="row-actions commercial-actions">{expense ? <>{pending !== null && pending > 0 ? <button className="small secondary" onClick={() => onPay(expense)}>Pagar aquisição</button> : <span className="badge success">Quitada</span>}<button className="small secondary" onClick={() => onDocuments(expense)}>Comprovantes</button></> : <button className="small secondary" onClick={() => onStart(property)}>Iniciar controle</button>}</div></td></tr>
  })}</FinanceTable></section>
}
