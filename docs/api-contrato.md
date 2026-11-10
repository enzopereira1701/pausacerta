# Contrato de dados do Pausa Certa

Como os dados andam do Node até o dashboard. Os nomes dos atributos são os mesmos no firmware, no `provisionar.sh`,
no Orion, no STH-Comet e no dashboard. **Mudou um, muda em todos.**

## 1. MQTT (Node ↔ IoT Agent), Ultralight 2.0

| Tópico | Sentido | Conteúdo |
|---|---|---|
| `/pausacerta/pcn001/attrs` | Node → nuvem | Telemetria, a cada 60 s e na hora em que algo muda |
| `/pausacerta/pcn001/cmd` | Nuvem → Node | Comando: `pcn001@<comando>\|<parâmetros>` |
| `/pausacerta/pcn001/cmdexe` | Node → nuvem | Resposta: `pcn001@<comando>\|ok` ou `\|erro` |

```
t|34.2|h|46.0|g|47.5|ic|37.5|ib|30.5|sol|true|st|CRITICO|msp|52|pz|3|ep|false|pr|true|me|0|ga|35|ta|31.0|aa|45|sa|REPOR|ts|2026-11-12T12:40:00-03:00|fw|0.2
```

| Chave | Atributo no Orion | Tipo | Significado |
|---|---|---|---|
| `t` | `temperatura_c` | Number | Temperatura do ar (°C) |
| `h` | `umidade_pct` | Number | Umidade relativa (%) |
| `g` | `globo_c` | Number | Temperatura de globo negro (°C) |
| `sol` | `solDireto` | Boolean | Sol direto no momento (LDR) |
| `ic` | `indiceCalor_c` | Number | Índice de calor da NOAA (°C); decide o estado |
| `ib` | `ibutgEstimado_c` | Number | IBUTG **estimado** (°C); só informativo |
| `st` | `estado` | Text | `NORMAL`, `ATENCAO`, `CRITICO`, `PERIGO` ou `FALHA_SENSOR` |
| `msp` | `minutosSemPausa` | Number | Minutos desde a última pausa válida |
| `pz` | `pausasHoje` | Number | Pausas válidas no dia |
| `ep` | `emPausa` | Boolean | A equipe está em pausa agora |
| `pr` | `pausaRecomendada` | Boolean | Passou do limite do regime sem pausa |
| `me` | `malEstarHoje` | Number | Ocorrências anônimas de mal-estar no dia |
| `ga` | `galao_pct` | Number | Nível do galão (%) |
| `ta` | `aguaTemp_c` | Number | Temperatura da água (°C) |
| `aa` | `aguaAcabaEmMin` | Number | Previsão de quando a água acaba (min); `-1` = sem previsão ainda |
| `sa` | `estadoAgua` | Text | `NORMAL`, `REPOR`, `ACABANDO`, `SEM_AGUA` ou `SEM_SENSOR` |
| `ts` | `timestamp` | DateTime | Hora da leitura no Node (−03:00); falta até o NTP sincronizar |
| `fw` | `firmware` | Text | Versão do firmware |

## 2. Comandos

| Comando | Parâmetros | Exemplo | Efeito |
|---|---|---|---|
| `setLimites` | ATENÇÃO, CRÍTICO, PERIGO (°C de índice de calor) | `27,32,41` | Faixas do estado |
| `setRegime` | pausa mínima (s), máx. sem pausa em ATENÇÃO (min), em CRÍTICO (min) | `300,90,50` | Quando acende "pausa recomendada" |
| `setGalao` | distância cheio (cm), distância vazio (cm), água quente (°C) | `5,45,30` | Cálculo do nível |
| `setIntervalo` | segundos | `60` | Envio periódico |
| `identify` | (vazio) | | Pisca o semáforo por 5 s |

Enviar pelo Orion (o IoT Agent repassa ao Node):

```bash
curl -X PATCH "http://localhost:1026/v2/entities/EquipeCampo:COL-CAM-07/attrs?type=EquipeCampo" \
  -H "fiware-service: pausacerta" -H "fiware-servicepath: /coleta" -H "Content-Type: application/json" \
  -d '{"setRegime":{"type":"command","value":"30,3,2"}}'
```

A resposta aparece na entidade como `setRegime_status` (`OK`) e `setRegime_info` (`ok`). Testado em 10/11/2026.

## 3. Entidade no Orion (NGSI-v2, `options=keyValues`)

`fiware-service: pausacerta` · `fiware-servicepath: /coleta`

