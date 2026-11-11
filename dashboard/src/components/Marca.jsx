import { Link } from 'react-router-dom'
import { SIMBOLO, TEXTO } from '../data/logo'

/**
 * Logo do Pausa Certa (casa, pessoa com coração e mãos), redesenhado em SVG a partir do logo do grupo.
 * A cor vem do texto em volta (currentColor): verde no fundo claro, off-white no fundo verde.
 * Versões coloridas para documentos: docs/imagens/pausacerta-logo.svg e pausacerta-logo-claro.svg.
 */
export function Simbolo({ className = 'size-10' }) {
  return (
    <svg viewBox={SIMBOLO.viewBox} className={className} aria-hidden="true" fill="currentColor">
      <path fillRule="evenodd" d={SIMBOLO.d} />
    </svg>
  )
}

/** "PAUSA / CERTA" no desenho do logo. CERTA fica um pouco mais clara, como no original. */
export function Texto({ className = 'h-9' }) {
  return (
    <svg viewBox={TEXTO.viewBox} className={className} aria-hidden="true" fill="currentColor">
      <path fillRule="evenodd" d={TEXTO.pausa} />
      <path fillRule="evenodd" d={TEXTO.certa} opacity="0.78" />
    </svg>
  )
}

/** Marca do topo: símbolo + nome (leva para o Início). `clara` = off-white, para o fundo verde. */
export default function Marca({ clara = true }) {
  return (
    <Link to="/" aria-label="Pausa Certa, página inicial" className={`flex items-center gap-2.5 ${clara ? 'text-creme' : 'text-verde-escuro'}`}>
      <Simbolo className="h-10 w-auto shrink-0 md:h-12" />
      <Texto className="h-7 w-auto md:h-9" />
    </Link>
  )
}
