// Leitura de PDF no navegador (só no site estático). Carregado sob demanda:
// o pdf.js só baixa quando alguém testa um contrato.
import * as pdfjs from 'pdfjs-dist'
import urlDoWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { juntarTexto, paraItens, type ItemTexto } from './campos'

pdfjs.GlobalWorkerOptions.workerSrc = urlDoWorker

export async function textoDoPdf(dados: ArrayBuffer): Promise<string> {
  const tarefa = pdfjs.getDocument({ data: new Uint8Array(dados) })
  const doc = await tarefa.promise
  try {
    const paginas: ItemTexto[][] = []
    for (let n = 1; n <= doc.numPages; n++) {
      const pagina = await doc.getPage(n)
      const conteudo = await pagina.getTextContent()
      paginas.push(paraItens(conteudo.items))
    }
    return juntarTexto(paginas)
  } finally {
    await tarefa.destroy()
  }
}
