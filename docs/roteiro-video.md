# Roteiro do vídeo: Pausa Certa (Edge)

**Duração:** até 7 minutos, narrado pela equipe. **Publicação:** YouTube, público ou não listado (testar o link numa janela anônima). Link final em [`../video/link.md`](../video/link.md).

## Antes de gravar

- [ ] Start Lab, IP do dia no `config.h` do Wokwi e `docker compose up -d` em `~/fiware`.
- [ ] Wokwi com o firmware mais recente e a aba `libraries.txt` com esse nome exato.
- [ ] Serial Monitor visível ao lado do circuito.
- [ ] Wokwi e dashboard **lado a lado** (janelas separadas e visíveis): escondido, o Wokwi quase para e perde os comandos.
- [ ] Terminal SSH da instância pronto para o `bash testa_fiware.sh`.
- [ ] Dashboard aberto (quando estiver pronto).
- [ ] Nenhuma janela mostrando senha ou o IP completo.
- [ ] Gravar em blocos: é mais fácil refazer um bloco do que o vídeo inteiro.

## Roteiro

| Tempo | Parte | O que mostrar e falar |
|---|---|---|
| 0:00–1:00 | **A ideia** | Quem é o cidadão (gari da coleta), o problema em uma frase, onde o dispositivo fica (caminhão: lateral, traseira, cabine) e os ODS 8, 3, 13 e 10. Uma fala: "A gente nunca para porque tá quente ou porque cansou" (Jackson) |
| 1:00–2:15 | **O circuito** | Cada componente no Wokwi e por que está ali (tabela em [`../hardware/esquema-ligacao.md`](../hardware/esquema-ligacao.md)). Diagrama sem fio de sinal cruzando outro |
| 2:15–3:30 | **A lógica** | No código: `LIM_PADRAO` (27, 32, 41, NOAA) e `HISTERESE_C`; `proximoEstado()`; o descarte de NaN e −127 em `leCalor()`; a `struct Media`; o uso de `millis()` e das tarefas FreeRTOS |
| 3:30–5:30 | **Simulação comentada** | As tabelas abaixo (calor, pausas e água), com o Serial Monitor ao lado |
| 5:30–6:30 | **Nuvem (camadas 2 e 3)** | `testa_fiware.sh` na instância: a entidade mudando no Orion, o `setRegime` chegando ao Wokwi (`Comando recebido`) e o histórico no STH-Comet. Depois o dashboard |
| 6:30–7:00 | **Fechamento** | Sem sinal o Node continua avisando e reenvia na garagem; o que a empresa vê no painel; uma fala do Sandro: "Se o patrão concordasse em fazer as pausas, a luz ajudaria muito para saber o momento da pausa" |

### Calor

| Ação no Wokwi | Resultado esperado |
|---|---|
| DHT22 em 25 °C / 50 % | NORMAL: verde, "Trabalho normal" |
| 30 °C / 50 % | ATENÇÃO (índice ≈ 31 °C): amarelo, 1 bipe |
| 34 °C / 50 % | CRÍTICO (≈ 38 °C): vermelho, 2 bipes, "PAUSA NA SOMBRA" |
| 38 °C / 50 % | PERIGO (≈ 49 °C): vermelho piscando, 3 bipes |
| Descer devagar | Só desce 1 °C abaixo do limite (histerese) |

### Pausas

| Ação | Resultado esperado |
|---|---|
| 1 min em CRÍTICO sem apertar o botão | Pausa recomendada: vermelho + amarelo, "PARE NA PROX PARADA" |
| Um clique, esperar 20 s, outro clique | Verde piscando durante a pausa; depois "PAUSA OK" e o contador sobe |
| Dois toques longos | "MAL-ESTAR", 3 bipes |

### Água

| Ação | Resultado esperado |
|---|---|
| HC-SR04 de 10 para 40 cm | "Agua ok" → "REPOR AGUA JA", 2 bipes longos |
| Subir a distância aos poucos (10, 20, 30 cm, uns 15 s entre cada) | Aparece "Acaba em ~N min" |

**Dica:** a média móvel muda o valor aos poucos. Esperem uns 12 s depois de mexer no sensor antes de comentar.

## Perguntas que o vídeo deve responder

- **Por que índice de calor e não só temperatura?** O corpo sente calor e umidade juntos; as faixas da NOAA têm fonte.
- **Por que não IBUTG como critério?** O ESP32 só estima o IBUTG (não tem bulbo úmido natural).
- **Por que "recomendada" e não "obrigatória"?** A coleta é por rota; o Node recomenda a próxima parada e quem decide é a equipe. A pausa nunca é bloqueada.
- **De onde vêm os tempos do regime?** São exemplos; a empresa define com a segurança do trabalho pelo `setRegime`.
