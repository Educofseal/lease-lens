import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// em dev, o Vite repassa /api para o FastAPI (uvicorn api:app --port 8000)
export default defineConfig({
  plugins: [react()],
  // caminhos relativos: o mesmo build roda na raiz (FastAPI) e dentro do
  // componente do Streamlit, que serve os arquivos em /component/...
  base: './',
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
})
