import { useState } from 'react'
import Aviso from '../components/Aviso'
import Botao from '../components/Botao'
import Cartao from '../components/Cartao'
import { Carregando } from '../components/Estado'
import FaixaEstados from '../components/FaixaEstados'
import Grafico from '../components/Grafico'
import { ESTADOS, INTERVALO_ATUALIZACAO_MS, PADROES, PERIODOS } from '../data/constantes'
import { usePolling } from '../hooks/usePolling'
import * as api from '../services/api'
import { FAIXAS_GALAO, faixasDoIndice } from '../utils/faixas'
import { formatarMinutos, formatarNumero } from '../utils/formatacao'

/** Números do período: o que o encarregado e a segurança do trabalho querem saber. */
function resumir(pontos) {
  let pausas = 0
  let minQuente = 0
  pontos.forEach((p, i) => {
    if (i > 0 && p.emPausa && !pontos[i - 1].emPausa) pausas++
    if (i < pontos.length - 1 && (p.estado === 'CRITICO' || p.estado === 'PERIGO') && !p.emPausa) {
      minQuente += (new Date(pontos[i + 1].t) - new Date(p.t)) / 60000
    }
  })
  const ics = pontos.map((p) => p.indiceCalor_c).filter((v) => v !== null)
  const galoes = pontos.map((p) => p.galao_pct).filter((v) => v !== null && v >= 0)
  return {
    pausas,
    minQuente,
    icMax: ics.length ? Math.max(...ics) : null,
    galaoMin: galoes.length ? Math.min(...galoes) : null,
    semPausaMax: Math.max(0, ...pontos.map((p) => p.minutosSemPausa ?? 0)),
  }
}

