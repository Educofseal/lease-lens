"""Roda a extracao em TODOS os contratos e mostra a confianca de cada um."""
from pathlib import Path
from extract import extrair_texto
from fields import extrair_campos

BASE = Path(__file__).resolve().parent.parent
CONTRACTS = BASE / "samples" / "contracts"


def main():
    pdfs = sorted(CONTRACTS.glob("*.pdf"))
    print(f"Processando {len(pdfs)} contratos...\n")

    total_confianca = 0
    for pdf in pdfs:
        texto = extrair_texto(pdf)
        resultado = extrair_campos(texto)
        conf = resultado["confianca"]
        total_confianca += conf

        # marca com X os campos que falharam
        faltando = [k for k, v in resultado["campos"].items() if v is None]
        aviso = "" if not faltando else f"  <- faltou: {', '.join(faltando)}"
        print(f"{pdf.name}: {conf * 100:.0f}%{aviso}")

    media = total_confianca / len(pdfs) * 100
    print(f"\nCONFIANCA MEDIA: {media:.0f}%")


if __name__ == "__main__":
    main()