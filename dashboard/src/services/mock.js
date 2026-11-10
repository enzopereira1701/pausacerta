// Simulador da equipe COL-CAM-07 no navegador.
// Serve para o dashboard funcionar SEM a AWS (VITE_USE_MOCK=true). Quando o backend estiver no ar,
// ele responde no lugar deste arquivo, com os MESMOS formatos (veja services/api.js e docs/api-contrato.md).
//
// O que ele simula:
//  - as leituras do Node chegando aos poucos (como a média móvel do firmware)
//  - o estado com histerese, o regime de pausas, a pausa recomendada e o galão esvaziando
//  - 24 h de histórico com o calor subindo até o meio-dia (para os gráficos já terem o que mostrar)
//  - comandos que ficam "pendentes" e depois "OK", como no IoT Agent
import { EQUIPE, OFFLINE_APOS_MS, PADROES, PERIODOS } from '../data/constantes'
import { bulboUmido, ibutgEstimado, indiceCalor, limiteSemPausa, proximoEstado } from '../utils/calor'

const SEG = 1000
const MIN = 60 * SEG
const HORA = 60 * MIN
const iso = (ms) => new Date(ms).toISOString()
const arred = (v, d = 1) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d)

/** Cenários do simulador (o que o "ar" em volta do caminhão está fazendo). */
export const CENARIOS = [
  { id: 'manha', rotulo: 'Manhã fresca', alvo: { t: 24, ur: 62, g: 29, sol: false } },
  { id: 'calor', rotulo: 'Calor', alvo: { t: 29.5, ur: 52, g: 41, sol: true } },
  { id: 'meio_dia', rotulo: 'Meio-dia ao sol', alvo: { t: 34.2, ur: 46, g: 47.5, sol: true } },
  { id: 'onda', rotulo: 'Onda de calor', alvo: { t: 38, ur: 50, g: 56, sol: true } },
  { id: 'falha', rotulo: 'DHT22 com falha', alvo: null },
  { id: 'offline', rotulo: 'Sem sinal na rota', alvo: null },
]

// ------------------------------------------------------------------ estado do simulador
const agoraInicial = Date.now()
const sim = {
  cenario: 'meio_dia',
  t: 34.2, ur: 46, g: 47.5, sol: true,
  estado: 'CRITICO',
  emPausa: false,
  inicioPausa: null,
  ultimaPausa: agoraInicial - 52 * MIN, // igual ao contrato: 52 min sem pausa
  pausasHoje: 3,
  malEstar: 0,
  galao: 35,
  aguaTemp: 31,
  ultimoRefil: agoraInicial - 130 * MIN, // galão reposto às 10h30 do turno
  ultimoTick: agoraInicial,
  ultimaLeitura: agoraInicial,
  ultimoPonto: 0,
  identifyAte: 0,
  config: { limites: [...PADROES.limites], regime: [...PADROES.regime], galao: [...PADROES.galao], intervalo: PADROES.intervalo },
  comandos: {},
}
const historico = gerarHistorico(agoraInicial)

/**
 * 24 h de leituras a cada 2 min, num "relógio de turno": o momento em que o site abre vale 12h40
 * (meio-dia ao sol, como o simulador começa), seja qual for a hora de verdade. Assim a demonstração
 * mostra um turno quente em qualquer horário. Turno das 7h às 15h; pausas às 8h20, 10h e 11h38
 * (a última termina 52 min antes de agora, igual ao contador); galão reposto às 10h30.
 */
function gerarHistorico(fim) {
  const pontos = []
  const limites = PADROES.limites
  const PAUSAS = [[8.33, 8.5], [10, 10.2], [11.63, 11.8]] // [início, fim] em horas do turno
  let estado = 'NORMAL'
  for (let ms = fim - 24 * HORA; ms <= fim; ms += 2 * MIN) {
    const h = (((12 + 40 / 60 - (fim - ms) / HORA) % 24) + 24) % 24 // hora no relógio do turno
    const ruido = Math.sin(ms / 7.3e5) * 0.5 + Math.sin(ms / 2.1e6) * 0.7
    let t = 20.5 + 13.5 * Math.exp(-(((h - 13) / 3.4) ** 2)) + ruido
    let ur = Math.min(85, 74 - (t - 20) * 1.9)
    const solK = Math.min(1, Math.max(0, h - 7.8)) * Math.min(1, Math.max(0, 17 - h)) // sol nasce e se põe aos poucos
    let g = t + 0.5 + solK * (3.5 + 9 * Math.exp(-(((h - 12.5) / 2.6) ** 2)))
    const falta = fim - ms
    if (falta < 10 * MIN) {
      // emenda suave com o valor inicial do simulador
      const k = 1 - falta / (10 * MIN)
      t += (sim.t - t) * k
      ur += (sim.ur - ur) * k
      g += (sim.g - g) * k
    }
    const ic = indiceCalor(t, ur)
    estado = proximoEstado(estado, ic, limites)

    const turno = h >= 7 && h < 15
    const emPausa = turno && PAUSAS.some(([a, b]) => h >= a && h < b)
    const fimUltima = PAUSAS.map(([, b]) => b).filter((b) => b <= h).pop() ?? 7
    const semPausa = !turno || emPausa ? 0 : Math.round((h - fimUltima) * 60)
    let galao = 100
    let aguaT = 19
    if (turno) {
      galao = h < 10.5 ? 100 - ((h - 7) / 3.5) * 70 : 100 - ((h - 10.5) / 2.17) * 65
      aguaT = h < 10.5 ? 18 + (h - 7) * 3 : 18 + Math.min(1, (h - 10.5) / 2.17) * 13
    }
    pontos.push({
      t: iso(ms),
      temperatura_c: arred(t),
      umidade_pct: arred(ur, 0),
      globo_c: arred(g),
      indiceCalor_c: arred(ic),
      estado,
      emPausa,
      minutosSemPausa: semPausa,
      galao_pct: Math.max(0, Math.round(galao)),
      aguaTemp_c: arred(aguaT),
    })
  }
  return pontos
}

