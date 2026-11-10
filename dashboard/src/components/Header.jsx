import { NavLink } from 'react-router-dom'
import { EQUIPE, ROTAS } from '../data/constantes'
import { useApp } from '../hooks/useApp'
import { sinalDoNode } from '../utils/sinais'
import Icone from './Icone'
import Marca from './Marca'

/** Pílula com o estado da equipe agora (cor + texto), visível em todas as telas. */
function EstadoAgora({ compacto = false }) {
  const { equipe } = useApp()
  const s = sinalDoNode(equipe?.atual, equipe ?? {})
  return (
    <NavLink
      to="/painel"
      className="inline-flex items-center gap-2 rounded-full bg-creme px-3 py-1.5 text-sm font-bold text-tinta hover:bg-papel"
      aria-label={`Equipe ${EQUIPE.id}: ${s.titulo}. Abrir o painel.`}
    >
      <span className={`size-2.5 rounded-full ${s.piscar ? 'piscar' : ''}`} style={{ background: s.cor }} aria-hidden="true" />
      {!compacto && <span className="numero text-suave">{EQUIPE.id}</span>}
      <span style={{ color: s.cor }}>{equipe ? s.titulo : '...'}</span>
    </NavLink>
  )
}

/**
 * Navegação em barra de ponta a ponta, verde e meio translúcida (como no WineGuard).
 * Ao passar o mouse, o item vira uma pílula off-white. No celular, os atalhos ficam numa barra embaixo.
 */
export default function Header() {
  const classeTopo = ({ isActive }) =>
    `inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-base font-bold transition-colors duration-200 hover:bg-creme hover:text-verde focus-visible:bg-creme focus-visible:text-verde ${
      isActive ? 'bg-creme/20 text-creme' : 'text-creme'
    }`
  const classeBase = ({ isActive }) =>
    `flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[11px] font-bold transition-colors ${isActive ? 'bg-creme text-verde' : 'text-creme'}`

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-creme/10 bg-verde/88 shadow-[0_8px_24px_-12px_rgb(19_59_40/0.6)] backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 md:h-20">
          <Marca />
          <div className="flex items-center gap-2">
            <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
              {ROTAS.map((rota) => (
                <NavLink key={rota.caminho} to={rota.caminho} className={classeTopo}>
                  {rota.rotulo}
                </NavLink>
              ))}
            </nav>
            <div className="pl-2 lg:pl-4">
              <span className="hidden lg:inline"><EstadoAgora /></span>
              <span className="lg:hidden"><EstadoAgora compacto /></span>
            </div>
          </div>
        </div>
      </header>

      <nav aria-label="Atalhos" className="fixed inset-x-0 bottom-0 z-40 flex gap-1 border-t border-creme/10 bg-verde/92 p-1.5 backdrop-blur-md md:hidden">
        {ROTAS.map((rota) => (
          <NavLink key={rota.caminho} to={rota.caminho} className={classeBase}>
            <Icone nome={rota.icone} />
            {rota.rotulo}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
