"""Gerador de contratos de locacao SINTETICOS (ficticios)."""
import json
import random
from datetime import datetime
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

BASE = Path(__file__).resolve().parent.parent
CONTRACTS = BASE / "samples" / "contracts"
EXPECTED = BASE / "samples" / "expected"

NOMES = ["Ana Souza", "Bruno Lima", "Carla Dias", "Diego Alves",
         "Elena Rocha", "Felipe Costa", "Gabriela Nunes",
         "Henrique Melo", "Isabela Cruz", "Joao Pereira"]
RUAS = ["Rua das Palmeiras", "Av. Brasil", "Rua XV de Novembro",
        "Av. Paulista", "Rua do Sol", "Rua Ipe Amarelo"]
CIDADES = ["Sao Paulo/SP", "Suzano/SP", "Rio de Janeiro/RJ",
           "Belo Horizonte/MG", "Curitiba/PR"]
INDICES = ["IGP-M", "IPCA", "INPC"]


def gerar_contrato(num, vence_logo=False):
    locador = random.choice(NOMES)
    locatario = random.choice([n for n in NOMES if n != locador])
    rua = random.choice(RUAS)
    numero = random.randint(1, 1999)
    cidade = random.choice(CIDADES)
    endereco = rua + ", " + str(numero) + " - " + cidade
    aluguel = random.choice([1200, 1500, 1800, 2200, 2500, 3000, 3500])

    if vence_logo:
        # forca o termino dentro dos proximos ~90 dias (pra demo)
        hoje = datetime.today()
        mes_fim = ((hoje.month - 1 + random.choice([1, 2, 3])) % 12) + 1
        ano_fim = hoje.year + (1 if hoje.month + 2 > 12 else 0)
        fim = f"{mes_fim:02d}/{ano_fim}"
        # inicio: uns 2 anos antes do fim
        inicio = f"{mes_fim:02d}/{ano_fim - 2}"
    else:
        meses = random.choice([12, 24, 30, 36])
        ano = random.choice([2025, 2026, 2027])
        mes = random.randint(1, 12)
        inicio = f"{mes:02d}/{ano}"
        total = (ano * 12 + (mes - 1)) + meses
        fim = f"{(total % 12) + 1:02d}/{total // 12}"
    indice = random.choice(INDICES)
    caucao = aluguel * random.choice([1, 2, 3])
    return {
        "id": num,
        "locador": locador,
        "locatario": locatario,
        "endereco": endereco,
        "aluguel": aluguel,
        "vigencia_inicio": inicio,
        "vigencia_fim": fim,
        "indice_reajuste": indice,
        "caucao": caucao,
    }


def escrever_pdf(dados, caminho):
    c = canvas.Canvas(str(caminho), pagesize=A4)
    altura = A4[1]
    estado = {"y": altura - 3 * cm}

    def linha(texto, tamanho=11, salto=0.7):
        c.setFont("Helvetica", tamanho)
        c.drawString(2.5 * cm, estado["y"], texto)
        estado["y"] -= salto * cm

    linha("CONTRATO DE LOCACAO RESIDENCIAL", 14, 1.2)
    linha("Pelo presente instrumento, " + dados["locador"] + ", LOCADOR,")
    linha("e " + dados["locatario"] + ", LOCATARIO, ajustam:")
    linha("1. IMOVEL: " + dados["endereco"] + ".")
    linha("2. VALOR DO ALUGUEL: R$ " + str(dados["aluguel"]) + ",00 mensais.")
    linha("3. VIGENCIA: de " + dados["vigencia_inicio"] + " a " + dados["vigencia_fim"] + ".")
    linha("4. REAJUSTE: anual, pelo indice " + dados["indice_reajuste"] + ".")
    linha("5. CAUCAO: R$ " + str(dados["caucao"]) + ",00.")
    linha("E por estarem justos e contratados, assinam.", 10)
    c.save()


def main(quantidade=8):
    CONTRACTS.mkdir(parents=True, exist_ok=True)
    EXPECTED.mkdir(parents=True, exist_ok=True)
    for i in range(1, quantidade + 1):
        dados = gerar_contrato(i, vence_logo=(i <= 2))
        nome = f"contrato_{i:03d}"
        escrever_pdf(dados, CONTRACTS / (nome + ".pdf"))
        texto = json.dumps(dados, indent=2, ensure_ascii=False)
        (EXPECTED / (nome + ".json")).write_text(texto, encoding="utf-8")
    print("OK: " + str(quantidade) + " contratos gerados")
    print("OK: gabaritos salvos")


if __name__ == "__main__":
    main()