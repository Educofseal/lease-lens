/*
 * Moldura da página: navegação fixa com progresso de leitura, loader com
 * curtain lift, tela de erro e rodapé.
 */
import { useRef, useState } from 'react'
import type { Carteira } from '../lib/api'
import { dataCurta } from '../lib/format'
import { MQ, ScrollTrigger, gsap, irPara, prefereMenosMovimento, useGSAP } from '../lib/motion'
import { noStreamlit } from '../lib/streamlit'

const SECOES = [
  ['resposta', 'Resposta'],
  ['linha-do-tempo', 'Linha do tempo'],
  ['carteira', 'Carteira'],
  ['indices', 'Reajuste'],
  ['extracao', 'Extração'],
  ['testar', 'Testar'],
] as const

export function Marca() {
  return (
    <span className="brand-mark">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="14" cy="14" r="8" />
        <path d="M20 20 26 26" />
      </svg>
      lease<span className="brand-dot">·</span>lens
    </span>
  )
}

export function Nav({ dados }: { dados: Carteira }) {
  const raiz = useRef<HTMLElement>(null)
  const [ativa, setAtiva] = useState<string | null>(null)

  useGSAP(
    () => {
      // refreshPriority negativo: calcula depois dos pins das seções
      gsap.to('.nav-progress', {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { start: 0, end: 'max', scrub: prefereMenosMovimento() ? true : 0.3, refreshPriority: -1 },
      })
      SECOES.forEach(([id]) => {
        // elemento, não seletor: o scope do useGSAP limitaria a busca ao <header>
        const secao = document.getElementById(id)
        if (!secao) return
        ScrollTrigger.create({
          trigger: secao,
          start: 'top 45%',
          end: 'bottom 45%',
          refreshPriority: -1,
          onToggle: (self) => {
            if (self.isActive) setAtiva(id)
            else setAtiva((atual) => (atual === id ? null : atual))
          },
        })
      })
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        gsap.from('.nav', { yPercent: -120, duration: 1, ease: 'power3.out', delay: 1.6 })
      })
    },
    { scope: raiz },
  )

  return (
    <header ref={raiz} className="nav-shell">
      <div className="nav">
        <a
          className="brand"
          href="#topo"
          aria-label="lease-lens, voltar ao topo"
          onClick={(e) => {
            e.preventDefault()
            irPara('topo')
          }}
        >
          <Marca />
        </a>
        <nav aria-label="Seções">
          <ul className="nav-links">
            {SECOES.map(([id, rotulo]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={ativa === id ? 'is-active' : undefined}
                  aria-current={ativa === id ? 'location' : undefined}
                  onClick={(e) => {
                    e.preventDefault()
                    irPara(id)
                  }}
                >
                  {rotulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <span className="nav-date mono">
          <span className="dot" aria-hidden="true" /> {dataCurta(dados.hoje)}
        </span>
        <span className="nav-progress" aria-hidden="true" />
      </div>
    </header>
  )
}

export function Loader({ pronto }: { pronto: boolean }) {
  const raiz = useRef<HTMLDivElement>(null)
  const [saiu, setSaiu] = useState(false)

  useGSAP(
    () => {
      if (!pronto) return
      if (prefereMenosMovimento()) {
        setSaiu(true)
        return
      }
      gsap
        .timeline({ onComplete: () => setSaiu(true) })
        .to('.loader-bar i', { scaleX: 1, duration: 0.35, ease: 'power2.out' })
        .to(raiz.current, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.95, ease: 'power4.inOut' }, '+=0.05')
        .to('.loader-mark', { yPercent: -60, opacity: 0, duration: 0.6, ease: 'power3.in' }, '<')
    },
    { scope: raiz, dependencies: [pronto] },
  )

  if (saiu) return null
  return (
    <div ref={raiz} className="loader" role="status">
      <span className="loader-mark">
        <Marca />
      </span>
      <span className="loader-bar" aria-hidden="true">
        <i />
      </span>
      <span className="sr-only">Carregando a carteira…</span>
    </div>
  )
}

export function TelaErro({ mensagem, tentar }: { mensagem: string; tentar: () => void }) {
  return (
    <main id="conteudo" className="error-screen">
      <Marca />
      <h1>{noStreamlit ? 'Não consegui carregar a carteira.' : 'A API não respondeu.'}</h1>
      <p className="muted">{mensagem}</p>
      {!noStreamlit && (
        <>
          <p>Suba o backend na raiz do projeto e tente de novo:</p>
          <pre className="mono">
            <code>.venv\Scripts\python -m uvicorn api:app --port 8000</code>
          </pre>
        </>
      )}
      <button type="button" className="btn btn-primary" onClick={tentar}>
        Tentar de novo
      </button>
    </main>
  )
}

export function Rodape() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <Marca />
        <p className="muted">
          Contratos sintéticos, gerados por <code>tools/make_samples.py</code>. Nenhum dado real de ninguém.
        </p>
        <ul className="footer-stack mono" aria-label="Tecnologias">
          {['Python', 'pdfplumber', 'SQLite', 'FastAPI', 'React', 'GSAP'].map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="footer-links">
          <a href="https://github.com/Educofseal/lease-lens" target="_blank" rel="noreferrer">
            Código no GitHub
          </a>
          {!noStreamlit && (
            <>
              <span className="muted"> · </span>
              <a href="/api/docs">Documentação da API</a>
            </>
          )}
          <span className="muted"> · MIT</span>
        </p>
      </div>
    </footer>
  )
}
