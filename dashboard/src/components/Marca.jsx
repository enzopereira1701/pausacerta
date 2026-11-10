import { Link } from 'react-router-dom'

/**
 * Símbolo PROVISÓRIO do Pausa Certa (até o grupo ter o logo): um quadrado verde com o sinal de pausa
 * e um sol no canto. Trocar por <img src="/pausacerta-simbolo.svg" /> quando o logo existir
 * (prompt em docs/prompts-imagens.md).
 */
export function Simbolo({ className = 'size-10' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#1f5c3f" />
      <circle cx="35" cy="13" r="5" fill="#f2b705" />
      <rect x="14" y="15" width="6.5" height="20" rx="2.2" fill="#f3f0e7" />
      <rect x="25.5" y="15" width="6.5" height="20" rx="2.2" fill="#f3f0e7" />
    </svg>
  )
}

/** Marca do topo: símbolo + nome (leva para o Início). `clara` = texto off-white, para fundo verde. */
export default function Marca({ clara = true }) {
  return (
    <Link to="/" aria-label="Pausa Certa, página inicial" className="flex items-center gap-3">
      <Simbolo className="size-10 shrink-0 md:size-11" />
      <span className={`font-titulo text-xl font-extrabold leading-none tracking-tight md:text-2xl ${clara ? 'text-creme' : 'text-verde'}`}>
        pausa certa
      </span>
    </Link>
  )
}
