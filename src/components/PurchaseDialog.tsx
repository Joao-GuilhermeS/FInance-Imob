import type { Data, Role } from '../lib/domain'
import { today } from '../lib/domain'
import { rpc } from '../lib/api'
import { purchaseCategories, purchaseValues } from '../lib/purchases'
import { FormDialog } from './FormDialog'
export function PurchaseDialog({ data, role, onClose, onSaved, defaultCategory }: { data: Data; role: Role; onClose: () => void; onSaved: () => Promise<void>; defaultCategory?: string }) {
  return <FormDialog title="Registrar compra ou despesa" submitLabel="Registrar despesa" onClose={onClose} fields={[
    { name: 'description', label: 'O que foi comprado ou contratado?', type: 'textarea', section: 'Registro financeiro' },
    { name: 'amount', label: 'Valor total (R$)', type: 'number', min: '0.01', step: '0.01', section: 'Registro financeiro' },
    { name: 'purchased', label: 'Data da compra / contratação', type: 'date', value: today(), max: today(), section: 'Registro financeiro' },
    { name: 'due', label: 'Vencimento para pagamento', type: 'date', value: today(), section: 'Registro financeiro' },
    { name: 'category', label: 'Categoria', value: defaultCategory || 'materials', options: Object.entries(purchaseCategories).map(([value, label]) => ({ value, label })), section: 'Registro financeiro' },
    { name: 'property', label: 'Imóvel / obra', required: role === 'works', hint: role === 'works' ? 'Selecione a obra relacionada.' : 'Sem vínculo: despesa geral da empresa.', options: data.properties.map(item => ({ value: item.id, label: `${item.code} · ${item.name}` })), section: 'Vínculos e detalhes opcionais' },
    { name: 'contact', label: 'Fornecedor / prestador', required: false, options: data.contacts.filter(item => ['supplier', 'provider'].includes(item.kind)).map(item => ({ value: item.id, label: item.name })), section: 'Vínculos e detalhes opcionais' },
    { name: 'classification', label: 'Classificação livre', required: false, maxLength: 80, hint: 'Ex.: cimento, cartório, frete ou comissão. Sem cadastro prévio.', section: 'Vínculos e detalhes opcionais' },
    { name: 'quantity', label: 'Quantidade (opcional)', type: 'number', required: false, min: '0.001', step: '0.001', section: 'Vínculos e detalhes opcionais' },
    { name: 'unit', label: 'Unidade (opcional)', required: false, maxLength: 30, hint: 'Ex.: sacos, metros, diária.', section: 'Vínculos e detalhes opcionais' },
    { name: 'notes', label: 'Observações', type: 'textarea', required: false, section: 'Vínculos e detalhes opcionais' },
  ]} onSave={async values => { await rpc('register_purchase', { p_request: values.request_id, ...purchaseValues(values, role === 'works') }); await onSaved() }}>
    <p className="form-hint">O registro gera custo e conta a pagar. Para movimentar o caixa, registre o pagamento depois. Notas e comprovantes podem ser anexados na consulta. Não é necessário cadastrar produtos.</p>
  </FormDialog>
}
