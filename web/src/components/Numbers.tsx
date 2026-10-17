/*
 * A CARTEIRA EM NÚMEROS
 * Técnicas: word-by-word scroll lighting (seção pinada no desktop),
 * contadores que sobem ao entrar na tela, multi-directional stagger nos KPIs.
 */
import { useRef } from 'react'
import type { Carteira } from '../lib/api'
import { capitalizar, extenso, moeda, pct, plural } from '../lib/format'
import { MQ, contar, gsap, useGSAP } from '../lib/motion'

type Trecho = { t: string; destaque?: boolean }

export function Numbers({ dados }: { dados: Carteira }) {
  const raiz = useRef<HTMLElement>(null)
  const nIndices = dados.por_indice.length

  const frase: Trecho[] = [
    { t: capitalizar(extenso(dados.total)), destaque: true },
    { t: `${plural(dados.total, 'contrato.', 'contratos.')}` },
    { t: moeda(dados.receita_mensal), destaque: true },
    { t: 'por' },
    { t: 'mês.' },
    { t: capitalizar(extenso(nIndices)), destaque: true },
    { t: plural(nIndices, 'índice', 'índices') },
    { t: 'de' },
    { t: 'reajuste.' },
    { t: 'E' },
    { t: 'nenhuma' },
    { t: 'planilha' },
    { t: 'aberta' },
    { t: 'para' },
    { t: 'saber' },
    { t: 'disso.' },
  ]
  const texto = frase.map((p) => p.t).join(' ')

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      const acender = (palavras: HTMLElement[]) =>
        gsap.timeline().fromTo(palavras, { opacity: 0.13 }, { opacity: 1, stagger: 0.1, ease: 'none', duration: 0.3 })

      mm.add(MQ.desktop, () => {
        const palavras = gsap.utils.toArray<HTMLElement>('.lit-word')
        const tl = acender(palavras)
        tl.to({}, { duration: 0.4 })
        gsap.timeline({
          scrollTrigger: {
            trigger: '.lit-wrap',
            start: 'center center',
            end: () => `+=${palavras.length * 60}`,
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
          },
        }).add(tl)
      })
      mm.add('(prefers-reduced-motion: no-preference) and (max-width: 899px)', () => {
        const tl = acender(gsap.utils.toArray<HTMLElement>('.lit-word'))
        gsap.timeline({
          scrollTrigger: { trigger: '.lit-wrap', start: 'top 75%', end: 'bottom 45%', scrub: 0.6 },
        }).add(tl)
      })
      mm.add(MQ.motion, () => {
        const tiles = gsap.utils.toArray<HTMLElement>('.kpi')
        tiles.forEach((tile, i) => {
          const de = [
            { x: -60, y: 0 },
            { x: 0, y: 70 },
            { x: 0, y: -70 },
            { x: 60, y: 0 },
          ][i % 4]
          gsap.from(tile, {
            ...de,
            opacity: 0,
            duration: 1.1,
            ease: 'power3.out',
            delay: i * 0.06,
            scrollTrigger: { trigger: '.kpis', start: 'top 85%' },
          })
        })
        const formatos: Record<string, (v: number) => string> = {
          int: (v) => String(v),
          brl: (v) => moeda(v),
          pct: (v) => `${v}%`,
        }
        gsap.utils
          .toArray<HTMLElement>('.numbers [data-count]')
          .forEach((el) => contar(el, formatos[el.dataset.format ?? 'int'], 0, el.closest('.kpis') ?? el))
      })
    },
    { scope: raiz },
  )

  const kpis = [
    { rotulo: 'Contratos na carteira', valor: dados.total, formato: 'int', texto: String(dados.total) },
    { rotulo: 'Receita mensal', valor: dados.receita_mensal, formato: 'brl', texto: moeda(dados.receita_mensal) },
    {
      rotulo: 'Aluguel médio',
      valor: Math.round(dados.aluguel_medio ?? 0),
      formato: 'brl',
      texto: moeda(dados.aluguel_medio),
    },
    {
      rotulo: 'Confiança média da extração',
      valor: Math.round((dados.confianca_media ?? 0) * 100),
      formato: 'pct',
      texto: pct(dados.confianca_media),
    },
  ]

  return (
    <section ref={raiz} id="carteira" className="scene numbers" data-scene="numbers" aria-labelledby="carteira-titulo">
      <div className="layer depth-0" data-depth="0" aria-hidden="true">
        <div className="numbers-bg" />
      </div>
      <div className="layer depth-1" data-depth="1" aria-hidden="true">
        <div className="glow-blob glow-violet-soft" />
      </div>
      <div className="layer depth-2" data-depth="2" aria-hidden="true">
        <span className="ghost-text ghost-right">R$</span>
      </div>

      <div className="layer-flow depth-4 container" data-depth="4">
        <p className="eyebrow mono">03 · A carteira</p>
        <h2 id="carteira-titulo" className="sr-only">
          A carteira em números
        </h2>
        <div className="lit-wrap">
          <p className="lit-text">
            <span className="sr-only">{texto}</span>
            <span aria-hidden="true">
              {frase.map((p, i) => (
                <span key={i}>
                  <span className={`lit-word${p.destaque ? ' hot' : ''}`}>{p.t}</span>{' '}
                </span>
              ))}
            </span>
          </p>
        </div>

        <ul className="kpis">
          {kpis.map((k) => (
            <li key={k.rotulo} className="kpi">
              <span className="kpi-label mono">{k.rotulo}</span>
              <span className="kpi-value" data-count={k.valor} data-format={k.formato}>
                {k.texto}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
