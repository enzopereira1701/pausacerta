// ============================================================
// PAUSA CERTA - FIAP Global Solution 2026.2 (CitizenTech)
// Edge Computing & Computer Systems - Engenharia de Software, 1o ano
//
// Integrantes:
//   Enzo Borgo Pereira           RM572529
//   Raphael Mascarenhas Lima     RM572313
//   Guilherme Pimentel Vilela    RM569177
//   Vinicius Campestrini Rodado  RM570703
//   Vinicius Shoiti Rios Honda   RM569744
//
// FICHA DA CITIZENTECH (resumo)
//   Cidadao:  gari da coleta de lixo, que corre atras do caminhao e ergue sacos ao sol,
//             com o calor mais forte entre 11h e 15h.
//   Problema: os garis trabalham sob calor forte sem pausas alem do intervalo obrigatorio,
//             porque nao ha um sinal objetivo de quando parar e eles tem receio de
//             "perder tempo" diante da chefia (entrevistas com os garis Sandro, Jackson
//             e um coletor anonimo).
//   Onde fica o dispositivo: no caminhao de coleta. Sensores na lateral externa, ao sol;
//             semaforo e botao de pausa na traseira (coletores); tela colorida na cabine (motorista);
//             sensor de nivel e de temperatura no galao de agua.
//   ODS:      8 (8.8 trabalho seguro), 3 (saude), 13 (13.1 adaptacao ao clima),
//             10 (reducao das desigualdades).
//   Indicador de impacto: pausas recomendadas x realizadas por equipe e por turno.
// ============================================================
//
// Pausa Certa Node - versao 0.2 (Nodes A, B e C no mesmo ESP32)
//   Node A: estresse termico (ar, globo negro, sol) -> indice de calor, IBUTG estimado, estado
//   Node B: botao de PAUSA da equipe -> minutos sem pausa, pausas do dia, pausa recomendada,
//           registro anonimo de mal-estar (dois toques longos)
//   Node C: galao de agua -> nivel (%), temperatura e previsao de quando vai acabar
//
// Base: WineGuard Node 2.3 (mesmo grupo) e "FIWARE Smart Lamp" (Prof. Fabio H. Cabrini)
// Protocolo: Ultralight 2.0 via MQTT
//   /<API_KEY>/<DEVICE_ID>/attrs   telemetria   |   /cmd comandos   |   /cmdexe respostas
//
// Telemetria (nomes do contrato EquipeCampo no provisionar.sh):
//   t|34.2|h|46.0|g|47.5|ic|37.5|ib|30.5|sol|true|st|CRITICO|msp|52|pz|3|ep|false|pr|true|me|0
//   |ga|35|ta|31.0|aa|45|sa|REPOR|ts|2026-11-12T12:40:00-03:00|fw|0.2
// Comandos: <DEVICE_ID>@<comando>|<parametros>
//   setLimites|27,32,41        indice de calor (C) para ATENCAO, CRITICO e PERIGO
//   setRegime|300,90,50        pausa minima (s), max. sem pausa em ATENCAO e em CRITICO (min)
//   setGalao|5,45,30           distancia cheio (cm), distancia vazio (cm), agua quente (C)
//   setIntervalo|60            envio periodico (s)
//   identify|                  pisca o semaforo por 5 s
//
// REGRAS DO PROJETO QUE O CODIGO RESPEITA
//   RN02 a pausa nunca e negada nem bloqueada: o botao sempre funciona.
//   RN03 nada identifica pessoas: tudo e da equipe/caminhao.
//   RN04 o Node nunca mostra "insalubre" nem "dentro da norma".
//   RN07 na coleta a pausa e RECOMENDADA na proxima parada da rota, nunca imposta.
//
// IMPORTANTE: o IBUTG e uma ESTIMATIVA (bulbo umido de Stull no lugar do bulbo umido natural;
// globo caseiro). Os numeros do regime de pausas sao EXEMPLOS: quem define e a empresa com a
// seguranca do trabalho (comando setRegime).
// ============================================================

#include <WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Preferences.h>
#include <time.h>
#include "config.h"

// Tipos usados em funcoes ficam AQUI no topo: o Arduino/Wokwi cria sozinho as
// declaracoes das funcoes antes do primeiro codigo, e elas precisam conhecer estes tipos.
#define BUF_MAX 60
#define SEM_VALOR INT16_MIN
struct __attribute__((packed)) Registro {   // um envio guardado no buffer offline
  uint32_t epoch;                            // 0 = hora desconhecida (sem NTP ainda)
  int16_t t10, h10, g10, ic10, ib10, ta10, aa;
  uint16_t msp;
  uint8_t estado, sol, pz, ep, pr, me, sa;
  int8_t ga;
};

#define FW_VERSION "0.2"

#ifndef MQTT_PORT
#define MQTT_PORT 1883
#endif
#ifndef CLIENT_SUFIXO
#define CLIENT_SUFIXO ""
#endif
#ifndef LDR_INVERTIDO
#define LDR_INVERTIDO 1
#endif
#ifndef BUZZER_ATIVO_EM_LOW
#define BUZZER_ATIVO_EM_LOW 0
#endif
#ifndef INTERVALO_PADRAO_S
#define INTERVALO_PADRAO_S 60
#endif

// ---------------- Pinos (desenho do diagram.json, sem fios cruzando sinais) ----------------
#define PIN_DHT       16   // DHT22: ar (RX2 na placa)
#define PIN_GLOBO     4    // DS18B20 dentro do globo negro
#define PIN_AGUA      15   // DS18B20 a prova d'agua dentro do galao
#define PIN_LDR       34   // LDR (ADC1): sol direto
#define PIN_TRIG      5    // HC-SR04 na tampa do galao
#define PIN_ECHO      17   // (TX2 na placa)
#define PIN_BOTAO     2    // botao PAUSA (pull-up interno, aperta = LOW)
#define PIN_VERDE     25   // semaforo da traseira
#define PIN_AMARELO   26
#define PIN_VERMELHO  27
#define PIN_BUZZER    33
#define PIN_TFT_CS    23   // tela colorida ILI9341 (SPI) na cabine
#define PIN_TFT_DC    22
#define PIN_TFT_MOSI  21
#define PIN_TFT_SCK   19
#define PIN_TFT_LED   18   // luz de fundo
#define PIN_TFT_RST   -1   // RST livre: reset por software (na placa, ligar RST ao 3V3)

// ---------------- Tempos ----------------
#if SIMULACAO_WOKWI
#define LEITURA_MS        2000UL    // no Wokwi le mais rapido, para a demonstracao reagir logo
#define AMOSTRA_AGUA_MS  10000UL
#else
#define LEITURA_MS       10000UL    // dossie: leitura a cada 10 s
#define AMOSTRA_AGUA_MS  60000UL    // uma amostra do galao por minuto para a previsao
#endif
#define JANELA_MEDIA          6
#define FALHAS_PARA_ALERTA    3
#define OFFLINE_APOS_MS   15000UL
#define TELA_MS            3000UL
#define MSG_MS             3500UL

// ---------------- Regras do Node A ----------------
const float LIM_PADRAO[3] = {27.0, 32.0, 41.0};   // faixas do indice de calor da NOAA (triagem)
#define HISTERESE_C        1.0
#define LIMIAR_SOL_PCT     60
#define HISTERESE_SOL_PCT  5
#define TAXA_GLOBO_ESTAVEL 0.5                    // C/min (modelo 3 da Matematica)
#define JANELA_TAXA_MS 30000UL

