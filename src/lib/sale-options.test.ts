import { expect, it } from 'vitest'
import { saleOptions } from './sale-options'
const values = { total: '100.00', down: '10.00', interest: '10.00', discount: '9.99', count: '3', sold: '2024-01-01', first: '2024-01-31', period: 'monthly', notes: 'Ajustes acordados' }
it('reconcilia ajustes, entrada e arredondamento em centavos', () => {
  const t = saleOptions(values)
  expect(t.total).toBe(10001)
  expect(t.down + t.schedule.reduce((s, i) => s + i.amount, 0)).toBe(10001)
  expect(t.schedule.map(i => i.due)).toEqual(['2024-01-31', '2024-02-29', '2024-03-31'])
})
it('reproduz datas semanais, de 14 dias, trimestrais e anuais do banco', () => {
  expect(saleOptions({ ...values, period: 'weekly' }).schedule[2].due).toBe('2024-02-14')
  expect(saleOptions({ ...values, period: 'fortnightly' }).schedule[2].due).toBe('2024-02-28')
  expect(saleOptions({ ...values, period: 'quarterly' }).schedule[2].due).toBe('2024-07-31')
  expect(saleOptions({ ...values, period: 'yearly' }).schedule[2].due).toBe('2026-01-31')
})
it('exige justificativa e rejeita total/entrada/contagem/datas inválidos', () => {
  for (const patch of [{ notes: '' }, { discount: '1000' }, { down: '200' }, { count: '0' }, { first: '2024-02-31' }, { period: 'invalid' }]) expect(() => saleOptions({ ...values, ...patch })).toThrow()
})
it('permite à vista sem parcelas do saldo e sem ajustes automáticos', () => {
  const t = saleOptions({ ...values, total: '100', down: '100', interest: '0', discount: '0', notes: '' })
  expect(t.total).toBe(10000); expect(t.schedule).toEqual([])
})
