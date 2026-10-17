// Espelho em TypeScript do src/fields.py, para o site estático (GitHub Pages)
// ler o PDF no navegador: mesmos regex, mesma ordem, mesmo score.
// O CI roda as duas versões contra samples/expected para garantir que não divergem.
// Sem imports de propósito: o script de gabarito roda este arquivo direto no Node.

const PADROES = {
  locador: /instrumento,\s*(.+?),\s*LOCADOR/i,
  locatario: /e\s*(.+?),\s*LOCATARIO/i,
  endereco: /IMOVEL:\s*(.+?)\.?\s*$/im,
  aluguel: /ALUGUEL:\s*R\$\s*([\d.]+)/i,
  vigencia_inicio: /VIGENCIA:\s*de\s*([\d/]+)/i,
  vigencia_fim: /a\s*([\d/]+)\./i,
  indice_reajuste: /indice\s*([A-Z-]+)/i,
}

export type Campos = Record<keyof typeof PADROES, string | null>

export function extrairCampos(texto: string): { campos: Campos; confianca: number } {
  const campos = {} as Campos
  for (const chave of Object.keys(PADROES) as (keyof typeof PADROES)[]) {
    const achado = texto.match(PADROES[chave])
    campos[chave] = achado ? achado[1].trim() : null
  }
  // confiança: quantos campos a gente conseguiu achar?
  const achados = Object.values(campos).filter((v) => v !== null).length
  return { campos, confianca: Math.round((achados / Object.keys(PADROES).length) * 100) / 100 }
}

export type ItemTexto = { str: string; x: number; y: number; largura: number }

/** Itens do getTextContent() do pdf.js -> formato neutro. */
export function paraItens(itens: readonly object[]): ItemTexto[] {
  return itens
    .filter((i): i is { str: string; transform: number[]; width: number } => 'str' in i)
    .map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], largura: i.width }))
}

/**
 * Remonta o texto como o pdfplumber faz: agrupa os pedaços por linha (mesma
 * altura, com tolerância), ordena de cima para baixo e da esquerda para a
 * direita, e junta as páginas com quebra de linha.
 */
export function juntarTexto(paginas: ItemTexto[][], tolerancia = 3): string {
  return paginas
    .map((itens) => {
      const linhas: { y: number; itens: ItemTexto[] }[] = []
      const visiveis = itens.filter((i) => i.str !== '').sort((a, b) => b.y - a.y || a.x - b.x)
      for (const item of visiveis) {
        const linha = linhas.find((l) => Math.abs(l.y - item.y) <= tolerancia)
        if (linha) linha.itens.push(item)
        else linhas.push({ y: item.y, itens: [item] })
      }
      return linhas
        .map((l) => juntarLinha(l.itens.sort((a, b) => a.x - b.x)))
        .filter((l) => l !== '')
        .join('\n')
    })
    .filter((p) => p !== '')
    .join('\n')
}

function juntarLinha(itens: ItemTexto[]) {
  let saida = ''
  let fim = -Infinity
  for (const item of itens) {
    const separado = item.x - fim > 1
    if (saida && separado && !saida.endsWith(' ') && !item.str.startsWith(' ')) saida += ' '
    saida += item.str
    fim = item.x + item.largura
  }
  return saida.trim()
}