// ------------------------------------------------------------------ passo da simulação
/** Avança o simulador até "agora": sensores se aproximam do cenário, galão desce, pausas contam. */
function avancar(agora) {
  const dt = Math.min((agora - sim.ultimoTick) / SEG, 30)
  sim.ultimoTick = agora
  const cen = CENARIOS.find((c) => c.id === sim.cenario)
  if (sim.cenario === 'offline') return

  if (cen.alvo) {
    // como a média móvel do Node: anda ~1/8 do caminho a cada 2 s
    const k = 1 - Math.exp(-dt / 16)
    const osc = Math.sin(agora / 9000) * 0.15
    sim.t += (cen.alvo.t + osc - sim.t) * k
    sim.ur += (cen.alvo.ur - sim.ur) * k
    sim.g += (cen.alvo.g - sim.g) * k * 0.6 // o globo demora mais
    sim.sol = cen.alvo.sol
    const ic = indiceCalor(sim.t, sim.ur)
    sim.estado = proximoEstado(sim.estado === 'FALHA_SENSOR' ? 'NORMAL' : sim.estado, ic, sim.config.limites)
  } else {
    sim.estado = 'FALHA_SENSOR'
  }

  // galão: desce mais rápido quanto mais quente (acelerado para a demonstração)
  const consumo = { NORMAL: 0.01, ATENCAO: 0.02, CRITICO: 0.035, PERIGO: 0.05, FALHA_SENSOR: 0.015 }[sim.estado]
  sim.galao = Math.max(0, sim.galao - consumo * dt)
  if (cen.alvo) sim.aguaTemp += (Math.min(cen.alvo.t, 36) - sim.aguaTemp) * (1 - Math.exp(-dt / 900))

  // pausa esquecida (60 min) termina sozinha, como no Node
  if (sim.emPausa && agora - sim.inicioPausa > 60 * MIN) encerrarPausa(agora)
  sim.ultimaLeitura = agora

  if (agora - sim.ultimoPonto >= 5 * SEG) {
    sim.ultimoPonto = agora
    const a = leituraAtual(agora)
    historico.push({
      t: iso(agora),
      temperatura_c: a.temperatura_c, umidade_pct: a.umidade_pct, globo_c: a.globo_c, indiceCalor_c: a.indiceCalor_c,
      estado: a.estado, emPausa: a.emPausa, minutosSemPausa: a.minutosSemPausa, galao_pct: a.galao_pct, aguaTemp_c: a.aguaTemp_c,
    })
    while (historico.length && new Date(historico[0].t).getTime() < agora - 24 * HORA) historico.shift()
  }
}

function minutosSemPausa(agora) {
  return sim.emPausa ? 0 : Math.floor((agora - sim.ultimaPausa) / MIN)
}

function estadoAgua() {
  const p = sim.galao
  if (p < 5) return 'SEM_AGUA'
  if (p < 20) return 'ACABANDO'
  if (p < 50) return 'REPOR'
  return 'NORMAL'
}

