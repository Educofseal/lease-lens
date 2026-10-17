"""Confere a extracao (src/fields.py) contra o gabarito em samples/expected.

O web/scripts/gabarito.ts faz o mesmo teste com a versao do navegador:
as duas tem que bater com o mesmo gabarito.
"""
import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE / "src"))

from extract import extrair_texto
from fields import extrair_campos

CONTRACTS = BASE / "samples" / "contracts"
EXPECTED = BASE / "samples" / "expected"


def main():
    falhas = 0
    pdfs = sorted(CONTRACTS.glob("*.pdf"))
    for pdf in pdfs:
        esperado = json.loads((EXPECTED / f"{pdf.stem}.json").read_text(encoding="utf-8"))
        campos = extrair_campos(extrair_texto(pdf))["campos"]
        erros = [
            f"{chave}: esperado {str(esperado[chave])!r}, veio {valor!r}"
            for chave, valor in campos.items()
            if str(esperado[chave]) != valor
        ]
        falhas += len(erros)
        print(f"{pdf.name}: {'FALHOU' if erros else 'ok'}")
        for erro in erros:
            print(f"  {erro}")

    if falhas:
        print(f"\n{falhas} campo(s) diferentes do gabarito.")
        sys.exit(1)
    print(f"\nPython: {len(pdfs)} contratos batem com o gabarito.")


if __name__ == "__main__":
    main()
