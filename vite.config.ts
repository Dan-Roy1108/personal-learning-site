import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: import.meta.env.PROD ? '/personal-learning-site/' : '/',
  plugins: [react()],
})
