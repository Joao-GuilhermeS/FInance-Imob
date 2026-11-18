import type { Data, Property } from '../lib/domain'
import { cents, money, today } from '../lib/domain'
import { rpc } from '../lib/api'
import { acquisitionValues, incomeValues, paymentMethods } from '../lib/income-acquisitions'
import { FormDialog } from './FormDialog'
export type FinanceAction = { type: 'income' } | { type: 'acquisition'; property: Property }
export function IncomeAcquisitionDialogs({ action, data, onClose, onSaved }: { action: FinanceAction; data: Data; onClose: () => void; onSaved: () => Promise<void> }) {
  const people = data.contacts.map(item => ({ value: item.id, label: item.name }))
  if (action.type === 'income') return <FormDialog title="Receber outra receita" submitLabel="Confirmar recebimento" onClose={onClose} fields={[
    { name: 'description', label: 'Referente a quê?', type: 'textarea' },
    { name: 'amount', label: 'Valor recebido (R$)', type: 'number', min: '0.01', step: '0.01' },
    { name: 'date', label: 'Data do recebimento', type: 'date', value: today(), max: today() },
    { name: 'account', label: 'Conta / caixa', options: data.accounts.map(item => ({ value: item.id, label: item.name })) },
    { name: 'method', label: 'Forma de pagamento', options: paymentMethods },
    { name: 'property', label: 'Imóvel relacionado (opcional)', required: false, options: data.properties.map(item => ({ value: item.id, label: `${item.code} · ${item.name}` })) },
    { name: 'contact', label: 'Pessoa relacionada (opcional)', required: false, options: people },
    { name: 'notes', label: 'Observações', type: 'textarea', required: false },
  ]} onSave={async values => { await rpc('record_income', { p_request: values.request_id, ...incomeValues(values) }); await onSaved() }}><p className="form-hint">Registra uma entrada efetivamente recebida. Recebimentos de vendas e parcelas devem ser baixados em Parcelas e recebimentos. O lançamento aparece no extrato, onde poderá receber comprovantes e ser estornado.</p>{!data.accounts.length ? <p className="notice">Cadastre uma conta antes de registrar o recebimento.</p> : null}</FormDialog>
  const property = action.property
  return <FormDialog title={`Controlar aquisição · ${property.code}`} submitLabel="Confirmar obrigação da aquisição" onClose={onClose} fields={[
    { name: 'opening', label: 'Pago antes do início deste controle (R$)', type: 'number', min: '0', max: String(property.acquisition_cents / 100), step: '0.01', hint: 'Informe explicitamente, inclusive se for zero. Não gera saída de caixa.' },
    { name: 'due', label: 'Vencimento do saldo restante', type: 'date', value: today() },
    { name: 'contact', label: 'Vendedor / favorecido (opcional)', required: false, options: people },
    { name: 'reason', label: 'Justificativa da situação inicial', type: 'textarea' },
    { name: 'confirm', label: 'Conferência do saldo inicial', options: [{ value: 'yes', label: 'Conferi: o saldo inicial do caixa já considera os pagamentos anteriores' }] },
  ]} preview={values => {
    let opening = NaN
    try { opening = cents(values.opening || '') } catch { /* Keep guidance for incomplete drafts. */ }
    return <div className="agreement-preview"><strong>Custo de aquisição: {money(property.acquisition_cents)}</strong>{Number.isFinite(opening) && opening <= property.acquisition_cents ? <p>Reconhecido como já pago: {money(opening)} · saldo a pagar: {money(property.acquisition_cents - opening)}</p> : <p>Informe quanto já foi pago para conferir a obrigação.</p>}</div>
  }} onSave={async values => { await rpc('prepare_acquisition', { p_request: values.request_id, p_property: property.id, p_expected: property.acquisition_cents, ...acquisitionValues(values, property.acquisition_cents) }); await onSaved() }}><p className="form-hint">O custo do imóvel permanece o mesmo. Esta operação cria uma obrigação única, sem movimentar caixa. Depois, registre os pagamentos do saldo pendente. Valores anteriores são reconhecidos fora do caixa atual; não registre novamente pagamentos que já compõem o saldo inicial. A situação inicial fica protegida após a confirmação.</p></FormDialog>
}
