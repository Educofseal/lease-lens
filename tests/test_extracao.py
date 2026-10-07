"""Testes da extracao contra o gabarito dos contratos sinteticos."""
import json
import sys
from pathlib import Path

import pytest

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE / "src"))

from extract import extrair_texto  # noqa: E402
from fields import extrair_campos  # noqa: E402

PDFS = sorted((BASE / "samples" / "contracts").glob("*.pdf"))


@pytest.mark.parametrize("pdf", PDFS, ids=lambda p: p.stem)
def test_campos_batem_com_gabarito(pdf):
    gabarito = json.loads((BASE / "samples" / "expected" / f"{pdf.stem}.json").read_text(encoding="utf-8"))
    resultado = extrair_campos(extrair_texto(pdf))

    for campo, valor in resultado["campos"].items():
        assert str(valor) == str(gabarito[campo]), campo
    assert resultado["confianca"] == 1.0


def test_endereco_nao_trunca_em_abreviacao():
    texto = "IMOVEL: Av. Brasil, 10 - Suzano/SP."
    assert extrair_campos(texto)["campos"]["endereco"] == "Av. Brasil, 10 - Suzano/SP"


def test_campo_ausente_baixa_confianca():
    resultado = extrair_campos("contrato sem nenhum campo reconhecivel")
    assert resultado["confianca"] == 0
