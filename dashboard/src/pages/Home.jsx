import { Link } from 'react-router-dom'
import Cartao from '../components/Cartao'
import Foto from '../components/Foto'
import Icone from '../components/Icone'
import Semaforo from '../components/Semaforo'
import { FALAS } from '../data/equipe'

// As imagens ficam em public/img/ (prompts em docs/prompts-imagens.md). Sem o arquivo, aparece um quadro verde.
const PROBLEMAS = [
  { imagem: 'problema-sol.webp', icone: 'sol', titulo: 'O sol do meio-dia', texto: 'O calor mais forte cai no meio do turno, entre 11h e 15h, com a equipe correndo atrás do caminhão e erguendo sacos.', fala: FALAS[3] },
  { imagem: 'problema-pausa.webp', icone: 'pausa', titulo: 'Ninguém para', texto: 'A coleta é por rota: parar atrasa a volta para casa, e falta um sinal objetivo, que a empresa reconheça, de quando parar.', fala: FALAS[1] },
  { imagem: 'problema-agua.webp', icone: 'gota', titulo: 'A água esquenta e acaba', texto: 'O galão fica no caminhão, esquenta no sol e costuma acabar antes da reposição na garagem.', fala: FALAS[2] },
]

const PASSOS = [
  { nome: 'Mede', icone: 'termometro', texto: 'No caminhão, o Node mede o ar, a umidade, o globo negro (sol e asfalto) e o galão de água.' },
  { nome: 'Avisa', icone: 'semaforo', texto: 'Acende o semáforo na traseira e mostra a ação na tela da cabine. Funciona sem internet.' },
  { nome: 'Registra', icone: 'pausa', texto: 'Um clique no botão marca a pausa. O Node conta o tempo sem pausa e recomenda a próxima parada.' },
  { nome: 'Envia', icone: 'nuvem', texto: 'Por MQTT para o FIWARE: o Orion guarda o agora e o STH-Comet guarda o histórico.' },
  { nome: 'Mostra', icone: 'painel', texto: 'Este painel mostra a equipe em tempo real e manda comandos de volta ao Node.' },
]

// o que o semáforo e a tela mostram em cada situação (igual ao firmware)
const SINAIS = [
  { situacao: 'Normal (índice abaixo de 27 °C)', luzes: { verde: true }, tela: 'Trabalho normal', bipes: '1 curto ao voltar' },
  { situacao: 'Atenção (27 a 32 °C)', luzes: { amarelo: true }, tela: 'Água e sombra', bipes: '1' },
  { situacao: 'Crítico (32 a 41 °C)', luzes: { vermelho: true }, tela: 'Pausa na sombra', bipes: '2' },
  { situacao: 'Perigo (41 °C ou mais)', luzes: { vermelho: true }, piscar: true, tela: 'Suspender trabalho pesado', bipes: '3' },
  { situacao: 'Pausa recomendada', luzes: { vermelho: true, amarelo: true }, tela: 'Pare na próxima parada', bipes: '1 longo' },
  { situacao: 'Em pausa', luzes: { verde: true }, piscar: true, tela: 'Em pausa, com cronômetro', bipes: '1 ao iniciar, 2 ao registrar' },
]

const TH = 'py-2 pr-4 font-bold'

