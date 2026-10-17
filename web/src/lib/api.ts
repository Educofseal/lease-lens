// Cliente da API FastAPI (api.py). Tipos espelham o JSON que ela devolve.
// Dentro do Streamlit (app.py) os mesmos dados vêm pela ponte em streamlit.ts.
import { argsDoStreamlit, noStreamlit, pedirExtracao } from './streamlit'

export type Contrato = {
  arquivo: string
  locador: string | null
  locatario: string | null
  endereco: string | null
  aluguel: number | null
  vigencia_inicio: string | null
  vigencia_fim: string | null
  indice_reajuste: string | null
  confianca: number | null
  dias_restantes: number | null
}

export type Carteira = {
  hoje: string
  janela_dias: number
  total: number
  aluguel_medio: number | null
  receita_mensal: number
  confianca_media: number | null
  por_indice: { indice: string | null; contratos: number; aluguel_medio: number | null }[]
  vencendo: { arquivo: string; locatario: string | null; vigencia_fim: string; dias_restantes: number }[]
  problemas: { arquivo: string; confianca: number }[]
  contratos: Contrato[]
}

export const CAMPOS = [
  ['locador', 'Locador'],
  ['locatario', 'Locatário'],
  ['endereco', 'Endereço'],
  ['aluguel', 'Aluguel'],
  ['vigencia_inicio', 'Início da vigência'],
  ['vigencia_fim', 'Fim da vigência'],
  ['indice_reajuste', 'Índice de reajuste'],
] as const

export type CampoChave = (typeof CAMPOS)[number][0]

export type Extracao = {
  arquivo: string
  campos: Record<CampoChave, string | null>
  confianca: number
}

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  let resposta: Response
  try {
    resposta = await fetch(url, init)
  } catch {
    throw new Error('Não consegui falar com a API.')
  }
  if (!resposta.ok) {
    let mensagem = `A API respondeu com erro ${resposta.status}.`
    try {
      const corpo = await resposta.json()
      if (typeof corpo?.detail === 'string') mensagem = corpo.detail
    } catch {
      // corpo sem JSON: fica a mensagem genérica
    }
    throw new Error(mensagem)
  }
  return resposta.json() as Promise<T>
}

const LIMITE_UPLOAD = 10 * 1024 * 1024

export const buscarCarteira = () =>
  noStreamlit ? argsDoStreamlit().then((a) => a.carteira!) : pedir<Carteira>('/api/carteira')

export const listarExemplos = () =>
  noStreamlit ? argsDoStreamlit().then((a) => a.exemplos ?? []) : pedir<string[]>('/api/exemplos')

export const extrairExemplo = (arquivo: string) =>
  noStreamlit
    ? pedirExtracao({ tipo: 'exemplo', arquivo })
    : pedir<Extracao>(`/api/exemplos/${encodeURIComponent(arquivo)}/extrair`, { method: 'POST' })

function emBase64(arquivo: File) {
  return new Promise<string>((ok, falha) => {
    const leitor = new FileReader()
    leitor.onload = () => ok(String(leitor.result).split(',')[1] ?? '')
    leitor.onerror = () => falha(new Error('Não consegui ler o arquivo.'))
    leitor.readAsDataURL(arquivo)
  })
}

export async function extrairPdf(arquivo: File) {
  if (arquivo.size > LIMITE_UPLOAD) throw new Error('O PDF passa de 10 MB.')
  if (noStreamlit) return pedirExtracao({ tipo: 'upload', arquivo: arquivo.name, b64: await emBase64(arquivo) })
  const corpo = new FormData()
  corpo.append('arquivo', arquivo)
  return pedir<Extracao>('/api/extrair', { method: 'POST', body: corpo })
}
