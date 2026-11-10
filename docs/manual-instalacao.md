# Manual de instalação

**Pausa Certa: estação de estresse térmico no caminhão da coleta** · GS 2026.2 · Edge · versão de 10/11/2026

Como subir o sistema do zero: o **Node** no Wokwi, a **plataforma FIWARE** na AWS, o **backend** e o **dashboard**.

## 1. O que será instalado

| Parte | O que é | Onde roda |
|---|---|---|
| **Pausa Certa Node** | ESP32 com sensores de calor, botão de pausa, sensores do galão, semáforo, buzzer e tela | Wokwi (ou placa na bancada) |
| **Plataforma FIWARE** | Mosquitto, IoT Agent Ultralight, Orion, STH-Comet e MongoDB, em Docker | Instância EC2 do AWS Learner Lab |
| **Backend** | FastAPI que liga o dashboard ao Orion e ao STH-Comet | Mesma instância, em contêiner (porta 8001) |
| **Dashboard** | Painel web de Edge em React | Computador do grupo (`npm run dev`) |

## 2. Simulação no Wokwi

1. Abra o projeto: https://wokwi.com/projects/480299618436453377 (ou crie um **ESP32 Arduino** novo).
2. As abas precisam ter estes nomes **exatos**:

| Aba | Conteúdo |
|---|---|
| `sketch.ino` | `hardware/firmware/pausacerta_node/pausacerta_node.ino` |
| `diagram.json` | `simulacao/diagram.json` |
| `libraries.txt` | `simulacao/libraries.txt` |
| `config.h` | cópia do `config.example.h`, preenchida |

3. No `config.h`: `SIMULACAO_WOKWI 1`, `WIFI_SSID "Wokwi-GUEST"`, senha vazia e `MQTT_BROKER` com o **IP público da instância**.
4. Play. No Serial Monitor deve aparecer `Conectado ao broker MQTT!` e depois `- Enviado: t|...`.

Sem broker (ou com o lab desligado), o Node funciona igual, mostra **OFFLINE** na tela e guarda até 60 envios para reenviar.

## 3. Plataforma FIWARE na AWS

### 3.1 Primeira vez

1. No Learner Lab: **Start Lab**, abra o console da AWS e a instância EC2 (Ubuntu) usada no WineGuard.
2. **Security Group**, regras de entrada: **22** (SSH) e **1883** (MQTT do Node). **8001** (API do backend). As portas 1026, 8666 e 4041 podem ficar fechadas: os scripts rodam dentro da instância.
3. Pelo SSH, suba a base do professor (já está em `~/fiware`):

```bash
cd ~/fiware && sudo docker compose up -d
sudo docker ps          # mosquitto, iot-agent, orion, sth-comet e os mongo devem estar "Up"
```

4. Copie os scripts deste repositório para `~/pausacerta` na instância e cadastre o Node:

```bash
cd ~/pausacerta
bash provisionar.sh     # padrão: pausacerta /coleta pausacerta 001 COL-CAM-07
```

Deve terminar com `"count":1`, `"apikey":"pausacerta"` e `"entity_name":"EquipeCampo:COL-CAM-07"`. Rodar de novo é inofensivo (responde 409, "já existe").

Para editar um script pelo terminal: `nano nome.sh`, cole o conteúdo, **Ctrl+O**, **Enter**, **Ctrl+X**. Os comandos (`bash ...`) vão no prompt `ubuntu@...$`, nunca dentro do nano.

### 3.2 Conferir

Com o Wokwi rodando e conectado:

```bash
bash testa_fiware.sh
```

| Parte | Resultado esperado |
|---|---|
| 1/3 Entidade no Orion | `OK: o ESP32 esta atualizando o Orion.` (mexa num sensor durante a espera de 20 s) |
| 2/3 Comando | `HTTP 204`, `setRegime_status: OK`, `setRegime_info: ok`; no Wokwi, `- Comando recebido: pcn001@setRegime\|30,3,2` |
| 3/3 Histórico | Valores de `indiceCalor_c` e `galao_pct` com `recvTime` (em UTC) |

Testado em 10/11/2026 com os três OK.

### 3.3 Toda nova sessão do lab

1. **Start Lab** e espere a instância ligar.
2. Pegue o **IP público novo** no painel do EC2.
3. `cd ~/fiware && sudo docker compose up -d`.
4. No Wokwi, troque o `MQTT_BROKER` no `config.h` e dê Play.

O cadastro do Node e o histórico ficam no MongoDB: não precisa rodar o `provisionar.sh` de novo. Ao terminar, **End Lab** (a instância desliga, o disco continua).

**Se o Node conecta mas os dados não chegam ao Orion:** reinicie o IoT Agent (`sudo docker restart fiware-iot-agent`, ou o nome que aparece no `docker ps`). Lição do WineGuard: isso acontece depois de reiniciar o Mosquitto.

## 4. Na bancada (opcional)

1. Arduino IDE com o pacote **esp32 (Espressif Systems)** e as bibliotecas de [`../hardware/firmware/README.md`](../hardware/firmware/README.md).
2. Monte pelo [`esquema de ligação`](../hardware/esquema-ligacao.md).
3. `config.h` com `SIMULACAO_WOKWI 0`, a rede de 2,4 GHz e o IP da instância. Placa **DOIT ESP32 DEVKIT V1**, monitor a 115200.

## 5. Backend e dashboard

1. **Assinatura nova do histórico:** rode de novo `bash provisionar.sh` (versão de 10/11, que guarda também `estado` e `emPausa`).
2. **Backend na instância:** passo a passo em [`../backend/README.md`](../backend/README.md) (copiar a pasta `backend`, criar o `.env`,
   `docker compose up -d --build pausacerta-backend`). Conferir: `curl http://localhost:8001/api/equipe` mostra a leitura do Node.
3. **Dashboard no computador:** em `dashboard/.env`, `VITE_USE_MOCK=false` e `VITE_API_URL=http://<IP da instância>:8001`; depois `npm run dev`.

A cada nova sessão do lab, o backend sobe sozinho com o compose; só o IP do `VITE_API_URL` (e do `MQTT_BROKER` no Wokwi) muda.
