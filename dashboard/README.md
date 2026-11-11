# Pausa Certa Dashboard (Edge)

Painel web da **camada 3** da atividade de Edge: mostra o que o Node manda para o FIWARE e envia comandos de volta.
É **separado** do painel do encarregado feito em Front-end e Web; este mostra o dispositivo e a nuvem funcionando.
Mesma base do dashboard do WineGuard: React 19, React Router 7 e Tailwind CSS 4, com Vite. Os gráficos são em SVG próprio
(`src/components/Grafico.jsx`), sem biblioteca. Roda no computador do grupo (`npm run dev`), não é publicado.

> **Status (10/11):** pronto. Funciona com o **simulador** do navegador (`VITE_USE_MOCK=true`) e com o backend (`false`); testado com um FIWARE de teste.

## Rodar

```bash
cd dashboard
npm install
cp .env.example .env      # no Windows: copie o arquivo e renomeie para .env
npm run dev
```

Abra o endereço que aparece no terminal (normalmente http://localhost:5173). No celular, no mesmo Wi-Fi: `npm run dev -- --host` e use o endereço `Network:`.

## Configuração (`.env`)

| Variável | Para quê |
|---|---|
| `VITE_USE_MOCK` | `true` usa o simulador do navegador (`src/services/mock.js`); `false` chama o backend |
| `VITE_API_URL` | Endereço do backend, ex.: `http://localhost:8001` ou `http://<IP da instância>:8001` |

Depois de mudar o `.env`, pare e suba o `npm run dev` de novo.

## Telas

| Tela | O que mostra |
|---|---|
| **Início** | O problema com as falas dos garis, como funciona e o que cada sinal do semáforo quer dizer |
| **Painel** | O semáforo e a tela da cabine como estão agora; calor (índice, ar, globo, IBUTG estimado), pausas (sem pausa há, pausas hoje, em pausa, mal-estar), água (nível, temperatura, previsão) e a última hora. Atualiza a cada 5 s |
| **Histórico** | Faixa do estado ao longo do período, índice de calor com as faixas e as pausas, ar × globo, minutos sem pausa com os limites do regime, galão e temperatura da água. Períodos: 1 h, turno (8 h), 24 h |
| **Comandos** | Identificar, regime de pausas, limites do índice, galão e intervalo, com validação e o status do envio (aguardando → confirmado pelo Node) |

O **simulador** (no fim do Painel, só no modo de demonstração) faz o papel do Wokwi: muda o tempo lá fora
(manhã, calor, meio-dia, onda de calor, falha do DHT22, sem sinal) e aperta os botões do Node (pausa, mal-estar, repor o galão).
No modo de demonstração, o histórico mostra um turno quente em qualquer horário: o momento em que o site abre vale 12h40.

## Estrutura

```
dashboard/
├── public/
│   ├── favicon.svg            símbolo do logo
│   └── img/                   fotos do Início (prompts em ../docs/prompts-imagens.md)
├── src/
│   ├── components/            Header, Footer, Marca, Semaforo, Grafico, FaixaEstados, Metrica, Simulador...
│   ├── pages/                 Home, Painel, Historico, Comandos
│   ├── services/              api.js (único lugar que busca dados) e mock.js (simulador)
│   ├── utils/                 calor.js (fórmulas do firmware), sinais.js (o que o Node mostra), faixas.js, formatacao.js
│   ├── data/                  constantes.js (estados, padrões, rotas) e equipe.js (integrantes e falas)
│   ├── context/, hooks/       estado global e atualização a cada 5 s
│   └── index.css              cores e fontes (off-white e verde)
├── index.html
└── package.json
```

As rotas da API estão em `src/services/api.js` e os formatos em [`../docs/api-contrato.md`](../docs/api-contrato.md) (seção 5).

## Imagens

Sem as fotos, o Início mostra quadros verdes com o nome do arquivo esperado. Os prompts para gerar cada uma estão em
[`../docs/prompts-imagens.md`](../docs/prompts-imagens.md). O logo é o do grupo, redesenhado em SVG (`src/data/logo.js`, gerado por `tools/vetoriza_logo.py`).
