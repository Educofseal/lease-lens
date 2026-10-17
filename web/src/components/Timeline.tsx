/*
 * LINHA DO TEMPO — cada contrato como uma barra do início ao fim da vigência.
 * Técnicas: clip-path wipe esquerda→direita sincronizado com o scroll (scrub),
 * marcador "hoje" nascendo de cima, janela de 90 dias em destaque,
 * parallax na grade de anos (depth-2).
 */
import { useRef, type CSSProperties } from 'react'
import type { Carteira } from '../lib/api'
import { STATUS_ROTULO, dataIso, mesAno, moeda, paraData, semPdf, statusDe, type Status } from '../lib/format'
import { MQ, gsap, useGSAP } from '../lib/motion'

const DIA = 24 * 60 * 60 * 1000

export function Timeline({ dados }: { dados: Carteira }) {
  const raiz = useRef<HTMLElement>(null)
  const hoje = dataIso(dados.hoje)

  const linhas = dados.contratos
    .map((c) => ({
      c,
      ini: paraData(c.vigencia_inicio),
      fim: paraData(c.vigencia_fim),
      status: statusDe(c.dias_restantes, c.vigencia_inicio, hoje, dados.janela_dias),
    }))
    .filter((l): l is typeof l & { ini: Date; fim: Date } => !!l.ini && !!l.fim)
    .sort((a, b) => a.fim.getTime() - b.fim.getTime())
  const semDatas = dados.contratos.length - linhas.length

  const anoMin = Math.min(hoje.getFullYear(), ...linhas.map((l) => l.ini.getFullYear()))
  const anoMax = Math.max(hoje.getFullYear(), ...linhas.map((l) => l.fim.getFullYear())) + 1
  const t0 = new Date(anoMin, 0, 1).getTime()
  const t1 = new Date(anoMax, 0, 1).getTime()
  const pos = (t: number) => ((t - t0) / (t1 - t0)) * 100
  const anos = Array.from({ length: anoMax - anoMin }, (_, i) => anoMin + i)
  const xHoje = pos(hoje.getTime())
  const larguraJanela = pos(hoje.getTime() + dados.janela_dias * DIA) - xHoje

  const contagem = linhas.reduce<Record<Status, number>>(
    (acc, l) => ({ ...acc, [l.status]: acc[l.status] + 1 }),
    { vencido: 0, vencendo: 0, futuro: 0, ativo: 0 },
  )

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        gsap.from('.timeline .mask-line > span', {
          yPercent: 110,
          duration: 1,
          ease: 'power4.out',
          stagger: 0.1,
          scrollTrigger: { trigger: '.timeline .section-head', start: 'top 80%' },
        })
        gsap.fromTo(
          '.gantt-bar',
          { clipPath: 'inset(0% 100% 0% 0% round 999px)' },
          {
            clipPath: 'inset(0% 0% 0% 0% round 999px)',
            ease: 'none',
            stagger: 0.12,
            scrollTrigger: { trigger: '.gantt', start: 'top 78%', end: 'bottom 60%', scrub: 0.8 },
          },
        )
        gsap.from('.gantt-label', {
          x: -30,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.06,
          scrollTrigger: { trigger: '.gantt', start: 'top 78%' },
        })
        gsap.from('.gantt-today', {
          scaleY: 0,
          transformOrigin: 'top center',
          duration: 1.4,
          ease: 'power3.inOut',
          scrollTrigger: { trigger: '.gantt', start: 'top 70%' },
        })
        gsap.from('.gantt-window', {
          opacity: 0,
          duration: 1.2,
          delay: 0.6,
          scrollTrigger: { trigger: '.gantt', start: 'top 70%' },
        })
        gsap.to('.timeline .year-ghost', {
          yPercent: -12,
          ease: 'none',
          scrollTrigger: { trigger: raiz.current, start: 'top bottom', end: 'bottom top', scrub: true },
        })
      })
    },
    { scope: raiz },
  )

  return (
    <section
      ref={raiz}
      id="linha-do-tempo"
      className="scene timeline"
      data-scene="timeline"
      aria-labelledby="linha-titulo"
    >
      <div className="layer depth-0" data-depth="0" aria-hidden="true">
        <div className="timeline-bg" />
      </div>
      <div className="layer depth-1" data-depth="1" aria-hidden="true">
        <div className="glow-blob glow-teal-soft" />
      </div>
      <div className="layer depth-2" data-depth="2" aria-hidden="true">
        <span className="year-ghost">{hoje.getFullYear()}</span>
      </div>

      <div className="layer-flow depth-4 container" data-depth="4">
        <header className="section-head">
          <p className="eyebrow mono mask-line">
            <span>02 · Linha do tempo</span>
          </p>
          <h2 id="linha-titulo" className="display">
            <span className="mask-line">
              <span>Cada contrato,</span>
            </span>{' '}
            <span className="mask-line">
              <span>
                do início <em>ao fim.</em>
              </span>
            </span>
          </h2>
          <p className="lead">
            A faixa âmbar é a janela de {dados.janela_dias} dias a partir de hoje. Tudo que termina dentro dela entra
            na resposta acima.
          </p>
        </header>

        <ul className="legend" aria-label="Legenda">
          {(['vencendo', 'ativo', 'futuro', 'vencido'] as Status[]).map((s) => (
            <li key={s} className={`legend-item st-${s}`}>
              <i aria-hidden="true" />
              {STATUS_ROTULO[s]} <span className="mono muted">{contagem[s]}</span>
            </li>
          ))}
        </ul>

        <div className="gantt" style={{ '--x-hoje': `${xHoje}%` } as CSSProperties}>
          <div className="gantt-overlay" aria-hidden="true">
            {anos.map((a) => (
              <span key={a} className="gantt-year" style={{ left: `${pos(new Date(a, 0, 1).getTime())}%` }}>
                <b className="mono">{a}</b>
              </span>
            ))}
            <span className="gantt-window" style={{ left: `${xHoje}%`, width: `${larguraJanela}%` }} />
            <span className="gantt-today" style={{ left: `${xHoje}%` }}>
              <b className="mono">hoje</b>
            </span>
          </div>

          <ol className="gantt-rows">
            {linhas.map(({ c, ini, fim, status }) => {
              const esquerda = pos(ini.getTime())
              const largura = Math.max(pos(fim.getTime()) - esquerda, 0.8)
              return (
                <li key={c.arquivo} className={`gantt-row st-${status}`}>
                  <div className="gantt-label">
                    <span className="gantt-name">{c.locatario}</span>
                    <span className="mono muted">
                      {semPdf(c.arquivo)} · {c.indice_reajuste} · {moeda(c.aluguel)}
                    </span>
                  </div>
                  <div className="gantt-track" aria-hidden="true">
                    <span className="gantt-bar" style={{ left: `${esquerda}%`, width: `${largura}%` }}>
                      <span className="gantt-bar-text mono">
                        {mesAno(c.vigencia_inicio)} → {mesAno(c.vigencia_fim)}
                      </span>
                    </span>
                  </div>
                  <span className="sr-only">
                    {`${semPdf(c.arquivo)}, ${c.locatario}: de ${mesAno(c.vigencia_inicio)} a ${mesAno(c.vigencia_fim)}. ${STATUS_ROTULO[status]}.`}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        {semDatas > 0 && (
          <p className="muted note">
            {semDatas} contrato(s) ficaram de fora da linha do tempo porque a vigência não foi extraída.
          </p>
        )}
      </div>
    </section>
  )
}