function Numero({ rotulo, valor, detalhe, tom }) {
  return (
    <Cartao tom={tom} className="p-4 pl-5">
      <p className="text-sm font-bold text-suave">{rotulo}</p>
      <p className="numero mt-1 font-titulo text-3xl font-bold">{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-suave">{detalhe}</p>}
    </Cartao>
  )
}

function Figura({ titulo, legenda, children }) {
  return (
    <figure className="rounded-lg border border-linha bg-papel p-4 md:p-5">
      <figcaption className="mb-3">
        <span className="font-titulo text-lg font-bold">{titulo}</span>
        {legenda && <span className="block text-xs text-suave">{legenda}</span>}
      </figcaption>
      {children}
    </figure>
  )
}

/** Histórico do STH-Comet: estado ao longo do turno, calor, pausas e água. */
export default function Historico() {
  const [periodo, setPeriodo] = useState('turno')
  const [aoVivo, setAoVivo] = useState(true)
  const [dados, setDados] = useState(null) // { periodo, pontos, limites, regime }
  const [erro, setErro] = useState(null)

  usePolling(
    async (aindaVale) => {
      try {
        const [h, c] = await Promise.all([api.obterHistorico(periodo), api.obterConfig()])
        if (!aindaVale()) return
        setDados({ periodo: h.periodo, pontos: h.pontos, limites: c.limites, regime: c.regime })
        setErro(null)
      } catch (e) {
        if (aindaVale()) setErro(e.message)
      }
    },
    INTERVALO_ATUALIZACAO_MS * 2,
    periodo,
    aoVivo,
  )

  const atual = dados?.periodo === periodo ? dados : null
  const pontos = atual?.pontos ?? []
  const limites = atual?.limites ?? PADROES.limites
  const regime = atual?.regime ?? PADROES.regime
  const r = resumir(pontos)

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-3xl">Histórico</h1>
        <p className="text-sm text-suave">Leituras guardadas no STH-Comet, no horário de Brasília. Passe o mouse (ou o dedo) nos gráficos para ver cada leitura.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-y border-linha py-3">
        <div className="flex overflow-hidden rounded-md border border-linha" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={periodo === p.id}
              onClick={() => {
                setPeriodo(p.id)
                setAoVivo(true)
              }}
              className={`px-3 py-1.5 text-sm font-bold ${periodo === p.id ? 'bg-verde text-papel' : 'bg-papel text-suave hover:text-verde'}`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
        <Botao variante="neutro" tamanho="sm" icone={aoVivo ? 'pausa' : 'play'} onClick={() => setAoVivo((v) => !v)} className="ml-auto">
          {aoVivo ? 'Pausar atualização' : 'Retomar'}
        </Botao>
      </div>

      {erro && <Aviso nivel="alerta" titulo="Falha ao buscar o histórico">{erro}</Aviso>}
      {!atual && !erro && <Carregando texto="Buscando o histórico..." />}

      {atual && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Numero rotulo="Pausas no período" valor={r.pausas} tom="normal" detalhe="Inícios de pausa registrados pelo botão." />
            <Numero rotulo="Em CRÍTICO ou PERIGO sem pausa" valor={formatarMinutos(r.minQuente)} tom={r.minQuente > regime[2] ? 'critico' : 'neutro'} detalhe="Indicador de impacto da ficha." />
            <Numero rotulo="Maior índice de calor" valor={`${formatarNumero(r.icMax)} °C`} tom={r.icMax >= limites[1] ? 'critico' : r.icMax >= limites[0] ? 'atencao' : 'normal'} />
            <Numero rotulo="Menor nível do galão" valor={r.galaoMin === null ? '--' : `${r.galaoMin} %`} tom={r.galaoMin !== null && r.galaoMin < 20 ? 'critico' : 'agua'} />
          </div>

          <Figura titulo="Estado do calor" legenda="Cada cor é um estado do semáforo; a legenda soma o tempo em cada um.">
            <FaixaEstados pontos={pontos} />
          </Figura>

          <Figura titulo="Índice de calor" legenda="Fundo: faixas do estado (limites atuais do Node). Faixa verde-clara: equipe em pausa.">
            <Grafico titulo="índice de calor" pontos={pontos} unidade="°C" faixas={faixasDoIndice(limites)} sombrear="emPausa" rotuloSombra="Equipe em pausa"
              series={[{ chave: 'indiceCalor_c', rotulo: 'Índice de calor', cor: '#1c2420' }]} />
          </Figura>

          <div className="grid gap-4 lg:grid-cols-2">
            <Figura titulo="Ar e globo negro" legenda="A distância entre as linhas é o calor do sol e do asfalto.">
              <Grafico titulo="temperatura do ar e do globo" pontos={pontos} unidade="°C"
                series={[{ chave: 'globo_c', rotulo: 'Globo negro', cor: '#4a3b33' }, { chave: 'temperatura_c', rotulo: 'Ar', cor: ESTADOS.ATENCAO.cor }]} />
            </Figura>
            <Figura titulo="Minutos sem pausa" legenda={`Linha: limite do regime em CRÍTICO (${regime[2]} min) e em ATENÇÃO (${regime[1]} min).`}>
              <Grafico titulo="minutos sem pausa" pontos={pontos} unidade="min" decimais={0} sombrear="emPausa" rotuloSombra="Equipe em pausa"
                faixas={[{ de: regime[2], ate: regime[2], cor: ESTADOS.CRITICO.cor, rotulo: `limite em CRÍTICO ${regime[2]} min`, apenasLinha: true }, { de: regime[1], ate: regime[1], cor: ESTADOS.ATENCAO.cor, rotulo: `limite em ATENÇÃO ${regime[1]} min`, apenasLinha: true }]}
                series={[{ chave: 'minutosSemPausa', rotulo: 'Sem pausa', cor: '#1f5c3f' }]} />
            </Figura>
            <Figura titulo="Nível do galão" legenda="Quando sobe de repente, o galão foi reposto.">
              <Grafico titulo="nível do galão" pontos={pontos} unidade="%" decimais={0} dominio={[0, 100]} faixas={FAIXAS_GALAO}
                series={[{ chave: 'galao_pct', rotulo: 'Galão', cor: '#2f6fa8' }]} />
            </Figura>
            <Figura titulo="Temperatura da água" legenda={`Acima de ${PADROES.galao[2]} °C a tela avisa "água quente".`}>
              <Grafico titulo="temperatura da água" pontos={pontos} unidade="°C"
                series={[{ chave: 'aguaTemp_c', rotulo: 'Água', cor: '#2f6fa8' }]} />
            </Figura>
          </div>
        </>
      )}
    </div>
  )
}
