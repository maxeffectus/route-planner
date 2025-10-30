import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Use relative paths for GitHub Pages - works for any repository name
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  }
})