// ---------------- Regime de pausas (EXEMPLO; a empresa define com setRegime) ----------------
#if SIMULACAO_WOKWI
#define PAUSA_MIN_S_PADRAO    20     // demonstracao: tempos curtos para caber no video
#define MAX_ATENCAO_MIN_PADRAO 3
#define MAX_CRITICO_MIN_PADRAO 1
#else
#define PAUSA_MIN_S_PADRAO    300
#define MAX_ATENCAO_MIN_PADRAO 90
#define MAX_CRITICO_MIN_PADRAO 50
#endif
#define PAUSA_ESQUECIDA_MIN   60     // pausa aberta ha mais que isso termina sozinha
#define TOQUE_LONGO_MS      1500     // a partir disso: toque longo; qualquer clique menor inicia/encerra a pausa
#define JANELA_MAL_ESTAR_MS 8000UL   // dois toques longos dentro dessa janela = mal-estar

// ---------------- Galao (EXEMPLO de galao de 20 L; ajustar com setGalao) ----------------
#define DIST_CHEIO_PADRAO   5.0      // cm do sensor ate a agua com o galao cheio
#define DIST_VAZIO_PADRAO  45.0      // cm do sensor ate o fundo
#define AGUA_QUENTE_PADRAO 30.0      // C; nao ha valor na norma: a NR-09 pede agua fresca
#define AMOSTRAS_PREVISAO  12

enum { E_NORMAL = 0, E_ATENCAO = 1, E_CRITICO = 2, E_PERIGO = 3, E_FALHA = 4 };
const char* NOMES_ESTADO[5] = {"NORMAL", "ATENCAO", "CRITICO", "PERIGO", "FALHA_SENSOR"};
const char* NOMES_TELA[5]   = {"NORMAL", "ATENCAO", "CRITICO", "PERIGO", "FALHA"};
const char* ACOES_TELA[5]   = {"Trabalho normal", "Agua e sombra", "PAUSA NA SOMBRA",
                               "SUSPENDER PESADO", "Confira o DHT22"};  // acoes mostradas na tela
enum { A_SEM_SENSOR = 0, A_NORMAL = 1, A_REPOR = 2, A_ACABANDO = 3, A_SEM_AGUA = 4 };
const char* NOMES_AGUA[5] = {"SEM_SENSOR", "NORMAL", "REPOR", "ACABANDO", "SEM_AGUA"};
const char* TELA_AGUA[5]  = {"Sensor galao?", "Agua ok", "Repor em breve", "REPOR AGUA JA", "SEM AGUA"};

// ---------------- Objetos ----------------
WiFiClient espClient;
PubSubClient MQTT(espClient);
Adafruit_ILI9341 tft(PIN_TFT_CS, PIN_TFT_DC, PIN_TFT_RST);
DHT dht(PIN_DHT, DHT22);
OneWire owGlobo(PIN_GLOBO), owAgua(PIN_AGUA);
DallasTemperature globo(&owGlobo), sensorAgua(&owAgua);
Preferences prefs;
char topicAttrs[64], topicCmd[64], topicCmdExe[64], clientId[40];

// ---------------- Estado compartilhado entre tarefas ----------------
volatile float temperatura = NAN, umidade = NAN, temGlobo = NAN;
volatile float indCalor = NAN, bulboUmido = NAN, ibutg = NAN;
volatile int   luz = 0;
volatile bool  solDireto = false, globoEstavel = false, temLeitura = false;
volatile uint8_t estado = E_NORMAL;
volatile bool  emPausa = false, pausaRecomendada = false;
volatile uint16_t minutosSemPausa = 0;
volatile uint8_t pausasHoje = 0, malEstarHoje = 0;
volatile int   galaoPct = -1;               // -1 = sem leitura
volatile float aguaTemp = NAN;
volatile int   aguaAcabaEmMin = -1;         // -1 = sem previsao
volatile uint8_t estadoAgua = A_SEM_SENSOR;
volatile bool  aguaQuente = false;
volatile unsigned long identificaAte = 0;
volatile bool  wifiOk = false, mqttOk = false, offlineLocal = false;
volatile uint8_t bipesPendentes = 0;
volatile uint16_t duracaoBipe = 200;
volatile uint8_t eventosCurtos = 0, eventosLongos = 0;   // botao -> loop()
char msgL1[22] = "", msgL2[22] = "";                     // mensagem temporaria na tela
volatile unsigned long msgAte = 0;

float lim[3];
uint16_t pausaMinS, maxAtencaoMin, maxCriticoMin;
float distCheio, distVazio, limiteAguaQuente;
unsigned long intervaloMs = INTERVALO_PADRAO_S * 1000UL;
bool publicarJa = false;
unsigned long tLeitura = 0, tPub = 0, tAmostraAgua = 0;
unsigned long tWifiTentativa = 0, tMqttTentativa = 0, tUltimoMqttOk = 0;
unsigned long tUltimaPausa = 0, tInicioPausa = 0, tPrimeiroLongo = 0;
bool ntpPedido = false;
int diaAtual = -1;

// ---------------- Media movel ----------------
struct Media {
  float v[JANELA_MEDIA];
  uint8_t n = 0, i = 0;
  void add(float x) { v[i] = x; i = (i + 1) % JANELA_MEDIA; if (n < JANELA_MEDIA) n++; }
  float valor() const {
    if (n == 0) return NAN;
    float s = 0;
    for (uint8_t k = 0; k < n; k++) s += v[k];
    return s / n;
  }
};
Media mT, mH, mG;
uint8_t falhasDht = 0;
float gRef = NAN;
unsigned long tRefGlobo = 0;

// Amostras do galao para a previsao (minutos desde o boot, %)
float amMin[AMOSTRAS_PREVISAO], amPct[AMOSTRAS_PREVISAO];
uint8_t amN = 0;

// ============================================================
//  Calculos (os mesmos do Python e da Matematica)
// ============================================================
float indiceCalor(float tC, float ur) {      // NOAA (Rothfusz + ajustes), entrada e saida em C
  float T = tC * 9.0 / 5.0 + 32.0;
  float hi = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (ur * 0.094));
  if ((hi + T) / 2.0 >= 80.0) {
    hi = -42.379 + 2.04901523 * T + 10.14333127 * ur - 0.22475541 * T * ur
         - 0.00683783 * T * T - 0.05481717 * ur * ur + 0.00122874 * T * T * ur
         + 0.00085282 * T * ur * ur - 0.00000199 * T * T * ur * ur;
    if (ur < 13 && T >= 80 && T <= 112) hi -= ((13 - ur) / 4) * sqrt((17 - fabs(T - 95.0)) / 17);
    else if (ur > 85 && T >= 80 && T <= 87) hi += ((ur - 85) / 10) * ((87 - T) / 5);
  }
  return (hi - 32.0) * 5.0 / 9.0;
}

float bulboUmidoStull(float t, float ur) {    // Stull (2011): UR 5-99 %, T -20 a 50 C
  return t * atan(0.151977 * sqrt(ur + 8.313659)) + atan(t + ur) - atan(ur - 1.676331)
         + 0.00391838 * pow(ur, 1.5) * atan(0.023101 * ur) - 4.686035;
}

float ibutgEstimado(float tbu, float tg, float t) {   // externo: 0,7 tbn + 0,2 tg + 0,1 tbs
  return 0.7 * tbu + 0.2 * tg + 0.1 * t;
}

uint8_t nivelPorIC(float ic) {
  if (ic >= lim[2]) return E_PERIGO;
  if (ic >= lim[1]) return E_CRITICO;
  if (ic >= lim[0]) return E_ATENCAO;
  return E_NORMAL;
}

// Sobe na hora; desce so quando o indice ficar HISTERESE_C abaixo do limite do nivel atual
uint8_t proximoEstado(uint8_t atual, float ic) {
  if (atual == E_FALHA) atual = E_NORMAL;
  uint8_t novo = nivelPorIC(ic);
  if (novo >= atual) return novo;
  while (atual > E_NORMAL && ic < lim[atual - 1] - HISTERESE_C) atual--;
  return atual;
}

