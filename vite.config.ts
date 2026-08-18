import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const here = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: here,
  plugins: [react(), tailwindcss()],
  server: { port: 5190 },
})
