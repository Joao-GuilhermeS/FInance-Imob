import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const label = theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'
  return <button className="icon-button theme-toggle" type="button" onClick={toggle} aria-label={label} title={label} aria-pressed={theme === 'dark'}>{theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}</button>
}
