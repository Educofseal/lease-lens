# lease-lens

> Passei um tempo cercado de contratos de locação numa operação imobiliária. A pergunta que mais se repetia era simples de fazer e chata de responder: "quais vencem esse trimestre?". Construí o lease-lens pra responder esse tipo de pergunta sozinho.

`Python` · `pdfplumber` · `SQLite` · `regex` · `FastAPI` · `React` · `GSAP`

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

Cada camada é isolada e testável sozinha — a extração não sabe que existe UI, a consulta não sabe que veio de PDF.

```
PDF ─► extract.py ─► fields.py ─► store.py (SQLite) ─► query.py ─► api.py (FastAPI) ─► web/ (React)
```

A interface web (`web/`, React + Vite + GSAP) só conversa com a API (`api.py`), que só chama as funções de consulta. A versão Streamlit (`app.py`) continua funcionando como alternativa enxuta.

A página conta a resposta como uma história de scroll: a pilha de contratos da carteira, a lente que lê a data de fim e a resposta nascendo de dentro dela. Depois vêm a linha do tempo de cada contrato, os números da carteira, os índices de reajuste, a saúde da extração e um laboratório para testar um PDF ao vivo. Respeita `prefers-reduced-motion` (sem pins, parallax nem loops) e funciona no celular.

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
```

**Interface web (desenvolvimento)**: dois terminais, com Node 20+:
```bash
uvicorn api:app --port 8000 --reload   # API
cd web && npm install && npm run dev   # frontend em http://localhost:5173
```

**Interface web (produção)**: a própria API serve o frontend compilado:
```bash
cd web && npm install && npm run build && cd ..
uvicorn api:app --port 8000            # abre em http://localhost:8000
```

A documentação da API fica em `/api/docs`. A interface Streamlit antiga continua disponível com `streamlit run app.py`.

## Licença
MIT