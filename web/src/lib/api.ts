// Cliente da API FastAPI (api.py). Tipos espelham o JSON que ela devolve.
// Dentro do Streamlit (app.py) os mesmos dados vêm pela ponte em streamlit.ts;
// no site estático (GitHub Pages) vêm de data/carteira.json e o PDF é lido no navegador.
import { argsDoStreamlit, pedirExtracao } from './streamlit'
import { modo } from './modo'
import { montarPainel, type ContratoBase } from './painel'

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

// ── site estático ────────────────────────────────────────────────────────
type DadosEstaticos = { exemplos: string[]; contratos: ContratoBase[] }
let dadosEstaticos: Promise<DadosEstaticos> | null = null
const dadosDoSite = () => (dadosEstaticos ??= pedir<DadosEstaticos>('./data/carteira.json'))

async function extrairNoNavegador(dados: ArrayBuffer, nome: string): Promise<Extracao> {
  const cabecalho = new TextDecoder().decode(new Uint8Array(dados, 0, Math.min(4, dados.byteLength)))
  if (cabecalho !== '%PDF') throw new Error('O arquivo enviado não é um PDF.')
  const { textoDoPdf } = await import('./pdf')
  const { extrairCampos } = await import('./campos')
  let texto: string
  try {
    texto = await textoDoPdf(dados)
  } catch {
    throw new Error('Não consegui ler esse PDF.')
  }
  return { arquivo: nome, ...extrairCampos(texto) }
}

async function extrairExemploNoNavegador(arquivo: string) {
  const { exemplos } = await dadosDoSite()
  // só aceita nomes da lista de exemplos (nada de ../)
  if (!exemplos.includes(arquivo)) throw new Error('Contrato de exemplo não encontrado.')
  const resposta = await fetch(`./data/contratos/${encodeURIComponent(arquivo)}`)
  if (!resposta.ok) throw new Error('Contrato de exemplo não encontrado.')
  return extrairNoNavegador(await resposta.arrayBuffer(), arquivo)
}

// ── interface comum aos três modos ───────────────────────────────────────
export function buscarCarteira() {
  if (modo === 'streamlit') return argsDoStreamlit().then((a) => a.carteira!)
  if (modo === 'estatico') return dadosDoSite().then((d) => montarPainel(d.contratos))
  return pedir<Carteira>('/api/carteira')
}

export function listarExemplos() {
  if (modo === 'streamlit') return argsDoStreamlit().then((a) => a.exemplos ?? [])
  if (modo === 'estatico') return dadosDoSite().then((d) => d.exemplos)
  return pedir<string[]>('/api/exemplos')
}

export function extrairExemplo(arquivo: string) {
  if (modo === 'streamlit') return pedirExtracao({ tipo: 'exemplo', arquivo })
  if (modo === 'estatico') return extrairExemploNoNavegador(arquivo)
  return pedir<Extracao>(`/api/exemplos/${encodeURIComponent(arquivo)}/extrair`, { method: 'POST' })
}

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
  if (modo === 'streamlit') return pedirExtracao({ tipo: 'upload', arquivo: arquivo.name, b64: await emBase64(arquivo) })
  if (modo === 'estatico') return extrairNoNavegador(await arquivo.arrayBuffer(), arquivo.name)
  const corpo = new FormData()
  corpo.append('arquivo', arquivo)
  return pedir<Extracao>('/api/extrair', { method: 'POST', body: corpo })
}
