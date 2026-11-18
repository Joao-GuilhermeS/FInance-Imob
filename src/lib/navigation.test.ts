import { expect, it } from 'vitest'
import { appRoutes, navigationGroups } from './navigation'
it('organiza 16 módulos reais sem estoque e mantém destinos exclusivos e grupos válidos', () => {
  const visible = appRoutes.filter(item => item.group)
  expect(visible).toHaveLength(16)
  expect(new Set(appRoutes.map(item => item.path)).size).toBe(appRoutes.length)
  expect(visible.every(item => navigationGroups.includes(item.group!))).toBe(true)
  expect(appRoutes.some(item => item.path.includes('estoque'))).toBe(false)
})
it('restringe financeiro a seus perfis e preserva reservas/fichas em links internos', () => {
  expect(appRoutes.find(item => item.path === '/financeiro/casas')?.roles).not.toContain('works')
  expect(appRoutes.find(item => item.path === '/financeiro/terrenos')?.roles).not.toContain('sales')
  expect(appRoutes.find(item => item.path === '/clientes')?.roles).not.toContain('works')
  expect(appRoutes.find(item => item.path === '/reservas')?.group).toBeUndefined()
  expect(appRoutes.find(item => item.path === '/fichas')?.roles).toContain('finance')
})
