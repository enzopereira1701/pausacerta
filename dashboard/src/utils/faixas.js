// Faixas coloridas do fundo dos gráficos.
import { ESTADOS } from '../data/constantes'

/**
 * Rótulo de cada faixa aparece na linha de BAIXO dela (o valor `de`).
 * Faixas do índice de calor para o fundo dos gráficos (a partir dos limites do Node). */
export function faixasDoIndice(limites) {
  return [
    { de: -50, ate: limites[0], cor: ESTADOS.NORMAL.cor },
    { de: limites[0], ate: limites[1], cor: ESTADOS.ATENCAO.cor, rotulo: `ATENÇÃO ${limites[0]} °C` },
    { de: limites[1], ate: limites[2], cor: ESTADOS.CRITICO.cor, rotulo: `CRÍTICO ${limites[1]} °C` },
    { de: limites[2], ate: 99, cor: ESTADOS.PERIGO.cor, rotulo: `PERIGO ${limites[2]} °C` },
  ]
}

/** Faixas do galão: abaixo de 20 % repor já, abaixo de 50 % repor em breve (igual ao Node). */
export const FAIXAS_GALAO = [
  { de: -10, ate: 20, cor: ESTADOS.CRITICO.cor },
  { de: 20, ate: 50, cor: ESTADOS.ATENCAO.cor, rotulo: 'REPOR JÁ abaixo de 20 %' },
  { de: 50, ate: 110, cor: '#2f6fa8', rotulo: 'repor em breve abaixo de 50 %' },
]
