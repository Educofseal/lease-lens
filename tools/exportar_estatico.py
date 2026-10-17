"""Gera os dados do site estatico (GitHub Pages) a partir do banco.

Uso: python tools/exportar_estatico.py web/dist/data

Escreve carteira.json (campos de cada contrato, sem os dias restantes, que o
navegador calcula na data de quem visita) e copia os PDFs de exemplo.
"""
import json
import shutil
import sys
from contextlib import closing
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE / "src"))

from store import conectar
from query import carteira

CONTRACTS = BASE / "samples" / "contracts"


def main(destino):
    pasta_pdfs = destino / "contratos"
    pasta_pdfs.mkdir(parents=True, exist_ok=True)

    with closing(conectar()) as con:
        contratos = carteira(con)
    for contrato in contratos:
        contrato.pop("dias_restantes")

    pdfs = sorted(CONTRACTS.glob("*.pdf"))
    for pdf in pdfs:
        shutil.copy2(pdf, pasta_pdfs / pdf.name)

    dados = {"exemplos": [p.name for p in pdfs], "contratos": contratos}
    (destino / "carteira.json").write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK: {len(contratos)} contratos e {len(pdfs)} PDFs em {destino}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("uso: python tools/exportar_estatico.py <pasta de destino>")
    main(Path(sys.argv[1]))
