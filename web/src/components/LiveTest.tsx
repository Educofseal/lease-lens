/*
 * TESTE AO VIVO — sobe um PDF (ou escolhe um exemplo) e vê os campos na hora.
 * Técnicas: lente varrendo a folha durante a leitura, scramble text nos valores
 * extraídos, linhas entrando em stagger, medidor de confiança em scaleX.
 */
import { useEffect, useRef, useState } from 'react'
import { CAMPOS, extrairExemplo, extrairPdf, listarExemplos, type Extracao } from '../lib/api'
import { moeda, pct, semPdf } from '../lib/format'
import { modo } from '../lib/modo'
import { MQ, embaralhar, gsap, prefereMenosMovimento, useGSAP } from '../lib/motion'

type Estado =
  | { fase: 'pronto' }
  | { fase: 'lendo'; nome: string }
  | { fase: 'ok'; r: Extracao; vez: number }
  | { fase: 'erro'; msg: string }

const espera = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

function valorExibido(chave: string, valor: string | null) {
  if (valor == null) return null
  return chave === 'aluguel' ? moeda(Number(valor)) : valor
}

function tomConfianca(c: number) {
  if (c >= 1) return 'tone-ok'
  if (c >= 0.7) return 'tone-warm'
  return 'tone-hot'
}

