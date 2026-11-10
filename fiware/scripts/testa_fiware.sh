#!/usr/bin/env bash
# ============================================================
# testa_fiware.sh - Pausa Certa (GS 2026.2)
# Confere as 3 coisas da etapa FIWARE, rodando DENTRO da instancia (usa localhost):
#   1) a entidade EquipeCampo:COL-CAM-07 existe e esta sendo atualizada pelo ESP32
#   2) um comando (setRegime) vai do Orion ate o ESP32 e volta "ok"
#   3) o STH-Comet esta guardando o historico
#
# Uso (com o Wokwi rodando e conectado ao IP da instancia):
#   bash testa_fiware.sh                 # usa pausacerta /coleta COL-CAM-07
#   bash testa_fiware.sh pausacerta /coleta COL-CAM-07
# ============================================================

SERVICE="${1:-pausacerta}"
SERVICEPATH="${2:-/coleta}"
EQUIPE="${3:-COL-CAM-07}"
ENTITY="EquipeCampo:${EQUIPE}"
ORION="http://localhost:1026"
STH="http://localhost:8666"
H1="fiware-service: ${SERVICE}"
H2="fiware-servicepath: ${SERVICEPATH}"

json() { python3 -m json.tool 2>/dev/null || cat; }
campo() { python3 -c "import sys,json
try:
    d=json.load(sys.stdin); print(d.get('$1', {}).get('value', '(sem valor)') if isinstance(d.get('$1'), dict) else d.get('$1', '(sem valor)'))
except Exception: print('(sem resposta)')"; }

echo "=== 1/3 Entidade no Orion ==="
R1=$(curl -s "${ORION}/v2/entities/${ENTITY}?type=EquipeCampo&options=keyValues" -H "$H1" -H "$H2")
echo "$R1" | json
TS1=$(echo "$R1" | campo TimeInstant)
echo
echo "Esperando 20 s para ver se os dados mudam (o Node envia a cada 60 s ou quando algo muda;"
echo "mexa num sensor no Wokwi agora para forcar um envio)..."
sleep 20
R2=$(curl -s "${ORION}/v2/entities/${ENTITY}?type=EquipeCampo&options=keyValues" -H "$H1" -H "$H2")
TS2=$(echo "$R2" | campo TimeInstant)
echo "TimeInstant antes: $TS1"
echo "TimeInstant agora: $TS2"
if [ -n "$R2" ] && [ "$R1" != "$R2" ]; then
  echo "OK: o ESP32 esta atualizando o Orion."
else
  echo "ATENCAO: nao mudou. Confira no Serial Monitor se aparece '- Enviado:'."
fi
echo

echo "=== 2/3 Comando setRegime (pausa min 30 s, 3 min em ATENCAO, 2 min em CRITICO) ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "${ORION}/v2/entities/${ENTITY}/attrs?type=EquipeCampo" \
  -H "$H1" -H "$H2" -H "Content-Type: application/json" \
  -d '{"setRegime":{"type":"command","value":"30,3,2"}}')
echo "Orion respondeu HTTP ${CODE} (esperado: 204)"
echo "No Serial Monitor do Wokwi deve aparecer: - Comando recebido: pcn001@setRegime|30,3,2"
echo "Esperando 10 s pela resposta do ESP32..."
sleep 10
R3=$(curl -s "${ORION}/v2/entities/${ENTITY}?type=EquipeCampo&options=keyValues" -H "$H1" -H "$H2")
echo "setRegime_status: $(echo "$R3" | campo setRegime_status)   (esperado: OK)"
echo "setRegime_info:   $(echo "$R3" | campo setRegime_info)   (esperado: ok)"
echo "Para conferir na tela: a faixa 'Sem pausa' passa a mostrar o limite novo (x/2 min em CRITICO)."
echo

echo "=== 3/3 Historico no STH-Comet (ultimas 5 leituras) ==="
for ATTR in indiceCalor_c galao_pct; do
  echo "--- ${ATTR}"
  curl -s "${STH}/STH/v1/contextEntities/type/EquipeCampo/id/${ENTITY}/attributes/${ATTR}?lastN=5" \
    -H "$H1" -H "$H2" | python3 -c "import sys,json
try:
    d=json.load(sys.stdin)
    vals=d['contextResponses'][0]['contextElement']['attributes'][0]['values']
    if not vals: print('  (vazio: espere alguns envios do Node)')
    for v in vals: print('  ', v['recvTime'], '->', v['attrValue'])
except Exception as e: print('  (sem historico ainda ou erro:', e, ')')"
done
echo
echo "Pronto. Se as 3 partes deram OK, a camada 2 (FIWARE) esta funcionando."
echo "Para voltar o regime de demonstracao: troque 30,3,2 por 20,3,1 e rode a parte 2 de novo,"
echo "ou simplesmente reinicie a simulacao com a NVS apagada (o Wokwi comeca do zero a cada Play)."
