# Roteiro do vídeo: Pausa Certa (Edge)

**Duração:** cerca de 6 min 30 s (limite de 7 min). **Narração:** ElevenLabs, a partir do texto da seção 3 (uns 710 palavras, perto de 4 min 45 s de fala; o resto do tempo é demonstração com só o som e os destaques na tela).
**Imagem:** gravações da tela do PC (seção 2), montadas com animações (motion) por cima.
**Publicação:** YouTube, não listado. Link final em [`../video/link.md`](../video/link.md).

## 1. Como produzir

1. **Narração (ElevenLabs):** gere **um áudio por bloco** (`narracao_1.mp3` a `narracao_7.mp3`), sempre com a mesma voz e as mesmas configurações. Assim, se um bloco precisar mudar, só ele é refeito.
   - Sugestão: voz masculina ou feminina em português do Brasil, modelo multilíngue, *stability* por volta de 50 % e *similarity* por volta de 75 %.
   - O texto já está escrito para ser lido em voz alta (números por extenso, siglas soletradas onde precisa). Cole como está.
2. **Gravações de tela:** um arquivo por clipe da seção 2 (`C01.mp4`, `C02.mp4`...), em **1920 × 1080**, 30 quadros por segundo, sem som. OBS Studio ou a gravação do Windows (Win + Alt + R) servem.
   - Grave **um pouco mais** do que o tempo indicado (uns 5 s antes e depois): a sobra é cortada na edição.
   - Mexa o mouse devagar e pare em cima do que está sendo mostrado.
   - Feche abas e notificações que não fazem parte do vídeo (favoritos, outras abas, avisos do Windows).
3. **Envio:** os áudios e os clipes. A edição junta tudo, sincroniza com a narração e acrescenta títulos, destaques, setas e legendas animadas.

### Antes de gravar (com a AWS ligada)

- [ ] Start Lab, `docker compose up -d` em `~/fiware` e o IP do dia no `config.h` do Wokwi e no `.env` do dashboard.
- [ ] Wokwi com o firmware mais recente, `libraries.txt` com esse nome e o Serial Monitor aberto.
- [ ] **Wokwi e dashboard lado a lado**, em janelas separadas e visíveis. Escondido, o Wokwi quase para e perde os comandos.
- [ ] Zoom do navegador em 100 %, sem barra de favoritos (Ctrl + Shift + B).

### Narrações gravadas (11/11)

| Bloco | Duração | Segmento no vídeo |
|---|---|---|
| 1 · problema | 43 s | ≈ 45 s |
| 2 · solução | 17 s | ≈ 20 s |
| 3 · circuito | 49 s | ≈ 50 s |
| 4 · lógica e código | 47 s | ≈ 50 s |
| 5 · simulação | 49 s | ≈ 1 min 25 s (a fala é dividida nas pausas entre as frases, para cada uma cair junto com a cena) |
| 6 · nuvem | 36 s | ≈ 1 min |
| 7 · fechamento | 18 s | ≈ 25 s |
| **Total** | **4 min 18 s** | **≈ 5 min 35 s** |

Esperas longas nas gravações (média móvel, pausa de 25 s, Node indo para "Sem conexão") são aceleradas na edição, com um selo "acelerado". Gravem no tempo real, sem pressa.

## 2. Clipes para gravar

| Clipe | Bloco | O que gravar | Duração |
|---|---|---|---|
| **C01** | 1 | Dashboard, tela **Início**: parado no topo uns 3 s, depois rolando devagar até o fim do "O que pesa na rota" | 25 s |
| **C02** | 1 | Início: a fala em destaque do Jackson (faixa verde) e o "Como funciona" | 15 s |
| **C03** | 2 | Wokwi, **circuito inteiro** parado, com a simulação rodando | 10 s |
| **C04** | 3 | Wokwi: o mouse passando devagar por cada componente, na ordem DHT22, globo, LDR, HC-SR04, sensor da água, botão, semáforo, buzzer e tela (uns 5 s em cada) | 55 s |
| **C05** | 3 | `hardware/esquema-ligacao.png` aberto em tela cheia | 10 s |
| **C06** | 4 | VS Code ou aba `sketch.ino` do Wokwi, nesta ordem e com uns 7 s em cada: topo do arquivo (nomes e RMs), `LIM_PADRAO` e `HISTERESE_C`, `indiceCalor()`, `proximoEstado()`, `leCalor()` (descarte de NaN e −127), `struct Media`, as duas tarefas do FreeRTOS | 60 s |
| **C07** | 5 | Wokwi com o Serial ao lado. DHT22 em **25 °C** (verde), depois **30 °C** (amarelo), **34 °C** (vermelho) e **38 °C** (vermelho piscando). Espere uns 12 s em cada valor | 60 s |
| **C08** | 5 | Umidade em 50 %. DHT22 descendo de 38 para **30,5 °C**: o índice fica em 31,8 °C, já abaixo de 32, e o semáforo **continua vermelho**. Só em **29,5 °C** (índice 30,3 °C) vira amarelo (histerese) | 35 s |
| **C09** | 5 | Em CRÍTICO, esperar a **pausa recomendada** (vermelho e amarelo, "PARE NA PROX PARADA"); clicar no **botão PAUSA**, esperar uns 25 s ("EM PAUSA" e cronômetro), clicar de novo ("PAUSA OK") | 50 s |
| **C10** | 5 | HC-SR04 subindo aos poucos (10, 20, 30, 40 cm): "Acaba em ~N min" e depois "REPOR AGUA JA" | 35 s |
| **C11** | 6 | **Lado a lado:** Wokwi à esquerda e o **Painel** do dashboard à direita, mudando o DHT22 e o Painel acompanhando | 25 s |
| **C12** | 6 | **Lado a lado:** tela **Comandos**, enviar o regime "Demonstração no Wokwi (20 s, 3, 1)": aparece "Comando recebido" no Serial e "Confirmado pelo Node" no dashboard. Depois o **Identificar** (semáforo piscando) | 30 s |
| **C13** | 6 | **Histórico**, período 1 hora: o topo com os números e a faixa de estados, depois rolando pelos gráficos e passando o mouse em um ponto | 30 s |
| **C14** | 6 | Terminal SSH da instância rodando `sudo docker ps` (os contêineres do FIWARE e o `pausacerta-backend`) | 10 s |
| **C15** | 7 | Parar a simulação do Wokwi e mostrar o Painel indo para **Sem conexão** (espera de 2 min e meio: grave o fim) | 15 s |
| **C16** | 7 | Início do dashboard, faixa final (garis na sombra), até o rodapé com os nomes | 15 s |

