// Espelho do query.painel() para o site estático: as contas de vencimento
// rodam no navegador, na data de quem está visitando (o JSON só traz os campos).
import type { Carteira, Contrato } from './api'

export type ContratoBase = Omit<Contrato, 'dias_restantes'>

const DIA = 24 * 60 * 60 * 1000

/** Mesma regra do _dias_ate(): dias até o dia 1 do mês 'MM/AAAA'. */
function diasAte(fim: string | null, agora: Date): number | null {
  if (!fim) return null
  const [mes, ano] = fim.split('/').map(Number)
  if (!mes || !ano || mes < 1 || mes > 12) return null
  return Math.floor((new Date(ano, mes - 1, 1).getTime() - agora.getTime()) / DIA)
}

const media = (valores: number[]) => (valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null)

function isoLocal(data: Date) {
  const doisDigitos = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`
}

export function montarPainel(base: ContratoBase[], agora = new Date(), janela = 90): Carteira {
  const contratos: Contrato[] = [...base]
    .sort((a, b) => a.arquivo.localeCompare(b.arquivo))
    .map((c) => ({ ...c, dias_restantes: diasAte(c.vigencia_fim, agora) }))

  const alugueis = contratos.flatMap((c) => (c.aluguel == null ? [] : [c.aluguel]))
  const confiancas = contratos.flatMap((c) => (c.confianca == null ? [] : [c.confianca]))

  const grupos = new Map<string | null, number[]>()
  const contagem = new Map<string | null, number>()
  for (const c of contratos) {
    contagem.set(c.indice_reajuste, (contagem.get(c.indice_reajuste) ?? 0) + 1)
    if (!grupos.has(c.indice_reajuste)) grupos.set(c.indice_reajuste, [])
    if (c.aluguel != null) grupos.get(c.indice_reajuste)!.push(c.aluguel)
  }

  return {
    hoje: isoLocal(agora),
    janela_dias: janela,
    total: contratos.length,
    aluguel_medio: media(alugueis),
    receita_mensal: alugueis.reduce((s, v) => s + v, 0),
    confianca_media: media(confiancas),
    por_indice: [...contagem.entries()]
      .map(([indice, n]) => ({ indice, contratos: n, aluguel_medio: media(grupos.get(indice) ?? []) }))
      .sort((a, b) => b.contratos - a.contratos || String(a.indice).localeCompare(String(b.indice))),
    vencendo: contratos
      .filter((c) => c.dias_restantes != null && c.dias_restantes >= 0 && c.dias_restantes <= janela)
      .sort((a, b) => a.dias_restantes! - b.dias_restantes!)
      .map((c) => ({
        arquivo: c.arquivo,
        locatario: c.locatario,
        vigencia_fim: c.vigencia_fim!,
        dias_restantes: c.dias_restantes!,
      })),
    problemas: contratos
      .filter((c) => c.confianca != null && c.confianca < 1)
      .sort((a, b) => a.confianca! - b.confianca!)
      .map((c) => ({ arquivo: c.arquivo, confianca: c.confianca! })),
    contratos,
  }
}
