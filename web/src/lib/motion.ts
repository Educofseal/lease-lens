// GSAP + ScrollTrigger + Lenis num lugar só. Toda animação passa por aqui.
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/** Media queries usadas com gsap.matchMedia(): sem motion, nada de pin/parallax. */
export const MQ = {
  motion: '(prefers-reduced-motion: no-preference)',
  reduced: '(prefers-reduced-motion: reduce)',
  desktop: '(prefers-reduced-motion: no-preference) and (min-width: 900px)',
  fino: '(prefers-reduced-motion: no-preference) and (pointer: fine)',
}

export const prefereMenosMovimento = () => window.matchMedia(MQ.reduced).matches

let lenis: Lenis | null = null

/** Scroll suave (Lenis) ligado ao ticker do GSAP. Desligado com reduced motion. */
export function iniciarScrollSuave() {
  if (prefereMenosMovimento()) return () => {}
  lenis = new Lenis({ duration: 1.15, smoothWheel: true })
  lenis.on('scroll', ScrollTrigger.update)
  const tick = (tempo: number) => lenis?.raf(tempo * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  return () => {
    gsap.ticker.remove(tick)
    lenis?.destroy()
    lenis = null
  }
}

/** Rola até uma seção e leva o foco do teclado junto. */
export function irPara(id: string) {
  const alvo = document.getElementById(id)
  if (!alvo) return
  if (lenis) lenis.scrollTo(alvo, { offset: -72 })
  else alvo.scrollIntoView({ behavior: prefereMenosMovimento() ? 'auto' : 'smooth' })
  const foco = alvo.querySelector<HTMLElement>('h2, h1') ?? alvo
  foco.setAttribute('tabindex', '-1')
  foco.focus({ preventScroll: true })
}

/** Conta um número de `de` até o valor final quando o elemento entra na tela. */
export function contar(el: HTMLElement, formatar: (v: number) => string, de = 0, gatilho: Element = el) {
  const ate = Number(el.dataset.count)
  if (Number.isNaN(ate)) return
  const estado = { v: de }
  el.textContent = formatar(de)
  gsap.to(estado, {
    v: ate,
    duration: 1.6,
    ease: 'power3.out',
    onUpdate: () => {
      el.textContent = formatar(Math.round(estado.v))
    },
    scrollTrigger: { trigger: gatilho, start: 'top 85%', once: true },
  })
}

const GLIFOS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/$-.'

/** Scramble: o texto embaralha e vai se resolvendo da esquerda pra direita. */
export function embaralhar(el: HTMLElement, final: string, duracao = 0.7) {
  const estado = { p: 0 }
  return gsap.to(estado, {
    p: 1,
    duration: duracao,
    ease: 'none',
    onUpdate: () => {
      const fixos = Math.floor(estado.p * final.length)
      let saida = final.slice(0, fixos)
      for (let i = fixos; i < final.length; i++) {
        saida += final[i] === ' ' ? ' ' : GLIFOS[Math.floor(Math.random() * GLIFOS.length)]
      }
      el.textContent = saida
    },
    onComplete: () => {
      el.textContent = final
    },
  })
}

export { gsap, ScrollTrigger, useGSAP }
