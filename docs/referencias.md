# Referências

Fontes usadas nos limites, nos cálculos e na justificativa do Pausa Certa. **Os limites do Node são uma triagem**: o sistema não diz "insalubre" nem "dentro da norma".

## Cálculos e limites

| O quê | Onde entra | Fonte |
|---|---|---|
| Índice de calor (equação de Rothfusz com os ajustes) e faixas de cautela (27 °C), cautela extrema (32 °C) e perigo (41 °C) | `indiceCalor()` e `LIM_PADRAO` | [NOAA / NWS, Heat Index Equation](https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml) |
| Temperatura de bulbo úmido a partir da temperatura e da umidade | `bulboUmidoStull()` | Stull, R. *Wet-Bulb Temperature from Relative Humidity and Air Temperature*. Journal of Applied Meteorology and Climatology, 2011 ([DOI 10.1175/JAMC-D-11-0143.1](https://doi.org/10.1175/JAMC-D-11-0143.1)) |
| IBUTG para ambiente externo com carga solar: 0,7·tbn + 0,2·tg + 0,1·tbs | `ibutgEstimado()` (com o bulbo úmido **psicrométrico** no lugar do natural, por isso "estimado") | NR-09, Anexo III, e Fundacentro, NHO 06 |

## Norma brasileira

- **NR-09, Anexo III (calor)**, Portaria MTP 426/2021, em vigor desde 03/01/2022: para trabalho a céu aberto, água fresca, trabalho pesado nos períodos mais amenos, acesso a locais mais amenos "que possibilitem pausas espontâneas", orientação sobre sintomas e procedimento de emergência ([texto da Portaria 426/2021](https://www.rsdata.com.br/portaria-no-426-de-7-de-outubro-de-2021/)).
- **NR-15, Anexo 3** (insalubridade) não se aplica a céu aberto sem fonte artificial de calor ([Portaria 1.359/2019](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/sst-portarias/2019/portaria_seprt_1359_-altera_anexo_3_nr_15_e_inclui_anexo_3_na_nr_9__calor.pdf)).
- **Fundacentro, app Monitor IBUTG**: estima o IBUTG por região a partir do INMET ([CBIC, 2021](https://cbic.org.br/aplicativo-da-fundacentro-avalia-exposicao-ocupacional-ao-calor/)).

## Contexto (para o vídeo)

- **OIT, 2024:** 2,41 bilhões de trabalhadores (71 % da força de trabalho mundial) expostos a calor excessivo ([ONU Brasil](https://brasil.un.org/pt-br/274970-oit-estresse-t%C3%A9rmico-afeta-um-n%C3%BAmero-crescente-de-trabalhadores-em-todo-o-mundo)).
- **MPT:** 602 denúncias relacionadas a calor de janeiro a outubro de 2025, contra 279 no mesmo período de 2023 ([Conexão Tocantins, nov/2025](https://conexaoto.com.br/2025/11/05/mpt-recebe-602-denuncias-relacionadas-ao-calor-em-2025)).
- **Lancet Countdown, Brasil 2025:** US$ 17,66 bilhões em perdas laborais potenciais por calor em 2024, 0,8 % do PIB ([ficha Brasil](https://lancetcountdown.org/wp-content/uploads/2025/10/Brasil_Lancet-Countdown_2025_Data-Sheet.pdf)).

**Não usar:** "X garis adoecem por ano" (não existe estatística nacional) e limites de IBUTG dos quadros do Anexo III (não conferidos no texto oficial).

## Base técnica

- **FIWARE Descomplicado** e **FIWARE Smart Lamp**, do Prof. Fábio H. Cabrini: base da plataforma e do protocolo.
- [Tutoriais do FIWARE](https://fiware-tutorials.readthedocs.io) · [Documentação do Wokwi](https://docs.wokwi.com).
- **WineGuard** (projeto anterior do grupo): estrutura do repositório, do firmware e do `provisionar.sh` ([github.com/enzopereira1701/wineguard](https://github.com/enzopereira1701/wineguard)).

## Entrevistas

Três garis da coleta responderam por mensagem em 9/11/2026. Sandro e Jackson autorizaram o uso das falas com o primeiro nome; o coletor anônimo, sem identificação. Sobrenome, empresa e local não são divulgados.
