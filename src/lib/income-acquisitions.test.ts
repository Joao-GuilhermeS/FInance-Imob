import { describe, expect, it } from 'vitest'
import { acquisitionValues, incomeValues } from './income-acquisitions'
describe('outras receitas', () => {
  const values = { description: 'Recebimento de reembolso', amount: '123.45', date: '2026-01-01', account: 'bank', method: 'Pix', notes: 'Documento', property: '', contact: '' }
  it('converte valores em centavos e permite receita geral sem venda ou pessoa', () => {
    expect(incomeValues(values)).toMatchObject({ p_amount: 12345, p_property: null, p_contact: null, p_notes: 'Documento' })
  })
  it('exige recebimento positivo, conta e data efetiva válida', () => {
    for (const patch of [{ amount: '0' }, { amount: '-1' }, { amount: '1.001' }, { date: '2099-01-01' }, { date: '2026-02-30' }, { account: '' }, { description: 'x' }, { method: '' }]) expect(() => incomeValues({ ...values, ...patch })).toThrow()
  })
})
describe('obrigação de aquisição', () => {
  const values = { opening: '30.00', due: '2026-12-01', reason: 'Saldo conferido no início do controle', confirm: 'yes', contact: '' }
  it('reconhece pagamento anterior explícito, inclusive zero e quitação integral', () => {
    expect(acquisitionValues(values, 10001).p_opening_paid).toBe(3000)
    expect(acquisitionValues({ ...values, opening: '0' }, 10001).p_opening_paid).toBe(0)
    expect(acquisitionValues({ ...values, opening: '100.01' }, 10001).p_opening_paid).toBe(10001)
  })
  it('rejeita reconhecimento presumido, acima do custo ou sem conferência', () => {
    for (const patch of [{ opening: '' }, { opening: '100.02' }, { opening: '-1' }, { due: '2026-02-30' }, { reason: 'x' }, { confirm: '' }]) expect(() => acquisitionValues({ ...values, ...patch }, 10001)).toThrow()
    expect(() => acquisitionValues(values, 0)).toThrow()
  })
})
