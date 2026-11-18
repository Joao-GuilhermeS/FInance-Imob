import { Bell, Building2, ClipboardList, FileBarChart2, Hammer, HardHat, LayoutDashboard, Map, Settings, ShoppingBag, Users, UserRoundCog, Wallet, WalletCards } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from './domain'
export type AppRoute = { path: string; label: string; icon: LucideIcon; roles: Role[]; group?: string; workspace?: string; propertyScope?: 'land' | 'house'; contactScope?: 'client' | 'supplier'; expenseScope?: 'services'; segment?: 'land' | 'house'; aliases?: string[] }
const all: Role[] = ['admin', 'finance', 'sales', 'works']
const finance: Role[] = ['admin', 'finance']
const commercial: Role[] = ['admin', 'finance', 'sales']
const works: Role[] = ['admin', 'finance', 'works']
export const navigationGroups = ['Visão geral', 'Imóveis e engenharia', 'Comercial e CRM', 'Financeiro', 'Administração']
export const appRoutes: AppRoute[] = [
  { path: '/', label: 'Dashboard principal', icon: LayoutDashboard, roles: all, group: navigationGroups[0] },
  { path: '/alertas', label: 'Central de notificações', icon: Bell, roles: finance, group: navigationGroups[0] },
  { path: '/terrenos', label: 'Terrenos', icon: Map, roles: all, group: navigationGroups[1], workspace: '/imoveis', propertyScope: 'land' },
  { path: '/casas', label: 'Casas e construções', icon: HardHat, roles: all, group: navigationGroups[1], workspace: '/imoveis', propertyScope: 'house', aliases: ['/obras'] },
  { path: '/compras', label: 'Compras e despesas', icon: ShoppingBag, roles: works, group: navigationGroups[1] },
  { path: '/servicos', label: 'Mão de obra e serviços', icon: Hammer, roles: works, group: navigationGroups[1], workspace: '/compras', expenseScope: 'services' },
  { path: '/clientes', label: 'Clientes', icon: Users, roles: commercial, group: navigationGroups[2], workspace: '/pessoas', contactScope: 'client' },
  { path: '/vendas', label: 'Vendas e contratos', icon: ClipboardList, roles: commercial, group: navigationGroups[2], aliases: ['/reservas'] },
  { path: '/fornecedores', label: 'Fornecedores', icon: Building2, roles: all, group: navigationGroups[2], workspace: '/pessoas', contactScope: 'supplier' },
  { path: '/parcelas', label: 'Parcelas e recebimentos', icon: WalletCards, roles: finance, group: navigationGroups[3] },
  { path: '/financeiro', label: 'Financeiro consolidado', icon: Wallet, roles: finance, group: navigationGroups[3] },
  { path: '/financeiro/terrenos', label: 'Financeiro dos terrenos', icon: Map, roles: finance, group: navigationGroups[3], workspace: '/financeiro', segment: 'land' },
  { path: '/financeiro/casas', label: 'Financeiro das casas', icon: Building2, roles: finance, group: navigationGroups[3], workspace: '/financeiro', segment: 'house' },
  { path: '/relatorios', label: 'Relatórios', icon: FileBarChart2, roles: finance, group: navigationGroups[3], workspace: '/financeiro' },
  { path: '/usuarios', label: 'Usuários e permissões', icon: UserRoundCog, roles: ['admin'], group: navigationGroups[4], workspace: '/configuracoes' },
  { path: '/configuracoes', label: 'Configurações', icon: Settings, roles: all, group: navigationGroups[4] },
  { path: '/fichas', label: 'Fichas financeiras', icon: FileBarChart2, roles: finance },
  { path: '/reservas', label: 'Reservas', icon: ClipboardList, roles: commercial },
  { path: '/imoveis', label: 'Imóveis', icon: Building2, roles: all },
  { path: '/pessoas', label: 'Pessoas', icon: Users, roles: all },
  { path: '/obras', label: 'Custos das construções', icon: HardHat, roles: works },
]
