"""Avaliacao: compara a extracao com o gabarito e mede a precisao por campo."""
import json
from pathlib import Path
from extract import extrair_texto
from fields import extrair_campos

BASE = Path(__file__).resolve().parent.parent
CONTRACTS = BASE / "samples" / "contracts"
EXPECTED = BASE / "samples" / "expected"


def avaliar():
    """Devolve {campo: (acertos, total)} e a lista de erros encontrados."""
    placar = {}
    erros = []
    for pdf in sorted(CONTRACTS.glob("*.pdf")):
        gabarito = json.loads((EXPECTED / f"{pdf.stem}.json").read_text(encoding="utf-8"))
        campos = extrair_campos(extrair_texto(pdf))["campos"]
        for campo, valor in campos.items():
            certo = valor is not None and str(valor) == str(gabarito[campo])
            acertos, total = placar.get(campo, (0, 0))
            placar[campo] = (acertos + certo, total + 1)
            if not certo:
                erros.append((pdf.name, campo, valor, gabarito[campo]))
    return placar, erros


def main():
    placar, erros = avaliar()
    print("PRECISAO POR CAMPO (extraido == gabarito):")
    for campo, (acertos, total) in placar.items():
        print(f"  {campo:18} {acertos}/{total}")
    acertos = sum(a for a, _ in placar.values())
    total = sum(t for _, t in placar.values())
    print(f"\nTOTAL: {acertos}/{total} campos corretos ({acertos / total * 100:.0f}%)")
    for nome, campo, achado, esperado in erros:
        print(f"  {nome} | {campo}: achou {achado!r}, esperado {esperado!r}")


if __name__ == "__main__":
    main()