/** Leitura no formato da entidade EquipeCampo (keyValues). */
function leituraAtual(agora) {
  const falha = sim.estado === 'FALHA_SENSOR'
  const ic = falha ? null : indiceCalor(sim.t, sim.ur)
  const tbu = falha ? null : bulboUmido(sim.t, sim.ur)
  const msp = minutosSemPausa(agora)
  const limite = limiteSemPausa(sim.estado, sim.config.regime)
  // previsão do galão: precisa de alguns minutos de amostras depois do último refil
  const consumoMin = { NORMAL: 0.6, ATENCAO: 1.2, CRITICO: 2.1, PERIGO: 3, FALHA_SENSOR: 0.9 }[sim.estado] // = consumo × 60
  const acaba = agora - sim.ultimoRefil > 2 * MIN && consumoMin > 0 ? Math.round(sim.galao / consumoMin) : -1
  return {
    temperatura_c: falha ? null : arred(sim.t),
    umidade_pct: falha ? null : arred(sim.ur, 0),
    globo_c: arred(sim.g),
    solDireto: sim.sol,
    indiceCalor_c: arred(ic),
    ibutgEstimado_c: falha ? null : arred(ibutgEstimado(tbu, sim.g, sim.t)),
    estado: sim.estado,
    minutosSemPausa: msp,
    pausasHoje: sim.pausasHoje,
    emPausa: sim.emPausa,
    pausaRecomendada: !sim.emPausa && !falha && limite > 0 && msp >= limite,
    malEstarHoje: sim.malEstar,
    galao_pct: Math.round(sim.galao),
    aguaTemp_c: arred(sim.aguaTemp),
    aguaAcabaEmMin: acaba,
    estadoAgua: estadoAgua(),
    timestamp: iso(sim.ultimaLeitura),
    firmware: '0.2',
  }
}

function encerrarPausa(agora) {
  const durou = (agora - sim.inicioPausa) / SEG
  sim.emPausa = false
  const valida = durou >= sim.config.regime[0]
  if (valida) {
    sim.pausasHoje += 1
    sim.ultimaPausa = agora
  }
  sim.inicioPausa = null
  return valida
}

/** Atualiza comandos pendentes: depois de ~1,5 s o "Node" responde ok. */
function atualizarComandos(agora) {
  for (const c of Object.values(sim.comandos)) {
    if (c.status === 'PENDING' && sim.cenario !== 'offline' && agora - new Date(c.em).getTime() > 1500) {
      c.status = 'OK'
      c.info = 'ok'
      c.confirmadoEm = iso(agora)
    }
  }
}

// ------------------------------------------------------------------ "API"
export const mock = {
  obterEquipe() {
    const agora = Date.now()
    avancar(agora)
    return {
      equipe: EQUIPE.id,
      entidade: EQUIPE.entidade,
      online: agora - sim.ultimaLeitura < OFFLINE_APOS_MS && sim.cenario !== 'offline',
      ultimaLeitura: iso(sim.ultimaLeitura),
      pausaDesde: sim.emPausa ? iso(sim.inicioPausa) : null,
      identificando: agora < sim.identifyAte,
      atual: leituraAtual(sim.cenario === 'offline' ? sim.ultimaLeitura : agora),
    }
  },

  obterHistorico(periodo) {
    const agora = Date.now()
    avancar(agora)
    const p = PERIODOS.find((x) => x.id === periodo) ?? PERIODOS[0]
    const desde = agora - p.ms
    const lista = historico.filter((x) => new Date(x.t).getTime() >= desde)
    // no máximo ~360 pontos por gráfico (o backend agrupa do mesmo jeito)
    const passo = Math.max(1, Math.ceil(lista.length / 360))
    return { periodo: p.id, pontos: lista.filter((_, i) => i % passo === 0 || i === lista.length - 1) }
  },

  obterConfig() {
    atualizarComandos(Date.now())
    return { ...structuredClone(sim.config), comandos: structuredClone(sim.comandos) }
  },

  enviarComando(nome, valor) {
    const agora = Date.now()
    const partes = String(valor ?? '').split(',').map(Number)
    if (nome === 'setLimites') sim.config.limites = partes
    if (nome === 'setRegime') sim.config.regime = partes
    if (nome === 'setGalao') sim.config.galao = partes
    if (nome === 'setIntervalo') sim.config.intervalo = partes[0]
    if (nome === 'identify') sim.identifyAte = agora + 5 * SEG
    sim.comandos[nome] = { valor: String(valor ?? ''), status: 'PENDING', info: null, em: iso(agora), confirmadoEm: null }
    return structuredClone(sim.comandos[nome])
  },

  // ---------------- só existem no simulador (botões do Simulador)
  definirCenario(id) {
    sim.cenario = id
    if (id !== 'offline') sim.ultimoTick = Date.now()
  },
  obterCenario: () => sim.cenario,
  apertarBotao() {
    const agora = Date.now()
    avancar(agora)
    if (!sim.emPausa) {
      sim.emPausa = true
      sim.inicioPausa = agora
      return 'Pausa iniciada no Node (verde piscando).'
    }
    return encerrarPausa(agora) ? 'Pausa registrada.' : `Pausa curta: menos de ${sim.config.regime[0]} s não conta (mas nunca é bloqueada).`
  },
  registrarMalEstar() {
    sim.malEstar += 1
    return 'Mal-estar anônimo registrado pela equipe.'
  },
  reporGalao() {
    sim.galao = 100
    sim.aguaTemp = 18
    sim.ultimoRefil = Date.now()
    return 'Galão reposto com água fresca.'
  },
}
