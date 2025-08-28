import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  const base = process.env.VITE_BASE ?? '/'
  return {
    base,
    plugins: [react()],
  }
})
