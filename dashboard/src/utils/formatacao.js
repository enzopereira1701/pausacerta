// Funções de formatação (texto para a tela). Todas são "puras": mesma entrada, mesma saída.

/** Número no padrão brasileiro (vírgula decimal). "--" quando não há valor. */
export const formatarNumero = (valor, decimais = 1) =>
  valor === null || valor === undefined || Number.isNaN(Number(valor))
    ? '--'
    : Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: decimais, maximumFractionDigits: decimais })

/**
 * "14:35" no horário de Brasília. O STH-Comet grava em UTC (…Z): o navegador converte sozinho
 * para o fuso do computador; o timeZone fixo garante Brasília mesmo num computador em outro fuso.
 */
export const formatarHora = (iso) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

/** "04/10 14:35" (Brasília). */
export const formatarDataHora = (iso) => {
  const d = new Date(iso)
  const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
  return `${dia} ${formatarHora(iso)}`
}

/** Minutos como texto: 45 -> "45 min"; 130 -> "2 h 10 min". */
export const formatarMinutos = (min) => {
  if (min === null || min === undefined || min < 0) return '--'
  if (min < 60) return `${Math.round(min)} min`
  return `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')} min`
}

/** Segundos como mm:ss (cronômetro da pausa). */
export const formatarCronometro = (seg) => {
  const s = Math.max(0, Math.floor(seg))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** "agora", "há 40 s", "há 5 min"... (`agora` vem de fora: a função continua pura). */
export const tempoRelativo = (iso, agora) => {
  if (!iso) return 'sem leituras'
  const dif = agora - new Date(iso).getTime()
  if (dif < 5000) return 'agora'
  if (dif < 60000) return `há ${Math.round(dif / 1000)} s`
  if (dif < 3600000) return `há ${Math.round(dif / 60000)} min`
  if (dif < 86400000) return `há ${Math.round(dif / 3600000)} h`
  return `há ${Math.round(dif / 86400000)} d`
}
