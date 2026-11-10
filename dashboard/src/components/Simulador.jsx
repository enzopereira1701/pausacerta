import { useState } from 'react'
import { CENARIOS } from '../services/mock'
import { simulador, usandoMock } from '../services/api'
import { useApp } from '../hooks/useApp'
import Botao from './Botao'

/**
 * Só aparece com dados de demonstração. Faz o papel do Wokwi: muda o "ar" em volta do caminhão
 * e aperta os botões do Node, para ver o painel reagir sem a AWS.
 */
export default function Simulador() {
  const { avisar, atualizar } = useApp()
  const [cenario, setCenario] = useState(() => (usandoMock ? simulador.obterCenario() : null))
  if (!usandoMock) return null

  const escolher = (id) => {
    simulador.definirCenario(id)
    setCenario(id)
    atualizar()
  }
  const acao = (funcao) => {
    avisar(funcao())
    atualizar()
  }

  return (
    <section className="rounded-lg border border-dashed border-verde/50 bg-verde-claro/40 p-4" aria-labelledby="titulo-simulador">
      <h2 id="titulo-simulador" className="text-lg">Simulador (dados de demonstração)</h2>
      <p className="mb-3 text-sm text-suave">
        Faz o papel do Wokwi. Escolha o tempo lá fora e use os botões do Node; os valores mudam aos poucos, como a média móvel do firmware.
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Cenário">
        {CENARIOS.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={cenario === c.id}
            onClick={() => escolher(c.id)}
            className={`rounded-md border px-3 py-1.5 text-sm font-bold ${cenario === c.id ? 'border-verde bg-verde text-papel' : 'border-linha bg-papel text-tinta hover:border-verde/60'}`}
          >
            {c.rotulo}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Botao variante="neutro" tamanho="sm" icone="pausa" onClick={() => acao(simulador.apertarBotao)}>Clicar no botão PAUSA</Botao>
        <Botao variante="neutro" tamanho="sm" icone="coracao" onClick={() => acao(simulador.registrarMalEstar)}>Dois toques longos (mal-estar)</Botao>
        <Botao variante="neutro" tamanho="sm" icone="gota" onClick={() => acao(simulador.reporGalao)}>Repor o galão</Botao>
      </div>
    </section>
  )
}
