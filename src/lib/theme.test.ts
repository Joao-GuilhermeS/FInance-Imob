import { expect, it } from 'vitest'
import { resolveTheme } from './theme'
it('prefere escolha explícita e usa o sistema somente sem uma preferência válida', () => {
  expect(resolveTheme('light', true)).toBe('light')
  expect(resolveTheme('dark', false)).toBe('dark')
  expect(resolveTheme(null, true)).toBe('dark')
  expect(resolveTheme('invalid', false)).toBe('light')
})