// Limite de minutos sem pausa para o estado atual (0 = sem limite)
uint16_t limiteSemPausa(uint8_t e) {
  if (e == E_CRITICO || e == E_PERIGO) return maxCriticoMin;
  if (e == E_ATENCAO) return maxAtencaoMin;
  return 0;
}

// ============================================================
//  Memoria (NVS)
// ============================================================
void carregaConfig() {
  prefs.begin("pausacerta", false);
  lim[0] = prefs.getFloat("l0", LIM_PADRAO[0]);
  lim[1] = prefs.getFloat("l1", LIM_PADRAO[1]);
  lim[2] = prefs.getFloat("l2", LIM_PADRAO[2]);
  pausaMinS     = prefs.getUShort("pMin", PAUSA_MIN_S_PADRAO);
  maxAtencaoMin = prefs.getUShort("mxA", MAX_ATENCAO_MIN_PADRAO);
  maxCriticoMin = prefs.getUShort("mxC", MAX_CRITICO_MIN_PADRAO);
  distCheio = prefs.getFloat("dCh", DIST_CHEIO_PADRAO);
  distVazio = prefs.getFloat("dVz", DIST_VAZIO_PADRAO);
  limiteAguaQuente = prefs.getFloat("aQ", AGUA_QUENTE_PADRAO);
  intervaloMs = prefs.getULong("intv", INTERVALO_PADRAO_S * 1000UL);
}

// ---------------- Buffer offline (60 envios, ~1 h; reenviado na garagem) ----------------
Registro buf[BUF_MAX];
uint8_t bufIni = 0, bufN = 0;

int16_t para10(float x) { return isnan(x) ? SEM_VALOR : (int16_t)lroundf(x * 10); }

void salvaBuffer() {
  prefs.putBytes("buf", buf, sizeof(buf));
  prefs.putUChar("bIni", bufIni);
  prefs.putUChar("bN", bufN);
}

void carregaBuffer() {
  if (prefs.getBytesLength("buf") == sizeof(buf)) {   // tamanho diferente = versao antiga: ignora
    prefs.getBytes("buf", buf, sizeof(buf));
    bufIni = prefs.getUChar("bIni", 0) % BUF_MAX;
    bufN = min((int)prefs.getUChar("bN", 0), BUF_MAX);
  }
  if (bufN) Serial.printf("- Buffer offline com %u registros guardados\n", bufN);
}

void guardaNoBuffer(const Registro& r) {
  uint8_t pos = (bufIni + bufN) % BUF_MAX;
  buf[pos] = r;
  if (bufN < BUF_MAX) bufN++;
  else bufIni = (bufIni + 1) % BUF_MAX;   // cheio: descarta o mais antigo
  salvaBuffer();
  Serial.printf("- Sem rede: guardado no buffer (%u/%u)\n", bufN, BUF_MAX);
}

// ============================================================
//  Hora (NTP)
// ============================================================
uint32_t agoraEpoch() {
  time_t t = time(nullptr);
  return (t > 1700000000) ? (uint32_t)t : 0;
}

void formataHora(uint32_t epoch, char* out, size_t tam) {
  time_t t = epoch;
  struct tm tmLocal;
  localtime_r(&t, &tmLocal);
  strftime(out, tam, "%Y-%m-%dT%H:%M:%S-03:00", &tmLocal);
}

// Zera os contadores do dia quando a data muda (um turno = um dia)
void confereVirada() {
  uint32_t e = agoraEpoch();
  if (!e) return;
  time_t t = e;
  struct tm tmLocal;
  localtime_r(&t, &tmLocal);
  if (diaAtual >= 0 && tmLocal.tm_yday != diaAtual) {
    pausasHoje = 0;
    malEstarHoje = 0;
    Serial.println("- Novo dia: contadores de pausa e mal-estar zerados");
  }
  diaAtual = tmLocal.tm_yday;
}

// ============================================================
//  Mensagens e bipes
// ============================================================
void mensagem(const char* l1, const char* l2) {
  snprintf(msgL1, sizeof(msgL1), "%s", l1);
  snprintf(msgL2, sizeof(msgL2), "%s", l2);
  msgAte = millis() + MSG_MS;
}

void bipa(uint8_t vezes, uint16_t duracao) {
  duracaoBipe = duracao;
  bipesPendentes = vezes;
}

// ============================================================
//  Atuadores (tarefaAtuadores): semaforo, buzzer e leitura do botao
// ============================================================
void buzzer(bool ligar) {
  static bool atual = false;
  if (ligar == atual) return;
  atual = ligar;
#if SIMULACAO_WOKWI
  if (ligar) tone(PIN_BUZZER, 2000);
  else noTone(PIN_BUZZER);
#else
  bool nivel = BUZZER_ATIVO_EM_LOW ? !ligar : ligar;
  digitalWrite(PIN_BUZZER, nivel ? HIGH : LOW);
#endif
}

void semaforo(bool vermelho, bool amarelo, bool verde) {
  digitalWrite(PIN_VERMELHO, vermelho);
  digitalWrite(PIN_AMARELO, amarelo);
  digitalWrite(PIN_VERDE, verde);
}

// Prioridade: identify > em pausa > iniciando/falha > pausa recomendada > estado do calor
void atualizaSemaforo() {
  unsigned long agora = millis();
  bool pisca = (agora / 400) % 2 == 0;
  bool piscaLento = (agora / 1000) % 2 == 0;
  if (identificaAte > agora) { semaforo(pisca, pisca, pisca); return; }
  if (emPausa) { semaforo(false, false, piscaLento); return; }           // verde piscando: em pausa
  if (!temLeitura || estado == E_FALHA) { semaforo(false, piscaLento, false); return; }  // amarelo piscando
  if (pausaRecomendada) { semaforo(true, true, false); return; }         // vermelho + amarelo
  switch (estado) {
    case E_NORMAL:  semaforo(false, false, true);  break;
    case E_ATENCAO: semaforo(false, true, false);  break;
    case E_CRITICO: semaforo(true, false, false);  break;
    default:        semaforo(pisca, false, false); break;   // PERIGO: vermelho piscando
  }
}

void atualizaBuzzer() {
  static bool tocando = false;
  static unsigned long tFase = 0;
  unsigned long agora = millis();
  if (!tocando && bipesPendentes == 0) { buzzer(false); return; }
  if (!tocando) {
    if (agora - tFase < 200) return;
    tocando = true; tFase = agora; buzzer(true);
  } else if (agora - tFase >= duracaoBipe) {
    tocando = false; tFase = agora; buzzer(false);
    if (bipesPendentes) bipesPendentes--;
  }
}

// Botao por interrupcao: registra o clique na hora, mesmo curto (o Wokwi roda mais devagar que o
// tempo real, e um clique rapido podia sumir entre duas leituras). So conta o tempo e avisa o loop();
// nada aqui grava memoria nem usa rede.
volatile bool botaoApertado = false;
volatile unsigned long tApertoBotao = 0, tUltimaBorda = 0;

void IRAM_ATTR registraSoltura(unsigned long agora) {
  botaoApertado = false;
  if (agora - tApertoBotao >= TOQUE_LONGO_MS) eventosLongos++;
  else eventosCurtos++;
}

void IRAM_ATTR isrBotao() {
  unsigned long agora = millis();
  bool apertado = digitalRead(PIN_BOTAO) == LOW;
  if (apertado && !botaoApertado) {
    if (agora - tUltimaBorda < 40) return;      // repique mecanico logo depois de soltar
    botaoApertado = true;
    tApertoBotao = agora;
    tUltimaBorda = agora;
  } else if (!apertado && botaoApertado && agora - tApertoBotao >= 15) {
    tUltimaBorda = agora;
    registraSoltura(agora);
  }
}