O logo (`docs/imagens/pausacerta-logo.svg` e a versão clara) entra na abertura e no fim, como animação.

## 3. Narração (texto para o ElevenLabs)

### Bloco 1: o problema (≈ 0:00 a 0:55)

> Todo dia, garis da coleta de lixo correm atrás do caminhão e erguem sacos pesados no sol do meio-dia. Entrevistamos três deles para este projeto. O Jackson resumiu assim: "A gente nunca para porque tá quente ou porque cansou." O Sandro contou por quê: "Sabemos que o patrão ficaria irritado em perder tempo." Fora o intervalo obrigatório, ninguém para. A água do galão do caminhão esquenta e acaba antes da reposição. E falta um sinal claro, que a empresa reconheça, de quando parar. Este é o Pausa Certa, uma CitizenTech ligada aos Objetivos de Desenvolvimento Sustentável oito, três, treze e dez: trabalho seguro, saúde, adaptação ao clima e redução das desigualdades.

### Bloco 2: a solução (≈ 0:55 a 1:20)

> O Pausa Certa é uma estação instalada no próprio caminhão. Um ESP32 mede o calor de verdade, acende um semáforo na traseira, que a equipe vê de longe, e mostra a ação na tela da cabine, para o motorista escolher onde parar. Funciona sem celular e sem internet.

### Bloco 3: o circuito (≈ 1:20 a 2:30)

> São três módulos num só ESP32. O Node A mede o calor: o DHT22 lê a temperatura e a umidade do ar, à sombra. Um sensor DS18B20 dentro de uma bola preta funciona como termômetro de globo, e mede o calor do sol e do asfalto, que o ar não mostra. O LDR indica se há sol direto. O Node B cuida das pausas: um botão na traseira, onde um clique inicia e outro encerra a pausa. O Node C cuida da água: o sensor ultrassônico na tampa mede o nível do galão, e outro DS18B20 mede a temperatura da água. Para avisar, um semáforo de três LEDs, um buzzer e uma tela colorida na cabine. O diagrama foi gerado por um script, com os fios em ângulo reto e nenhum fio de sinal cruzando outro.

### Bloco 4: a lógica e o código (≈ 2:30 a 3:35)

> O estado é decidido pelo índice de calor da NOAA, que junta temperatura e umidade, como o corpo sente. As faixas são vinte e sete, trinta e dois e quarenta e um graus: atenção, crítico e perigo. O I-BU-TÊ-GÊ da norma brasileira aparece só como estimativa, porque o ESP32 não mede o bulbo úmido natural. Para o semáforo não ficar trocando de cor perto de um limite, usamos histerese de um grau. Leituras inválidas, como "não é número" ou menos cento e vinte e sete graus, são descartadas, e uma média móvel de seis leituras impede que um valor isolado mude o estado. O tempo é contado com millis, sem travar o programa, e duas tarefas do FreeRTOS cuidam do semáforo, do botão e da tela, mesmo sem rede.

### Bloco 5: a simulação (≈ 3:35 a 5:00)

> Vamos ver funcionando. Com o índice abaixo de vinte e sete graus, verde: trabalho normal. Em atenção, amarelo, com um bipe. Em crítico, vermelho, dois bipes, e a tela pede pausa na sombra. Em perigo, o vermelho pisca. Na descida, o estado só volta um grau abaixo do limite: essa é a histerese. Se a equipe passa do tempo combinado sem pausa, o semáforo acende vermelho e amarelo, e a tela pede para parar na próxima parada da rota. A pausa é recomendada, nunca obrigatória, e nunca é bloqueada, porque a coleta é por rota e quem decide é a equipe. Um clique no botão inicia a pausa, e o cronômetro aparece na cabine. Outro clique registra. No galão, o Node calcula a tendência de consumo, prevê quando a água vai acabar e avisa para repor antes disso.

