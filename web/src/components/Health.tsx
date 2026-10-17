/*
 * SAÚDE DA EXTRAÇÃO — o score de confiança, e o que ele NÃO garante.
 * Técnicas: anel de progresso desenhado no scroll, chips com stagger elástico,
 * curtain wipe (clip-path) no aviso honesto.
 */
import { useRef } from 'react'
import { CAMPOS, type Carteira } from '../lib/api'
import { capitalizar, extenso, pct, plural, semPdf } from '../lib/format'
import { MQ, gsap, useGSAP } from '../lib/motion'

const RAIO = 54
const CIRC = 2 * Math.PI * RAIO

export function Health({ dados }: { dados: Carteira }) {
  const raiz = useRef<HTMLElement>(null)
  const media = dados.confianca_media ?? 0
  const completos = dados.total - dados.problemas.length

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        gsap.from('.health .mask-line > span', {
          yPercent: 110,
          duration: 1,
          ease: 'power4.out',
          stagger: 0.1,
          scrollTrigger: { trigger: '.health .section-head', start: 'top 80%' },
        })
        gsap.from('.ring-progress', {
          strokeDashoffset: CIRC,
          duration: 1.8,
          ease: 'power3.inOut',
          scrollTrigger: { trigger: '.ring', start: 'top 80%' },
        })
        gsap.from('.field-chip', {
          scale: 0.4,
          opacity: 0,
          duration: 0.8,
          ease: 'back.out(2.4)',
          stagger: 0.06,
          scrollTrigger: { trigger: '.field-chips', start: 'top 88%' },
        })
        gsap.fromTo(
          '.caveat',
          { clipPath: 'inset(0% 0% 100% 0% round 28px)' },
          {
            clipPath: 'inset(0% 0% 0% 0% round 28px)',
            duration: 1.2,
            ease: 'power3.inOut',
            scrollTrigger: { trigger: '.caveat', start: 'top 85%' },
          },
        )
      })
    },
    { scope: raiz },
  )

  return (
    <section ref={raiz} id="extracao" className="scene health" data-scene="health" aria-labelledby="extracao-titulo">
      <div className="layer depth-0" data-depth="0" aria-hidden="true">
        <div className="health-bg" />
      </div>
      <div className="layer depth-1" data-depth="1" aria-hidden="true">
        <div className="glow-blob glow-teal-soft glow-left" />
      </div>
      <div className="layer depth-2" data-depth="2" aria-hidden="true">
        <span className="ghost-text">{pct(media)}</span>
      </div>

      <div className="layer-flow depth-4 container" data-depth="4">
        <header className="section-head">
          <p className="eyebrow mono mask-line">
            <span>05 · Extração</span>
          </p>
          <h2 id="extracao-titulo" className="display">
            <span className="mask-line">
              <span>Quanto dá pra</span>
            </span>{' '}
            <span className="mask-line">
              <span>
                <em>confiar</em> nisso.
              </span>
            </span>
          </h2>
        </header>

        <div className="health-grid">
          <div className="ring" role="img" aria-label={`Confiança média da extração: ${pct(media)}`}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="ring-track" cx="60" cy="60" r={RAIO} />
              <circle
                className="ring-progress"
                cx="60"
                cy="60"
                r={RAIO}
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - media)}
              />
            </svg>
            <span className="ring-value" aria-hidden="true">
              {pct(media)}
            </span>
            <span className="ring-caption mono" aria-hidden="true">
              confiança média
            </span>
          </div>

          <div className="health-copy">
            <p className="lead">
              {capitalizar(extenso(completos))} de {extenso(dados.total)}{' '}
              {plural(dados.total, 'contrato', 'contratos')} com os {CAMPOS.length} campos encontrados.
            </p>
            <ul className="field-chips" aria-label="Campos extraídos de cada contrato">
              {CAMPOS.map(([chave, rotulo]) => (
                <li key={chave} className="field-chip">
                  <span aria-hidden="true">✓</span> {rotulo}
                </li>
              ))}
            </ul>

            {dados.problemas.length > 0 && (
              <div className="problems">
                <h3>Extração incompleta</h3>
                <ol>
                  {dados.problemas.map((p) => (
                    <li key={p.arquivo}>
                      <span className="mono">{semPdf(p.arquivo)}</span>
                      <span className="problem-bar" aria-hidden="true">
                        <i style={{ transform: `scaleX(${p.confianca})` }} />
                      </span>
                      <span className="mono">{pct(p.confianca)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <aside className="caveat" aria-labelledby="caveat-titulo">
            <p className="mono caveat-tag">nota honesta</p>
            <h3 id="caveat-titulo">Confiança mede presença, não exatidão.</h3>
            <p>
              Um regex de endereço já parou no primeiro ponto e cortou o “Av.” — e a extração marcou 100% com o dado
              errado. Achar algo não é achar certo. O próximo passo é validar o conteúdo, não só a presença.
            </p>
          </aside>
        </div>
      </div>
    </section>
  )
}
