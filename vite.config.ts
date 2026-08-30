import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const here = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: here,
  plugins: [
    react(),
    tailwindcss(),
    // PWA "leve": instalável (tela inicial, janela própria) + service worker
    // que cacheia só o shell (JS/CSS/HTML/ícones). NÃO há offline de dados —
    // toda consulta continua indo ao Supabase ao vivo; sem rede, o app abre
    // mas não carrega dados. Offline de verdade (fila de escrita, IndexedDB)
    // seria uma frente própria, ver claude.md §1 e a memória de decisão.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: '/',
        name: 'Tesouros da Terra — Loja',
        short_name: 'TT Loja',
        description: 'Estoque, vendas, clientes e documentos da loja',
        lang: 'pt-BR',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: '#1c1917',
        background_color: '#1c1917',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Fundo sólido + cristal na zona segura central: serve de maskable.
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [/^\/auth/],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  server: { port: 5190 },
})
