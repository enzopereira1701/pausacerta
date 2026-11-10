import Cartao from './Cartao'
import Distintivo from './Distintivo'
import Icone from './Icone'

/**
 * Um cartão de valor do Painel: ícone, rótulo, número grande, selo (sempre com texto)
 * e uma linha de detalhe. `children` entra embaixo (ex.: uma barra).
 */
export default function Metrica({ icone, cor, rotulo, valor, unidade, selo, detalhe, tom = 'neutro', children }) {
  return (
    <Cartao tom={tom} className="flex flex-col p-4 pl-5 md:p-5 md:pl-6">
      <div className="flex items-center gap-2 text-sm font-bold" style={{ color: cor }}>
        <Icone nome={icone} className="size-5" />
        {rotulo}
      </div>
      <p className="mt-2 flex items-baseline gap-1">
        <span className={`numero font-titulo font-bold text-tinta ${String(valor).length > 6 ? 'text-2xl md:text-3xl' : 'text-4xl md:text-[2.75rem]'}`}>{valor}</span>
        {unidade && <span className="text-base text-suave">{unidade}</span>}
      </p>
      {selo && <div className="mt-2"><Distintivo tom={selo.tom} icone={selo.icone}>{selo.texto}</Distintivo></div>}
      {children}
      {detalhe && <p className="mt-2 text-xs text-suave">{detalhe}</p>}
    </Cartao>
  )
}

const COR_BARRA = { normal: 'bg-normal', atencao: 'bg-amarelo', critico: 'bg-critico', perigo: 'bg-perigo', falha: 'bg-falha', agua: 'bg-agua', marca: 'bg-verde' }

/** Barra de progresso com texto para leitor de tela. */
export function Barra({ pct, tom = 'marca', rotulo }) {
  const v = Math.max(0, Math.min(100, pct ?? 0))
  return (
    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-linha/70" role="progressbar" aria-label={rotulo} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-[width] duration-700 ${COR_BARRA[tom] ?? COR_BARRA.marca}`} style={{ width: `${v}%` }} />
    </div>
  )
}
