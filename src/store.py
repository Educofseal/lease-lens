"""Camada de armazenamento: guarda os contratos extraidos num SQLite consultavel."""
import sqlite3
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
DB = BASE / "lease_lens.db"


def criar_tabela(con):
    con.execute("""
        CREATE TABLE IF NOT EXISTS contratos (
            arquivo TEXT PRIMARY KEY,
            locador TEXT,
            locatario TEXT,
            endereco TEXT,
            aluguel INTEGER,
            vigencia_inicio TEXT,
            vigencia_fim TEXT,
            indice_reajuste TEXT,
            confianca REAL
        )
    """)


def salvar(con, arquivo, campos, confianca):
    con.execute("""
        INSERT OR REPLACE INTO contratos
        (arquivo, locador, locatario, endereco, aluguel,
         vigencia_inicio, vigencia_fim, indice_reajuste, confianca)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        arquivo,
        campos.get("locador"),
        campos.get("locatario"),
        campos.get("endereco"),
        int(campos["aluguel"]) if campos.get("aluguel") else None,
        campos.get("vigencia_inicio"),
        campos.get("vigencia_fim"),
        campos.get("indice_reajuste"),
        confianca,
    ))


def conectar():
    con = sqlite3.connect(DB)
    criar_tabela(con)
    return con