"""Pipeline: le todos os contratos, extrai e salva no banco."""
from pathlib import Path
from extract import extrair_texto
from fields import extrair_campos
from store import conectar

BASE = Path(__file__).resolve().parent.parent
CONTRACTS = BASE / "samples" / "contracts"


def main():
    con = conectar()
    pdfs = sorted(CONTRACTS.glob("*.pdf"))
    print(f"Processando {len(pdfs)} contratos...")

    for pdf in pdfs:
        texto = extrair_texto(pdf)
        resultado = extrair_campos(texto)
        salvar_no_banco(con, pdf.name, resultado)

    con.commit()
    con.close()
    print(f"OK: {len(pdfs)} contratos salvos no banco.")


def salvar_no_banco(con, nome, resultado):
    from store import salvar
    salvar(con, nome, resultado["campos"], resultado["confianca"])


if __name__ == "__main__":
    main()