// Hash de PIN com PBKDF2 (Web Crypto) — COMPARTILHADO entre o catálogo e a
// loja (ver scripts/shared-ui.mjs). Usado pelo PIN do modo privado do
// catálogo (`lib/privacy.ts` reexporta daqui) e pela trava de abertura do app
// (`lib/appLock.ts`), que são PINs independentes: o mesmo algoritmo, salts e
// armazenamentos diferentes.
//
// O PIN é uma trava de sessão/UX: impede olhares e uso casual do aparelho.
// A proteção de servidor é o login + RLS — o PIN não substitui isso.

const ITERATIONS = 100_000

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return toHex(salt.buffer)
}

export async function hashPin(pin: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex) as BufferSource, iterations: ITERATIONS },
    key,
    256,
  )
  return toHex(bits)
}
