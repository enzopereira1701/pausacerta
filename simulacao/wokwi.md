# Simulação no Wokwi

**Projeto:** https://wokwi.com/projects/480299618436453377

Simula a estação Pausa Certa no caminhão de coleta, com os três módulos num único ESP32:

| Módulo | Peças no Wokwi | Onde ficaria no caminhão |
|---|---|---|
| **Node A, calor** | DHT22 (ar), DS18B20 "Globo", LDR (sol) | Lateral externa, ao sol, longe do escapamento |
| **Node B, pausas** | Botão vermelho PAUSA | Traseira, ao alcance dos coletores |
| **Node C, água** | HC-SR04 (nível) e DS18B20 "Água" | Tampa e interior do galão |
| **Respostas** | Semáforo de 3 LEDs, buzzer, tela colorida ILI9341 | Semáforo e buzzer na traseira; tela na cabine |

## Arquivos desta pasta

| Arquivo | Para quê |
|---|---|
| `diagram.json` | O circuito (cole na aba `diagram.json`). Gerado por `tools/gera_diagrama.py`, com fios em ângulo reto |
| `libraries.txt` | As bibliotecas (cole na aba `libraries.txt`) |

O código é `hardware/firmware/pausacerta_node/pausacerta_node.ino` (cole na aba `sketch.ino`). Crie a aba `config.h` com o
conteúdo do `config.example.h`.

## Como usar

1. Projeto **ESP32 Arduino** no Wokwi (wokwi.com/projects/new/esp32). Cole `sketch.ino`, `diagram.json`, `libraries.txt` e crie `config.h`.
2. No `config.h`: `SIMULACAO_WOKWI 1`, `WIFI_SSID "Wokwi-GUEST"`, `MQTT_BROKER` com o IP público da instância do FIWARE (muda a cada sessão do Learner Lab; sem broker o Node funciona e mostra OFFLINE).
3. Play. O circuito começa em 34,2 °C, 46 % e globo a 47,5 °C: índice de calor ≈ 37,5 °C, **CRÍTICO**.

No Wokwi o regime de pausas usa **tempos curtos de demonstração**: pausa mínima de 20 s, pausa recomendada depois de
1 min sem pausa em CRÍTICO e 3 min em ATENÇÃO. Na placa, os padrões são 5 min, 50 min e 90 min, e quem define de verdade
é a empresa (comando `setRegime`).

## Roteiro de demonstração (vídeo)

**Node A, calor**

| Ação | O que acontece |
|---|---|
| DHT22 em 25 °C / 50 % | NORMAL: LED verde, "Trabalho normal" |
| 30 °C / 50 % | ATENÇÃO (índice ≈ 31 °C): amarelo, 1 bipe, "Agua e sombra" |
| 34 °C / 50 % | CRÍTICO (≈ 38 °C): vermelho, 2 bipes, cartão vermelho na tela, "PAUSA NA SOMBRA" |
| 38 °C / 50 % | PERIGO (≈ 49 °C): vermelho piscando, 3 bipes, "SUSPENDER PESADO" |
| Descer devagar | Só desce 1 °C abaixo do limite (histerese) |
| Globo de 47,5 para 30 °C | "*" ao lado do globo por 30 a 60 s (estabilizando) |
| Parar, apagar o fio de dados do DHT22 e rodar | FALHA: amarelo piscando, "Confira o DHT22" (depois Ctrl+Z) |

**Node B, pausas**

| Ação | O que acontece |
|---|---|
| Ficar 1 min em CRÍTICO sem apertar o botão | **Pausa recomendada**: vermelho + amarelo acesos, bipe longo, faixa laranja "PARE NA PROX PARADA" na tela |
| Um clique no botão | Pausa iniciada: verde piscando, cartão verde "EM PAUSA" com cronômetro |
| Clique de novo antes de 20 s | "CURTA: Abaixo do minimo" (a pausa nunca é bloqueada, só não conta) |
| Clique de novo depois de 20 s | "PAUSA OK", 2 bipes; "Pausas hoje" sobe e o tempo sem pausa zera |
| Dois toques longos (segurar 2 s, duas vezes em 8 s) | "MAL-ESTAR", 3 bipes: ocorrência anônima da equipe |

**Node C, água** (clique no HC-SR04 e mude a distância)

| Distância | Nível | O que acontece |
|---|---|---|
| 10 cm | ≈ 88 % | "Agua ok" e barra azul quase cheia |
| 30 cm | ≈ 38 % | "Repor em breve", barra amarela |
| 40 cm | ≈ 13 % | "REPOR AGUA JA", barra vermelha, 2 bipes longos |
| 44 cm | ≈ 3 % | "SEM AGUA" |
| Aumentar a distância aos poucos, de 10 em 10 s | A faixa da água passa a mostrar "Acaba em ~N min", pela tendência de consumo |
| Sensor "Água" acima de 30 °C | "QUENTE" ao lado da temperatura da água |

O nível considera um galão de exemplo: 5 cm do sensor até a água cheio, 45 cm vazio (comando `setGalao` para outro galão).

## Observações

- No Wokwi o buzzer toca por `tone()`. Na placa o buzzer é ativo (`SIMULACAO_WOKWI` escolhe).
- Na placa: use o **HC-SR04P** (versão de 3,3 V) e DS18B20 em módulo com resistor de 4,7 kΩ (ou um resistor entre DQ e VCC).
- O índice de calor usa as faixas da NOAA como **triagem**. O IBUTG é uma **estimativa** e não substitui a NHO 06.
- O diagrama tem 4 cruzamentos, todos de alimentação (descida do 3V3 sobre o barramento de GND). Nenhum fio de sinal cruza outro.
- Botão: um clique inicia ou encerra a pausa (interrupção). Segurar 1,5 s ou mais conta como toque longo.

## A tela da cabine

Tela colorida ILI9341 de 2,8" (240x320), num painel único que só redesenha o que muda:

| Faixa | O que mostra |
|---|---|
| Topo | Equipe e status da nuvem (verde NUVEM, vermelho OFFLINE) |
| Cartão | O estado na **cor do semáforo** (verde, amarelo, vermelho, vermelho piscando em PERIGO); em pausa, cartão verde "EM PAUSA" com cronômetro |
| Ação | A ação para o motorista; em pausa recomendada, **faixa laranja** "PARE NA PROX PARADA" |
| Leituras | Índice de calor na cor do estado, IBUTG estimado, ar, globo e sol |
| Pausas | Minutos sem pausa contra o limite, com barra verde → amarela → vermelha; pausas e mal-estar do dia |
| Água | Nível com barra azul, amarela ou vermelha; temperatura (laranja e "QUENTE" acima do limite); previsão de quando acaba |

Mensagens rápidas (pausa iniciada, pausa registrada, mal-estar) aparecem num quadro azul por 3,5 s.
