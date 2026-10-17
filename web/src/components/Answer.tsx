/*
 * A RESPOSTA — contratos da janela, por ordem de urgência.
 * Técnicas: top-down clip birth nos cartões (stagger), contagem regressiva
 * dos dias (90 → N), masked line reveal no título, ghost text no fundo.
 */
import { useRef } from 'react'
import type { Carteira, Contrato } from '../lib/api'
import { capitalizar, extenso, mesAno, moeda, plural, semPdf } from '../lib/format'
import { MQ, contar, gsap, useGSAP } from '../lib/motion'

function tom(dias: number) {
  if (dias <= 30) return 'tone-hot'
  if (dias <= 60) return 'tone-warm'
  return 'tone-calm'
}

export function Answer({ dados }: { dados: Carteira }) {
  const raiz = useRef<HTMLElement>(null)
  const porArquivo = new Map(dados.contratos.map((c) => [c.arquivo, c]))
  const vencidos = dados.contratos
    .filter((c) => (c.dias_restantes ?? 0) < 0)
    .sort((a, b) => (b.dias_restantes ?? 0) - (a.dias_restantes ?? 0))
  const n = dados.vencendo.length

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        gsap.from('.answer .mask-line > span', {
          yPercent: 110,
          duration: 1,
          ease: 'power4.out',
          stagger: 0.1,
          scrollTrigger: { trigger: '.answer-head', start: 'top 80%' },
        })
        gsap.utils.toArray<HTMLElement>('.urgent-card, .expired-card').forEach((card, i) => {
          gsap.fromTo(
            card,
            { clipPath: 'inset(0% 0% 100% 0% round 28px)', y: 40 },
            {
              clipPath: 'inset(0% 0% 0% 0% round 28px)',
              y: 0,
              duration: 1.1,
              delay: (i % 3) * 0.08,
              ease: 'power3.out',
              scrollTrigger: { trigger: card, start: 'top 88%' },
            },
          )
        })
        gsap.utils.toArray<HTMLElement>('.urgent-meter i').forEach((barra) => {
          gsap.from(barra, {
            scaleX: 0,
            duration: 1.4,
            ease: 'power3.out',
            scrollTrigger: { trigger: barra, start: 'top 90%' },
          })
        })
        gsap.utils.toArray<HTMLElement>('.answer [data-count]').forEach((el) => contar(el, String, dados.janela_dias))
        gsap.to('.answer .ghost-text', {
          xPercent: -18,
          ease: 'none',
          scrollTrigger: { trigger: raiz.current, start: 'top bottom', end: 'bottom top', scrub: true },
        })
      })
    },
    { scope: raiz },
  )

  const lead =
    n === 0
      ? `Nenhum contrato vence nos próximos ${dados.janela_dias} dias. A carteira está tranquila — por enquanto.`
      : `${capitalizar(extenso(n))} ${plural(n, 'contrato vence', 'contratos vencem')} nos próximos ${dados.janela_dias} dias. ` +
        `O mais urgente termina em ${dados.vencendo[0].dias_restantes} ${plural(dados.vencendo[0].dias_restantes, 'dia', 'dias')}.`

  return (
    <section ref={raiz} id="resposta" className="scene answer" data-scene="answer" aria-labelledby="resposta-titulo">
      <div className="layer depth-0" data-depth="0" aria-hidden="true">
        <div className="answer-bg" />
      </div>
      <div className="layer depth-1" data-depth="1" aria-hidden="true">
        <div className="glow-blob glow-amber-soft" />
      </div>
      <div className="layer depth-2" data-depth="2" aria-hidden="true">
        <span className="ghost-text">{dados.janela_dias} dias</span>
      </div>

      <div className="layer-flow depth-4 container" data-depth="4">
        <header className="answer-head section-head">
          <p className="eyebrow mono mask-line">
            <span>01 · A resposta</span>
          </p>
          <h2 id="resposta-titulo" className="display">
            <span className="mask-line">
              <span>Por ordem</span>
            </span>{' '}
            <span className="mask-line">
              <span>
                de <em>urgência.</em>
              </span>
            </span>
          </h2>
          <p className="lead">{lead}</p>
        </header>

        {n > 0 ? (
          <ol className="urgent-list">
            {dados.vencendo.map((v) => {
              const c = porArquivo.get(v.arquivo) as Contrato | undefined
              return (
                <li key={v.arquivo} className={`urgent-card ${tom(v.dias_restantes)}`}>
                  <div className="urgent-days">
                    <span className="num" data-count={v.dias_restantes}>
                      {v.dias_restantes}
                    </span>
                    <span className="unit">{plural(v.dias_restantes, 'dia', 'dias')}</span>
                  </div>
                  <div className="urgent-info">
                    <p className="urgent-name">{v.locatario ?? 'Locatário não identificado'}</p>
                    <p className="mono urgent-file">
                      {semPdf(v.arquivo)} · vence em {mesAno(v.vigencia_fim)}
                    </p>
                    {c && (
                      <dl className="urgent-facts">
                        <div>
                          <dt>Aluguel</dt>
                          <dd>{moeda(c.aluguel)}</dd>
                        </div>
                        <div>
                          <dt>Reajuste</dt>
                          <dd>{c.indice_reajuste ?? '—'}</dd>
                        </div>
                        <div>
                          <dt>Locador</dt>
                          <dd>{c.locador ?? '—'}</dd>
                        </div>
                        <div className="wide">
                          <dt>Imóvel</dt>
                          <dd>{c.endereco ?? '—'}</dd>
                        </div>
                      </dl>
                    )}
                  </div>
                  <div className="urgent-meter" aria-hidden="true">
                    <i style={{ transform: `scaleX(${1 - v.dias_restantes / dados.janela_dias})` }} />
                    <span className="mono">hoje</span>
                    <span className="mono">{dados.janela_dias} dias</span>
                  </div>
                </li>
              )
            })}
          </ol>
        ) : (
          <div className="calm-card">
            <p className="display-sm">Nada vence na janela.</p>
            <p>
              Volte a olhar daqui a algumas semanas — ou aumente a janela na API (<code>?dias=180</code>).
            </p>
          </div>
        )}

        {vencidos.length > 0 && (
          <div className="expired">
            <h3 className="expired-title">
              <span className="pill pill-hot mono">atenção</span>
              {capitalizar(extenso(vencidos.length))} {plural(vencidos.length, 'contrato já venceu', 'contratos já venceram')}{' '}
              e {plural(vencidos.length, 'continua', 'continuam')} na carteira
            </h3>
            <p className="muted">
              A consulta de vencimentos olha só para frente. Estes passaram da data e não têm renovação registrada.
            </p>
            <ul className="expired-list">
              {vencidos.map((c) => (
                <li key={c.arquivo} className="expired-card">
                  <span className="expired-days mono">
                    há {Math.abs(c.dias_restantes ?? 0)} {plural(Math.abs(c.dias_restantes ?? 0), 'dia', 'dias')}
                  </span>
                  <span className="expired-name">{c.locatario}</span>
                  <span className="mono muted">
                    {semPdf(c.arquivo)} · terminou em {mesAno(c.vigencia_fim)} · {moeda(c.aluguel)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