/** Página inicial: o problema, a solução, como funciona e o que o semáforo diz. */
export default function Home() {
  return (
    <div>
      {/* abertura */}
      <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-verde-escuro text-papel">
        <Foto arquivo="hero-coleta.webp" className="absolute inset-0 -z-20 size-full" prioridade />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-verde-escuro/95 via-verde-escuro/70 to-verde-escuro/10" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-verde-escuro/70 via-transparent to-verde-escuro/30" />
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-32">
          <p className="inline-flex items-center gap-2 rounded-full bg-creme/15 px-3 py-1 text-sm font-bold text-creme">
            <Icone nome="caminhao" className="size-4" /> Para quem corre atrás do caminhão da coleta
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl leading-[1.02] font-extrabold md:text-7xl">A pausa certa, na hora do calor.</h1>
          <p className="mt-5 max-w-xl text-lg text-papel/90">
            Uma estação no caminhão mede o calor de verdade, acende um semáforo que a equipe vê de longe e recomenda a pausa na próxima parada da rota. Sem celular, sem internet.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/painel" className="rounded-md bg-creme px-5 py-2.5 text-sm font-bold text-verde hover:bg-papel">Abrir o painel</Link>
            <Link to="/historico" className="rounded-md border border-papel/70 px-5 py-2.5 text-sm font-bold text-papel hover:bg-papel/15">Ver o histórico do turno</Link>
          </div>
        </div>
      </section>

      {/* o problema, com as falas */}
      <section className="mx-auto max-w-7xl px-4 py-14" aria-labelledby="titulo-problema">
        <h2 id="titulo-problema" className="text-3xl md:text-4xl">O que pesa na rota</h2>
        <p className="mt-2 max-w-2xl text-suave">Ouvimos três garis da coleta. As falas são deles, usadas com autorização.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {PROBLEMAS.map((p) => (
            <article key={p.titulo} className="flex flex-col overflow-hidden rounded-lg border border-linha bg-papel">
              <Foto arquivo={p.imagem} className="aspect-[4/3] w-full" />
              <div className="flex flex-1 flex-col p-5">
                <p className="flex items-center gap-2 font-titulo text-xl font-bold text-verde">
                  <Icone nome={p.icone} className="size-6" />
                  {p.titulo}
                </p>
                <p className="mt-2 text-tinta">{p.texto}</p>
                <blockquote className="mt-4 border-l-4 border-amarelo pl-3 text-sm italic text-suave">
                  "{p.fala.texto}" <span className="not-italic font-bold text-tinta">({p.fala.autor})</span>
                </blockquote>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* fala em destaque */}
      <section className="bg-verde text-creme" aria-label="Fala de um gari entrevistado">
        <figure className="mx-auto max-w-5xl px-4 py-14 md:py-20">
          <blockquote className="font-titulo text-3xl font-bold leading-tight md:text-5xl">"{FALAS[0].texto}"</blockquote>
          <figcaption className="mt-5 text-creme/80">{FALAS[0].autor}, gari da coleta, entrevistado em 9/11/2026</figcaption>
        </figure>
      </section>

      {/* como funciona */}
      <section className="border-b border-linha bg-papel" aria-labelledby="titulo-passos">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <h2 id="titulo-passos" className="text-3xl md:text-4xl">Como funciona</h2>
          <ol className="mt-10 grid gap-0 md:grid-cols-5 md:gap-6">
            {PASSOS.map((c, i) => (
              <li key={c.nome} className="relative flex gap-4 pb-8 last:pb-0 md:block md:pb-0">
                <span className="relative inline-grid size-14 shrink-0 place-items-center rounded-xl bg-verde text-creme">
                  <Icone nome={c.icone} className="size-7" />
                  <span className="numero absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-amarelo text-xs font-bold text-tinta ring-2 ring-papel">{i + 1}</span>
                </span>
                {i < PASSOS.length - 1 && (
                  <>
                    <span aria-hidden="true" className="absolute left-16 top-7 -right-6 hidden h-0.5 bg-verde/25 md:block" />
                    <span aria-hidden="true" className="absolute bottom-0 left-7 top-16 -ml-px w-0.5 bg-verde/25 md:hidden" />
                  </>
                )}
                <div className="md:mt-5">
                  <h3 className="text-xl">{c.nome}</h3>
                  <p className="mt-1 text-sm text-tinta">{c.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* o que o semáforo diz */}
      <section className="mx-auto max-w-7xl px-4 py-14" aria-labelledby="titulo-sinais">
        <h2 id="titulo-sinais" className="text-3xl md:text-4xl">Um sinal que se entende de longe</h2>
        <p className="mt-2 max-w-2xl text-suave">
          O semáforo fica na traseira, para os coletores; a tela fica na cabine, para o motorista escolher onde parar. O bipe só toca quando algo muda.
        </p>
        <Cartao tom="marca" className="mt-6 p-5 pl-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-linha text-suave">
                <tr><th className={TH}>Situação</th><th className={TH}>Semáforo</th><th className={TH}>Tela da cabine</th><th className="font-bold">Bipes</th></tr>
              </thead>
              <tbody>
                {SINAIS.map((s) => (
                  <tr key={s.situacao} className="border-b border-linha/60 last:border-0">
                    <td className="py-3 pr-4 font-bold">{s.situacao}</td>
                    <td className="pr-4">
                      <span className="inline-flex items-center gap-2">
                        <Semaforo luzes={s.luzes} piscar={s.piscar} horizontal pequeno />
                        {s.piscar && <span className="text-xs text-suave">piscando</span>}
                      </span>
                    </td>
                    <td className="pr-4">{s.tela}</td>
                    <td>{s.bipes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>
        <p className="mt-4 max-w-3xl text-sm text-tinta">
          A pausa é <strong>recomendada, nunca obrigatória</strong>: quem decide é a equipe, e o botão nunca bloqueia uma pausa.
          Os tempos do regime são da empresa, com a segurança do trabalho. Faixas do índice de calor: NOAA. O IBUTG aparece só como estimativa.
        </p>
      </section>

      {/* faixa final */}
      <section className="relative isolate overflow-hidden bg-verde-escuro text-creme" aria-labelledby="titulo-final">
        <Foto arquivo="banner-final.webp" className="absolute inset-0 -z-20 size-full" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-verde-escuro/40 via-verde-escuro/60 to-verde-escuro" />
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 md:pb-24 md:pt-40">
          <h2 id="titulo-final" className="max-w-2xl text-3xl md:text-5xl">Menos cansaço, mais energia depois da pausa.</h2>
          <p className="mt-4 max-w-xl text-lg text-creme/90">"Isso ia diminuir nosso cansaço e ajudar a trabalhar com mais energia depois." (Jackson)</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/painel" className="rounded-md bg-creme px-5 py-2.5 text-sm font-bold text-verde hover:bg-papel">Abrir o painel</Link>
            <Link to="/comandos" className="rounded-md border border-creme/70 px-5 py-2.5 text-sm font-bold text-creme hover:bg-creme/15">Ajustar o regime</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
