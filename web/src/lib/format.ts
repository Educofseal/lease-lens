// Formatação pt-BR usada em toda a interface.

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

export const moeda = (valor: number | null | undefined) => (valor == null ? '—' : brl.format(valor))

export const pct = (valor: number | null | undefined) => (valor == null ? '—' : `${Math.round(valor * 100)}%`)

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** 'MM/AAAA' -> Date no dia 1 do mês (mesma regra do query.py). */
export function paraData(mesAno: string | null): Date | null {
  if (!mesAno) return null
  const [mes, ano] = mesAno.split('/').map(Number)
  if (!mes || !ano || mes < 1 || mes > 12) return null
  return new Date(ano, mes - 1, 1)
}

/** 'MM/AAAA' -> 'nov 2026' */
export function mesAno(valor: string | null) {
  const data = paraData(valor)
  return data ? `${MESES[data.getMonth()]} ${data.getFullYear()}` : '—'
}

/** '2026-10-17' -> '17 out 2026' */
export function dataCurta(iso: string) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return `${dia} ${MESES[mes - 1]} ${ano}`
}

/** '2026-10-17' -> Date local (sem cair no fuso UTC). */
export function dataIso(iso: string) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

const EXTENSO = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
  'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte',
]

export const extenso = (n: number) => EXTENSO[n] ?? String(n)

export const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

export const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios)

export const semPdf = (arquivo: string) => arquivo.replace(/\.pdf$/i, '')

export type Status = 'vencido' | 'vencendo' | 'futuro' | 'ativo'

export function statusDe(dias: number | null, inicio: string | null, hoje: Date, janela: number): Status {
  if (dias != null && dias < 0) return 'vencido'
  if (dias != null && dias <= janela) return 'vencendo'
  const comeco = paraData(inicio)
  if (comeco && comeco > hoje) return 'futuro'
  return 'ativo'
}

export const STATUS_ROTULO: Record<Status, string> = {
  vencido: 'Já venceu',
  vencendo: 'Vence na janela',
  futuro: 'Ainda não começou',
  ativo: 'Em vigor',
}

/** Cor de cada índice de reajuste (tokens em styles/tokens.css). */
export function corIndice(indice: string | null) {
  switch (indice) {
    case 'IPCA':
      return 'var(--idx-ipca)'
    case 'INPC':
      return 'var(--idx-inpc)'
    case 'IGP-M':
      return 'var(--idx-igpm)'
    default:
      return 'var(--muted)'
  }
}
