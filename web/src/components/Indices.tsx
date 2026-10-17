/*
 * ÍNDICES DE REAJUSTE — como a carteira se distribui entre IPCA, INPC e IGP-M.
 * Técnicas: barra de proporção com clip wipe por segmento, bleed typography
 * (nome do índice gigante vazando do cartão), skew + elastic bounce nos cartões.
 */
import { useRef, type CSSProperties } from 'react'
import type { Carteira } from '../lib/api'
import { corIndice, moeda, plural } from '../lib/format'
import { MQ, gsap, useGSAP } from '../lib/motion'

export function Indices({ dados }: { dados: Carteira }) {
  const raiz = useRef<HTMLElement>(null)
  const total = dados.por_indice.reduce((s, i) => s + i.contratos, 0) || 1
  const resumo = dados.por_indice
    .map((i) => `${i.indice ?? 'sem índice'} ${Math.round((i.contratos / total) * 100)}%`)
    .join(', ')

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        gsap.from('.indices .mask-line > span', {
          yPercent: 110,
          duration: 1,
          ease: 'power4.out',
          stagger: 0.1,
          scrollTrigger: { trigger: '.indices .section-head', start: 'top 80%' },
        })
        gsap.fromTo(
          '.share-seg',
          { clipPath: 'inset(0% 100% 0% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 0.9,
            ease: 'power3.inOut',
            stagger: 0.18,
            scrollTrigger: { trigger: '.share-bar', start: 'top 85%' },
          },
        )
        gsap.from('.index-card', {
          y: 90,
          skewY: 6,
          opacity: 0,
          duration: 1.3,
          ease: 'elastic.out(1, 0.8)',
          stagger: 0.12,
          scrollTrigger: { trigger: '.index-cards', start: 'top 85%' },
        })
        gsap.utils.toArray<HTMLElement>('.index-bleed').forEach((el) => {
          gsap.fromTo(
            el,
            { xPercent: 8 },
            {
              xPercent: -8,
              ease: 'none',
              scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
            },
          )
        })
      })
    },
    { scope: raiz },
  )

  return (
    <section ref={raiz} id="indices" className="scene indices" data-scene="indices" aria-labelledby="indices-titulo">
      <div className="layer depth-0" data-depth="0" aria-hidden="true">
        <div className="indices-bg" />
      </div>
      <div className="layer depth-1" data-depth="1" aria-hidden="true">
        <div className="glow-blob glow-sky-soft" />
      </div>
      <div className="layer depth-2" data-depth="2" aria-hidden="true">
        <div className="indices-rings" />
      </div>

      <div className="layer-flow depth-4 container" data-depth="4">
        <header className="section-head">
          <p className="eyebrow mono mask-line">
            <span>04 · Reajuste</span>
          </p>
          <h2 id="indices-titulo" className="display">
            <span className="mask-line">
              <span>Como a carteira</span>
            </span>{' '}
            <span className="mask-line">
              <span>
                se <em>reajusta.</em>
              </span>
            </span>
          </h2>
          <p className="lead">
            Quantos contratos seguem cada índice, e quanto eles pagam em média. É a conta que define o impacto do
            próximo reajuste.
          </p>
        </header>

        <div className="share-bar" role="img" aria-label={`Distribuição por índice: ${resumo}`}>
          {dados.por_indice.map((i) => (
            <span
              key={i.indice ?? 'sem'}
              className="share-seg"
              style={{ flexGrow: i.contratos, background: corIndice(i.indice) }}
            >
              <b className="mono">{Math.round((i.contratos / total) * 100)}%</b>
            </span>
          ))}
        </div>

        <ul className="index-cards">
          {dados.por_indice.map((i) => (
            <li key={i.indice ?? 'sem'} className="index-card" style={{ '--c': corIndice(i.indice) } as CSSProperties}>
              <span className="index-bleed" aria-hidden="true">
                {i.indice ?? '—'}
              </span>
              <h3 className="index-name">{i.indice ?? 'Sem índice'}</h3>
              <p className="index-count">
                <strong>{i.contratos}</strong> {plural(i.contratos, 'contrato', 'contratos')}
                <span className="muted"> · {Math.round((i.contratos / total) * 100)}% da carteira</span>
              </p>
              <p className="index-avg">
                <span className="mono muted">aluguel médio</span>
                <span className="index-money">{moeda(i.aluguel_medio)}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
