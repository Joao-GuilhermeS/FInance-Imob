import type { Contact, Property, Role } from '../lib/domain'
import { today } from '../lib/domain'
import { canEditContact, canEditProperty, contactKinds, contactPayload, constructionStatuses, maritalStatuses, propertyPayload } from '../lib/registry'
import { FieldErrors } from '../lib/form-errors'
import { supabase } from '../lib/supabase'
import { FormDialog } from './FormDialog'
import type { Field } from './FormDialog'
const options = (values: Record<string, string>) => Object.entries(values).map(([value, label]) => ({ value, label }))
function checkRegistryError(error: { code?: string; message: string } | null, table: 'contacts' | 'properties') {
  if (!error) return
  if (error.code === '23505') throw new FieldErrors(table === 'contacts' ? { document: 'Este CPF ou CNPJ já está cadastrado.' } : { code: 'Este código de imóvel já está cadastrado.' })
  if (error.code === 'PGRST116') throw new Error('O registro não foi salvo. Confira se ele ainda existe e se seu perfil tem permissão para editá-lo.')
  throw new Error(error.message)
}
type Props = { role: Role; onClose: () => void; onSaved: () => Promise<void> }
export function ContactDialog({ contact, hasSales = false, role, onClose, onSaved }: Props & { contact?: Contact; hasSales?: boolean }) {
  const readOnly = Boolean(contact && !canEditContact(role))
  const choices = role === 'works' ? { supplier: 'Fornecedor', provider: 'Prestador' } : contactKinds
  const fields: Field[] = [
    { section: 'Dados básicos', name: 'name', label: 'Nome completo ou razão social', value: contact?.name },
    { section: 'Dados básicos', name: 'kind', label: 'Tipo de cadastro', value: contact?.kind || (role === 'works' ? 'supplier' : 'client'), options: options(choices), readOnly: hasSales, hint: hasSales ? 'Cliente vinculado a uma venda.' : undefined },
    { section: 'Dados básicos', name: 'document', label: 'CPF ou CNPJ', value: contact?.document, required: false, maxLength: 20, hint: 'Opcional. A conferência verifica o formato; não consulta a Receita Federal.' },
    { section: 'Dados pessoais (quando aplicável)', name: 'rg', label: 'RG', value: contact?.rg, required: false, maxLength: 40 },
    { section: 'Dados pessoais (quando aplicável)', name: 'birth_date', label: 'Data de nascimento', value: contact?.birth_date || '', type: 'date', max: today(), required: false },
    { section: 'Dados pessoais (quando aplicável)', name: 'marital_status', label: 'Estado civil', value: contact?.marital_status, options: options(maritalStatuses), required: false },
    { section: 'Dados pessoais (quando aplicável)', name: 'profession', label: 'Profissão / atividade', value: contact?.profession, required: false },
    { section: 'Contato e endereço', name: 'phone', label: 'Telefone', value: contact?.phone, type: 'tel', maxLength: 40, required: false },
    { section: 'Contato e endereço', name: 'whatsapp', label: 'WhatsApp', value: contact?.whatsapp, type: 'tel', maxLength: 40, required: false },
    { section: 'Contato e endereço', name: 'email', label: 'E-mail', value: contact?.email, type: 'email', maxLength: 254, required: false },
    { section: 'Contato e endereço', name: 'address', label: 'Endereço completo', value: contact?.address, type: 'textarea', maxLength: 500, required: false },
    { section: 'Observações', name: 'notes', label: 'Observações do cadastro', value: contact?.notes, type: 'textarea', required: false },
  ]
  async function save(values: Record<string, string>) {
    if (readOnly) return
    const payload = contactPayload(values, role, contact, hasSales)
    const result = contact ? await supabase.from('contacts').update(payload).eq('id', contact.id).select('id').single()
      : await supabase.from('contacts').insert(payload).select('id').single()
    checkRegistryError(result.error, 'contacts'); await onSaved()
  }
  return <FormDialog title={readOnly ? 'Dados da pessoa' : contact ? 'Editar pessoa' : 'Cadastrar pessoa'} fields={readOnly ? fields.map(field => ({ ...field, readOnly: true })) : fields} onClose={onClose} onSave={save} submitLabel={readOnly ? 'Concluir' : 'Salvar'} />
}
export function PropertyDialog({ property, role, onClose, onSaved }: Props & { property?: Property }) {
  const readOnly = Boolean(property && !canEditProperty(role))
  const works = role === 'works'
  const fields: Field[] = works ? [] : [
    { section: 'Identificação do imóvel', name: 'code', label: 'Código do imóvel', value: property?.code, maxLength: 40, readOnly: Boolean(property), hint: property ? 'Identificação permanente do imóvel.' : undefined },
    { section: 'Identificação do imóvel', name: 'name', label: 'Nome do imóvel', value: property?.name },
    { section: 'Identificação do imóvel', name: 'kind', label: 'Tipo de imóvel', value: property?.kind, readOnly: Boolean(property), options: options({ land: 'Terreno', house: 'Casa' }) },
    { section: 'Localização e medidas', name: 'development', label: 'Loteamento / empreendimento', value: property?.development, required: false },
    { section: 'Localização e medidas', name: 'block', label: 'Quadra', value: property?.block, required: false, maxLength: 40 },
    { section: 'Localização e medidas', name: 'lot', label: 'Número do lote', value: property?.lot, required: false, maxLength: 40 },
    { section: 'Localização e medidas', name: 'area_sqm', label: 'Área do terreno (m²)', value: property?.area_sqm == null ? '' : String(property.area_sqm), type: 'number', min: '0.01', step: '0.01', required: false },
    { section: 'Localização e medidas', name: 'address', label: 'Endereço / localização completa', value: property?.address, type: 'textarea', maxLength: 500 },
    { section: 'Aquisição e comercial', name: 'acquisition_on', label: 'Data de aquisição', value: property?.acquisition_on || '', type: 'date', max: today(), required: false },
    { section: 'Aquisição e comercial', name: 'acquisition_cents', label: 'Custo de aquisição (R$)', value: String((property?.acquisition_cents || 0) / 100), type: 'number', min: '0', step: '0.01', readOnly: Boolean(property), hint: property ? 'Valor mantido para preservar a base de custos.' : 'Comporá o custo do imóvel; não gera pagamento no caixa.' },
    { section: 'Aquisição e comercial', name: 'asking_cents', label: 'Preço pedido de venda (R$)', value: String((property?.asking_cents || 0) / 100), type: 'number', min: '0', step: '0.01', hint: 'Alterar o preço pedido não altera o valor de uma venda já contratada.' },
  ]
  fields.push(
    { section: 'Construção (quando aplicável)', name: 'construction_reference', label: 'Identificação da obra', value: property?.construction_reference, maxLength: 100, required: false },
    { section: 'Construção (quando aplicável)', name: 'responsible', label: 'Responsável pela obra', value: property?.responsible, required: false },
    { section: 'Construção (quando aplicável)', name: 'started_on', label: 'Data de início', value: property?.started_on || '', type: 'date', required: false },
    { section: 'Construção (quando aplicável)', name: 'expected_completion_on', label: 'Previsão de conclusão', value: property?.expected_completion_on || '', type: 'date', required: false },
    { section: 'Construção (quando aplicável)', name: 'completed_on', label: 'Conclusão efetiva', value: property?.completed_on || '', type: 'date', max: today(), required: false },
    { section: 'Construção (quando aplicável)', name: 'construction_status', label: 'Etapa da construção', value: property?.construction_status || 'planning', options: options(constructionStatuses) },
    { section: 'Construção (quando aplicável)', name: 'budget_cents', label: 'Orçamento da construção (R$)', value: String((property?.budget_cents || 0) / 100), type: 'number', min: '0', step: '0.01' },
    { section: 'Observações', name: 'notes', label: 'Observações do imóvel', value: property?.notes, type: 'textarea', required: false },
  )
  async function save(values: Record<string, string>) {
    if (readOnly) return
    const payload = propertyPayload(values, role, property)
    const result = property ? await supabase.from('properties').update(payload).eq('id', property.id).select('id').single()
      : await supabase.from('properties').insert(payload).select('id').single()
    checkRegistryError(result.error, 'properties'); await onSaved()
  }
  const title = readOnly ? 'Dados do imóvel' : property ? works ? 'Atualizar construção' : 'Editar imóvel' : 'Cadastrar imóvel'
  return <FormDialog title={property ? `${title} · ${property.code}` : title} fields={readOnly ? fields.map(field => ({ ...field, readOnly: true })) : fields} onClose={onClose} onSave={save} submitLabel={readOnly ? 'Concluir' : 'Salvar'} />
}