export function LiveTest() {
  const raiz = useRef<HTMLElement>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const [estado, setEstado] = useState<Estado>({ fase: 'pronto' })
  const [exemplos, setExemplos] = useState<string[]>([])
  const [arrastando, setArrastando] = useState(false)

  useEffect(() => {
    listarExemplos()
      .then(setExemplos)
      .catch(() => setExemplos([]))
  }, [])

  async function rodar(nome: string, pedido: () => Promise<Extracao>) {
    setEstado({ fase: 'lendo', nome })
    try {
      // segura a animação de leitura um instante, mesmo se a API for instantânea
      const [r] = await Promise.all([pedido(), espera(prefereMenosMovimento() ? 0 : 1200)])
      setEstado({ fase: 'ok', r, vez: Date.now() })
    } catch (e) {
      setEstado({ fase: 'erro', msg: e instanceof Error ? e.message : 'Algo deu errado na extração.' })
    }
  }

  function escolher(arquivo: File | undefined) {
    if (!arquivo) return
    const ehPdf = arquivo.type === 'application/pdf' || arquivo.name.toLowerCase().endsWith('.pdf')
    if (!ehPdf) {
      setEstado({ fase: 'erro', msg: 'Escolha um arquivo PDF.' })
      return
    }
    rodar(arquivo.name, () => extrairPdf(arquivo))
    if (entrada.current) entrada.current.value = ''
  }

  const resultado = estado.fase === 'ok' ? estado : null

  useGSAP(
    () => {
      if (!resultado) return
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        gsap.from('.result-row', { x: 24, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.07 })
        gsap.utils.toArray<HTMLElement>('[data-scramble]').forEach((el, i) => {
          embaralhar(el, el.dataset.scramble ?? '', 0.55).delay(0.1 + i * 0.07)
        })
        gsap.from('.result-meter i', { scaleX: 0, duration: 1.2, ease: 'power3.out', delay: 0.3 })
        gsap.from('.scan-stamp', { scale: 2.2, rotation: -24, opacity: 0, duration: 0.7, ease: 'back.out(2)', delay: 0.5 })
      })
    },
    { scope: raiz, dependencies: [resultado?.vez], revertOnUpdate: true },
  )

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        gsap.from('.livetest .mask-line > span', {
          yPercent: 110,
          duration: 1,
          ease: 'power4.out',
          stagger: 0.1,
          scrollTrigger: { trigger: '.livetest .section-head', start: 'top 80%' },
        })
        gsap.fromTo(
          '.lab',
          { clipPath: 'inset(10% 8% 10% 8% round 48px)', opacity: 0 },
          {
            clipPath: 'inset(0% 0% 0% 0% round 32px)',
            opacity: 1,
            duration: 1.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: '.lab', start: 'top 92%' },
          },
        )
      })
    },
    { scope: raiz },
  )

  const encontrados = resultado ? Object.values(resultado.r.campos).filter((v) => v != null).length : 0

  return (
    <section ref={raiz} id="testar" className="scene livetest" data-scene="livetest" aria-labelledby="testar-titulo">
      <div className="layer depth-0" data-depth="0" aria-hidden="true">
        <div className="livetest-bg" />
      </div>
      <div className="layer depth-1" data-depth="1" aria-hidden="true">
        <div className="glow-blob glow-amber-soft glow-bottom" />
      </div>
      <div className="layer depth-2" data-depth="2" aria-hidden="true">
        <span className="ghost-text">PDF</span>
      </div>

      <div className="layer-flow depth-4 container" data-depth="4">
        <header className="section-head">
          <p className="eyebrow mono mask-line">
            <span>06 · Ao vivo</span>
          </p>
          <h2 id="testar-titulo" className="display">
            <span className="mask-line">
              <span>Teste com</span>
            </span>{' '}
            <span className="mask-line">
              <span>
                um <em>contrato.</em>
              </span>
            </span>
          </h2>
          <p className="lead">Suba um PDF e veja os campos extraídos na hora, com o score de confiança da leitura.</p>
        </header>

        <div className="lab">
          <div className="lab-input">
            <label
              className={`dropzone${arrastando ? ' is-drag' : ''}${estado.fase === 'lendo' ? ' is-busy' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setArrastando(true)
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(e) => {
                e.preventDefault()
                setArrastando(false)
                escolher(e.dataTransfer.files[0])
              }}
            >
              <input
                ref={entrada}
                className="sr-only"
                type="file"
                accept="application/pdf,.pdf"
                disabled={estado.fase === 'lendo'}
                onChange={(e) => escolher(e.target.files?.[0])}
              />
              <svg className="drop-icon" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M14 6h14l10 10v26H14z" />
                <path d="M28 6v10h10" />
                <path d="M26 36V22m-6 6 6-6 6 6" />
              </svg>
              <strong>Arraste um PDF para cá</strong>
              <span className="muted">ou clique para escolher · até 10 MB</span>
              {modo === 'estatico' && (
                <span className="mono muted drop-privacy">lido aqui no navegador: o PDF não sai do seu computador</span>
              )}
            </label>

            {exemplos.length > 0 && (
              <div className="samples">
                <p className="mono muted" id="exemplos-rotulo">
                  sem PDF à mão? use um exemplo sintético
                </p>
                <ul className="sample-chips" aria-labelledby="exemplos-rotulo">
                  {exemplos.map((ex) => (
                    <li key={ex}>
                      <button
                        type="button"
                        className="sample-chip mono"
                        disabled={estado.fase === 'lendo'}
                        onClick={() => rodar(ex, () => extrairExemplo(ex))}
                      >
                        {semPdf(ex).replace('contrato_', '#')}
                        <span className="sr-only"> — extrair {ex}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="lab-output">
            <div className={`scan-sheet fase-${estado.fase}`} aria-hidden="true">
              <div className="scan-lines">
                {Array.from({ length: 11 }, (_, i) => (
                  <i key={i} className={i % 4 === 3 ? 'short' : ''} />
                ))}
              </div>
              <span className="scan-beam" />
              <span className="scan-lens" />
              {resultado && (
                <span key={resultado.vez} className={`scan-stamp mono ${tomConfianca(resultado.r.confianca)}`}>
                  lido · {pct(resultado.r.confianca)}
                </span>
              )}
            </div>

            <div className="result" aria-live="polite">
              {estado.fase === 'pronto' && (
                <p className="result-empty muted">
                  Os campos aparecem aqui: locador, locatário, endereço, aluguel, vigência e índice.
                </p>
              )}
              {estado.fase === 'lendo' && (
                <p className="result-status mono">
                  <span className="spinner" aria-hidden="true" /> Lendo {estado.nome}…
                </p>
              )}
              {estado.fase === 'erro' && (
                <p className="result-error" role="alert">
                  {estado.msg}
                </p>
              )}
              {resultado && (
                <div key={resultado.vez}>
                  <div className="result-top">
                    <p className="result-file mono">{resultado.r.arquivo}</p>
                    <p className={`result-score ${tomConfianca(resultado.r.confianca)}`}>
                      <strong>{pct(resultado.r.confianca)}</strong>
                      <span className="muted">
                        {' '}
                        de confiança · {encontrados} de {CAMPOS.length} campos
                      </span>
                    </p>
                    <span className={`result-meter ${tomConfianca(resultado.r.confianca)}`} aria-hidden="true">
                      <i style={{ transform: `scaleX(${resultado.r.confianca})` }} />
                    </span>
                  </div>
                  <dl className="result-fields">
                    {CAMPOS.map(([chave, rotulo]) => {
                      const valor = valorExibido(chave, resultado.r.campos[chave])
                      return (
                        <div key={chave} className={`result-row${valor == null ? ' is-missing' : ''}`}>
                          <dt className="mono">{rotulo}</dt>
                          <dd>
                            {valor == null ? (
                              'não encontrado'
                            ) : (
                              <span data-scramble={valor}>{valor}</span>
                            )}
                          </dd>
                        </div>
                      )
                    })}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
