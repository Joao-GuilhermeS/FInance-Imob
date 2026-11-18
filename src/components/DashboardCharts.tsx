import { useEffect, useRef, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { dateLabel, money } from '../lib/domain'
import type { CashBucket } from '../lib/dashboard'
const compact = (cents: number) => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(cents / 100)
const signed = (cents: number) => `${cents >= 0 ? '+' : '−'} ${money(Math.abs(cents))}`
export function CashFlowChart({ buckets }: { buckets: CashBucket[] }) {
  const [selected, setSelected] = useState<number | null>(null)
  const hasEntries = buckets.some(item => item.income || item.outcome)
  const canvas = useRef<HTMLDivElement>(null)
  const [canvasWidth, setCanvasWidth] = useState(760)
  useEffect(() => {
    if (!canvas.current) return
    const observer = new ResizeObserver(entries => { for (const entry of entries) setCanvasWidth(Math.max(280, Math.floor(entry.contentRect.width))) })
    observer.observe(canvas.current)
    return () => observer.disconnect()
  }, [hasEntries])
  const active = selected === null ? undefined : buckets[selected]
  const max = Math.max(1, ...buckets.flatMap(item => [item.income, item.result]))
  const min = Math.min(0, ...buckets.flatMap(item => [-item.outcome, item.result]))
  const scale = (value: number) => 20 + (max - value) / (max - min) * 170
  const baseline = scale(0)
  const width = (canvasWidth - 90) / Math.max(buckets.length, 1)
  return <section className="panel chart-panel"><div className="panel-heading"><div><h2>Fluxo de caixa</h2><p>Entradas, saídas e resultado ao longo do período</p></div><span className="badge info">Realizado</span></div><div className="chart-legend"><span><i className="legend-dot revenue" />+ Entradas</span><span><i className="legend-dot expense" />− Saídas</span><span><i className="legend-dot result" />Resultado</span></div>
    {!hasEntries ? <div className="chart-empty"><BarChart3 size={30} aria-hidden="true" /><strong>Sem movimentações neste período</strong><p>Os lançamentos confirmados aparecerão aqui.</p></div> : <div className="cash-chart"><div className="chart-canvas" ref={canvas}><svg viewBox={`0 0 ${canvasWidth} 230`} role="group" aria-label="Gráfico de fluxo de caixa. Consulte os valores por intervalo com Tab ou na tabela de dados.">
      {[0, .5, 1].map(ratio => <g key={ratio}><line x1="60" x2={canvasWidth - 20} y1={20 + ratio * 170} y2={20 + ratio * 170} className="chart-gridline" /><text x="48" y={24 + ratio * 170} textAnchor="end" className="chart-axis">{compact(max - ratio * (max - min))}</text></g>)}
      <line x1="60" x2={canvasWidth - 20} y1={baseline} y2={baseline} className="chart-baseline" />
      {buckets.map((item, index) => { const x = 65 + index * width; const bar = Math.min(18, width * .28); return <g key={item.from} tabIndex={0} role="img" aria-label={`${dateLabel(item.from)} a ${dateLabel(item.to)}: entradas ${money(item.income)}, saídas ${money(item.outcome)}, resultado ${money(item.result)}`} onMouseEnter={() => setSelected(index)} onMouseLeave={() => setSelected(null)} onFocus={() => setSelected(index)} onBlur={() => setSelected(null)} className="chart-group" onClick={() => setSelected(index)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(index) } }}>
        <rect x={x - 4} y="16" width={width - 4} height="183" fill="transparent" />
        <rect x={x} y={scale(item.income)} width={bar} height={Math.max(item.income ? 2 : 0, baseline - scale(item.income))} rx="3" className="chart-income" />
        <rect x={x + bar + 3} y={baseline} width={bar} height={Math.max(item.outcome ? 2 : 0, scale(-item.outcome) - baseline)} rx="3" className="chart-outcome" />
        {(buckets.length <= 7 || index % (canvasWidth < 500 ? 3 : 2) === 0 || index === buckets.length - 1) ? <text x={x + bar} y="218" textAnchor="middle" className="chart-axis">{item.label}</text> : null}
      </g> })}
      <polyline points={buckets.map((item, index) => `${65 + index * width + Math.min(18, width * .28)},${scale(item.result)}`).join(' ')} className="chart-result-line" />
      {buckets.map((item, index) => <circle key={item.from} cx={65 + index * width + Math.min(18, width * .28)} cy={scale(item.result)} r={selected === index ? 5 : 3} className="chart-result-dot" />)}
    </svg></div><div className="chart-tooltip" aria-live="polite">{active ? <><strong>{dateLabel(active.from)}–{dateLabel(active.to)}</strong><span className="positive">{signed(active.income)}</span><span className="negative">− {money(active.outcome)}</span><span>Resultado {signed(active.result)}</span></> : <span>Passe sobre o gráfico ou use Tab para consultar os valores.</span>}</div></div>}
    <details className="chart-data"><summary>Ver dados do gráfico</summary><div className="table-wrap"><table><thead><tr><th scope="col">Intervalo</th><th scope="col">+ Entradas</th><th scope="col">− Saídas</th><th scope="col">Resultado</th></tr></thead><tbody>{buckets.map(item => <tr key={item.from}><td>{dateLabel(item.from)}–{dateLabel(item.to)}</td><td>{signed(item.income)}</td><td>− {money(item.outcome)}</td><td>{signed(item.result)}</td></tr>)}</tbody></table></div></details>
  </section>
}
const colors = ['var(--color-accent)', 'var(--info)', 'var(--warning)', 'var(--positive)', 'var(--negative)', 'var(--text-secondary)', 'var(--chart-extra)']
export function ExpenseDonut({ items }: { items: { label: string; value: number }[] }) {
  const [selected, setSelected] = useState<number | null>(null)
  const total = items.reduce((sum, item) => sum + item.value, 0)
  const gradient = items.reduce<{ segments: string[]; end: number }>((state, item, index) => { const end = state.end + item.value / total * 100; return { segments: [...state.segments, `${colors[index % colors.length]} ${state.end}% ${end}%`], end } }, { segments: [], end: 0 }).segments.join(',')
  const active = selected === null ? undefined : items[selected]
  return <section className="panel chart-panel expense-donut-panel"><div className="panel-heading"><div><h2>Despesas por categoria</h2><p>Saídas de caixa registradas no período</p></div></div>{total ? <><div className="donut-visual"><div className="expense-donut" style={{ background: `conic-gradient(${gradient})` }} role="img" aria-label={`Distribuição de ${money(total)} em ${items.length} categorias. Valores na legenda abaixo.`}><div><small>{active?.label || 'Total de saídas'}</small><strong>{money(active?.value || total).replace('R$', '').trim()}</strong><small>R$</small></div></div></div><div className="donut-legend">{items.map((item, index) => <button className={selected === index ? 'selected' : ''} key={item.label} onMouseEnter={() => setSelected(index)} onMouseLeave={() => setSelected(null)} onFocus={() => setSelected(index)} onBlur={() => setSelected(null)} onClick={() => setSelected(current => current === index ? null : index)} aria-pressed={selected === index}><i style={{ background: colors[index % colors.length] }} aria-hidden="true" /><span>{item.label}</span><strong>{money(item.value)}</strong><small>{(item.value / total * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</small></button>)}</div></> : <div className="chart-empty"><BarChart3 size={30} aria-hidden="true" /><strong>Nenhuma saída registrada</strong><p>A distribuição respeita o período selecionado.</p></div>}</section>
}
