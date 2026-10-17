/*
 * HERO — "Quais vencem esse trimestre?"
 * Técnicas (catálogo epic-design):
 *  - 6 camadas de profundidade (depth-0..5) + parallax de mouse por camada
 *  - Split converge no título (metades entram pelos lados) e diverge no scroll
 *  - Elastic drop nas folhas de contrato + float loop contínuo
 *  - Pinned scrub timeline: folhas se espalham (scatter) e a lente abre um
 *    circle iris que revela a resposta — o "zoom" para dentro do dado
 *  - Masked line reveal no texto da resposta
 */
import { useRef, type CSSProperties } from 'react'
import type { Carteira, Contrato } from '../lib/api'
import { capitalizar, extenso, mesAno, moeda, plural, semPdf } from '../lib/format'
import { MQ, gsap, irPara, useGSAP } from '../lib/motion'

const GIROS = [-7, 5, -3.5, 6.5, -5.5, 3, -2, 1.5, -4, 4]
const FATOR: Record<string, number> = { '0': 0.1, '1': 0.25, '2': 0.5, '3': 0.8, '5': 1.2 }

// partículas com posições fixas (pseudoaleatórias, mas iguais a cada render)
const PARTICULAS = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7) % 100,
  s: 2 + ((i * 7) % 5),
  d: -((i * 1.7) % 6),
}))

function maisUrgente(dados: Carteira): Contrato {
  const porArquivo = new Map(dados.contratos.map((c) => [c.arquivo, c]))
  const primeiro = dados.vencendo[0] && porArquivo.get(dados.vencendo[0].arquivo)
  if (primeiro) return primeiro
  const futuros = dados.contratos
    .filter((c) => (c.dias_restantes ?? -1) >= 0)
    .sort((a, b) => (a.dias_restantes ?? 0) - (b.dias_restantes ?? 0))
  return futuros[0] ?? dados.contratos[0]
}

function Folha({ c, topo }: { c: Contrato; topo: boolean }) {
  return (
    <div className={`sheet${topo ? ' is-top' : ''}`}>
      <div className="sheet-head">
        <span>Contrato de locação</span>
        <span className="mono">{semPdf(c.arquivo).replace('contrato_', 'nº ')}</span>
      </div>
      <div className="sheet-lines">
        <i />
        <i />
        <i className="short" />
      </div>
      <dl className="sheet-fields">
        <div>
          <dt>Locatário</dt>
          <dd>{c.locatario ?? '—'}</dd>
        </div>
        <div>
          <dt>Aluguel</dt>
          <dd>{moeda(c.aluguel)}</dd>
        </div>
        <div className="hl">
          <span className="hl-mark" />
          <dt>Vigência</dt>
          <dd>
            {c.vigencia_inicio} a {c.vigencia_fim}
          </dd>
        </div>
        <div>
          <dt>Reajuste</dt>
          <dd>{c.indice_reajuste ?? '—'}</dd>
        </div>
      </dl>
      <div className="sheet-lines">
        <i />
        <i />
        <i />
        <i className="short" />
      </div>
      <div className="sheet-sign">
        <span />
        <span />
      </div>
    </div>
  )
}

