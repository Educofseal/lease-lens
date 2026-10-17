// Confere a extração do navegador (pdf.js + src/lib/campos.ts) contra o
// gabarito em samples/expected — o mesmo teste que tools/checar_gabarito.py
// faz com o Python. Roda direto no Node 22.18+: `node scripts/gabarito.ts`.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { extrairCampos, juntarTexto, paraItens, type ItemTexto } from '../src/lib/campos.ts'

const RAIZ = join(import.meta.dirname, '..', '..')
const CONTRATOS = join(RAIZ, 'samples', 'contracts')
const ESPERADO = join(RAIZ, 'samples', 'expected')

async function textoDoPdf(caminho: string) {
  const tarefa = getDocument({ data: new Uint8Array(readFileSync(caminho)), verbosity: 0 })
  const doc = await tarefa.promise
  const paginas: ItemTexto[][] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const conteudo = await (await doc.getPage(n)).getTextContent()
    paginas.push(paraItens(conteudo.items))
  }
  await tarefa.destroy()
  return juntarTexto(paginas)
}

let falhas = 0
const pdfs = readdirSync(CONTRATOS).filter((f) => f.endsWith('.pdf')).sort()
for (const pdf of pdfs) {
  const esperado = JSON.parse(readFileSync(join(ESPERADO, pdf.replace('.pdf', '.json')), 'utf-8'))
  const { campos } = extrairCampos(await textoDoPdf(join(CONTRATOS, pdf)))
  const erros = Object.entries(campos)
    .filter(([chave, valor]) => String(esperado[chave]) !== valor)
    .map(([chave, valor]) => `${chave}: esperado ${JSON.stringify(String(esperado[chave]))}, veio ${JSON.stringify(valor)}`)
  falhas += erros.length
  console.log(`${pdf}: ${erros.length ? 'FALHOU' : 'ok'}`)
  erros.forEach((e) => console.log(`  ${e}`))
}

console.log(falhas ? `\n${falhas} campo(s) diferentes do gabarito.` : `\nNavegador: ${pdfs.length} contratos batem com o gabarito.`)
process.exit(falhas ? 1 : 0)
