import { registerSW } from 'virtual:pwa-register'

// PWA leve: registra o service worker (precache do shell) e força uma
// checagem periódica de nova versão. Sem isso, quem deixa o app instalado
// aberto pode continuar vendo um build antigo por horas — a navegação
// client-side do React Router não dispara reavaliação do sw.js. Com
// `registerType: 'autoUpdate'`, assim que a nova versão assume a página
// recarrega sozinha. Mesmo mecanismo do catálogo pessoal (`src/pwa/web.ts`),
// só sem a indireção de alias `@pwa-register` (a loja não tem build nativo).
const SW_UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

export function registerAppServiceWorker(): void {
  registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      if (!registration) return
      setInterval(async () => {
        if (registration.installing || !navigator.onLine) return
        const resp = await fetch(swUrl, { cache: 'no-store' })
        if (resp.status === 200) await registration.update()
      }, SW_UPDATE_CHECK_INTERVAL_MS)
    },
  })
}
