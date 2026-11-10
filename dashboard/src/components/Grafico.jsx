import { useEffect, useMemo, useRef, useState } from 'react'
import { formatarDataHora, formatarHora, formatarNumero } from '../utils/formatacao'

/**
 * Gráfico de linha em SVG (sem biblioteca), com:
 *  - faixas horizontais ao fundo (ex.: NORMAL / ATENÇÃO / CRÍTICO / PERIGO do índice de calor)
 *  - períodos sombreados (ex.: quando a equipe estava em pausa)
 *  - linha quebrada quando faltam leituras (Node sem sinal), em vez de ligar os dois lados
 *  - leitura do valor ao passar o mouse ou o dedo
 *
 * @param {{ pontos: object[], series: {chave:string, rotulo:string, cor:string, tracejado?:boolean}[],
 *           unidade?: string, decimais?: number, faixas?: {de:number, ate:number, cor:string, rotulo?:string, apenasLinha?:boolean}[],
 *           sombrear?: string, rotuloSombra?: string, dominio?: [number, number], altura?: number, titulo: string }} props
 */
export default function Grafico({ pontos, series, unidade = '', decimais = 1, faixas = [], sombrear, rotuloSombra, dominio, altura = 240, titulo }) {
  const caixa = useRef(null)
  const [largura, setLargura] = useState(600)
  const [foco, setFoco] = useState(null) // índice do ponto sob o mouse

  useEffect(() => {
    const el = caixa.current
    if (!el) return undefined
    const obs = new ResizeObserver(([e]) => setLargura(Math.max(260, e.contentRect.width)))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const M = { topo: 10, dir: 12, base: 26, esq: 40 }
  const W = largura
  const H = altura
  const iw = W - M.esq - M.dir
  const ih = H - M.topo - M.base

  const calc = useMemo(() => {
    const tempos = pontos.map((p) => new Date(p.t).getTime())
    const t0 = tempos[0] ?? 0
    const t1 = tempos[tempos.length - 1] ?? 1
    const valores = pontos.flatMap((p) => series.map((s) => p[s.chave])).filter((v) => v !== null && v !== undefined)
    faixas.filter((f) => f.apenasLinha).forEach((f) => valores.push(f.de)) // linhas de limite sempre visíveis
    let [y0, y1] = dominio ?? [Math.min(...valores), Math.max(...valores)]
    let passoY = (y1 - y0) / 4
    if (!dominio) {
      const positivos = y0 >= 0
      const folga = Math.max((y1 - y0) * 0.1, 1)
      y0 -= folga
      y1 += folga
      if (positivos) y0 = Math.max(0, y0) // minutos, % e afins não ficam negativos
      // marcas "redondas": passo de 1, 2, 5, 10... e eixo começando e terminando nelas
      const bruto = (y1 - y0) / 4
      const base = 10 ** Math.floor(Math.log10(bruto))
      passoY = [1, 2, 2.5, 5, 10].map((m) => m * base).find((m) => m >= bruto)
      y0 = Math.floor(y0 / passoY) * passoY
      y1 = Math.ceil(y1 / passoY) * passoY
    }
    // intervalo "normal" entre leituras: acima de 3x isso, a linha quebra
    const difs = tempos.slice(1).map((t, i) => t - tempos[i]).sort((a, b) => a - b)
    const passo = difs[Math.floor(difs.length / 2)] ?? 60000
    return { tempos, t0, t1: Math.max(t1, t0 + 1), y0, y1: Math.max(y1, y0 + 1), passo, passoY }
  }, [pontos, series, dominio, faixas])

  const x = (t) => M.esq + ((t - calc.t0) / (calc.t1 - calc.t0)) * iw
  const y = (v) => M.topo + ih - ((v - calc.y0) / (calc.y1 - calc.y0)) * ih

  const caminho = (chave) => {
    let d = ''
    let aberto = false
    pontos.forEach((p, i) => {
      const v = p[chave]
      const quebra = i > 0 && calc.tempos[i] - calc.tempos[i - 1] > calc.passo * 3
      if (v === null || v === undefined || quebra) aberto = false
      if (v === null || v === undefined) return
      d += `${aberto ? 'L' : 'M'}${x(calc.tempos[i]).toFixed(1)},${y(v).toFixed(1)}`
      aberto = true
    })
    return d
  }

  // períodos sombreados (ex.: emPausa = true)
  const sombras = []
  if (sombrear) {
    let inicio = null
    pontos.forEach((p, i) => {
      if (p[sombrear] && inicio === null) inicio = calc.tempos[i]
      if ((!p[sombrear] || i === pontos.length - 1) && inicio !== null) {
        sombras.push([inicio, calc.tempos[i]])
        inicio = null
      }
    })
  }

  const nY = Math.round((calc.y1 - calc.y0) / calc.passoY)
  const marcasY = Array.from({ length: nY + 1 }, (_, i) => calc.y0 + calc.passoY * i)
  const nX = Math.max(2, Math.floor(iw / 110))
  const marcasX = Array.from({ length: nX + 1 }, (_, i) => calc.t0 + ((calc.t1 - calc.t0) * i) / nX)

  const aoMover = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const t = calc.t0 + ((px - M.esq) / iw) * (calc.t1 - calc.t0)
    let melhor = 0
    calc.tempos.forEach((tt, i) => {
      if (Math.abs(tt - t) < Math.abs(calc.tempos[melhor] - t)) melhor = i
    })
    setFoco(melhor)
  }

  if (pontos.length < 2) {
    return <p className="grid place-items-center text-sm text-suave" style={{ height: altura }}>Sem leituras neste período.</p>
  }

  const pf = foco !== null ? pontos[foco] : null
  const xf = foco !== null ? x(calc.tempos[foco]) : 0

  return (
    <div ref={caixa} className="relative w-full">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Gráfico: ${titulo}`}
        className="block touch-none select-none"
        onPointerMove={aoMover}
        onPointerDown={aoMover}
        onPointerLeave={() => setFoco(null)}
      >
        {faixas.map((f) => {
          const a = Math.max(calc.y0, f.de)
          const b = Math.min(calc.y1, f.ate)
          if (b <= a || f.apenasLinha) return null
          return <rect key={`${f.de}-${f.ate}`} x={M.esq} width={iw} y={y(b)} height={y(a) - y(b)} fill={f.cor} opacity={0.11} />
        })}
        {sombras.map(([a, b]) => (
          <rect key={a} x={x(a)} width={Math.max(2, x(b) - x(a))} y={M.topo} height={ih} fill="#2e8b47" opacity={0.14} />
        ))}
        {marcasY.map((v) => (
          <g key={v}>
            <line x1={M.esq} x2={M.esq + iw} y1={y(v)} y2={y(v)} stroke="#d9d4c5" strokeDasharray="3 3" />
            <text x={M.esq - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#5d665f">{formatarNumero(v, Number.isInteger(calc.passoY) ? 0 : 1)}</text>
          </g>
        ))}
        {faixas.filter((f) => f.rotulo && f.de > calc.y0 && f.de < calc.y1).map((f, i, lista) => {
          // dois rótulos colados (ex.: limites de 1 e 3 min): o segundo vai para baixo da linha
          const colado = i > 0 && Math.abs(y(lista[i - 1].de) - y(f.de)) < 14
          return (
            <g key={`l${f.de}-${i}`}>
              <line x1={M.esq} x2={M.esq + iw} y1={y(f.de)} y2={y(f.de)} stroke={f.cor} strokeDasharray="6 4" strokeWidth="1.2" />
              <text x={M.esq + iw - 4} y={y(f.de) + (colado ? 12 : -4)} textAnchor="end" fontSize="10.5" fontWeight="700" fill={f.cor}>{f.rotulo}</text>
            </g>
          )
        })}
        {marcasX.map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="11" fill="#5d665f">{formatarHora(new Date(t).toISOString())}</text>
        ))}
        <line x1={M.esq} x2={M.esq + iw} y1={M.topo + ih} y2={M.topo + ih} stroke="#d9d4c5" />
        {series.map((s) => (
          <path key={s.chave} d={caminho(s.chave)} fill="none" stroke={s.cor} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.tracejado ? '6 4' : undefined} />
        ))}
        {pf && (
          <g>
            <line x1={xf} x2={xf} y1={M.topo} y2={M.topo + ih} stroke="#1c2420" strokeOpacity="0.35" />
            {series.map((s) => (pf[s.chave] === null || pf[s.chave] === undefined ? null : (
              <circle key={s.chave} cx={xf} cy={y(pf[s.chave])} r="4" fill={s.cor} stroke="#fbfaf6" strokeWidth="2" />
            )))}
          </g>
        )}
      </svg>
      {pf && (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-md border border-linha bg-papel/95 px-3 py-2 text-xs shadow-sm"
          style={xf > W / 2 ? { right: W - xf + 10 } : { left: xf + 10 }}
        >
          <p className="numero font-bold">{formatarDataHora(pf.t)}</p>
          {series.map((s) => (
            <p key={s.chave} className="numero" style={{ color: s.cor }}>
              {s.rotulo}: <strong>{pf[s.chave] === null || pf[s.chave] === undefined ? 'sem leitura' : `${formatarNumero(pf[s.chave], decimais)} ${unidade}`}</strong>
            </p>
          ))}
          {sombrear && pf[sombrear] && <p className="font-bold text-normal">{rotuloSombra}</p>}
        </div>
      )}
    </div>
  )
}
