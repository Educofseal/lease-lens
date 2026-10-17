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

**Ao vivo: [educofseal.github.io/lease-lens](https://educofseal.github.io/lease-lens/)**

A interface web (`web/`, React + Vite + GSAP) é a mesma em três lugares:
- **GitHub Pages (site publicado):** estático e sempre no ar. A cada push, um GitHub Action roda o pipeline Python e exporta a carteira para JSON. As contas de vencimento rodam no navegador, na data de quem visita. O PDF enviado no laboratório é lido no próprio navegador ([pdf.js](https://mozilla.github.io/pdf.js/) + `web/src/lib/campos.ts`, espelho dos regex do `fields.py`) e não sai do computador.
- **API (`api.py`, FastAPI):** a extração roda no Python do servidor.
- **Streamlit (`app.py`, [lease-lens.streamlit.app](https://lease-lens.streamlit.app)):** o frontend roda como componente e o PDF volta para o Python. Sem o build em `web/build`, cai na interface Streamlit clássica.

Como a extração existe em duas linguagens, o CI confere as duas contra o mesmo gabarito (`samples/expected`) antes de publicar: `tools/checar_gabarito.py` (Python) e `web/scripts/gabarito.ts` (navegador). Se uma divergir, o deploy não acontece.

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

A documentação da API fica em `/api/docs`.

**Versão Streamlit** (a mesma do site publicado):
```bash
streamlit run app.py
```

**Site estático** (o mesmo do GitHub Pages):
```bash
cd web && VITE_MODO=estatico npm run build && cd ..
python tools/exportar_estatico.py web/dist/data
python -m http.server 4173 --directory web/dist
```

**Gabaritos** (Python e navegador):
```bash
python tools/checar_gabarito.py
cd web && node scripts/gabarito.ts
```

## Deploy
- **GitHub Pages** (principal): o `.github/workflows/pages.yml` publica sozinho a cada push na `main`. Ele roda o pipeline, os dois gabaritos, o build estático e a exportação dos dados.
- **Streamlit Community Cloud**: publica o `app.py` direto da `main`. Como o Streamlit Cloud não roda `npm`, o build do componente fica versionado em `web/build`. Depois de mexer no frontend, rode `npm run build:streamlit` dentro de `web/` e commite o resultado.
- **Docker / Render** (alternativa): o `Dockerfile` compila o frontend e sobe a API servindo tudo numa porta só (usa o `requirements-api.txt`, mais enxuto). O `render.yaml` descreve um web service gratuito no [Render](https://render.com).

## Licença
MIT