import Icone from './Icone'

// Classes COMPLETAS (o Tailwind só enxerga texto escrito por inteiro no código).
const VARIANTES = {
  primario: 'bg-verde text-papel hover:bg-verde-escuro',
  secundario: 'border border-verde text-verde hover:bg-verde/10',
  neutro: 'border border-linha bg-papel text-tinta hover:border-verde/60',
  fantasma: 'text-verde hover:bg-verde/10',
  perigo: 'bg-critico text-papel hover:bg-critico/90',
}
const TAMANHOS = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

/**
 * Botão padrão do site.
 * @param {{ variante?: keyof typeof VARIANTES, tamanho?: keyof typeof TAMANHOS,
 *           icone?: string, carregando?: boolean }} props
 */
export default function Botao({ variante = 'primario', tamanho = 'md', icone, carregando = false, className = '', children, disabled, ...resto }) {
  return (
    <button
      type="button"
      disabled={disabled || carregando}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${className}`}
      {...resto}
    >
      {icone && <Icone nome={icone} className="size-4" />}
      {carregando ? 'Aguarde...' : children}
    </button>
  )
}
