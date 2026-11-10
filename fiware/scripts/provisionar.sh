#!/usr/bin/env bash
# ============================================================
# provisionar.sh - Pausa Certa (GS 2026.2)
# Cadastra no FIWARE o service group, o dispositivo (Pausa Certa Node) ligado
# a entidade EquipeCampo e a assinatura do historico no STH-Comet.
# Adaptado do provisionar.sh do WineGuard.
#
# Rode DENTRO da maquina onde o FIWARE esta (usa localhost).
#
# Uso:
#   bash provisionar.sh [service] [servicepath] [apikey] [numero] [equipe]
#
# Exemplo:
#   bash provisionar.sh                                   # pausacerta /coleta pausacerta 001 COL-CAM-07
#
# Cada empresa de coleta = um "service"; cada garagem/regiao = um "servicepath";
# cada caminhao/equipe = um Node (pcn<numero>) ligado a entidade EquipeCampo:<equipe>.
#
# IMPORTANTE: o dispositivo e cadastrado COM a apikey (licao do WineGuard). Sem ela,
# o IoT Agent cria um dispositivo novo sozinho, sem o mapeamento t -> temperatura_c etc.
# ============================================================

SERVICE="${1:-pausacerta}"
SERVICEPATH="${2:-/coleta}"
APIKEY="${3:-pausacerta}"
NUM="${4:-001}"
EQUIPE="${5:-COL-CAM-07}"

DEVICE_ID="pcn${NUM}"
ENTITY="EquipeCampo:${EQUIPE}"
ENTITY_AUTO="EquipeCampo:${DEVICE_ID}"   # nome que o IoT Agent criaria sozinho
IOTA="http://localhost:4041"
ORION="http://localhost:1026"

H1="fiware-service: ${SERVICE}"
H2="fiware-servicepath: ${SERVICEPATH}"

post() {
  local url="$1" body="$2" resp code text
  resp=$(curl -sS -w "\n%{http_code}" -X POST "$url" \
    -H "$H1" -H "$H2" -H "Content-Type: application/json" -d "$body")
  code=$(echo "$resp" | tail -n1)
  text=$(echo "$resp" | sed '$d')
  echo "   -> HTTP ${code}"
  if [ "$code" != "201" ] && [ -n "$text" ]; then echo "   ${text}"; fi
}

del() {
  curl -s -o /dev/null -w "%{http_code}" -X DELETE "$1" -H "$H1" -H "$H2"
}

echo "Empresa (service):        ${SERVICE}"
echo "Garagem (servicepath):    ${SERVICEPATH}"
echo "Apikey:                   ${APIKEY}"
echo "Dispositivo:              ${DEVICE_ID}  ->  ${ENTITY}"
echo

echo "0/4 Limpando cadastros antigos..."
for i in 1 2 3 4; do
  code=$(del "${IOTA}/iot/devices/${DEVICE_ID}")
  echo "   dispositivo ${DEVICE_ID}: HTTP ${code}"
  [ "$code" = "404" ] && break
done
echo "   entidade ${ENTITY}: HTTP $(del "${ORION}/v2/entities/${ENTITY}?type=EquipeCampo")"
echo "   entidade ${ENTITY_AUTO}: HTTP $(del "${ORION}/v2/entities/${ENTITY_AUTO}?type=EquipeCampo")"