export function Hero({ dados }: { dados: Carteira }) {
  const raiz = useRef<HTMLElement>(null)

  const topo = maisUrgente(dados)
  const folhas = [...dados.contratos.filter((c) => c.arquivo !== topo.arquivo), topo]
  const n = dados.vencendo.length
  const vencidos = dados.contratos.filter((c) => (c.dias_restantes ?? 0) < 0).length
  const primeiro = dados.vencendo[0]

  const chips = [
    { t: moeda(topo.aluguel), pos: 'c1' },
    { t: topo.indice_reajuste ?? 'índice', pos: 'c2' },
    { t: `fim ${topo.vigencia_fim}`, pos: 'c3' },
    { t: topo.locatario ?? '', pos: 'c4' },
  ]

  useGSAP(
    () => {
      const el = raiz.current!
      const lado = (alvo: Element) => ((alvo.closest('.w') as HTMLElement)?.dataset.lado === 'e' ? -1 : 1)
      const mm = gsap.matchMedia()

      mm.add(MQ.motion, () => {
        // ── INTRO (uma vez, no carregamento) ──────────────────────────────
        gsap
          .timeline({ delay: 0.5, defaults: { ease: 'power4.out' } })
          .from('.hero-title .w-i', {
            x: (_i: number, alvo: Element) => lado(alvo) * window.innerWidth * 0.5,
            opacity: 0,
            duration: 1.5,
            stagger: 0.07,
          })
          .from(
            '.sheet',
            {
              y: -180,
              rotation: () => gsap.utils.random(-16, 16),
              opacity: 0,
              duration: 1.5,
              ease: 'elastic.out(1, 0.72)',
              stagger: 0.07,
            },
            0.1,
          )
          .from('.hero-eyebrow, .hero-sub, .hero-cta', { y: 26, opacity: 0, duration: 1, stagger: 0.09 }, 0.55)
          .from('.lens-inner', { scale: 0.3, opacity: 0, duration: 1.1, ease: 'back.out(1.8)' }, 1.05)
          .from('.sheet.is-top .hl-mark', { scaleX: 0, duration: 0.9, ease: 'power2.inOut' }, 1.35)
          .from('.chip', { scale: 0, opacity: 0, duration: 0.8, ease: 'back.out(2.2)', stagger: 0.1 }, 1.3)
          .from('.scroll-cue', { opacity: 0, y: 12, duration: 0.8 }, 1.8)

        // ── SCRUB PINADO: scatter + circle iris a partir da lente ─────────
        const lente = el.querySelector<HTMLElement>('.lens')!
        const centro = () => {
          // offsets ignoram transforms (intro, parallax), então a medida é estável
          let x = lente.offsetWidth / 2
          let y = lente.offsetHeight / 2
          let no: HTMLElement | null = lente
          while (no && no !== el) {
            x += no.offsetLeft
            y += no.offsetTop
            no = no.offsetParent as HTMLElement | null
          }
          return { x, y }
        }
        const raioFinal = () => Math.hypot(window.innerWidth, window.innerHeight) * 1.05
        const angulo = (i: number, total: number) => (i / total) * Math.PI * 2 + 0.6

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            // no celular o hero pode passar da altura da tela: pina quando o fim dele chega
            start: () => (el.offsetHeight > window.innerHeight + 1 ? 'bottom bottom' : 'top top'),
            end: () => `+=${window.innerHeight * 2.2}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        })

        tl.to(
          '.hero-title .w',
          {
            x: (_i: number, alvo: Element) => lado(alvo) * window.innerWidth * 0.65,
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            stagger: 0.02,
          },
          0,
        )
          .to('.hero-eyebrow, .hero-sub, .hero-cta, .scroll-cue', { y: -50, opacity: 0, duration: 0.2 }, 0)
          .to(
            '.sheet-orbit',
            {
              x: (i: number, _a: Element, todos: Element[]) => Math.cos(angulo(i, todos.length)) * window.innerWidth * 0.7,
              y: (i: number, _a: Element, todos: Element[]) => Math.sin(angulo(i, todos.length)) * window.innerHeight * 0.75,
              rotation: (i: number) => (i % 2 ? 1 : -1) * (24 + i * 4),
              scale: 1.18,
              opacity: 0,
              duration: 0.45,
              ease: 'power2.in',
              stagger: { each: 0.012, from: 'end' },
            },
            0.04,
          )
          .to(
            '.chip-orbit',
            {
              x: (i: number) => [-1, 1, 1, -1][i % 4] * window.innerWidth * 0.35,
              y: (i: number) => [-1, -1, 1, 1][i % 4] * window.innerHeight * 0.3,
              opacity: 0,
              duration: 0.35,
              ease: 'power2.in',
            },
            0.02,
          )
          .to('.lens-rings', { scale: 2.4, opacity: 0, duration: 0.45, ease: 'power2.in' }, 0.05)
          .to('.lens', { scale: 5, opacity: 0, duration: 0.42, ease: 'power2.in' }, 0.16)
          .fromTo(
            '.lens-reveal',
            { clipPath: () => `circle(0px at ${centro().x}px ${centro().y}px)` },
            {
              clipPath: () => `circle(${raioFinal()}px at ${centro().x}px ${centro().y}px)`,
              duration: 0.42,
              ease: 'power2.in',
            },
            0.16,
          )
          .to('.hero-grid', { scale: 1.3, opacity: 0.35, duration: 0.6 }, 0)
          .to('.hero-particles', { yPercent: -30, duration: 0.6 }, 0)
          .from('.reveal-line > span', { yPercent: 115, duration: 0.18, stagger: 0.05, ease: 'power3.out' }, 0.5)
          .from('.reveal-ghost', { scale: 0.6, opacity: 0, duration: 0.3, ease: 'power3.out' }, 0.48)
          .to({}, { duration: 0.22 })
      })

      // ── PARALLAX DE MOUSE (só com ponteiro fino) ────────────────────────
      mm.add(MQ.fino, () => {
        const camadas = gsap.utils
          .toArray<HTMLElement>('[data-depth]', el)
          .filter((c) => c.dataset.depth! in FATOR)
          .map((c) => ({
            f: FATOR[c.dataset.depth!],
            x: gsap.quickTo(c, 'x', { duration: 0.9, ease: 'power3' }),
            y: gsap.quickTo(c, 'y', { duration: 0.9, ease: 'power3' }),
          }))
        const giroY = gsap.quickTo('.stack', 'rotationY', { duration: 1.1, ease: 'power3' })
        const giroX = gsap.quickTo('.stack', 'rotationX', { duration: 1.1, ease: 'power3' })
        const mover = (e: PointerEvent) => {
          const nx = e.clientX / window.innerWidth - 0.5
          const ny = e.clientY / window.innerHeight - 0.5
          camadas.forEach(({ f, x, y }) => {
            x(nx * 46 * f)
            y(ny * 32 * f)
          })
          giroY(nx * 12)
          giroX(-ny * 9)
        }
        el.addEventListener('pointermove', mover)
        return () => el.removeEventListener('pointermove', mover)
      })
    },
    { scope: raiz },
  )

  const frase =
    n === 0
      ? 'Nenhum contrato vence nos próximos 90 dias.'
      : `${capitalizar(extenso(n))} ${plural(n, 'contrato vence', 'contratos vencem')} nos próximos ${dados.janela_dias} dias.`

  return (
    <section ref={raiz} className="scene hero" data-scene="hero" id="topo" aria-labelledby="hero-titulo">
      {/* DEPTH 0 — grade de planta + vinheta */}
      <div className="layer depth-0" data-depth="0" aria-hidden="true">
        <div className="hero-grid" />
        <div className="hero-vignette" />
      </div>

      {/* DEPTH 1 — brilhos atmosféricos */}
      <div className="layer depth-1" data-depth="1" aria-hidden="true">
        <div className="glow-blob glow-amber" />
        <div className="glow-blob glow-teal" />
      </div>

      {/* DEPTH 2 — anéis da lente + campos extraídos orbitando a pilha */}
      <div className="layer depth-2 stage-align" data-depth="2" aria-hidden="true">
        <div className="orbit-box">
          <svg className="lens-rings" viewBox="0 0 200 200">
            <g className="rings-spin">
              <circle cx="100" cy="100" r="98" />
              <circle cx="100" cy="100" r="80" strokeDasharray="1 5" />
              <circle cx="100" cy="100" r="62" />
            </g>
          </svg>
          {chips.map((c) => (
            <span key={c.pos} className={`chip-orbit ${c.pos}`}>
              <span className="chip float-loop">{c.t}</span>
            </span>
          ))}
        </div>
      </div>

      {/* DEPTH 3 — a estrela: a pilha de contratos da carteira */}
      <div className="layer depth-3 stage-align hero-stage" data-depth="3">
        <figure
          className="stack"
          role="img"
          aria-label={`Pilha com os ${dados.total} contratos da carteira. No topo, ${semPdf(topo.arquivo)}, de ${topo.locatario}, com vigência até ${mesAno(topo.vigencia_fim)}.`}
        >
          <div className="stack-inner" aria-hidden="true">
            {folhas.map((c, i) => (
              <div
                key={c.arquivo}
                className="sheet-slot"
                style={
                  {
                    '--k': folhas.length - 1 - i,
                    '--r': `${i === folhas.length - 1 ? -1.5 : GIROS[i % GIROS.length]}deg`,
                    '--i': i,
                  } as CSSProperties
                }
              >
                <div className="sheet-orbit">
                  <div className="sheet-float">
                    <Folha c={c} topo={i === folhas.length - 1} />
                  </div>
                </div>
              </div>
            ))}
            <div className="lens">
              <div className="lens-float">
                <div className="lens-inner">
                  <span className="lens-handle" />
                  <span className="lens-glass">
                    <span className="lens-zoom">
                      <small>fim da vigência</small>
                      <b>{topo.vigencia_fim}</b>
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </figure>
      </div>

      {/* DEPTH 4 — texto e chamadas */}
      <div className="layer depth-4 hero-copy" data-depth="4">
        <div className="hero-copy-inner">
          <p className="hero-eyebrow mono">
            <span className="dot" /> {dados.total} contratos lidos · hoje é {dados.hoje.split('-').reverse().join('/')}
          </p>
          <h1 id="hero-titulo" className="hero-title">
            <span className="sr-only">Quais vencem esse trimestre?</span>
            <span aria-hidden="true">
              <span className="line">
                <span className="w" data-lado="e">
                  <span className="w-i">Quais</span>
                </span>{' '}
                <span className="w" data-lado="e">
                  <span className="w-i">vencem</span>
                </span>
              </span>
              <span className="line">
                <span className="w" data-lado="d">
                  <span className="w-i">esse</span>
                </span>{' '}
                <span className="w" data-lado="d">
                  <em className="w-i">trimestre?</em>
                </span>
              </span>
            </span>
          </h1>
          <p className="hero-sub">
            Aponte para uma pasta de contratos de locação. O lease-lens lê cada PDF, extrai os campos e responde as
            perguntas que tomavam a tarde inteira.
          </p>
          <div className="hero-cta">
            <a
              className="btn btn-primary"
              href="#resposta"
              onClick={(e) => {
                e.preventDefault()
                irPara('resposta')
              }}
            >
              Ver a resposta
              <span aria-hidden="true">↓</span>
            </a>
            <a
              className="btn btn-ghost"
              href="#testar"
              onClick={(e) => {
                e.preventDefault()
                irPara('testar')
              }}
            >
              Testar um contrato
            </a>
          </div>
        </div>
      </div>

      {/* DEPTH 5 — poeira em primeiro plano */}
      <div className="layer depth-5" data-depth="5" aria-hidden="true">
        <div className="hero-particles">
          {PARTICULAS.map((p, i) => (
            <span
              key={i}
              className="particle float-loop"
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, animationDelay: `${p.d}s` }}
            />
          ))}
        </div>
      </div>

      <div className="scroll-cue mono" aria-hidden="true">
        <span>role para a resposta</span>
        <i />
      </div>

      {/* Iris: abre a partir da lente. Decorativo — a seção #resposta repete o conteúdo. */}
      <div className="lens-reveal" aria-hidden="true">
        {primeiro && <span className="reveal-ghost">{primeiro.dias_restantes}</span>}
        <div className="reveal-inner">
          <p className="reveal-line eyebrow-line mono">
            <span>Próximos {dados.janela_dias} dias</span>
          </p>
          <p className="reveal-line reveal-big">
            <span>{frase}</span>
          </p>
          {primeiro && (
            <p className="reveal-line reveal-sub mono">
              <span>
                {semPdf(primeiro.arquivo)} · {primeiro.locatario} · em {primeiro.dias_restantes}{' '}
                {plural(primeiro.dias_restantes, 'dia', 'dias')}
              </span>
            </p>
          )}
          {vencidos > 0 && (
            <p className="reveal-line reveal-warn mono">
              <span>
                + {vencidos} {plural(vencidos, 'já venceu e segue', 'já venceram e seguem')} na carteira
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
