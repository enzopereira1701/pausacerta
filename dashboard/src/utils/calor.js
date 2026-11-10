// Cálculos de calor: as MESMAS fórmulas do firmware (pausacerta_node.ino).
// O dashboard usa para o simulador e para explicar os números; quem decide o estado é o Node.

/**
 * Índice de calor da NOAA (Rothfusz com os ajustes). Entrada e saída em °C.
 * https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml
 */
export function indiceCalor(tC, ur) {
  const T = (tC * 9) / 5 + 32
  let hi = 0.5 * (T + 61 + (T - 68) * 1.2 + ur * 0.094)
  if ((hi + T) / 2 >= 80) {
    hi = -42.379 + 2.04901523 * T + 10.14333127 * ur - 0.22475541 * T * ur
      - 0.00683783 * T * T - 0.05481717 * ur * ur + 0.00122874 * T * T * ur
      + 0.00085282 * T * ur * ur - 0.00000199 * T * T * ur * ur
    if (ur < 13 && T >= 80 && T <= 112) hi -= ((13 - ur) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17)
    else if (ur > 85 && T >= 80 && T <= 87) hi += ((ur - 85) / 10) * ((87 - T) / 5)
  }
  return ((hi - 32) * 5) / 9
}

/** Temperatura de bulbo úmido (Stull, 2011). UR de 5 a 99 %, T de −20 a 50 °C. */
export function bulboUmido(t, ur) {
  return t * Math.atan(0.151977 * Math.sqrt(ur + 8.313659)) + Math.atan(t + ur) - Math.atan(ur - 1.676331)
    + 0.00391838 * ur ** 1.5 * Math.atan(0.023101 * ur) - 4.686035
}

/** IBUTG ESTIMADO para ambiente externo: 0,7·tbu + 0,2·tg + 0,1·t (não substitui a NHO 06). */
export const ibutgEstimado = (tbu, tg, t) => 0.7 * tbu + 0.2 * tg + 0.1 * t

/** Nível pelo índice, sem histerese. */
export function nivelPorIndice(ic, limites) {
  if (ic >= limites[2]) return 'PERIGO'
  if (ic >= limites[1]) return 'CRITICO'
  if (ic >= limites[0]) return 'ATENCAO'
  return 'NORMAL'
}

const ORDEM = ['NORMAL', 'ATENCAO', 'CRITICO', 'PERIGO']

/** Próximo estado com histerese: sobe na hora, desce só `histerese` °C abaixo do limite (igual a proximoEstado() do Node). */
export function proximoEstado(atual, ic, limites, histerese = 1) {
  let nivel = ORDEM.indexOf(atual)
  if (nivel < 0) nivel = 0
  const novo = ORDEM.indexOf(nivelPorIndice(ic, limites))
  if (novo >= nivel) return ORDEM[novo]
  while (nivel > 0 && ic < limites[nivel - 1] - histerese) nivel--
  return ORDEM[nivel]
}

/** Limite de minutos sem pausa para o estado (0 = sem limite), pelo regime [pausaMin_s, maxAtencao, maxCritico]. */
export function limiteSemPausa(estado, regime) {
  if (estado === 'CRITICO' || estado === 'PERIGO') return regime[2]
  if (estado === 'ATENCAO') return regime[1]
  return 0
}
