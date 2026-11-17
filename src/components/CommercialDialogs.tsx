import type { Data, Reservation, Sale } from '../lib/domain'
import { cents, dateLabel, money, today } from '../lib/domain'
import { rpc } from '../lib/api'
import { cancellationValues, eventLabels, renegotiationValues, saleBalances, schedulePreview } from '../lib/sales-lifecycle'
import { FieldErrors } from '../lib/form-errors'
import { FormDialog } from './FormDialog'
import type { Field } from './FormDialog'
export type CommercialAction = { type: 'reserve'; propertyId?: string } | { type: 'release'; reservation: Reservation } | { type: 'renegotiate' | 'cancel'; sale: Sale } | { type: 'history'; saleId?: string; reservationId?: string }
const reasonField: Field = { name: 'reason', label: 'Motivo / condições do acordo', type: 'textarea', maxLength: 2000 }
export function CommercialDialogs({ action, data, onClose, onSaved }: { action: CommercialAction; data: Data; onClose: () => void; onSaved: () => Promise<void> }) {
  if (action.type === 'reserve') {
    const fields: Field[] = [
      { name: 'property', label: 'Imóvel disponível', value: action.propertyId, options: data.properties.filter(property => property.commercial_status === 'available').map(property => ({ value: property.id, label: `${property.code} · ${property.name}` })) },
      { name: 'contact', label: 'Cliente', options: data.contacts.filter(contact => contact.kind === 'client').map(contact => ({ value: contact.id, label: contact.name })) },
      { name: 'expires', label: 'Reservado até', type: 'date', min: today(), value: today(), hint: 'A reserva vale até o fim deste dia, no horário de São Paulo.' },
      { name: 'notes', label: 'Observações da reserva', type: 'textarea', required: false },
    ]
    return <FormDialog title="Reservar imóvel" fields={fields} onClose={onClose} onSave={async values => {
      await rpc('reserve_property', { p_request: values.request_id, p_property: values.property, p_contact: values.contact, p_expires: values.expires, p_notes: values.notes }); await onSaved()
    }}><p className="form-hint">A reserva bloqueia novas vendas para outro cliente. Após vencer, o imóvel volta a ficar disponível automaticamente nas consultas.</p></FormDialog>
  }
  if (action.type === 'release') return <FormDialog title={`Liberar reserva · ${action.reservation.property_code}`} fields={[reasonField]} onClose={onClose} onSave={async values => {
    if (values.reason.trim().length < 5) throw new FieldErrors({ reason: 'Informe um motivo com pelo menos 5 caracteres.' })
    await rpc('release_reservation', { p_request: values.request_id, p_reservation: action.reservation.id, p_reason: values.reason.trim() }); await onSaved()
  }}><p className="form-hint">A reserva de {action.reservation.client_name} será encerrada, com seu histórico preservado.</p></FormDialog>
  if (action.type === 'history') {
    const events = (data.commercialEvents || []).filter(event => action.saleId ? event.sale_id === action.saleId : event.reservation_id === action.reservationId).sort((a, b) => a.created_at.localeCompare(b.created_at))
    return <FormDialog title="Histórico de acordos" fields={[]} submitLabel="Concluir" onClose={onClose} onSave={async () => {}}>
      <div className="commercial-history">{events.length ? events.map(event => <article key={event.id}><span className="badge">{eventLabels[event.kind] || event.kind}</span><small>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(event.created_at))}</small><p>{event.reason}</p>
        {typeof event.details.balance === 'number' ? <small>Saldo reprogramado: {money(event.details.balance)} · versão {String(event.details.version)}</small> : null}
        {typeof event.details.refund === 'number' ? <small>Devolução acordada: {money(event.details.refund)} · valor retido conforme acordo: {money(Number(event.details.retained_agreement || 0))}</small> : null}
      </article>) : <p className="muted">Não há acordos ou mudanças comerciais registrados para esta seleção.</p>}</div>
    </FormDialog>
  }
  const balance = saleBalances(data, action.sale.id)
  if (action.type === 'renegotiate') return <FormDialog title={`Renegociar parcelas · ${action.sale.properties.code}`} fields={[
    { name: 'count', label: 'Quantidade de novas parcelas', type: 'number', min: '1', max: '600', step: '1', value: '1' },
    { name: 'first', label: 'Primeiro vencimento', type: 'date', min: today(), value: today() }, reasonField,
  ]} onClose={onClose} submitLabel="Confirmar renegociação" preview={values => {
    try {
      const schedule = schedulePreview(balance.outstanding, Number(values.count), values.first)
      return <div className="agreement-preview"><strong>Saldo mantido: {money(balance.outstanding)}</strong><p>{schedule.length} parcelas · primeira em {dateLabel(schedule[0].due)} por {money(schedule[0].amount)} · última em {dateLabel(schedule.at(-1)!.due)} por {money(schedule.at(-1)!.amount)}</p></div>
    } catch { return <p className="form-hint">Informe a quantidade e a data para conferir o novo cronograma.</p> }
  }} onSave={async values => {
    const terms = renegotiationValues(values, balance.outstanding)
    await rpc('renegotiate_sale', { p_request: values.request_id, p_sale: action.sale.id, p_expected: balance.outstanding, p_count: terms.count, p_first: terms.first, p_reason: terms.reason }); await onSaved()
  }}><p className="form-hint">Somente o saldo ainda pendente será distribuído nas novas parcelas. As parcelas antigas e seus recebimentos ficam no histórico. Não são aplicados juros ou descontos. Recebimentos vinculados às parcelas substituídas ficam protegidos contra estorno para não invalidar o acordo.</p></FormDialog>
  return <FormDialog title={`Cancelar venda · ${action.sale.properties.code}`} submitLabel="Confirmar distrato" fields={[
    { name: 'refund', label: 'Devolução acordada (R$)', type: 'number', min: '0', max: String(balance.received / 100), step: '0.01', value: balance.received === 0 ? '0' : '', hint: 'Informe explicitamente o valor do acordo, inclusive se for zero.' },
    { name: 'due', label: 'Vencimento da devolução', type: 'date', value: today() }, reasonField,
    { name: 'confirm', label: 'Conferência do acordo', options: [{ value: 'yes', label: 'Conferi o valor de devolução e as condições do distrato' }] },
  ]} onClose={onClose} preview={values => {
    let amount = NaN
    try { amount = cents(values.refund || '') } catch { /* Invalid drafts keep the guidance visible. */ }
    return <div className="agreement-preview"><strong>Recebido: {money(balance.received)} · saldo a encerrar: {money(balance.outstanding)}</strong>{values.refund !== '' && Number.isFinite(amount) && amount >= 0 && amount <= balance.received ? <p>Devolução a pagar: {money(amount)} · valor a permanecer com a empresa conforme acordo: {money(balance.received - amount)}</p> : <p>Confira e informe o valor acordado de devolução.</p>}</div>
  }} onSave={async values => {
    const terms = cancellationValues(values, balance.received)
    await rpc('cancel_sale', { p_request: values.request_id, p_sale: action.sale.id, p_expected_received: balance.received, p_expected_outstanding: balance.outstanding, p_refund: terms.refund, p_due: terms.due, p_reason: terms.reason }); await onSaved()
  }}><p className="form-hint">O distrato encerra a cobrança pendente e libera o imóvel para nova venda. Os recebimentos ficam preservados. Se houver devolução, uma conta a pagar será criada; o caixa só muda quando o pagamento for registrado no Financeiro. Não há cálculo automático de multa ou retenção.</p></FormDialog>
}
