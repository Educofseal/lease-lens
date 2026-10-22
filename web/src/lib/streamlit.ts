// Ponte com o Streamlit: quando a página roda como componente dentro do
// app.py (`streamlit run app.py`), os dados chegam por postMessage e a
// extração roda no Python do Streamlit, não no FastAPI.
import type { Carteira, Extracao } from './api'

type RespostaExtracao = { nonce: string; resultado?: Extracao; erro?: string }
type Args = { carteira?: Carteira; exemplos?: string[]; extracao?: RespostaExtracao | null }

export type PedidoExtracao = { tipo: 'exemplo'; arquivo: string } | { tipo: 'upload'; arquivo: string; b64: string }

/** O Streamlit abre o componente com ?streamlitUrl=... na URL. */
export const noStreamlit = new URLSearchParams(window.location.search).has('streamlitUrl')

let ultimos: Args | null = null
const ouvintes = new Set<(args: Args) => void>()

function enviar(type: string, dados: Record<string, unknown> = {}) {
  window.parent.postMessage({ isStreamlitMessage: true, type, ...dados }, '*')
}

function alturaDaJanela() {
  try {
    return window.parent.innerHeight
  } catch {
    return window.screen.height
  }
}

export function iniciarStreamlit() {
  if (!noStreamlit) return
  window.addEventListener('message', (e: MessageEvent) => {
    if (e.data?.type !== 'streamlit:render') return
    ultimos = (e.data.args ?? {}) as Args
    ouvintes.forEach((f) => f(ultimos!))
  })
  enviar('streamlit:componentReady', { apiVersion: 1 })
  // o app.py já estica o iframe para a tela toda via CSS; isto é o reforço
  const ajustar = () => enviar('streamlit:setFrameHeight', { height: alturaDaJanela() })
  ajustar()
  try {
    window.parent.addEventListener('resize', ajustar)
  } catch {
    // pai de outra origem: fica a altura do CSS
  }
}

function esperar<T>(pegar: (args: Args) => T | undefined, limiteMs: number, msgTempo: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const imediato = ultimos && pegar(ultimos)
    if (imediato !== undefined && imediato !== null) return resolve(imediato as T)
    const ouvir = (args: Args) => {
      const valor = pegar(args)
      if (valor === undefined) return
      ouvintes.delete(ouvir)
      clearTimeout(relogio)
      resolve(valor)
    }
    const relogio = setTimeout(() => {
      ouvintes.delete(ouvir)
      reject(new Error(msgTempo))
    }, limiteMs)
    ouvintes.add(ouvir)
  })
}

export const argsDoStreamlit = () =>
  esperar((a) => (a.carteira ? a : undefined), 30_000, 'O Streamlit não enviou os dados da carteira.')

/** Manda o pedido para o Python e espera a resposta com o mesmo nonce. */
export async function pedirExtracao(pedido: PedidoExtracao): Promise<Extracao> {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const resposta = esperar(
    (a) => (a.extracao?.nonce === nonce ? a.extracao : undefined),
    60_000,
    'A extração demorou demais. Tente de novo.',
  )
  enviar('streamlit:setComponentValue', { value: { ...pedido, nonce }, dataType: 'json' })
  const r = await resposta
  if (r.erro || !r.resultado) throw new Error(r.erro ?? 'Algo deu errado na extração.')
  return r.resultado
}
