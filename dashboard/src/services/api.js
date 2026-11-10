// ÚNICO lugar do site que "busca dados". Nenhuma tela chama fetch direto.
//
//   VITE_USE_MOCK=true  (padrão)  -> responde com o simulador do navegador (services/mock.js)
//   VITE_USE_MOCK=false           -> chama o backend FastAPI em VITE_API_URL
//
// Os formatos de resposta estão em docs/api-contrato.md (seção 5).
import { mock } from './mock'

const USAR_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Chamada HTTP de verdade. Lança Error com mensagem clara quando algo dá errado. */
async function http(metodo, caminho, corpo) {
  let resposta
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      method: metodo,
      headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
    })
  } catch {
    throw new Error('Não foi possível falar com o backend. Confira a internet, o IP da instância e o VITE_API_URL.')
  }
  if (!resposta.ok) {
    const detalhe = await resposta.json().catch(() => ({}))
    throw new Error(detalhe.detail ?? `O backend respondeu com erro ${resposta.status}.`)
  }
  return resposta.json()
}

/** Decide entre simulador e backend. */
async function rota(funcaoMock, requisicao, latencia = 120) {
  if (USAR_MOCK) {
    await esperar(latencia)
    return funcaoMock()
  }
  return http(...requisicao)
}

export const usandoMock = USAR_MOCK

/** Leitura atual da equipe (entidade EquipeCampo no Orion) e se o Node está online. */
export const obterEquipe = () => rota(() => mock.obterEquipe(), ['GET', '/api/equipe'], 60)

/** Histórico do STH-Comet, já juntado por horário. periodo: '1h' | 'turno' | '24h'. */
export const obterHistorico = (periodo) => rota(() => mock.obterHistorico(periodo), ['GET', `/api/historico?periodo=${periodo}`], 90)

/** Configuração enviada ao Node (limites, regime, galão, intervalo) e o estado do último envio de cada comando. */
export const obterConfig = () => rota(() => mock.obterConfig(), ['GET', '/api/config'], 60)

/**
 * Envia um comando ao Node pelo Orion. Volta { status: 'PENDING' }; o "OK" chega depois em obterConfig().
 * @param {'setLimites'|'setRegime'|'setGalao'|'setIntervalo'|'identify'} nome
 * @param {string} [valor]  ex.: "300,90,50"
 */
export const enviarComando = (nome, valor = '') =>
  rota(() => mock.enviarComando(nome, valor), ['POST', `/api/comandos/${nome}`, { valor }], 250)

// ---------------------------------------------------- só existem no simulador
export const simulador = {
  definirCenario: (id) => mock.definirCenario(id),
  obterCenario: () => mock.obterCenario(),
  apertarBotao: () => mock.apertarBotao(),
  registrarMalEstar: () => mock.registrarMalEstar(),
  reporGalao: () => mock.reporGalao(),
}
