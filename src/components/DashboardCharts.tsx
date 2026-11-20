import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { money } from '../lib/domain'
export { CashFlowChart } from './CashFlowChart'
const colors = ['var(--color-accent)', 'var(--info)', 'var(--warning)', 'var(--positive)', 'var(--negative)', 'var(--text-secondary)', 'var(--chart-extra)']
export function ExpenseDonut({ items }: { items: { label: string; value: number }[] }) {
  const [selected, setSelected] = useState<number | null>(null)
  const total = items.reduce((sum, item) => sum + item.value, 0)
  const gradient = items.reduce<{ segments: string[]; end: number }>((state, item, index) => { const end = state.end + item.value / total * 100; return { segments: [...state.segments, `${colors[index % colors.length]} ${state.end}% ${end}%`], end } }, { segments: [], end: 0 }).segments.join(',')
  const active = selected === null ? undefined : items[selected]
  return <section className="panel chart-panel expense-donut-panel"><div className="panel-heading"><div><h2>Despesas por categoria</h2><p>Saídas de caixa registradas no período</p></div></div>{total ? <><div className="donut-visual"><div className="expense-donut" style={{ background: `conic-gradient(${gradient})` }} role="img" aria-label={`Distribuição de ${money(total)} em ${items.length} categorias. Valores na legenda abaixo.`}><div><small>{active?.label || 'Total de saídas'}</small><strong>{money(active?.value || total).replace('R$', '').trim()}</strong><small>R$</small></div></div></div><div className="donut-legend">{items.map((item, index) => <button className={selected === index ? 'selected' : ''} key={item.label} onMouseEnter={() => setSelected(index)} onMouseLeave={() => setSelected(null)} onFocus={() => setSelected(index)} onBlur={() => setSelected(null)} onClick={() => setSelected(current => current === index ? null : index)} aria-pressed={selected === index}><i style={{ background: colors[index % colors.length] }} aria-hidden="true" /><span>{item.label}</span><strong>{money(item.value)}</strong><small>{(item.value / total * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</small></button>)}</div></> : <div className="chart-empty"><BarChart3 size={30} aria-hidden="true" /><strong>Nenhuma saída registrada</strong><p>A distribuição respeita o período selecionado.</p></div>}</section>
}
