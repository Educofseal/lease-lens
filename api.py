"""API HTTP do lease-lens (FastAPI). O frontend em web/ so conversa com ela."""
import sys
from contextlib import closing
from pathlib import Path

# deixa o Python enxergar a pasta src/
BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE / "src"))

import tempfile
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles
from extract import extrair_texto
from fields import extrair_campos
from store import conectar
from query import painel

CONTRACTS = BASE / "samples" / "contracts"
DIST = BASE / "web" / "dist"
LIMITE_UPLOAD = 10 * 1024 * 1024  # 10 MB

app = FastAPI(title="lease-lens", docs_url="/api/docs", openapi_url="/api/openapi.json")


@app.get("/api/carteira")
def visao_carteira(dias: int = 90):
    """Tudo que o painel precisa numa chamada so."""
    with closing(conectar()) as con:
        return painel(con, dias)


@app.get("/api/exemplos")
def listar_exemplos():
    """PDFs de exemplo que da pra testar sem ter um contrato em maos."""
    return sorted(p.name for p in CONTRACTS.glob("*.pdf"))


@app.post("/api/exemplos/{arquivo}/extrair")
def extrair_exemplo(arquivo: str):
    # so aceita nomes que existem na pasta de exemplos (nada de ../)
    if arquivo not in listar_exemplos():
        raise HTTPException(404, "Contrato de exemplo não encontrado.")
    return _extrair(CONTRACTS / arquivo, arquivo)


@app.post("/api/extrair")
async def extrair_upload(arquivo: UploadFile):
    conteudo = await arquivo.read(LIMITE_UPLOAD + 1)
    if len(conteudo) > LIMITE_UPLOAD:
        raise HTTPException(413, "O PDF passa de 10 MB.")
    if not conteudo.startswith(b"%PDF"):
        raise HTTPException(422, "O arquivo enviado não é um PDF.")

    with tempfile.TemporaryDirectory() as pasta:
        caminho = Path(pasta) / "contrato.pdf"
        caminho.write_bytes(conteudo)
        return _extrair(caminho, arquivo.filename or "contrato.pdf")


def _extrair(caminho, nome):
    try:
        texto = extrair_texto(caminho)
    except Exception:
        raise HTTPException(422, "Não consegui ler esse PDF.")
    resultado = extrair_campos(texto)
    return {"arquivo": nome, **resultado}


# em producao (depois do `npm run build`), a propria API serve o frontend
if DIST.exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="web")
