# Pausa Certa Cloud (backend)

API em **FastAPI** que liga o dashboard de Edge ao FIWARE, no mesmo formato do backend do WineGuard. Ela existe por dois motivos:

1. O navegador não consegue chamar o Orion e o STH-Comet direto: eles exigem os cabeçalhos `fiware-service` e `fiware-servicepath` e não liberam CORS.
2. Assim só a porta da API precisa ficar aberta no Security Group; Orion (1026), STH-Comet (8666) e IoT Agent (4041) ficam fechados.

> **Status (10/11):** pronto e testado com 22 testes automáticos e com o dashboard ligado a um FIWARE de teste. Falta rodar com o FIWARE da AWS.

## Rotas

| Rota | O que faz | Vem de |
|---|---|---|
| `GET /api/equipe` | Leitura atual da equipe (estado, calor, pausas, água) e se o Node está online | Orion |
| `GET /api/historico?periodo=1h\|turno\|24h` | Histórico de todos os atributos, juntado por horário (máx. ~360 pontos) | STH-Comet |
| `GET /api/config` | Configuração confirmada pelo Node e o status do último envio de cada comando | memória do backend + Orion |
| `POST /api/comandos/{nome}` | Envia `setRegime`, `setLimites`, `setGalao`, `setIntervalo` ou `identify` | Orion → IoT Agent → Node |
| `GET /saude` | Confere se a API está no ar e para onde aponta | |

Formatos em [`../docs/api-contrato.md`](../docs/api-contrato.md) (seção 5). O dashboard usa exatamente essas rotas (`dashboard/src/services/api.js`).

**Como o comando é confirmado:** o backend manda o comando ao Orion, que repassa ao Node pelo IoT Agent. Quando o Node responde (`pcn001@setRegime|ok`),
o IoT Agent grava `setRegime_status = OK` e `setRegime_info = ok` na entidade. O backend compara com o que havia **antes** do envio, para não confundir
com a resposta de um envio anterior. Sem resposta em 30 s, o envio aparece como "sem resposta": o comando vai por MQTT sem fila e não chega se o Node estava sem sinal.

**Configuração:** o Node não informa os próprios limites e regime. O backend começa nos padrões do firmware e guarda o que o Node **confirmou**
num arquivo pequeno (`estado_backend.json`, fora do GitHub), que sobrevive a um reinício.

## Estrutura

```
backend/
├── app/
│   ├── main.py        rotas
│   ├── config.py      lê o .env
│   ├── fiware.py      pedidos ao Orion e ao STH-Comet
│   ├── dominio.py     regras sem rede: leitura, online, validação dos comandos, junção do histórico
│   └── memoria.py     configuração confirmada, envios de comando e início da pausa
├── tests/             22 testes (unittest), com um FIWARE de mentira
├── Dockerfile
├── requirements.txt
└── .env.example
```

## Rodar no computador

Na pasta `backend`, no Git Bash (Windows):

```bash
py -m venv .venv                      # cria o ambiente virtual (uma vez)
source .venv/Scripts/activate         # ativa (aparece "(.venv)" no começo da linha)
pip install -r requirements.txt       # instala as bibliotecas (uma vez)
cp .env.example .env                  # e edite o .env (FIWARE_HOST = IP da instância)
uvicorn app.main:app --reload --port 8001
```

Documentação interativa: <http://127.0.0.1:8001/docs>. Testes: `python -m unittest discover -s tests -v`.

Com o backend no computador, as portas **1026** e **8666** precisam estar abertas no Security Group (o backend chama o Orion e o STH-Comet de fora).
No dashboard: `VITE_USE_MOCK=false` e `VITE_API_URL=http://localhost:8001`.

## Rodar na instância (contêiner)

O `Dockerfile` desta pasta gera a imagem. Na instância ele sobe como o serviço `pausacerta-backend`, junto com o compose do FIWARE:

O código precisa estar em `~/pausacerta/backend` na instância (a pasta `~/pausacerta` já existe, com os scripts). Do seu computador, no Git Bash,
na pasta do projeto (troque a chave e o IP):

```bash
scp -i ~/Downloads/labsuser.pem -r backend ubuntu@<IP da instância>:~/pausacerta/
```

Depois, na instância:

```bash
cp ~/pausacerta/backend/.env.example ~/pausacerta/backend/.env
nano ~/pausacerta/backend/.env        # FIWARE_HOST=host.docker.internal e CORS_ORIGINS=*  (Ctrl+O, Enter, Ctrl+X)
```

Se ainda **não** existe `~/fiware/docker-compose.override.yml`:

```bash
cp ~/pausacerta/fiware/docker-compose.backend.yml ~/fiware/docker-compose.override.yml
```

Se ele já existe (o do WineGuard), cole o serviço `pausacerta-backend` de `fiware/docker-compose.backend.yml` dentro de `services:` desse arquivo. Depois:

```bash
cd ~/fiware && sudo docker compose up -d --build pausacerta-backend
sudo docker logs --tail 20 pausacerta-backend
curl http://localhost:8001/saude
```

- No Security Group, abra a porta **8001**. As portas 1026, 8666 e 4041 podem ficar fechadas: o contêiner usa `host.docker.internal`.
- `restart: unless-stopped`: depois de um novo *Start Lab* ele sobe sozinho.
- O IP da instância muda a cada sessão, mas o `.env` do backend **não** muda. Só o `VITE_API_URL` do dashboard muda.
- A porta é **8001** porque a 8000 já é do backend do WineGuard na mesma instância.

## Antes de usar com o Node

Rode de novo o `fiware/scripts/provisionar.sh` (versão de 10/11): a assinatura do STH-Comet agora guarda também `estado` e `emPausa`,
que o dashboard usa para pintar o turno e marcar as pausas. O script apaga e recria o cadastro sozinho; o histórico antigo continua no STH-Comet.
