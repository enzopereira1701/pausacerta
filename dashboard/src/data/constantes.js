// Constantes do Pausa Certa: estados, rotas, períodos e padrões dos comandos.
// Mexa aqui (e não nas telas) para mudar nomes, cores ou textos.
// Os nomes dos estados são os mesmos que o Node envia (atributo "estado" no Orion).

/**
 * @typedef {'NORMAL'|'ATENCAO'|'CRITICO'|'PERIGO'|'FALHA_SENSOR'|'OFFLINE'} Estado
 */

/** Estado do calor: cor (igual ao semáforo), texto e a ação que aparece na tela da cabine. */
export const ESTADOS = {
  NORMAL: { rotulo: 'Normal', cor: '#2e8b47', tom: 'normal', luz: 'verde', piscar: false, acao: 'Trabalho normal', faixa: 'índice de calor abaixo de 27 °C' },
  ATENCAO: { rotulo: 'Atenção', cor: '#b07800', tom: 'atencao', luz: 'amarelo', piscar: false, acao: 'Água e sombra', faixa: '27 a 32 °C' },
  CRITICO: { rotulo: 'Crítico', cor: '#d0341f', tom: 'critico', luz: 'vermelho', piscar: false, acao: 'Pausa na sombra', faixa: '32 a 41 °C' },
  PERIGO: { rotulo: 'Perigo', cor: '#8f1414', tom: 'perigo', luz: 'vermelho', piscar: true, acao: 'Suspender trabalho pesado', faixa: '41 °C ou mais' },
  FALHA_SENSOR: { rotulo: 'Falha do sensor', cor: '#6b6f6c', tom: 'falha', luz: 'amarelo', piscar: true, acao: 'Confira o DHT22', faixa: 'leituras inválidas' },
  OFFLINE: { rotulo: 'Sem conexão', cor: '#6b6f6c', tom: 'falha', luz: null, piscar: false, acao: 'O Node continua avisando no caminhão', faixa: 'sem envio recente' },
}

/** Ordem dos níveis de calor (para as faixas dos gráficos). */
export const NIVEIS = ['NORMAL', 'ATENCAO', 'CRITICO', 'PERIGO']

/** Estado da água (atributo "estadoAgua"), com o texto da tela da cabine. */
export const ESTADOS_AGUA = {
  NORMAL: { rotulo: 'Água ok', tom: 'normal' },
  REPOR: { rotulo: 'Repor em breve', tom: 'atencao' },
  ACABANDO: { rotulo: 'Repor água já', tom: 'critico' },
  SEM_AGUA: { rotulo: 'Sem água', tom: 'perigo' },
  SEM_SENSOR: { rotulo: 'Sensor do galão?', tom: 'falha' },
}

/** Padrões do firmware (os mesmos do pausacerta_node.ino). */
export const PADROES = {
  limites: [27, 32, 41], // índice de calor (°C) para ATENÇÃO, CRÍTICO e PERIGO (NOAA)
  regime: [300, 90, 50], // pausa mínima (s), máx. sem pausa em ATENÇÃO e em CRÍTICO (min)
  regimeDemo: [20, 3, 1], // tempos curtos usados no Wokwi, só para caber no vídeo
  galao: [5, 45, 30], // distância cheio (cm), vazio (cm), água quente (°C)
  intervalo: 60, // envio periódico (s)
}

export const HISTERESE_C = 1 // o estado só desce 1 °C abaixo do limite (igual ao Node)

/** Períodos do Histórico. */
export const PERIODOS = [
  { id: '1h', rotulo: '1 hora', ms: 60 * 60 * 1000 },
  { id: 'turno', rotulo: 'Turno (8 h)', ms: 8 * 60 * 60 * 1000 },
  { id: '24h', rotulo: '24 horas', ms: 24 * 60 * 60 * 1000 },
]

export const INTERVALO_ATUALIZACAO_MS = 5000 // o backend consulta o Orion a cada 5 s
export const OFFLINE_APOS_MS = 150000 // o Node envia a cada 60 s: 2,5 min sem nada = sem conexão

/** Telas com atalho na navegação. */
export const ROTAS = [
  { caminho: '/painel', rotulo: 'Painel', icone: 'painel' },
  { caminho: '/historico', rotulo: 'Histórico', icone: 'grafico' },
  { caminho: '/comandos', rotulo: 'Comandos', icone: 'ajustes' },
]

/** Equipe e Node mostrados (os mesmos do provisionar.sh). */
export const EQUIPE = { id: 'COL-CAM-07', entidade: 'EquipeCampo:COL-CAM-07', device: 'pcn001', service: 'pausacerta', servicepath: '/coleta' }