// Plano B, chamado a cada 5 ms: se a borda de soltura se perdeu, fecha o clique pela leitura do pino
void conferBotao() {
  unsigned long agora = millis();
  if (botaoApertado && digitalRead(PIN_BOTAO) == HIGH && agora - tApertoBotao >= 15) {
    noInterrupts();
    if (botaoApertado) { tUltimaBorda = agora; registraSoltura(agora); }
    interrupts();
  }
}

void tarefaAtuadores(void*) {
  for (;;) {
    conferBotao();
    atualizaSemaforo();
    atualizaBuzzer();
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

// ============================================================
//  Tela colorida da cabine (tarefaTela; so ela usa o SPI)
//  ILI9341 240x320 em pe. Cada faixa so e redesenhada quando o conteudo muda (sem piscar).
// ============================================================
#define COR_FUNDO     0x0000
#define COR_TEXTO     0xFFFF
#define COR_CINZA     0x7BEF
#define COR_ESCURO    0x2104
#define COR_VERDE     0x07E0
#define COR_VERDE_E   0x0400
#define COR_AMARELO   0xFFE0
#define COR_LARANJA   0xFD20
#define COR_VERMELHO  0xF800
#define COR_AZUL      0x041F
#define COR_CIANO     0x07FF

const uint16_t COR_ESTADO[5]  = {COR_VERDE, COR_AMARELO, COR_VERMELHO, COR_VERMELHO, COR_CINZA};
const uint16_t TEXTO_ESTADO[5] = {COR_FUNDO, COR_FUNDO, COR_TEXTO, COR_TEXTO, COR_FUNDO};

// Faixas da tela (y, altura)
#define Y_TOPO    0
#define H_TOPO   26
#define Y_CARTAO 30
#define H_CARTAO 74
#define Y_ACAO  106
#define H_ACAO   30
#define Y_LEIT  140
#define H_LEIT   60
#define Y_PAUSA 204
#define H_PAUSA  54
#define Y_AGUA  262
#define H_AGUA   58

uint32_t cache[6];          // assinatura do que esta desenhado em cada faixa
bool redesenhaTudo = true;

uint32_t assinatura(const char* s) {     // hash simples (FNV-1a) para saber se a faixa mudou
  uint32_t h = 2166136261u;
  while (*s) { h ^= (uint8_t)*s++; h *= 16777619u; }
  return h;
}

bool mudou(uint8_t faixa, const char* chave) {
  uint32_t h = assinatura(chave);
  if (!redesenhaTudo && cache[faixa] == h) return false;
  cache[faixa] = h;
  return true;
}

void texto(const char* s, int x, int y, uint8_t tam, uint16_t cor) {
  tft.setTextSize(tam);
  tft.setTextColor(cor);
  tft.setCursor(x, y);
  tft.print(s);
}

void centro(const char* s, int y, uint8_t tam, uint16_t cor) {
  int w = strlen(s) * 6 * tam;
  texto(s, max(0, (240 - w) / 2), y, tam, cor);
}

void fmt(char* out, size_t tam, float v, int dec) {
  if (isnan(v)) snprintf(out, tam, "--");
  else dtostrf(v, 0, dec, out);
}

void barra(int x, int y, int w, int h, int pct, uint16_t cor) {
  tft.drawRect(x, y, w, h, COR_CINZA);
  int cheio = (long)(w - 4) * constrain(pct, 0, 100) / 100;
  tft.fillRect(x + 2, y + 2, cheio, h - 4, cor);
  tft.fillRect(x + 2 + cheio, y + 2, w - 4 - cheio, h - 4, COR_FUNDO);
}

void desenhaTopo() {
  const char* rede = mqttOk ? "NUVEM" : (offlineLocal ? "OFFLINE" : "...");
  char chave[48];
  snprintf(chave, sizeof(chave), "%s|%s", EQUIPE_ID, rede);
  if (!mudou(0, chave)) return;
  tft.fillRect(0, Y_TOPO, 240, H_TOPO, COR_ESCURO);
  texto(EQUIPE_ID, 6, 6, 2, COR_TEXTO);
  uint16_t cor = mqttOk ? COR_VERDE : (offlineLocal ? COR_VERMELHO : COR_AMARELO);
  texto(rede, 234 - 6 * strlen(rede), 10, 1, cor);
}

// Cartao grande: estado do calor na cor do semaforo (ou EM PAUSA)
void desenhaCartao() {
  unsigned long agora = millis();
  char chave[40];
  bool pisca = (estado == E_PERIGO) && ((agora / 500) % 2);
  if (emPausa) snprintf(chave, sizeof(chave), "P|%lu", (agora - tInicioPausa) / 1000);
  else snprintf(chave, sizeof(chave), "E|%u|%d|%d", (unsigned)estado, pisca, (int)pausaRecomendada);
  if (!mudou(1, chave)) return;
  tft.fillRect(0, Y_CARTAO, 240, Y_ACAO - Y_CARTAO, COR_FUNDO);   // limpa cantos e folga (sobra de mensagem)
  if (emPausa) {
    unsigned long s = (agora - tInicioPausa) / 1000;
    char l[16];
    tft.fillRoundRect(4, Y_CARTAO, 232, H_CARTAO, 10, COR_VERDE_E);
    centro("EM PAUSA", Y_CARTAO + 8, 3, COR_TEXTO);
    snprintf(l, sizeof(l), "%02lu:%02lu", s / 60, s % 60);
    centro(l, Y_CARTAO + 40, 3, COR_VERDE);
    return;
  }
  uint16_t fundo = pisca ? COR_FUNDO : COR_ESTADO[estado];
  uint16_t letra = pisca ? COR_VERMELHO : TEXTO_ESTADO[estado];
  tft.fillRoundRect(4, Y_CARTAO, 232, H_CARTAO, 10, fundo);
  if (pisca) tft.drawRoundRect(4, Y_CARTAO, 232, H_CARTAO, 10, COR_VERMELHO);
  centro(NOMES_TELA[estado], Y_CARTAO + 14, 4, letra);
  centro("calor", Y_CARTAO + 54, 1, letra);
}

// Faixa da acao para o motorista (laranja quando a pausa e recomendada)
void desenhaAcao() {
  char l[32];
  if (emPausa) snprintf(l, sizeof(l), (millis() - tInicioPausa) / 1000 >= pausaMinS ? "Agua e sombra" : "Minimo %us", (unsigned)pausaMinS);
  else snprintf(l, sizeof(l), "%s", pausaRecomendada ? "PARE NA PROX PARADA" : ACOES_TELA[estado]);
  char chave[40];
  snprintf(chave, sizeof(chave), "%s|%d", l, (int)pausaRecomendada);
  if (!mudou(2, chave)) return;
  uint16_t fundo = (pausaRecomendada && !emPausa) ? COR_LARANJA : COR_FUNDO;
  uint16_t cor = (pausaRecomendada && !emPausa) ? COR_FUNDO : COR_TEXTO;
  tft.fillRect(0, Y_ACAO, 240, H_ACAO, fundo);
  centro(l, Y_ACAO + 8, strlen(l) * 12 <= 236 ? 2 : 1, cor);
}

// Leituras de calor
void desenhaLeituras() {
  char a[8], b[8], c[8], l[48], chave[64];
  fmt(a, sizeof(a), indCalor, 1);
  fmt(b, sizeof(b), ibutg, 1);
  snprintf(chave, sizeof(chave), "%s|%s|%.1f|%.0f|%.1f|%d|%d", a, b, (float)temperatura, (float)umidade,
           (float)temGlobo, (int)solDireto, (int)globoEstavel);
  if (!mudou(3, chave)) return;
  tft.fillRect(0, Y_LEIT, 240, H_LEIT, COR_FUNDO);
  tft.drawFastHLine(0, Y_LEIT, 240, COR_ESCURO);
  texto("Indice de calor", 6, Y_LEIT + 6, 1, COR_CINZA);
  snprintf(l, sizeof(l), "%sC", a);
  texto(l, 6, Y_LEIT + 18, 3, COR_ESTADO[estado] == COR_CINZA ? COR_TEXTO : COR_ESTADO[estado]);
  texto("IBUTG estimado", 132, Y_LEIT + 6, 1, COR_CINZA);
  snprintf(l, sizeof(l), "%sC", b);
  texto(l, 132, Y_LEIT + 18, 2, COR_TEXTO);
  fmt(a, sizeof(a), temperatura, 1);
  fmt(b, sizeof(b), umidade, 0);
  fmt(c, sizeof(c), temGlobo, 1);
  snprintf(l, sizeof(l), "Ar %sC %s%%  Globo %sC%s  %s", a, b, c,
           (!isnan(temGlobo) && !globoEstavel) ? "*" : "", solDireto ? "SOL" : "sombra");
  texto(l, 6, Y_LEIT + 46, 1, solDireto ? COR_AMARELO : COR_TEXTO);
}

// Pausas da equipe, com barra do tempo sem pausa
void desenhaPausas() {
  char l[40], chave[40];
  uint16_t limite = limiteSemPausa(estado);
  snprintf(chave, sizeof(chave), "%u|%u|%u|%u", (unsigned)minutosSemPausa, (unsigned)limite,
           (unsigned)pausasHoje, (unsigned)malEstarHoje);
  if (!mudou(4, chave)) return;
  tft.fillRect(0, Y_PAUSA, 240, H_PAUSA, COR_FUNDO);
  tft.drawFastHLine(0, Y_PAUSA, 240, COR_ESCURO);
  if (limite) snprintf(l, sizeof(l), "Sem pausa %u/%u min", (unsigned)minutosSemPausa, (unsigned)limite);
  else snprintf(l, sizeof(l), "Sem pausa %u min", (unsigned)minutosSemPausa);
  texto(l, 6, Y_PAUSA + 6, 2, COR_TEXTO);
  int pct = limite ? (int)(100L * minutosSemPausa / limite) : 0;
  uint16_t cor = pct >= 100 ? COR_VERMELHO : (pct >= 70 ? COR_AMARELO : COR_VERDE);
  barra(6, Y_PAUSA + 26, 228, 10, limite ? pct : 0, cor);
  snprintf(l, sizeof(l), "Pausas hoje: %u    Mal-estar: %u", (unsigned)pausasHoje, (unsigned)malEstarHoje);
  texto(l, 6, Y_PAUSA + 42, 1, malEstarHoje ? COR_LARANJA : COR_CINZA);
}

// Galao: nivel com barra colorida e previsao
void desenhaAgua() {
  char a[8], l[40], chave[48];
  snprintf(chave, sizeof(chave), "%d|%.0f|%u|%d|%d", (int)galaoPct, (float)aguaTemp, (unsigned)estadoAgua,
           (int)aguaAcabaEmMin, (int)aguaQuente);
  if (!mudou(5, chave)) return;
  tft.fillRect(0, Y_AGUA, 240, H_AGUA, COR_FUNDO);
  tft.drawFastHLine(0, Y_AGUA, 240, COR_ESCURO);
  if (galaoPct < 0) {
    texto("Galao: sem leitura", 6, Y_AGUA + 8, 2, COR_CINZA);
    return;
  }
  fmt(a, sizeof(a), aguaTemp, 0);
  snprintf(l, sizeof(l), "Agua %d%%", (int)galaoPct);
  texto(l, 6, Y_AGUA + 6, 2, COR_TEXTO);
  snprintf(l, sizeof(l), "%sC", a);
  texto(l, 132, Y_AGUA + 6, 2, aguaQuente ? COR_LARANJA : COR_CIANO);
  if (aguaQuente) texto("QUENTE", 186, Y_AGUA + 10, 1, COR_LARANJA);
  uint16_t cor = estadoAgua >= A_ACABANDO ? COR_VERMELHO : (estadoAgua == A_REPOR ? COR_AMARELO : COR_AZUL);
  barra(6, Y_AGUA + 26, 228, 12, galaoPct, cor);
  if (estadoAgua >= A_REPOR || aguaAcabaEmMin < 0) snprintf(l, sizeof(l), "%s", TELA_AGUA[estadoAgua]);
  else snprintf(l, sizeof(l), "Acaba em ~%d min", (int)aguaAcabaEmMin);
  texto(l, 6, Y_AGUA + 44, 1, estadoAgua >= A_ACABANDO ? COR_VERMELHO : COR_TEXTO);
}

// Mensagem temporaria sobre o cartao e a faixa de acao
void desenhaMensagem() {
  char chave[48];
  snprintf(chave, sizeof(chave), "M|%s|%s", msgL1, msgL2);
  if (!mudou(1, chave)) return;
  cache[2] = 0;
  tft.fillRect(0, Y_CARTAO, 240, Y_LEIT - Y_CARTAO, COR_FUNDO);
  tft.fillRoundRect(4, Y_CARTAO, 232, Y_ACAO + H_ACAO - Y_CARTAO, 10, COR_AZUL);
  centro(msgL1, Y_CARTAO + 16, strlen(msgL1) <= 13 ? 3 : 2, COR_TEXTO);
  centro(msgL2, Y_CARTAO + 64, 2, COR_TEXTO);
}

void desenhaTela() {
  unsigned long agora = millis();
  static bool emMensagem = false, emIdentify = false;
  if (identificaAte > agora) {
    if (!emIdentify) {
      emIdentify = true;
      tft.fillScreen(((agora / 500) % 2) ? COR_AZUL : COR_FUNDO);
      centro("Pausa Certa", 120, 2, COR_TEXTO);
      centro(DEVICE_ID, 150, 3, COR_TEXTO);
    }
    return;
  }
  if (emIdentify) { emIdentify = false; tft.fillScreen(COR_FUNDO); redesenhaTudo = true; }
  if (!temLeitura) {
    if (mudou(1, "iniciando")) {
      tft.fillScreen(COR_FUNDO);
      centro("Pausa Certa", 120, 3, COR_VERDE);
      centro("Lendo sensores...", 160, 2, COR_TEXTO);
    }
    redesenhaTudo = false;
    return;
  }
  if (cache[1] == assinatura("iniciando")) { tft.fillScreen(COR_FUNDO); redesenhaTudo = true; }

  desenhaTopo();
  if (msgAte > agora) { desenhaMensagem(); emMensagem = true; }
  else {
    if (emMensagem) {                                   // a mensagem sumiu: apaga a caixa inteira
      emMensagem = false;
      tft.fillRect(0, Y_CARTAO, 240, Y_LEIT - Y_CARTAO, COR_FUNDO);
      cache[1] = cache[2] = 0;
    }
    desenhaCartao();
    desenhaAcao();
  }
  desenhaLeituras();
  desenhaPausas();
  desenhaAgua();
  redesenhaTudo = false;
}

void tarefaTela(void*) {
  for (;;) {
    desenhaTela();
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

// ============================================================
//  Node A: sensores de calor e estado
// ============================================================
void leCalor() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (isnan(t) || isnan(h)) {                 // leitura invalida: descarta
    if (falhasDht < 255) falhasDht++;
  } else {
    falhasDht = 0;
    mT.add(t);
    mH.add(h);
  }

  float g = globo.getTempCByIndex(0);         // conversao pedida na leitura anterior
  if (g != DEVICE_DISCONNECTED_C && g > -50 && g < 125) mG.add(g);   // descarta -127 C
  globo.requestTemperatures();

  long soma = 0;
  for (int i = 0; i < 8; i++) soma += analogRead(PIN_LDR);
  int pct = map(soma / 8, 0, 4095, 0, 100);
  if (LDR_INVERTIDO) pct = 100 - pct;
  luz = constrain(pct, 0, 100);
  if (!solDireto && luz >= LIMIAR_SOL_PCT) solDireto = true;
  else if (solDireto && luz < LIMIAR_SOL_PCT - HISTERESE_SOL_PCT) solDireto = false;

  temperatura = mT.valor();
  umidade = mH.valor();
  temGlobo = mG.valor();

  // Globo estabilizando: derivada da temperatura do globo acima de 0,5 C/min
  if (!isnan(temGlobo)) {
    if (isnan(gRef)) { gRef = temGlobo; tRefGlobo = millis(); globoEstavel = false; }
    else if (millis() - tRefGlobo >= JANELA_TAXA_MS) {
      float taxa = (temGlobo - gRef) / ((millis() - tRefGlobo) / 60000.0);
      globoEstavel = fabs(taxa) < TAXA_GLOBO_ESTAVEL;
      gRef = temGlobo;
      tRefGlobo = millis();
    }
  }

  uint8_t anterior = estado;
  if (falhasDht >= FALHAS_PARA_ALERTA || isnan(temperatura) || isnan(umidade)) {
    if (falhasDht >= FALHAS_PARA_ALERTA) estado = E_FALHA;
    indCalor = bulboUmido = ibutg = NAN;
  } else {
    indCalor = indiceCalor(temperatura, umidade);
    bulboUmido = bulboUmidoStull(temperatura, umidade);
    ibutg = isnan(temGlobo) ? NAN : ibutgEstimado(bulboUmido, temGlobo, temperatura);
    estado = proximoEstado(estado, indCalor);
    temLeitura = true;
  }
  if (estado == E_FALHA) temLeitura = true;

  if (estado != anterior) {
    Serial.printf(">> Calor: %s -> %s\n", NOMES_ESTADO[anterior], NOMES_ESTADO[estado]);
    if (estado > anterior && estado != E_FALHA) bipa(estado, 250);   // subir: 1, 2 ou 3 bipes
    else bipa(1, 120);                                                // descer ou falha: 1 curto
    publicarJa = true;
  }
}

// ============================================================
//  Node B: pausas da equipe
// ============================================================
void iniciaPausa() {
  emPausa = true;
  tInicioPausa = millis();
  bipa(1, 150);
  mensagem("PAUSA", "Agua e sombra");
  Serial.println(">> Pausa iniciada");
  publicarJa = true;
}

void encerraPausa(bool automatica) {
  unsigned long durS = (millis() - tInicioPausa) / 1000;
  emPausa = false;
  if (durS >= pausaMinS) {
    pausasHoje++;
    tUltimaPausa = millis();          // zera o tempo de exposicao
    bipa(2, 150);
    mensagem("PAUSA OK", automatica ? "Fim automatico" : "Registrada");
    Serial.printf(">> Pausa de %lus registrada (%u hoje)\n", durS, (unsigned)pausasHoje);
  } else {
    // RN02: a pausa nunca e negada; so nao conta para o regime se for curta demais
    bipa(1, 120);
    mensagem("CURTA", "Abaixo do minimo");
    Serial.printf(">> Pausa de %lus: abaixo do minimo de %us, nao contou\n", durS, (unsigned)pausaMinS);
  }
  publicarJa = true;
}

void trataBotao() {
  while (eventosCurtos) {
    eventosCurtos--;
    if (emPausa) encerraPausa(false); else iniciaPausa();
  }
  while (eventosLongos) {
    eventosLongos--;
    unsigned long agora = millis();
    if (tPrimeiroLongo && agora - tPrimeiroLongo <= JANELA_MAL_ESTAR_MS) {
      tPrimeiroLongo = 0;
      malEstarHoje++;
      bipa(3, 100);
      mensagem("MAL-ESTAR", "Registrado. Ajude!");
      Serial.printf(">> Ocorrencia de mal-estar registrada (anonima). Hoje: %u\n", (unsigned)malEstarHoje);
      publicarJa = true;
    } else {
      tPrimeiroLongo = agora;
      mensagem("Mal-estar?", "Segure de novo");
    }
  }
  if (tPrimeiroLongo && millis() - tPrimeiroLongo > JANELA_MAL_ESTAR_MS) tPrimeiroLongo = 0;
}

void atualizaPausas() {
  if (emPausa) {
    minutosSemPausa = 0;
    if (millis() - tInicioPausa > PAUSA_ESQUECIDA_MIN * 60000UL) encerraPausa(true);
  } else {
    minutosSemPausa = (millis() - tUltimaPausa) / 60000UL;
  }
  uint16_t limite = limiteSemPausa(estado);
  bool rec = !emPausa && temLeitura && estado != E_FALHA && limite && minutosSemPausa >= limite;
  if (rec != pausaRecomendada) {
    pausaRecomendada = rec;
    if (rec) {
      bipa(1, 600);
      Serial.printf(">> Pausa recomendada: %u min sem pausa em %s\n", (unsigned)minutosSemPausa, NOMES_ESTADO[estado]);
    }
    publicarJa = true;
  }
}

// ============================================================
//  Node C: galao de agua
// ============================================================
float medeDistanciaCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  unsigned long us = pulseIn(PIN_ECHO, HIGH, 30000UL);   // ate ~5 m
  return us ? us / 58.0 : NAN;
}

// Mediana de 5 leituras: ignora respingos e o balanco da agua
float distanciaGalao() {
  float v[5];
  uint8_t n = 0;
  for (uint8_t i = 0; i < 5; i++) {
    float d = medeDistanciaCm();
    if (!isnan(d) && d > 1 && d < 400) v[n++] = d;
    delay(15);
  }
  if (n < 3) return NAN;
  for (uint8_t i = 1; i < n; i++)
    for (uint8_t j = i; j > 0 && v[j] < v[j - 1]; j--) { float x = v[j]; v[j] = v[j - 1]; v[j - 1] = x; }
  return v[n / 2];
}

// Previsao: reta pelos minimos quadrados nas ultimas amostras (% por minuto)
void atualizaPrevisao(int pct) {
  float agoraMin = millis() / 60000.0;
  if (amN && pct > amPct[amN - 1] + 10) amN = 0;   // galao reabastecido: recomeca
  if (amN == AMOSTRAS_PREVISAO) {
    for (uint8_t i = 1; i < amN; i++) { amMin[i - 1] = amMin[i]; amPct[i - 1] = amPct[i]; }
    amN--;
  }
  amMin[amN] = agoraMin; amPct[amN] = pct; amN++;
  if (amN < 3) { aguaAcabaEmMin = -1; return; }
  float mx = 0, my = 0;
  for (uint8_t i = 0; i < amN; i++) { mx += amMin[i]; my += amPct[i]; }
  mx /= amN; my /= amN;
  float sxy = 0, sxx = 0;
  for (uint8_t i = 0; i < amN; i++) { sxy += (amMin[i] - mx) * (amPct[i] - my); sxx += (amMin[i] - mx) * (amMin[i] - mx); }
  float taxa = sxx > 0 ? sxy / sxx : 0;            // %/min (negativo quando o galao esvazia)
  aguaAcabaEmMin = (taxa < -0.05) ? (int)(pct / -taxa) : -1;
}

uint8_t classificaAgua(int pct, uint8_t atual) {
  // histerese de 3 pontos para nao ficar trocando na fronteira
  int h = (atual >= A_REPOR) ? 3 : 0;
  if (pct < 5 + h) return A_SEM_AGUA;
  if (pct < 20 + h) return A_ACABANDO;
  if (pct < 50 + h) return A_REPOR;
  return A_NORMAL;
}

void leAgua() {
  float ta = sensorAgua.getTempCByIndex(0);
  if (ta != DEVICE_DISCONNECTED_C && ta > -20 && ta < 80) aguaTemp = ta; else aguaTemp = NAN;
  sensorAgua.requestTemperatures();
  bool quente = !isnan(aguaTemp) && aguaTemp > limiteAguaQuente;

  float d = distanciaGalao();
  uint8_t anterior = estadoAgua;
  if (isnan(d)) {
    galaoPct = -1;
    estadoAgua = A_SEM_SENSOR;
  } else {
    float pct = (distVazio - d) / (distVazio - distCheio) * 100.0;
    galaoPct = constrain((int)lroundf(pct), 0, 100);
    estadoAgua = classificaAgua(galaoPct, estadoAgua);
    if (millis() - tAmostraAgua >= AMOSTRA_AGUA_MS || tAmostraAgua == 0) {
      tAmostraAgua = millis();
      atualizaPrevisao(galaoPct);
    }
  }
  if (estadoAgua != anterior || quente != aguaQuente) {
    aguaQuente = quente;
    Serial.printf(">> Agua: %s%s\n", NOMES_AGUA[estadoAgua], quente ? " (quente)" : "");
    if (estadoAgua >= A_ACABANDO && estadoAgua > anterior) bipa(2, 500);   // aviso ao motorista
    publicarJa = true;
  }
}

void leSensores() {
  if (tLeitura != 0 && millis() - tLeitura < LEITURA_MS) return;
  tLeitura = millis();
  leCalor();
  leAgua();
  Serial.printf("T=%.1f UR=%.0f G=%.1f sol=%d | IC=%.1f IBUTG~%.1f | %s | sem pausa %umin, pausas %u | agua %d%% %.1fC %s acaba~%dmin\n",
                (float)temperatura, (float)umidade, (float)temGlobo, solDireto ? 1 : 0,
                (float)indCalor, (float)ibutg, NOMES_ESTADO[estado],
                (unsigned)minutosSemPausa, (unsigned)pausasHoje,
                (int)galaoPct, (float)aguaTemp, NOMES_AGUA[estadoAgua], (int)aguaAcabaEmMin);
}

// ============================================================
//  Telemetria
// ============================================================
Registro registroAtual() {
  Registro r;
  r.epoch = agoraEpoch();
  r.t10 = para10(temperatura); r.h10 = para10(umidade); r.g10 = para10(temGlobo);
  r.ic10 = para10(indCalor);   r.ib10 = para10(ibutg);  r.ta10 = para10(aguaTemp);
  r.aa = aguaAcabaEmMin;       r.msp = minutosSemPausa;
  r.estado = estado; r.sol = solDireto; r.pz = pausasHoje; r.ep = emPausa;
  r.pr = pausaRecomendada; r.me = malEstarHoje; r.sa = estadoAgua; r.ga = galaoPct;
  return r;
}

void campo(char* msg, size_t tam, const char* chave, int16_t v10) {   // acrescenta "|chave|valor" se houver valor
  if (v10 == SEM_VALOR) return;
  size_t n = strlen(msg);
  snprintf(msg + n, tam - n, "%s%s|%.1f", n ? "|" : "", chave, v10 / 10.0);
}

void texto(char* msg, size_t tam, const char* chave, const char* valor) {
  size_t n = strlen(msg);
  snprintf(msg + n, tam - n, "%s%s|%s", n ? "|" : "", chave, valor);
}

void inteiro(char* msg, size_t tam, const char* chave, long valor) {
  size_t n = strlen(msg);
  snprintf(msg + n, tam - n, "%s%s|%ld", n ? "|" : "", chave, valor);
}

bool publicaRegistro(const Registro& r) {
  char msg[320] = "";
  campo(msg, sizeof(msg), "t", r.t10);
  campo(msg, sizeof(msg), "h", r.h10);
  campo(msg, sizeof(msg), "g", r.g10);
  campo(msg, sizeof(msg), "ic", r.ic10);
  campo(msg, sizeof(msg), "ib", r.ib10);
  texto(msg, sizeof(msg), "sol", r.sol ? "true" : "false");
  texto(msg, sizeof(msg), "st", NOMES_ESTADO[r.estado]);
  inteiro(msg, sizeof(msg), "msp", r.msp);
  inteiro(msg, sizeof(msg), "pz", r.pz);
  texto(msg, sizeof(msg), "ep", r.ep ? "true" : "false");
  texto(msg, sizeof(msg), "pr", r.pr ? "true" : "false");
  inteiro(msg, sizeof(msg), "me", r.me);
  if (r.ga >= 0) inteiro(msg, sizeof(msg), "ga", r.ga);
  campo(msg, sizeof(msg), "ta", r.ta10);
  if (r.aa >= 0) inteiro(msg, sizeof(msg), "aa", r.aa);
  texto(msg, sizeof(msg), "sa", NOMES_AGUA[r.sa]);
  if (r.epoch) {
    char hora[32];
    formataHora(r.epoch, hora, sizeof(hora));
    texto(msg, sizeof(msg), "ts", hora);
  }
  texto(msg, sizeof(msg), "fw", FW_VERSION);

  bool ok = MQTT.publish(topicAttrs, msg);
  Serial.print(ok ? "- Enviado: " : "- Falha ao enviar: ");
  Serial.println(msg);
  return ok;
}

void esvaziaBuffer() {   // reenvia aos poucos (5 por volta) para nao travar
  if (!MQTT.connected() || bufN == 0) return;
  uint8_t enviados = 0;
  while (bufN && enviados < 5) {
    if (!publicaRegistro(buf[bufIni])) break;
    bufIni = (bufIni + 1) % BUF_MAX;
    bufN--;
    enviados++;
  }
  if (enviados) {
    salvaBuffer();
    Serial.printf("- Buffer: %u reenviados, faltam %u\n", enviados, bufN);
  }
}

void telemetria() {
  if (!temLeitura) return;
  if (!publicarJa && tPub != 0 && millis() - tPub < intervaloMs) return;
  publicarJa = false;
  tPub = millis();
  Registro r = registroAtual();
  if (MQTT.connected() && bufN == 0) {
    if (!publicaRegistro(r)) guardaNoBuffer(r);
  } else {
    guardaNoBuffer(r);
  }
}

// ============================================================
//  Comandos recebidos por MQTT
// ============================================================
bool parseFloats(const String& s, float* out, int n) {
  int pos = 0;
  for (int i = 0; i < n; i++) {
    int virg = s.indexOf(',', pos);
    String parte = (virg < 0) ? s.substring(pos) : s.substring(pos, virg);
    if (parte.length() == 0) return false;
    out[i] = parte.toFloat();
    if (virg < 0) return i == n - 1;
    pos = virg + 1;
  }
  return true;
}

bool executaComando(const String& cmd, const String& params) {
  float v[3];
  if (cmd == "setLimites") {
    if (!parseFloats(params, v, 3)) return false;
    if (!(v[0] >= 20 && v[0] < v[1] && v[1] < v[2] && v[2] <= 60)) return false;
    for (int i = 0; i < 3; i++) lim[i] = v[i];
    prefs.putFloat("l0", lim[0]); prefs.putFloat("l1", lim[1]); prefs.putFloat("l2", lim[2]);
    tLeitura = 0;
    return true;
  }
  if (cmd == "setRegime") {   // RN01: o regime vem da empresa
    if (!parseFloats(params, v, 3)) return false;
    if (v[0] < 10 || v[0] > 3600 || v[1] < 1 || v[1] > 600 || v[2] < 1 || v[2] > 600) return false;
    pausaMinS = v[0]; maxAtencaoMin = v[1]; maxCriticoMin = v[2];
    prefs.putUShort("pMin", pausaMinS); prefs.putUShort("mxA", maxAtencaoMin); prefs.putUShort("mxC", maxCriticoMin);
    return true;
  }
  if (cmd == "setGalao") {
    if (!parseFloats(params, v, 3)) return false;
    if (!(v[0] > 0 && v[0] < v[1] && v[1] < 400 && v[2] > 0 && v[2] < 60)) return false;
    distCheio = v[0]; distVazio = v[1]; limiteAguaQuente = v[2];
    prefs.putFloat("dCh", distCheio); prefs.putFloat("dVz", distVazio); prefs.putFloat("aQ", limiteAguaQuente);
    amN = 0;
    return true;
  }
  if (cmd == "setIntervalo") {
    long s = params.toInt();
    if (s < 10 || s > 3600) return false;
    intervaloMs = s * 1000UL;
    prefs.putULong("intv", intervaloMs);
    return true;
  }
  if (cmd == "identify") {
    identificaAte = millis() + 5000;
    return true;
  }
  return false;
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.print("- Comando recebido: ");
  Serial.println(msg);
  int at = msg.indexOf('@');
  int bar = msg.indexOf('|');
  if (at < 0 || bar < 0) return;
  String dev = msg.substring(0, at);
  String cmd = msg.substring(at + 1, bar);
  String params = msg.substring(bar + 1);
  if (dev != DEVICE_ID) return;
  bool ok = executaComando(cmd, params);
  String resp = String(DEVICE_ID) + "@" + cmd + "|" + (ok ? "ok" : "erro");
  MQTT.publish(topicCmdExe, resp.c_str());
}

// ============================================================
//  Conexao (sem bloquear o loop)
// ============================================================
// Nome legivel do estado do Wi-Fi (para o Serial Monitor)
const char* nomeWifi(int st) {
  switch (st) {
    case WL_IDLE_STATUS: return "ocioso";
    case WL_NO_SSID_AVAIL: return "rede nao encontrada";
    case WL_CONNECTED: return "conectado";
    case WL_CONNECT_FAILED: return "falhou";
    case WL_CONNECTION_LOST: return "conexao perdida";
    case WL_DISCONNECTED: return "desconectado";
    default: return "outro";
  }
}

void conectaRede() {
  static bool avisouConexao = false;
  static int ultimoStatus = -99;
  int st = WiFi.status();
  if (st != ultimoStatus) {                       // mostra cada mudanca de estado do Wi-Fi
    Serial.printf("- Wi-Fi: %s (%d) aos %lus\n", nomeWifi(st), st, millis() / 1000);
    ultimoStatus = st;
  }
  if (WiFi.status() == WL_CONNECTED) {
    if (!avisouConexao) {
      avisouConexao = true;
      Serial.print("Wi-Fi conectado, IP ");
      Serial.println(WiFi.localIP());
    }
    if (!ntpPedido) {
      configTime(-3 * 3600, 0, "pool.ntp.org", "time.google.com");   // Brasilia
      ntpPedido = true;
    }
    return;
  }
  avisouConexao = false;
  // 30 s entre tentativas: desconectar no meio de uma conexao lenta faz ela nunca terminar
  if (tWifiTentativa != 0 && millis() - tWifiTentativa < 30000) return;
  tWifiTentativa = millis();
  Serial.printf("Conectando ao Wi-Fi: %s (status anterior %d)\n", WIFI_SSID, (int)WiFi.status());
  WiFi.disconnect();
#if SIMULACAO_WOKWI
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);   // canal 6: o Wokwi-GUEST conecta mais rapido
#else
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
#endif
}

void conectaMqtt() {
  if (WiFi.status() != WL_CONNECTED || MQTT.connected()) return;
  if (tMqttTentativa != 0 && millis() - tMqttTentativa < 5000) return;
  tMqttTentativa = millis();
  Serial.printf("* Conectando ao broker: %s:%d\n", MQTT_BROKER, MQTT_PORT);
  if (MQTT.connect(clientId)) {
    Serial.println("Conectado ao broker MQTT!");
    MQTT.subscribe(topicCmd);
    publicarJa = true;
  } else {
    // Codigos do PubSubClient: -4 sem resposta (timeout), -3 conexao perdida, -2 nao abriu a conexao
    // (DNS, porta ou internet), -1 desconectado, 1 a 5 = o broker recusou (protocolo, id, usuario/senha)
    Serial.printf("Falha no broker (codigo %d), nova tentativa em 5 s\n", MQTT.state());
  }
}

// ============================================================
//  setup / loop
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("Pausa Certa Node " FW_VERSION " - estresse termico, pausas e agua");

  pinMode(PIN_VERDE, OUTPUT);
  pinMode(PIN_AMARELO, OUTPUT);
  pinMode(PIN_VERMELHO, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_BOTAO, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_BOTAO), isrBotao, CHANGE);
  semaforo(false, false, false);
