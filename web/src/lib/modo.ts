// Onde a página está rodando:
//  - 'api': FastAPI (api.py) ou Vite em dev
//  - 'streamlit': componente dentro do app.py
//  - 'estatico': GitHub Pages, tudo no navegador (build com VITE_MODO=estatico)
import { noStreamlit } from './streamlit'

export type Modo = 'api' | 'streamlit' | 'estatico'

export const modo: Modo = noStreamlit ? 'streamlit' : import.meta.env.VITE_MODO === 'estatico' ? 'estatico' : 'api'
