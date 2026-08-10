# lease-lens

> Passei um tempo cercado de contratos de locação numa operação imobiliária. A pergunta que mais se repetia era simples de fazer e chata de responder: "quais vencem esse trimestre?". Construí o lease-lens pra responder esse tipo de pergunta sozinho.

`Python` · `pdfplumber` · `SQLite` · `Streamlit` · `regex`

---

## O que me fez construir
Numa carteira de contratos, a informação que importa está presa dentro de PDFs, cada um num modelo diferente. Responder "o que vence?", "qual o aluguel médio?", "qual contrato está com dado faltando?" virava trabalho manual, documento por documento. Eu já tinha vivido esse problema — quis ver se conseguia automatizá-lo.

## O que ele faz
Aponta pra uma pasta de contratos e responde perguntas operacionais sobre a **carteira inteira**:
- **O que vence nos próximos 90 dias** (ordenado por urgência)
- **Resumo da carteira**: aluguel médio, distribuição por índice de reajuste
- **Contratos com extração incompleta** (score de confiança baixo)

E deixa testar um contrato avulso: sobe o PDF, vê os campos extraídos na hora.

## Como funciona (pipeline em camadas)

Cada camada é isolada e testável sozinha — a extração não sabe que existe UI, a consulta não sabe que veio de PDF. A interface (Streamlit) só chama as funções de consulta.

## Decisões de design
- **Dados sintéticos por design**: um gerador (`tools/make_samples.py`) cria contratos fictícios + um gabarito JSON. Nenhum dado real de ninguém — e qualquer pessoa clona o repo e reproduz tudo.
- **Score de confiança por extração**: o sistema assume que a extração pode falhar e marca o quão confiante está, em vez de fingir perfeição.
- **SQLite com queries parametrizadas**: consulta agregada é problema de banco de dados; SQL analítico (`AVG`, `GROUP BY`) resolve, e as queries são seguras contra injection.

## O desafio que me prendeu
Um regex de endereço parava no primeiro ponto e truncava "Av." silenciosamente — a extração marcava 100% de confiança com o dado **errado**. Isso me ensinou que "achou algo" não é "achou certo", e que score de confiança precisa evoluir pra validar conteúdo, não só presença.

## O que aprendi
Extração de PDF na prática, regex para dados estruturados, modelagem em SQLite, SQL analítico, e arquitetura em camadas que separa domínio de interface.

## Limitações (honestas)
Feito para contratos sintéticos bem-formados. Contratos reais escaneados exigiriam OCR e tratamento de ruído — próximo passo natural (V2), junto de validação de conteúdo e detecção de cláusulas.

---

## Rodar local
```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt

python tools/make_samples.py  # gera contratos sintéticos
python src/pipeline.py        # extrai e salva no banco
streamlit run app.py          # abre a interface
```

## Licença
MIT