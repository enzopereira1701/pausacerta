import Icone from './Icone'

// Classes COMPLETAS (o Tailwind só enxerga texto escrito por inteiro no código).
const TONS = {
  normal: 'bg-normal/12 text-normal',
  atencao: 'bg-amarelo/25 text-atencao',
  critico: 'bg-critico/12 text-critico',
  perigo: 'bg-perigo/12 text-perigo',
  falha: 'bg-falha/12 text-falha',
  agua: 'bg-agua/12 text-agua',
  neutro: 'bg-suave/10 text-suave',
  marca: 'bg-verde/10 text-verde',
}

/** Selo pequeno com texto (e ícone opcional). Nunca depende só da cor: sempre tem texto. */
export default function Distintivo({ tom = 'neutro', icone, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${TONS[tom] ?? TONS.neutro} ${className}`}>
      {icone && <Icone nome={icone} className="size-3.5" />}
      {children}
    </span>
  )
}
