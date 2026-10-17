"""Camada de consulta: perguntas operacionais sobre a carteira."""
from datetime import date, datetime
from store import conectar


def _dias_ate(fim):
    """Dias entre hoje e o inicio do mes 'MM/AAAA'. None se a data for invalida."""
    if not fim:
        return None
    try:
        mes, ano = fim.split("/")
        data_fim = datetime(int(ano), int(mes), 1)
    except (ValueError, AttributeError):
        return None
    return (data_fim - datetime.today()).days


def vencendo_em(con, dias=90):
    """Contratos cuja vigencia_fim cai nos proximos N dias."""
    resultado = []
    for row in con.execute("SELECT arquivo, locatario, vigencia_fim FROM contratos"):
        arquivo, locatario, fim = row
        faltam = _dias_ate(fim)
        if faltam is not None and 0 <= faltam <= dias:
            resultado.append((arquivo, locatario, fim, faltam))
    return sorted(resultado, key=lambda x: x[3])


def carteira(con):
    """Todos os contratos, com os dias que faltam pro fim (negativo = ja venceu)."""
    cur = con.execute("""
        SELECT arquivo, locador, locatario, endereco, aluguel,
               vigencia_inicio, vigencia_fim, indice_reajuste, confianca
        FROM contratos
        ORDER BY arquivo
    """)
    colunas = [c[0] for c in cur.description]
    contratos = []
    for row in cur.fetchall():
        contrato = dict(zip(colunas, row))
        contrato["dias_restantes"] = _dias_ate(contrato["vigencia_fim"])
        contratos.append(contrato)
    return contratos


def resumo_carteira(con):
    """Aluguel medio e contagem por indice."""
    media = con.execute("SELECT AVG(aluguel) FROM contratos").fetchone()[0]
    total = con.execute("SELECT COUNT(*) FROM contratos").fetchone()[0]
    por_indice = con.execute("""
        SELECT indice_reajuste, COUNT(*), AVG(aluguel)
        FROM contratos
        GROUP BY indice_reajuste
        ORDER BY COUNT(*) DESC
    """).fetchall()
    return {"total": total, "aluguel_medio": media, "por_indice": por_indice}


def com_problema(con, limite=1.0):
    """Contratos com confianca abaixo do limite (extracao incompleta)."""
    return con.execute("""
        SELECT arquivo, confianca FROM contratos
        WHERE confianca < ?
        ORDER BY confianca ASC
    """, (limite,)).fetchall()


def painel(con, dias=90):
    """Tudo que a interface web precisa numa chamada so (API e Streamlit)."""
    resumo = resumo_carteira(con)
    contratos = carteira(con)
    alugueis = [c["aluguel"] for c in contratos if c["aluguel"] is not None]
    confiancas = [c["confianca"] for c in contratos if c["confianca"] is not None]
    return {
        "hoje": date.today().isoformat(),
        "janela_dias": dias,
        "total": resumo["total"],
        "aluguel_medio": resumo["aluguel_medio"],
        "receita_mensal": sum(alugueis),
        "confianca_media": sum(confiancas) / len(confiancas) if confiancas else None,
        "por_indice": [
            {"indice": i, "contratos": q, "aluguel_medio": m}
            for i, q, m in resumo["por_indice"]
        ],
        "vencendo": [
            {"arquivo": a, "locatario": loc, "vigencia_fim": f, "dias_restantes": d}
            for a, loc, f, d in vencendo_em(con, dias)
        ],
        "problemas": [{"arquivo": a, "confianca": c} for a, c in com_problema(con)],
        "contratos": contratos,
    }


if __name__ == "__main__":
    con = conectar()

    print("=" * 55)
    print("1. CONTRATOS VENCENDO NOS PROXIMOS 90 DIAS")
    print("=" * 55)
    vencendo = vencendo_em(con, 90)
    if vencendo:
        for arquivo, locatario, fim, faltam in vencendo:
            print(f"  {arquivo} | {locatario} | vence {fim} (em {faltam} dias)")
    else:
        print("  Nenhum contrato vence nesse periodo.")

    print("\n" + "=" * 55)
    print("2. RESUMO DA CARTEIRA")
    print("=" * 55)
    r = resumo_carteira(con)
    print(f"  Total de contratos: {r['total']}")
    print(f"  Aluguel medio: R$ {r['aluguel_medio']:.2f}")
    print("  Por indice de reajuste:")
    for indice, qtd, media in r["por_indice"]:
        print(f"    {indice}: {qtd} contrato(s), media R$ {media:.2f}")

    print("\n" + "=" * 55)
    print("3. CONTRATOS COM EXTRACAO INCOMPLETA")
    print("=" * 55)
    problemas = com_problema(con)
    if problemas:
        for arquivo, conf in problemas:
            print(f"  {arquivo}: confianca {conf * 100:.0f}%")
    else:
        print("  Nenhum. Todos extraidos com 100% de confianca.")

    con.close()