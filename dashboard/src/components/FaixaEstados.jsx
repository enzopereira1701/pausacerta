import { ESTADOS, NIVEIS } from '../data/constantes'
import { formatarHora, formatarMinutos } from '../utils/formatacao'

/**
 * Linha do tempo do estado do calor: uma faixa colorida com a cor de cada estado ao longo do período,
 * e quanto tempo a equipe passou em cada um (a cor nunca é a única pista: a legenda diz o tempo).
 */
export default function FaixaEstados({ pontos }) {
  if (pontos.length < 2) return null
  const t = pontos.map((p) => new Date(p.t).getTime())
  const t0 = t[0]
  const total = t[t.length - 1] - t0 || 1
  const segmentos = []
  const minutos = {}
  pontos.forEach((p, i) => {
    if (i === pontos.length - 1) return
    const dur = t[i + 1] - t[i]
    minutos[p.estado] = (minutos[p.estado] ?? 0) + dur / 60000
    const ultimo = segmentos[segmentos.length - 1]
    if (ultimo && ultimo.estado === p.estado) ultimo.fim = t[i + 1]
    else segmentos.push({ estado: p.estado, inicio: t[i], fim: t[i + 1] })
  })

  return (
    <div>
      <div className="flex h-7 w-full overflow-hidden rounded-md border border-linha" role="img" aria-label="Estado do calor ao longo do período">
        {segmentos.map((s) => (
          <span
            key={s.inicio}
            title={`${ESTADOS[s.estado]?.rotulo ?? s.estado}: ${formatarHora(new Date(s.inicio).toISOString())} a ${formatarHora(new Date(s.fim).toISOString())}`}
            style={{ width: `${((s.fim - s.inicio) / total) * 100}%`, background: ESTADOS[s.estado]?.cor ?? '#6b6f6c' }}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {[...NIVEIS, 'FALHA_SENSOR'].filter((e) => minutos[e]).map((e) => (
          <li key={e} className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: ESTADOS[e].cor }} aria-hidden="true" />
            {ESTADOS[e].rotulo}: <strong className="numero">{formatarMinutos(minutos[e])}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