#if !SIMULACAO_WOKWI
  digitalWrite(PIN_BUZZER, BUZZER_ATIVO_EM_LOW ? HIGH : LOW);
#endif
  analogReadResolution(12);

  pinMode(PIN_TFT_LED, OUTPUT);
  digitalWrite(PIN_TFT_LED, HIGH);                    // luz de fundo
  SPI.begin(PIN_TFT_SCK, -1, PIN_TFT_MOSI, PIN_TFT_CS);   // SPI nos pinos escolhidos para o diagrama
  tft.begin();
  tft.setRotation(0);                                 // em pe, 240x320
  tft.fillScreen(COR_FUNDO);
  centro("Pausa Certa", 120, 3, COR_VERDE);
  centro("Node v" FW_VERSION, 160, 2, COR_TEXTO);

  dht.begin();
  globo.begin();
  globo.setWaitForConversion(false);       // a conversao (~750 ms) acontece entre as leituras
  globo.requestTemperatures();
  sensorAgua.begin();
  sensorAgua.setWaitForConversion(false);
  sensorAgua.requestTemperatures();

  carregaConfig();
  carregaBuffer();
  Serial.printf("Limites IC: %.0f/%.0f/%.0f C | Regime: pausa min %us, max sem pausa %u min (atencao) e %u min (critico)\n",
                lim[0], lim[1], lim[2], (unsigned)pausaMinS, (unsigned)maxAtencaoMin, (unsigned)maxCriticoMin);

  snprintf(topicAttrs, sizeof(topicAttrs), "/%s/%s/attrs", API_KEY, DEVICE_ID);
  snprintf(topicCmd, sizeof(topicCmd), "/%s/%s/cmd", API_KEY, DEVICE_ID);
  snprintf(topicCmdExe, sizeof(topicCmdExe), "/%s/%s/cmdexe", API_KEY, DEVICE_ID);
  snprintf(clientId, sizeof(clientId), "pausacerta_%s%s", DEVICE_ID, CLIENT_SUFIXO);

  WiFi.mode(WIFI_STA);
  MQTT.setServer(MQTT_BROKER, MQTT_PORT);
  MQTT.setCallback(mqttCallback);
  MQTT.setSocketTimeout(6);   // brokers publicos (e o Wokwi) podem levar alguns segundos para responder
  MQTT.setKeepAlive(30);
  MQTT.setBufferSize(512);

  tUltimaPausa = millis();   // o turno comeca quando o caminhao liga
  delay(1500);

  xTaskCreatePinnedToCore(tarefaAtuadores, "atuad", 4096, NULL, 2, NULL, 1);
  xTaskCreatePinnedToCore(tarefaTela,      "tela",  6144, NULL, 1, NULL, 1);
}

void loop() {
  conectaRede();
  conectaMqtt();
  MQTT.loop();

  bool mq = MQTT.connected();
  if (mq) tUltimoMqttOk = millis();
  wifiOk = (WiFi.status() == WL_CONNECTED);
  mqttOk = mq;
  offlineLocal = !mq && (millis() - tUltimoMqttOk > OFFLINE_APOS_MS);

  confereVirada();
  trataBotao();
  leSensores();       // decide sempre no proprio Node (offline-first)
  atualizaPausas();
  esvaziaBuffer();
  telemetria();
}
