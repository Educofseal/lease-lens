"""Camada de estruturacao: texto -> campos + score de confianca."""
import re


def _buscar(padrao, texto, grupo=1):
    """Aplica um regex. Retorna o trecho achado ou None."""
    achado = re.search(padrao, texto, re.IGNORECASE)
    if achado:
        return achado.group(grupo).strip()
    return None


def extrair_campos(texto):
    """Recebe o texto do contrato e devolve os campos + confianca."""
    campos = {}

    # cada campo: um padrao regex que descreve onde ele aparece no texto
    campos["locador"] = _buscar(r"instrumento,\s*(.+?),\s*LOCADOR", texto)
    campos["locatario"] = _buscar(r"e\s*(.+?),\s*LOCATARIO", texto)
    campos["endereco"] = _buscar(r"IMOVEL:\s*(.+)", texto)
    if campos["endereco"]:
        # a frase do contrato termina em ponto, que nao faz parte do endereco
        campos["endereco"] = campos["endereco"].rstrip(".")
    campos["aluguel"] = _buscar(r"ALUGUEL:\s*R\$\s*([\d.]+)", texto)
    campos["vigencia_inicio"] = _buscar(r"VIGENCIA:\s*de\s*([\d/]+)", texto)
    campos["vigencia_fim"] = _buscar(r"a\s*([\d/]+)\.", texto)
    campos["indice_reajuste"] = _buscar(r"indice\s*([A-Z\-]+)", texto)

    # confianca: quantos campos a gente conseguiu achar?
    achados = sum(1 for v in campos.values() if v is not None)
    total = len(campos)
    confianca = round(achados / total, 2)

    return {"campos": campos, "confianca": confianca}


if __name__ == "__main__":
    from pathlib import Path
    from extract import extrair_texto

    exemplo = Path(__file__).resolve().parent.parent / "samples" / "contracts" / "contrato_001.pdf"
    texto = extrair_texto(exemplo)
    resultado = extrair_campos(texto)

    print("CAMPOS EXTRAIDOS:")
    for chave, valor in resultado["campos"].items():
        print(f"  {chave:18} = {valor}")
    print(f"\nCONFIANCA: {resultado['confianca'] * 100:.0f}%")