```json
{
  "id": "EquipeCampo:COL-CAM-07", "type": "EquipeCampo",
  "temperatura_c": 34.2, "umidade_pct": 46, "globo_c": 47.5, "solDireto": true,
  "indiceCalor_c": 37.5, "ibutgEstimado_c": 30.5, "estado": "CRITICO",
  "minutosSemPausa": 52, "pausasHoje": 3, "emPausa": false, "pausaRecomendada": true, "malEstarHoje": 0,
  "galao_pct": 35, "aguaTemp_c": 31.0, "aguaAcabaEmMin": 45, "estadoAgua": "REPOR",
  "timestamp": "2026-11-12T12:40:00-03:00", "firmware": "0.2"
}
```

Este é o mesmo contrato combinado com Front-end, Web e Python (os grupos leem `EquipeCampo` do Orion).

## 4. Histórico (STH-Comet)

```
GET http://localhost:8666/STH/v1/contextEntities/type/EquipeCampo/id/EquipeCampo:COL-CAM-07/attributes/indiceCalor_c?lastN=60
```

Cada valor vem com `recvTime` em **UTC** (`2026-11-10T11:01:43.839Z` = 08:01 em Brasília) e `attrValue`. O dashboard converte para o horário local.

## 5. API do backend (para o dashboard)

O que o dashboard espera do backend. O simulador do navegador (`dashboard/src/services/mock.js`) já devolve exatamente isto;
o backend precisa devolver o mesmo. Todos os caminhos começam em `VITE_API_URL`. Erros: status 4xx/5xx com `{ "detail": "mensagem" }`.
Datas em ISO 8601.

| Método e caminho | Corpo | Resposta | Vem de |
|---|---|---|---|
| `GET /api/equipe` | | leitura atual (abaixo) | Orion |
| `GET /api/historico?periodo=1h` | | `{ "periodo", "pontos": [...] }` | STH-Comet |
| `GET /api/config` | | configuração e status dos comandos | memória do backend + Orion |
| `POST /api/comandos/{nome}` | `{ "valor": "300,90,50" }` | o envio, com `status: "PENDING"` | Orion |

`periodo`: `1h`, `turno` (8 h) ou `24h`. `nome`: `setLimites`, `setRegime`, `setGalao`, `setIntervalo` ou `identify`.

**`GET /api/equipe`**

```json
{
  "equipe": "COL-CAM-07", "entidade": "EquipeCampo:COL-CAM-07",
  "online": true, "ultimaLeitura": "2026-11-12T15:40:02.000Z",
  "pausaDesde": null, "identificando": false,
  "atual": { "...": "a entidade da seção 3, em keyValues" }
}
```

- `online`: houve leitura nos últimos 150 s (o Node envia a cada 60 s).
- `ultimaLeitura`: o `TimeInstant` da entidade.
- `pausaDesde` (opcional): quando `emPausa` virou `true`; o backend anota ao perceber a mudança. Com ele, o painel mostra o cronômetro.
- `identificando` (opcional): `true` nos 5 s depois de um `identify`.

**`GET /api/historico?periodo=turno`**: o backend busca cada atributo no STH-Comet (`lastN` ou `dateFrom`), junta pelo `recvTime`
(tolerância de 2 s, porque os atributos de um mesmo envio chegam com milissegundos de diferença) e devolve no máximo ~360 pontos:

```json
{ "periodo": "turno", "pontos": [
  { "t": "2026-11-12T15:40:02.000Z", "temperatura_c": 34.2, "umidade_pct": 46, "globo_c": 47.5, "indiceCalor_c": 37.5,
    "estado": "CRITICO", "emPausa": false, "minutosSemPausa": 52, "galao_pct": 35, "aguaTemp_c": 31.0 }
] }
```

**`GET /api/config`**: o Node não informa a própria configuração, então o backend guarda o último valor enviado de cada comando
(começa nos padrões do firmware) e lê o status no Orion (`<comando>_status`, `<comando>_info`):

```json
{
  "limites": [27, 32, 41], "regime": [300, 90, 50], "galao": [5, 45, 30], "intervalo": 60,
  "comandos": {
    "setRegime": { "valor": "30,3,2", "status": "OK", "info": "ok", "em": "2026-11-12T15:41:00.000Z", "confirmadoEm": "2026-11-12T15:41:02.000Z" }
  }
}
```

`status`: `PENDING` (enviado, esperando o Node), `OK` ou `ERROR`. Enquanto houver comando pendente, o dashboard consulta a cada 1,5 s.
