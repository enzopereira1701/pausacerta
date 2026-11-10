// O que o Node está mostrando agora no caminhão (semáforo da traseira e tela da cabine),
// a partir da leitura que chegou ao Orion. Mesma prioridade do firmware (atualizaSemaforo()):
//   identificar > em pausa > falha > pausa recomendada > estado do calor
import { ESTADOS } from '../data/constantes'

/**
 * @param {object|null} atual  leitura (entidade EquipeCampo)
 * @param {{ online?: boolean, identificando?: boolean }} [extra]
 * @returns {{ luzes: {verde:boolean, amarelo:boolean, vermelho:boolean}, piscar: boolean,
 *             tela: string, titulo: string, cor: string, tom: string, estado: string }}
 */
export function sinalDoNode(atual, { online = true, identificando = false } = {}) {
  const apagado = { verde: false, amarelo: false, vermelho: false }
  if (!atual) return { luzes: apagado, piscar: false, tela: 'Aguardando leitura', titulo: 'Aguardando', cor: ESTADOS.OFFLINE.cor, tom: 'falha', estado: 'OFFLINE' }

  const info = ESTADOS[atual.estado] ?? ESTADOS.FALHA_SENSOR
  const base = { estado: atual.estado, cor: info.cor, tom: info.tom, titulo: info.rotulo }

  if (!online) return { luzes: apagado, piscar: false, tela: 'Última leitura recebida', titulo: 'Sem conexão', cor: ESTADOS.OFFLINE.cor, tom: 'falha', estado: 'OFFLINE' }
  if (identificando) return { ...base, luzes: { verde: true, amarelo: true, vermelho: true }, piscar: true, tela: 'Identificando o Node' }
  if (atual.emPausa) return { ...base, luzes: { ...apagado, verde: true }, piscar: true, tela: 'EM PAUSA', titulo: 'Em pausa', cor: ESTADOS.NORMAL.cor, tom: 'normal' }
  if (atual.estado === 'FALHA_SENSOR') return { ...base, luzes: { ...apagado, amarelo: true }, piscar: true, tela: 'Confira o DHT22' }
  if (atual.pausaRecomendada) return { ...base, luzes: { ...apagado, vermelho: true, amarelo: true }, piscar: false, tela: 'PARE NA PRÓXIMA PARADA' }

  const luzes = { verde: info.luz === 'verde', amarelo: info.luz === 'amarelo', vermelho: info.luz === 'vermelho' }
  return { ...base, luzes, piscar: info.piscar, tela: info.acao.toUpperCase() }
}
