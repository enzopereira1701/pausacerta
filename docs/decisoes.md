# Pausa Certa: decisões do projeto (Edge)

Ficha de decisões da parte de Edge da **Global Solution 2026.2 (CitizenTech)**. Cole este arquivo no começo de uma conversa nova para retomar de onde paramos.

- **Produto:** Pausa Certa, estação de estresse térmico no caminhão da coleta de lixo
- **Cidadão:** gari da coleta (entrevistas com Sandro, Jackson e um coletor anônimo em 9/11/2026)
- **Entrega:** 19/11/2026, 23h55 (link do Wokwi e vídeo de até 7 min no Teams)
- **Última atualização:** 10/11/2026

## 1. Escopo de Edge

**Dentro:** Node com três módulos num ESP32 (calor, pausas, água); sinalização local (semáforo, buzzer, tela); MQTT para o FIWARE na AWS; histórico no STH-Comet; comandos de volta ao Node; dashboard próprio de Edge.

**Fora:** o painel do encarregado (é de Front-end e Web), o relatório semanal (Python), login, MQTT com TLS, GPS do caminhão.

## 2. Decisões e por quê

| Decisão | Por quê |
|---|---|
| **Índice de calor da NOAA decide o estado**; IBUTG só como estimativa | A norma (NR-09, Anexo III) usa o IBUTG, mas o ESP32 não mede o bulbo úmido natural. Dizer "IBUTG" como critério seria prometer o que não medimos |
| Faixas **27 / 32 / 41 °C** | Cautela, cautela extrema e perigo da NOAA, com fonte pública |
| **Histerese de 1 °C** e **média móvel de 6** | Sem elas o semáforo troca de cor sem parar perto do limite, e uma leitura errada muda o estado |
| **Globo negro** (DS18B20 numa bola preta) | Mede o calor do sol e do asfalto, que o ar não mostra. O coletor anônimo: mais quente "quando o céu está limpíssimo" |
| **"Pausa recomendada", nunca obrigatória**, na **próxima parada natural** | A coleta é por rota; parar no meio atrasa a volta para casa. O Node recomenda e registra; a pausa nunca é bloqueada (RN02, RN07) |
| **Regime configurável** (`setRegime`) | Os tempos são da empresa com a segurança do trabalho, não nossos. Os números do firmware são exemplos |
| **Semáforo de 3 LEDs** no lugar do LED RGB | Todo mundo entende de longe; e o RGB obrigava um fio a cruzar outro no diagrama |
| **Tela colorida ILI9341** no lugar de LCD ou OLED | O motorista vê o estado na cor do semáforo; o OLED do Wokwi é monocromático |
| **Botão por interrupção** (um clique) | Com debounce por tempo, o Wokwi lento exigia segurar o botão |
| **Bipe só quando algo muda** | A rua é barulhenta e bipe contínuo vira ruído; a luz é o sinal principal |
| **Mal-estar anônimo** (dois toques longos) | Registra o problema da equipe sem expor quem passou mal |
| **Node C, água** (nível, temperatura, previsão) | Jackson: a água "esquenta muito", "acabou e demorou pra colocar outra" |
| **Buffer offline de 60 envios** | Sem sinal na rota, o Node continua avisando e reenvia na garagem |
| **FIWARE na AWS** (o mesmo do WineGuard) | O briefing aceita FIWARE ou IoT Cloud; o grupo já tinha a base e o `provisionar.sh` |
| Entidade **`EquipeCampo`** por equipe, não por dispositivo | Front, Web e Python leem a equipe; o Node é um detalhe de quem mede |
| Dashboard de Edge **separado** do painel de Front e Web | Cada disciplina entrega o seu; o de Edge prova o dispositivo e a nuvem |

## 3. Lições aprendidas

- **Wokwi e protótipos do Arduino:** `struct` usada em função precisa ficar no topo do código, e argumento padrão quebra o protótipo gerado. Compilamos com o mesmo `ctags` do Wokwi para pegar isso antes.
- **Wi-Fi no Wokwi:** usar o canal 6 (`WiFi.begin(ssid, senha, 6)`) e esperar 30 s entre tentativas.
- **Broker:** `MQTT.setSocketTimeout(6)`; com 2 s, brokers públicos davam código −4 (sem resposta).
- **Aba do Wokwi:** o arquivo tem que se chamar exatamente `libraries.txt`; com outro nome, as bibliotecas não instalam.
- **IP do Learner Lab muda a cada sessão:** trocar o `MQTT_BROKER` no `config.h` do Wokwi. O cadastro no FIWARE continua (fica no MongoDB).
- **STH-Comet grava em UTC.**
- **Do WineGuard:** cadastrar o dispositivo **com a `apikey`**; depois de reiniciar o Mosquitto, reiniciar o IoT Agent.

## 4. Status (10/11/2026)

| Parte | Estado |
|---|---|
| Firmware 0.2 (Nodes A, B e C) no Wokwi | Pronto e rodando |
| FIWARE na AWS: telemetria, comando `setRegime` e histórico | Testado com `testa_fiware.sh` |
| Dashboard de Edge | Pronto (simulador e backend) |
| Backend FastAPI | Pronto e testado; falta subir na instância (12/11) |
| Vídeo | A gravar (14/11) |
