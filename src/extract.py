"""Camada de extracao: PDF -> texto puro."""
import pdfplumber


def extrair_texto(caminho_pdf):
    """Abre um PDF e devolve todo o texto dele como string."""
    partes = []
    with pdfplumber.open(caminho_pdf) as pdf:
        for pagina in pdf.pages:
            texto = pagina.extract_text()
            if texto:
                partes.append(texto)
    return "\n".join(partes)


# teste rapido: roda direto pra ver o texto de um contrato
if __name__ == "__main__":
    from pathlib import Path
    exemplo = Path(__file__).resolve().parent.parent / "samples" / "contracts" / "contrato_001.pdf"
    texto = extrair_texto(exemplo)
    print("=" * 50)
    print(texto)
    print("=" * 50)