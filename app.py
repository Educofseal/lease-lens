"""Interface web do lease-lens (Streamlit)."""
import sys
from pathlib import Path

# deixa o Python enxergar a pasta src/
sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

import tempfile
import streamlit as st
from extract import extrair_texto
from fields import extrair_campos
from store import conectar
from query import vencendo_em, resumo_carteira, com_problema

st.set_page_config(page_title="lease-lens", page_icon="📄", layout="wide")

st.title("📄 lease-lens")
st.caption("Transforma uma pasta de contratos de locação em respostas operacionais.")

con = conectar()

# ---------- PAINEL DA CARTEIRA ----------
st.header("Visão da carteira")

col1, col2, col3 = st.columns(3)
resumo = resumo_carteira(con)
col1.metric("Contratos", resumo["total"])
col2.metric("Aluguel médio", f"R$ {resumo['aluguel_medio']:.0f}")
col3.metric("Índices diferentes", len(resumo["por_indice"]))

st.subheader("⏰ Vencendo nos próximos 90 dias")
vencendo = vencendo_em(con, 90)
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

# ---------- UPLOAD ----------
st.header("Testar com um contrato")
st.caption("Suba um PDF de contrato e veja os campos extraídos na hora.")

arquivo = st.file_uploader("Escolha um PDF", type="pdf")
if arquivo:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(arquivo.read())
        caminho = tmp.name

    texto = extrair_texto(caminho)
    resultado = extrair_campos(texto)

    st.metric("Confiança da extração", f"{resultado['confianca'] * 100:.0f}%")
    st.json(resultado["campos"])

con.close()