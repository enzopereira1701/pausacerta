# Firmware do Pausa Certa Node

Código do ESP32 em Arduino (`pausacerta_node/pausacerta_node.ino`). Versão atual: **0.2**, com os três módulos no mesmo
ESP32. Estrutura, protocolo e estilo seguem o **WineGuard Node 2.3**, projeto anterior do grupo.

## O que faz

**Node A, calor:** DHT22 (ar), DS18B20 dentro de um globo negro e LDR (sol direto). Média móvel de 6 leituras; descarta
`NaN` e −127 °C. Calcula índice de calor (NOAA), bulbo úmido (Stull) e IBUTG estimado. Estados com histerese de 1 °C.
"Globo estabilizando" pela derivada da temperatura do globo.

**Node B, pausas:** botão PAUSA na traseira. Um clique inicia e encerra a pausa; a pausa só conta para o regime se durar
o mínimo, mas **nunca é bloqueada** (RN02). Conta minutos sem pausa e pausas do dia. Quando o tempo sem pausa passa do
limite do regime para o estado atual, acende **pausa recomendada** (vermelho + amarelo) e a tela pede para parar **na
próxima parada da rota** (RN07). Dois toques longos registram uma ocorrência de mal-estar **anônima** da equipe.

**Node C, água:** HC-SR04 na tampa do galão (mediana de 5 leituras) e DS18B20 dentro dele. Nível em %, aviso de reposição,
água quente e **previsão de quando vai acabar** pela tendência de consumo (reta de mínimos quadrados nas últimas 12 amostras).

**Rede:** MQTT (Ultralight 2.0) a cada 60 s e na hora em que algo muda; buffer offline de 60 envios na memória, reenviados
quando a conexão volta (na garagem). FreeRTOS: uma tarefa cuida do semáforo, do buzzer e do botão; outra da tela; o `loop()`
cuida de rede, sensores e telemetria. A sinalização não trava sem rede.

## Pinos

| Componente | Pino | Observação |
|---|---|---|
| DHT22 | 16 (RX2) | |
| DS18B20 do globo | 4 | Em módulo com resistor de 4,7 kΩ |
| DS18B20 da água | 15 | À prova d'água, em módulo com resistor |
| LDR (módulo) | 34 (ADC1) | |
| HC-SR04 | TRIG 5, ECHO 17 (TX2) | Na placa: HC-SR04P (3,3 V) |
| Botão PAUSA | 2 | Pull-up interno e interrupção: um clique basta |
| Semáforo | verde 25, amarelo 26, vermelho 27 | Resistores de 220 Ω |
| Buzzer | 33 | |
| Tela colorida ILI9341 2,8" (SPI) | CS 23, D/C 22, MOSI 21, SCK 19, luz de fundo 18 | RST livre (reset por software); na placa, ligar RST ao 3V3 |

Os pinos foram escolhidos para o diagrama não ter nenhum fio de sinal cruzando outro.

## Sinais

| Situação | Semáforo (traseira) | Tela (cabine) | Bipes |
|---|---|---|---|
| NORMAL (índice < 27 °C) | Verde | Trabalho normal | 1 curto ao descer |
| ATENÇÃO (27 a 32 °C) | Amarelo | Agua e sombra | 1 |
| CRÍTICO (32 a 41 °C) | Vermelho | PAUSA NA SOMBRA | 2 |
| PERIGO (≥ 41 °C) | Vermelho piscando | SUSPENDER PESADO | 3 |
| Pausa recomendada | Vermelho + amarelo | PARE NA PROX PARADA | 1 longo |
| Em pausa | Verde piscando | EM PAUSA mm:ss | 1 ao iniciar, 2 ao registrar |
| Falha do DHT22 ou iniciando | Amarelo piscando | Confira o DHT22 | 1 curto |
| Água acabando | (não muda o semáforo) | REPOR AGUA JA | 2 longos |

## Telemetria e comandos

```
t|34.2|h|46.0|g|47.5|ic|37.5|ib|30.5|sol|true|st|CRITICO|msp|52|pz|3|ep|false|pr|true|me|0|ga|35|ta|31.0|aa|45|sa|REPOR|ts|...|fw|0.2

setLimites|27,32,41      índice de calor para ATENCAO, CRITICO, PERIGO
setRegime|300,90,50      pausa mínima (s), máx. sem pausa em ATENCAO e em CRITICO (min)
setGalao|5,45,30         distância cheio (cm), distância vazio (cm), limite de água quente (°C)
setIntervalo|60          envio periódico (s)
identify|                pisca o semáforo por 5 s
```

| Chave | Atributo (contrato `EquipeCampo`) | Chave | Atributo |
|---|---|---|---|
| `t` | `temperatura_c` | `msp` | `minutosSemPausa` |
| `h` | `umidade_pct` | `pz` | `pausasHoje` |
| `g` | `globo_c` | `ep` | `emPausa` |
| `sol` | `solDireto` | `pr` | `pausaRecomendada` |
| `ic` | `indiceCalor_c` | `me` | `malEstarHoje` |
| `ib` | `ibutgEstimado_c` | `ga` | `galao_pct` |
| `st` | `estado` | `ta` | `aguaTemp_c` |
| `ts` | `timestamp` | `aa` | `aguaAcabaEmMin` |
| `fw` | `firmware` | `sa` | `estadoAgua` |

## Regime de pausas

Os números padrão são **exemplos** para a demonstração. Quem define é a empresa com a segurança do trabalho (RN01), pelo
comando `setRegime`. No Wokwi os tempos são curtos (20 s, 3 min, 1 min) para caber no vídeo; na placa, 300 s, 90 min e 50 min.

## Como gravar na placa

1. Arduino IDE com o pacote **esp32 (Espressif Systems)**.
2. Bibliotecas: PubSubClient, DHT sensor library (e Adafruit Unified Sensor), OneWire, DallasTemperature, Adafruit GFX Library e Adafruit ILI9341 (com a Adafruit BusIO).
3. Copie `config.example.h` para `config.h` (`SIMULACAO_WOKWI` **0** na bancada). O `config.h` não vai para o GitHub.
4. Placa DOIT ESP32 DEVKIT V1.

Compilado sem erros nem avisos no pacote esp32 2.0.17, nos modos Wokwi e placa (62% da flash).

## Histórico

| Versão | O que mudou |
|---|---|
| 0.1 | Node A: calor, estados, buffer offline |
| 0.2 | Nodes B e C; semáforo de 3 LEDs no lugar do LED RGB; tela colorida ILI9341 no lugar do LCD 16x2 (painel único com estado na cor do semáforo, barras de pausa e de água); botão por interrupção (um clique basta); pinos reorganizados para o diagrama sem cruzamento de sinais; Wi-Fi mais paciente no Wokwi |

## Limitações

- IBUTG estimado, não medido pela NHO 06; o sistema não diz "insalubre" nem "dentro da norma".
- Com o caminhão andando, o vento esfria o globo e a água balança: as leituras válidas são as das paradas.
- O contador de pausas zera quando a data muda (precisa de NTP); sem rede, zera ao ligar o caminhão.