### Bloco 6: a nuvem (≈ 5:00 a 6:05)

> As leituras sobem por MQTT para a plataforma FIWARE, na AWS. O IoT Agent traduz as mensagens, o Orion guarda o estado atual da equipe e o STH-Comet guarda o histórico. Um backend em FastAPI liga tudo ao nosso dashboard. Aqui, cada mudança no Wokwi aparece no painel em segundos. O caminho também funciona ao contrário: daqui, a empresa ajusta o regime de pausas, o comando desce até o ESP32, e o Node confirma. O histórico mostra o turno inteiro: quanto tempo a equipe passou em cada estado, as pausas e o nível do galão.

### Bloco 7: fechamento (≈ 6:05 a 6:30)

> Sem sinal na rota, o Node continua avisando a equipe e guarda até sessenta envios para mandar quando a conexão voltar. Nas palavras do Sandro: "Se o patrão concordasse em fazer as pausas, a luz ajudaria muito para saber o momento da pausa." Pausa Certa: a pausa certa, na hora do calor.

## 4. Mapa da edição

| Tempo | Narração | Imagem | Motion por cima |
|---|---|---|---|
| 0:00–0:55 | Bloco 1 | Logo animado (3 s) → C01 → C02 | As duas falas dos garis em destaque (texto grande, com o nome); selos dos ODS 8, 3, 13 e 10 |
| 0:55–1:20 | Bloco 2 | C03 | Rótulos "traseira", "cabine" e "lateral" apontando para semáforo, tela e sensores |
| 1:20–2:30 | Bloco 3 | C04 → C05 | Nome de cada componente e do Node (A, B ou C) aparecendo quando o mouse passa por ele |
| 2:30–3:35 | Bloco 4 | C06 | Faixas 27, 32 e 41 °C coloridas; destaque nas linhas de código citadas |
| 3:35–5:00 | Bloco 5 | C07 → C08 → C09 → C10 | Nome do estado na cor do semáforo; "histerese: 1 °C"; "pausa recomendada, nunca obrigatória" |
| 5:00–6:05 | Bloco 6 | Diagrama das 3 camadas (animado) → C11 → C12 → C13 → C14 | Setas Wokwi → MQTT → FIWARE → backend → dashboard; "comando confirmado pelo Node" |
| 6:05–6:30 | Bloco 7 | C15 → C16 → logo e nomes do grupo | Fala do Sandro em destaque; nomes e RMs no fim |

## 5. Perguntas que o vídeo responde

- **Por que índice de calor e não só temperatura?** O corpo sente calor e umidade juntos; as faixas da NOAA têm fonte (bloco 4).
- **Por que não IBUTG como critério?** O ESP32 só estima o IBUTG, porque não tem bulbo úmido natural (bloco 4).
- **Por que "recomendada" e não "obrigatória"?** A coleta é por rota; o Node recomenda a próxima parada, e quem decide é a equipe. A pausa nunca é bloqueada (bloco 5).
- **De onde vêm os tempos do regime?** São exemplos; a empresa define com a segurança do trabalho pelo comando `setRegime` (blocos 5 e 6).
- **E sem internet?** O Node continua avisando e guarda os envios para depois (bloco 7).

## 6. Valores de teste no Wokwi (referência para os clipes)

| Ação | Resultado esperado |
|---|---|
| DHT22 em 25 °C / 50 % | NORMAL: verde, "Trabalho normal" |
| 30 °C / 50 % | ATENÇÃO (índice ≈ 31 °C): amarelo, 1 bipe, "Agua e sombra" |
| 34 °C / 50 % | CRÍTICO (≈ 38 °C): vermelho, 2 bipes, "PAUSA NA SOMBRA" |
| 38 °C / 50 % | PERIGO (≈ 49 °C): vermelho piscando, 3 bipes, "SUSPENDER PESADO" |
| De CRÍTICO, descer para 30,5 °C / 50 % (índice 31,8 °C) | Continua CRÍTICO: só desce abaixo de 31 °C (histerese) |
| 29,5 °C / 50 % (índice 30,3 °C) | ATENÇÃO |
| 1 min em CRÍTICO sem pausa (regime de demonstração) | Pausa recomendada: vermelho e amarelo, "PARE NA PROX PARADA" |
| Um clique, esperar 25 s, outro clique | Verde piscando e "EM PAUSA" com cronômetro; depois "PAUSA OK" |
| Dois toques longos | "MAL-ESTAR", 3 bipes |
| HC-SR04 de 10 para 40 cm, aos poucos | "Acaba em ~N min", depois "REPOR AGUA JA" |

**Dica:** a média móvel muda o valor aos poucos. Espere uns 12 s depois de mexer num sensor.
