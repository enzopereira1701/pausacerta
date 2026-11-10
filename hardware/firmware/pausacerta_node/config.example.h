// Copie este arquivo para "config.h" (na mesma pasta) e preencha.
// O config.h NAO vai para o GitHub: ele guarda a senha do Wi-Fi e o endereco da nuvem.
#ifndef CONFIG_H
#define CONFIG_H

// 1 = simulacao no Wokwi, 0 = placa fisica (bancada)
#define SIMULACAO_WOKWI 1

// Wi-Fi. No Wokwi use "Wokwi-GUEST" e senha vazia.
// Na bancada: rede de 2,4 GHz (no caminhao, o hotspot do celular do motorista).
// Para testar SEM nuvem, use uma rede que nao existe (ex.: "sem_rede"): o Node continua
// sinalizando e guarda os envios no buffer offline.
#define WIFI_SSID     "Wokwi-GUEST"
#define WIFI_PASSWORD ""

// IP da instancia na nuvem onde roda o Mosquitto. No Learner Lab ele muda a cada sessao.
#define MQTT_BROKER   "IP_DA_INSTANCIA"
#define MQTT_PORT     1883

// Mesmos valores cadastrados no FIWARE (veja fiware/scripts/provisionar.sh)
#define API_KEY       "pausacerta"
#define DEVICE_ID     "pcn001"
#define EQUIPE_ID     "COL-CAM-07"     // aparece na tela; a entidade e EquipeCampo:COL-CAM-07

// No Wokwi, para a simulacao e a placa nao se derrubarem no broker com o mesmo DEVICE_ID
#define CLIENT_SUFIXO "_sim"

// ---------------- Ajustes (todos opcionais) ----------------

// Envio periodico em segundos (o Node tambem envia na hora quando o estado muda)
// #define INTERVALO_PADRAO_S 60

// LDR: padrao 1 (escuro = numero alto no modulo; o firmware inverte).
// Use 0 se o valor de luz SUBIR ao cobrir o sensor com a mao.
// #define LDR_INVERTIDO 0

// Buzzer ativo de 3 pinos: se apitar direto em repouso, use 1.
// #define BUZZER_ATIVO_EM_LOW 1

#endif
