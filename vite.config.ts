import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  if (command === 'build' && process.env.VERCEL === '1') {
    const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'].filter(key => !process.env[key]?.trim())
    if (missing.length) throw new Error(`Configure as variáveis do projeto Vercel antes do deploy: ${missing.join(', ')}`)
  }
  return {
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/, priority: 20 },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
          ],
        },
      },
    },
  },
  }
})