SUBS=$(curl -s "${ORION}/v2/subscriptions?limit=100" -H "$H1" -H "$H2" | python3 -c '
import sys, json
try:
    for s in json.load(sys.stdin):
        if str(s.get("description", "")).startswith("Historico Pausa Certa"):
            print(s["id"])
except Exception:
    pass')
for id in $SUBS; do
  echo "   assinatura ${id}: HTTP $(del "${ORION}/v2/subscriptions/${id}")"
done
echo

echo "1/4 Criando service group..."
post "${IOTA}/iot/services" "{\"services\":[{\"apikey\":\"${APIKEY}\",\"cbroker\":\"http://fiware-orion:1026\",\"entity_type\":\"EquipeCampo\",\"resource\":\"/iot/d\"}]}"

echo "2/4 Criando dispositivo ${DEVICE_ID} (com apikey)..."
# Nomes iguais ao contrato de dados EquipeCampo (secao 9 do dossie).
# Node A (calor), Node B (pausas) e Node C (agua) no mesmo dispositivo (firmware 0.2).
post "${IOTA}/iot/devices" "{\"devices\":[{\"device_id\":\"${DEVICE_ID}\",\"apikey\":\"${APIKEY}\",\"entity_name\":\"${ENTITY}\",\"entity_type\":\"EquipeCampo\",\"protocol\":\"PDI-IoTA-UltraLight\",\"transport\":\"MQTT\",\"attributes\":[{\"object_id\":\"t\",\"name\":\"temperatura_c\",\"type\":\"Number\"},{\"object_id\":\"h\",\"name\":\"umidade_pct\",\"type\":\"Number\"},{\"object_id\":\"g\",\"name\":\"globo_c\",\"type\":\"Number\"},{\"object_id\":\"sol\",\"name\":\"solDireto\",\"type\":\"Boolean\"},{\"object_id\":\"ic\",\"name\":\"indiceCalor_c\",\"type\":\"Number\"},{\"object_id\":\"ib\",\"name\":\"ibutgEstimado_c\",\"type\":\"Number\"},{\"object_id\":\"st\",\"name\":\"estado\",\"type\":\"Text\"},{\"object_id\":\"msp\",\"name\":\"minutosSemPausa\",\"type\":\"Number\"},{\"object_id\":\"pz\",\"name\":\"pausasHoje\",\"type\":\"Number\"},{\"object_id\":\"ep\",\"name\":\"emPausa\",\"type\":\"Boolean\"},{\"object_id\":\"pr\",\"name\":\"pausaRecomendada\",\"type\":\"Boolean\"},{\"object_id\":\"me\",\"name\":\"malEstarHoje\",\"type\":\"Number\"},{\"object_id\":\"ga\",\"name\":\"galao_pct\",\"type\":\"Number\"},{\"object_id\":\"ta\",\"name\":\"aguaTemp_c\",\"type\":\"Number\"},{\"object_id\":\"aa\",\"name\":\"aguaAcabaEmMin\",\"type\":\"Number\"},{\"object_id\":\"sa\",\"name\":\"estadoAgua\",\"type\":\"Text\"},{\"object_id\":\"ts\",\"name\":\"timestamp\",\"type\":\"DateTime\"},{\"object_id\":\"fw\",\"name\":\"firmware\",\"type\":\"Text\"}],\"commands\":[{\"name\":\"setLimites\",\"type\":\"command\"},{\"name\":\"setRegime\",\"type\":\"command\"},{\"name\":\"setGalao\",\"type\":\"command\"},{\"name\":\"setIntervalo\",\"type\":\"command\"},{\"name\":\"identify\",\"type\":\"command\"}]}]}"

echo "3/4 Criando assinatura do STH-Comet (historico)..."
# Guarda tambem estado e emPausa (o dashboard pinta o turno e as pausas com eles).
# A notificacao sai quando muda calor, estado, pausa, minutos sem pausa ou agua.
post "${ORION}/v2/subscriptions" "{\"description\":\"Historico Pausa Certa no STH-Comet\",\"subject\":{\"entities\":[{\"idPattern\":\".*\",\"type\":\"EquipeCampo\"}],\"condition\":{\"attrs\":[\"temperatura_c\",\"umidade_pct\",\"globo_c\",\"indiceCalor_c\",\"estado\",\"emPausa\",\"minutosSemPausa\",\"galao_pct\",\"aguaTemp_c\"]}},\"notification\":{\"http\":{\"url\":\"http://fiware-sth-comet:8666/notify\"},\"attrs\":[\"temperatura_c\",\"umidade_pct\",\"globo_c\",\"indiceCalor_c\",\"ibutgEstimado_c\",\"estado\",\"emPausa\",\"pausaRecomendada\",\"minutosSemPausa\",\"pausasHoje\",\"malEstarHoje\",\"galao_pct\",\"aguaTemp_c\",\"estadoAgua\"],\"attrsFormat\":\"legacy\"}}"

echo "4/4 Conferindo dispositivos cadastrados..."
curl -s "${IOTA}/iot/devices" -H "$H1" -H "$H2" | grep -o '"count":[0-9]*\|"device_id":"[^"]*"\|"entity_name":"[^"]*"\|"apikey":"[^"]*"'

echo
echo "Pronto. Deve aparecer count 1, com apikey ${APIKEY}."
echo "No firmware (config.h) use:"
echo "  API_KEY   \"${APIKEY}\""
echo "  DEVICE_ID \"${DEVICE_ID}\""
echo "  EQUIPE_ID \"${EQUIPE}\""
echo
echo "Teste rapido (estado atual da equipe):"
echo "  curl -s '${ORION}/v2/entities/${ENTITY}?type=EquipeCampo&options=keyValues' -H '${H1}' -H '${H2}'"
