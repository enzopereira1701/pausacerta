import { Link } from 'react-router-dom'
import { ROTAS } from '../data/constantes'
import { INTEGRANTES, REPO } from '../data/equipe'
import { usandoMock } from '../services/api'
import { Simbolo, Texto } from './Marca'

const LINK = 'rounded text-creme underline-offset-4 hover:underline'
const TITULO = 'text-sm text-creme/70'

/**
 * Rodapé compacto: faixa verde-escura de ponta a ponta.
 * Linha 1: quem fez. Linha 2: sobre, telas e projeto. Linha 3: avisos.
 */
export default function Footer() {
  return (
    <footer className="bg-verde-escuro text-creme">
      <div className="mx-auto max-w-7xl px-4">
        <section aria-labelledby="titulo-quem-fez" className="flex flex-col gap-3 border-b border-creme/15 py-7 md:flex-row md:items-baseline md:gap-10">
          <h2 id="titulo-quem-fez" className="shrink-0 text-2xl">Quem fez</h2>
          <ul className="flex flex-wrap gap-x-8 gap-y-1 text-base">
            {INTEGRANTES.map((p) => (
              <li key={p.rm}>
                <span className="font-titulo font-semibold">{p.nome}</span> <span className="numero text-sm text-creme/60">{p.rm}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-8 py-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="flex items-center gap-2.5 text-creme" aria-label="Pausa Certa">
              <Simbolo className="h-12 w-auto" />
              <Texto className="h-9 w-auto" />
            </p>
            <p className="mt-2 max-w-xs text-sm text-creme/80">
              Estação de estresse térmico no caminhão da coleta: avisa a equipe quando o calor pede pausa, registra as pausas e cuida da água.
            </p>
          </div>

          <nav aria-label="Rodapé">
            <p className={TITULO}>Telas</p>
            <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <li><Link to="/" className={LINK}>Início</Link></li>
              {ROTAS.map((r) => <li key={r.caminho}><Link to={r.caminho} className={LINK}>{r.rotulo}</Link></li>)}
            </ul>
          </nav>

          <div>
            <p className={TITULO}>Projeto</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a className={LINK} href={REPO} target="_blank" rel="noreferrer">Código no GitHub</a></li>
              <li><a className={LINK} href="https://wokwi.com/projects/480299618436453377" target="_blank" rel="noreferrer">Simulação no Wokwi</a></li>
            </ul>
          </div>
        </div>

        <div className="space-y-1 border-t border-creme/15 py-5 pb-24 text-xs text-creme/70 md:pb-5">
          <p>
            Global Solution 2026.2 (CitizenTech), Engenharia de Software, FIAP. Plataforma FIWARE de código aberto, base do professor
            Fábio Henrique Cabrini. O índice de calor segue as faixas da NOAA como triagem; o IBUTG é uma estimativa e não substitui a NHO 06.
            As falas são de garis entrevistados em 9/11/2026, com autorização. As fotos do site são geradas com IA. Demonstração sem login.
          </p>
          {usandoMock && <p className="font-bold text-creme">Você está vendo dados de demonstração, gerados no navegador.</p>}
          <p>© 2026 Pausa Certa.</p>
        </div>
      </div>
    </footer>
  )
}
