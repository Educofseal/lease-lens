"""Interface publica do lease-lens no Streamlit (lease-lens.streamlit.app).

Embute o frontend React (web/build) como componente: os dados da carteira
vao como argumento e a extracao dos PDFs roda aqui, em Python. Se o build
nao existir, cai na interface classica em Streamlit puro.
"""
import sys
from pathlib import Path

# deixa o Python enxergar a pasta src/
BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE / "src"))

import base64
import tempfile
from contextlib import closing
import streamlit as st
import streamlit.components.v1 as components
from extract import extrair_texto
from fields import extrair_campos
from store import conectar
from query import painel, vencendo_em, resumo_carteira

FRONT = BASE / "web" / "build"
CONTRACTS = BASE / "samples" / "contracts"
LIMITE_UPLOAD = 10 * 1024 * 1024  # 10 MB

# o frontend ocupa a tela toda: some o cabecalho e o padding do Streamlit
CSS_TELA_CHEIA = """
<style>
  header[data-testid="stHeader"], [data-testid="stDecoration"], footer { display: none !important; }
  .stApp, [data-testid="stAppViewContainer"], [data-testid="stMain"] { background: #07080c; }
  [data-testid="stMain"] { overflow: hidden; }
  [data-testid="stMainBlockContainer"], .block-container { padding: 0 !important; max-width: 100% !important; }
  [data-testid="stVerticalBlock"] { gap: 0 !important; }
  iframe[data-testid="stCustomComponentV1"] {
    display: block; width: 100% !important; border: 0;
    height: 100vh !important; height: 100dvh !important;
  }
</style>
"""


def exemplos():
    return sorted(p.name for p in CONTRACTS.glob("*.pdf"))


def extrair(conteudo, nome):
    with tempfile.TemporaryDirectory() as pasta:
        caminho = Path(pasta) / "contrato.pdf"
        caminho.write_bytes(conteudo)
        texto = extrair_texto(caminho)
    return {"arquivo": nome, **extrair_campos(texto)}


def atender(pedido):
    """Pedido de extracao vindo do frontend -> resposta com o mesmo nonce."""
    nonce = pedido.get("nonce")
    try:
        if pedido.get("tipo") == "exemplo":
            nome = pedido.get("arquivo", "")
            # so aceita nomes que existem na pasta de exemplos (nada de ../)
            if nome not in exemplos():
                raise ValueError("Contrato de exemplo não encontrado.")
            resultado = extrair((CONTRACTS / nome).read_bytes(), nome)
        else:
            conteudo = base64.b64decode(pedido.get("b64") or "")
            if len(conteudo) > LIMITE_UPLOAD:
                raise ValueError("O PDF passa de 10 MB.")
            if not conteudo.startswith(b"%PDF"):
                raise ValueError("O arquivo enviado não é um PDF.")
            resultado = extrair(conteudo, pedido.get("arquivo") or "contrato.pdf")
        return {"nonce": nonce, "resultado": resultado}
    except ValueError as erro:
        return {"nonce": nonce, "erro": str(erro)}
    except Exception:
        return {"nonce": nonce, "erro": "Não consegui ler esse PDF."}


def interface_web():
    st.html(CSS_TELA_CHEIA)
    lente = components.declare_component("lease_lens", path=str(FRONT))

    with closing(conectar()) as con:
        dados = painel(con)

    pedido = lente(
        carteira=dados,
        exemplos=exemplos(),
        extracao=st.session_state.get("extracao"),
        key="lease_lens",
        default=None,
    )

    # o valor do componente persiste entre reruns: o nonce evita reprocessar
    if pedido and pedido.get("nonce") != st.session_state.get("ultimo_nonce"):
        st.session_state["ultimo_nonce"] = pedido.get("nonce")
        st.session_state["extracao"] = atender(pedido)
        st.rerun()


def interface_classica():
    st.title("📄 lease-lens")
    st.caption("Transforma uma pasta de contratos de locação em respostas operacionais.")

    with closing(conectar()) as con:
        resumo = resumo_carteira(con)
        vencendo = vencendo_em(con, 90)

    st.header("Visão da carteira")
    col1, col2, col3 = st.columns(3)
    col1.metric("Contratos", resumo["total"])
    col2.metric("Aluguel médio", f"R$ {resumo['aluguel_medio']:.0f}")
    col3.metric("Índices diferentes", len(resumo["por_indice"]))

    st.subheader("⏰ Vencendo nos próximos 90 dias")
    if vencendo:
        st.dataframe(
            [{"Contrato": a, "Locatário": loc, "Vence": f, "Faltam (dias)": d}
             for a, loc, f, d in vencendo],
            use_container_width=True, hide_index=True,
        )
    else:
        st.info("Nenhum contrato vence nesse período.")

    st.subheader("📊 Aluguel médio por índice de reajuste")
    st.dataframe(
        [{"Índice": i, "Contratos": q, "Aluguel médio": f"R$ {m:.0f}"}
         for i, q, m in resumo["por_indice"]],
        use_container_width=True, hide_index=True,
    )

    st.header("Testar com um contrato")
    st.caption("Suba um PDF de contrato e veja os campos extraídos na hora.")
    arquivo = st.file_uploader("Escolha um PDF", type="pdf")
    if arquivo:
        resultado = extrair(arquivo.read(), arquivo.name)
        st.metric("Confiança da extração", f"{resultado['confianca'] * 100:.0f}%")
        st.json(resultado["campos"])


st.set_page_config(page_title="lease-lens", page_icon="🔍", layout="wide")

if (FRONT / "index.html").exists():
    interface_web()
else:
    interface_classica()
