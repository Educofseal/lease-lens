import { useCallback, useEffect, useState } from 'react'
import { buscarCarteira, type Carteira } from './lib/api'
import { ScrollTrigger, iniciarScrollSuave } from './lib/motion'
import { Hero } from './components/Hero'
import { Answer } from './components/Answer'
import { Timeline } from './components/Timeline'
import { Numbers } from './components/Numbers'
import { Indices } from './components/Indices'
import { Health } from './components/Health'
import { LiveTest } from './components/LiveTest'
import { Loader, Nav, Rodape, TelaErro } from './components/Chrome'

export function App() {
  const [dados, setDados] = useState<Carteira | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(() => {
    setErro(null)
    buscarCarteira()
      .then(setDados)
      .catch((e: Error) => setErro(e.message))
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => iniciarScrollSuave(), [])

  // as fontes mudam a altura do texto: remede os pins depois que carregam
  useEffect(() => {
    if (!dados) return
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
  }, [dados])

  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      {!erro && <Loader pronto={!!dados} />}
      {erro && <TelaErro mensagem={erro} tentar={carregar} />}
      {dados && (
        <>
          <Nav dados={dados} />
          <main id="conteudo">
            <Hero dados={dados} />
            <Answer dados={dados} />
            <Timeline dados={dados} />
            <Numbers dados={dados} />
            <Indices dados={dados} />
            <Health dados={dados} />
            <LiveTest />
          </main>
          <Rodape />
        </>
      )}
    </>
  )
}
