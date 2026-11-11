import { useState } from 'react'
import { Link } from 'react-router-dom'
import Aviso from '../components/Aviso'
import Botao from '../components/Botao'
import Cartao from '../components/Cartao'
import { Carregando, Erro } from '../components/Estado'
import Grafico from '../components/Grafico'
import Icone from '../components/Icone'
import Metrica, { Barra } from '../components/Metrica'
import Semaforo from '../components/Semaforo'
import Simulador from '../components/Simulador'
import { EQUIPE, ESTADOS, ESTADOS_AGUA, INTERVALO_ATUALIZACAO_MS, PADROES } from '../data/constantes'
import { useAgora } from '../hooks/useAgora'
import { useApp } from '../hooks/useApp'
import { usePolling } from '../hooks/usePolling'
import * as api from '../services/api'
import { limiteSemPausa } from '../utils/calor'
import { formatarCronometro, formatarMinutos, formatarNumero, tempoRelativo } from '../utils/formatacao'
import { faixasDoIndice } from '../utils/faixas'
import { sinalDoNode } from '../utils/sinais'

const TITULO_SECAO = 'flex items-center gap-2 text-xl'

/** Tela principal: o que o Node está mostrando agora, calor, pausas, água e a última hora. */
export default function Painel() {
  const { equipe, erro, carregando, avisar, atualizar } = useApp()
  const [config, setConfig] = useState(null)
  const [hora, setHora] = useState(null)
  const agora = useAgora(1000)

  usePolling(
    async (aindaVale) => {
      const [c, h] = await Promise.all([api.obterConfig(), api.obterHistorico('1h')])
      if (!aindaVale()) return
      setConfig(c)
      setHora(h.pontos)
    },
    INTERVALO_ATUALIZACAO_MS,
    'painel',
  )

  const identificar = async () => {
    try {
      await api.enviarComando('identify')
      avisar('O semáforo do caminhão vai piscar por 5 segundos.')
      setTimeout(atualizar, 400)
    } catch (e) {
      avisar(e.message, 'erro')
    }
  }

  if (carregando) return <Carregando texto="Lendo a equipe..." />
  if (erro && !equipe) return <Erro mensagem={erro} aoTentar={atualizar} />

  const a = equipe.atual
  const sinal = sinalDoNode(a, equipe)
  const estadoInfo = ESTADOS[a.estado] ?? ESTADOS.FALHA_SENSOR
  const limites = config?.limites ?? PADROES.limites
  const regime = config?.regime ?? PADROES.regime
  const limitePausa = limiteSemPausa(a.estado, regime)
  const agua = ESTADOS_AGUA[a.estadoAgua] ?? ESTADOS_AGUA.SEM_SENSOR
  const aguaQuente = a.aguaTemp_c !== null && a.aguaTemp_c > (config?.galao ?? PADROES.galao)[2]
  const segPausa = equipe.pausaDesde ? (agora - new Date(equipe.pausaDesde).getTime()) / 1000 : null

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-3xl">Painel</h1>
        <p className="text-sm text-suave">
          Equipe <strong className="numero text-tinta">{EQUIPE.id}</strong> · Node <span className="numero">{EQUIPE.device}</span> no caminhão · entidade <span className="numero">{EQUIPE.entidade}</span>
        </p>
      </div>

      {/* status e controles */}
      <div className="flex flex-wrap items-center gap-3 border-y border-linha py-3">
        {equipe.online ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-normal">
            <span className="ao-vivo size-2 rounded-full bg-normal" aria-hidden="true" />
            Online, atualiza a cada 5 s
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-falha">
            <Icone nome="semNuvem" className="size-4" /> Sem conexão
          </span>
        )}
        <span className="text-sm text-suave">
          Última leitura: <span className="numero font-bold text-tinta">{tempoRelativo(equipe.ultimaLeitura, agora)}</span>
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Botao variante="neutro" tamanho="sm" icone="semaforo" onClick={identificar} disabled={!equipe.online}>Identificar Node</Botao>
          <Link to="/comandos" className="inline-flex items-center gap-2 rounded-md border border-linha bg-papel px-3 py-1.5 text-sm font-bold text-tinta hover:border-verde/60">
            <Icone nome="ajustes" className="size-4" /> Regime e limites
          </Link>
        </div>
      </div>

      {erro && <Aviso nivel="alerta" titulo="Falha ao atualizar">{erro}</Aviso>}
      {!equipe.online && (
        <Aviso nivel="info" titulo="O Node está sem sinal (comum na rota)">
          Os valores abaixo são da última leitura. No caminhão, o semáforo e a tela continuam avisando a equipe, e o Node guarda até 60 envios para mandar quando o sinal voltar.
        </Aviso>
      )}

      {/* o que o caminhão está mostrando agora */}
      <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]" aria-label="Sinal do Node agora">
        <div className="relative overflow-hidden rounded-xl p-5 text-papel md:p-7" style={{ background: sinal.estado === 'OFFLINE' ? '#4b524e' : sinal.cor }}>
          <div className="flex items-center gap-5 md:gap-7">
            <Semaforo luzes={sinal.luzes} piscar={sinal.piscar} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-wider text-papel/80">Estado do calor</p>
              <p className="font-titulo text-4xl font-extrabold leading-none md:text-6xl">{equipe.online ? estadoInfo.rotulo : 'Sem conexão'}</p>
              <p className="mt-3 text-lg font-bold md:text-xl">{!equipe.online ? `Última leitura: ${estadoInfo.rotulo}` : a.emPausa ? 'Equipe em pausa' : a.pausaRecomendada ? 'Pausa recomendada' : estadoInfo.acao}</p>
              <p className="mt-1 text-sm text-papel/85">
                Índice de calor <strong className="numero">{formatarNumero(a.indiceCalor_c)} °C</strong> ({estadoInfo.faixa}).
              </p>
            </div>
          </div>
        </div>

        <Cartao tom="marca" className="flex flex-col justify-between gap-4 p-5 pl-6">
          <div>
            <p className="text-sm font-bold text-suave">Na tela da cabine, agora</p>
            <div className="mt-2 rounded-md bg-[#101413] px-4 py-3 font-mono">
              <p className="text-xs text-[#9aa39d]">{EQUIPE.id}</p>
              <p className="text-base font-bold break-words sm:text-lg" style={{ color: sinal.estado === 'OFFLINE' ? '#c9cfcb' : sinal.luzes.vermelho ? '#ff6a5a' : sinal.luzes.amarelo ? '#f2c94c' : '#5fd47e' }}>
                {sinal.tela}
                {segPausa !== null && <span className="numero"> {formatarCronometro(segPausa)}</span>}
              </p>
            </div>
          </div>
          <p className="text-sm text-tinta">
            {a.pausaRecomendada
              ? `${a.minutosSemPausa} min sem pausa em ${estadoInfo.rotulo.toUpperCase()} (limite do regime: ${limitePausa} min). O Node pede a pausa na próxima parada natural da rota; quem decide é a equipe.`
              : a.emPausa
                ? 'A pausa conta para o regime se durar o mínimo combinado. Ela nunca é bloqueada.'
                : 'O semáforo fica na traseira, para os coletores verem de longe; a tela fica na cabine, para o motorista decidir onde parar.'}
          </p>
        </Cartao>
      </section>

      {/* avisos */}
      {(a.estadoAgua === 'ACABANDO' || a.estadoAgua === 'SEM_AGUA') && (
        <div className="respirar flex items-start gap-3 rounded-md border border-agua/40 bg-agua/10 px-4 py-3 text-agua" role="alert">
          <Icone nome="gota" className="mt-0.5 size-5" />
          <div>
            <p className="font-bold">{agua.rotulo}: galão em {a.galao_pct}%</p>
            <p className="text-sm text-tinta">Reponha antes de acabar: na entrevista, a água acabava "muito antes da parada na garagem" (Jackson).</p>
          </div>
        </div>
      )}
      {a.estado === 'FALHA_SENSOR' && (
        <Aviso nivel="forte" titulo="Sensor do ar com falha">O DHT22 mandou 3 leituras inválidas seguidas. No caminhão, o semáforo pisca amarelo e a tela pede para conferir o sensor.</Aviso>
      )}

      {/* calor */}
      <section aria-labelledby="t-calor" className="space-y-3">
        <h2 id="t-calor" className={TITULO_SECAO}><Icone nome="sol" className="size-6 text-atencao" /> Calor</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metrica icone="termometro" cor={estadoInfo.cor} rotulo="Índice de calor" valor={formatarNumero(a.indiceCalor_c)} unidade="°C" tom={estadoInfo.tom}
            selo={{ tom: estadoInfo.tom, texto: estadoInfo.rotulo }} detalhe={`Faixas: ${limites[0]}, ${limites[1]} e ${limites[2]} °C (NOAA). Decide o estado.`} />
          <Metrica icone="termometro" cor="#1c2420" rotulo="Ar" valor={formatarNumero(a.temperatura_c)} unidade="°C"
            detalhe={`Umidade ${formatarNumero(a.umidade_pct, 0)} %. DHT22, à sombra.`} />
          <Metrica icone="globo" cor="#4a3b33" rotulo="Globo negro" valor={formatarNumero(a.globo_c)} unidade="°C"
            selo={a.solDireto ? { tom: 'atencao', icone: 'sol', texto: 'Sol direto' } : { tom: 'neutro', icone: 'nuvem', texto: 'Sombra' }}
            detalhe="Calor do sol e do asfalto, que o ar não mostra." />
          <Metrica icone="info" cor="#5d665f" rotulo="IBUTG estimado" valor={formatarNumero(a.ibutgEstimado_c)} unidade="°C"
            detalhe="Só informativo: o ESP32 não mede o bulbo úmido natural (NR-09, Anexo III)." />
        </div>
      </section>

      {/* pausas */}
      <section aria-labelledby="t-pausas" className="space-y-3">
        <h2 id="t-pausas" className={TITULO_SECAO}><Icone nome="pausa" className="size-6 text-verde" /> Pausas</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metrica icone="relogio" cor="#1c2420" rotulo="Sem pausa há" valor={a.emPausa ? '0' : formatarNumero(a.minutosSemPausa, 0)} unidade="min"
            tom={a.pausaRecomendada ? 'critico' : 'neutro'}
            selo={a.pausaRecomendada ? { tom: 'critico', icone: 'alerta', texto: 'Pausa recomendada' } : undefined}
            detalhe={limitePausa ? `Limite em ${estadoInfo.rotulo.toUpperCase()}: ${formatarMinutos(limitePausa)} (regime da empresa).` : 'Em NORMAL o regime não pede pausa extra.'}>
            {limitePausa > 0 && !a.emPausa && <Barra pct={(a.minutosSemPausa / limitePausa) * 100} tom={a.pausaRecomendada ? 'critico' : 'marca'} rotulo="Tempo sem pausa em relação ao limite" />}
          </Metrica>
          <Metrica icone="check" cor="#2e8b47" rotulo="Pausas hoje" valor={a.pausasHoje} tom="normal"
            detalhe={`Contam as de ${regime[0] >= 60 ? formatarMinutos(regime[0] / 60) : `${regime[0]} s`} ou mais (pausa mínima do regime).`} />
          <Metrica icone="pausa" cor={a.emPausa ? '#2e8b47' : '#5d665f'} rotulo="Agora" valor={a.emPausa ? (segPausa !== null ? formatarCronometro(segPausa) : 'Em pausa') : 'Trabalhando'}
            tom={a.emPausa ? 'normal' : 'neutro'} detalhe="Um clique no botão da traseira inicia e encerra a pausa." />
          <Metrica icone="coracao" cor="#8f1414" rotulo="Mal-estar hoje" valor={a.malEstarHoje} tom={a.malEstarHoje > 0 ? 'perigo' : 'neutro'}
            selo={a.malEstarHoje > 0 ? { tom: 'perigo', texto: 'Conversar com a equipe' } : undefined}
            detalhe="Registro anônimo da equipe (dois toques longos no botão)." />
        </div>
      </section>

      {/* água */}
      <section aria-labelledby="t-agua" className="space-y-3">
        <h2 id="t-agua" className={TITULO_SECAO}><Icone nome="gota" className="size-6 text-agua" /> Água do galão</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Metrica icone="gota" cor="#2f6fa8" rotulo="Nível" valor={a.galao_pct < 0 ? '--' : a.galao_pct} unidade="%" tom={agua.tom === 'normal' ? 'agua' : agua.tom}
            selo={{ tom: agua.tom, texto: agua.rotulo }}>
            <Barra pct={a.galao_pct} tom={agua.tom === 'normal' ? 'agua' : agua.tom} rotulo="Nível do galão" />
          </Metrica>
          <Metrica icone="termometro" cor="#2f6fa8" rotulo="Temperatura da água" valor={formatarNumero(a.aguaTemp_c)} unidade="°C" tom={aguaQuente ? 'atencao' : 'agua'}
            selo={aguaQuente ? { tom: 'atencao', texto: 'Água quente' } : { tom: 'agua', texto: 'Fresca' }}
            detalhe='"Por ficar dentro do caminhão, ela esquenta muito" (Jackson).' />
          <Metrica icone="relogio" cor="#2f6fa8" rotulo="Acaba em" valor={a.aguaAcabaEmMin >= 0 ? `~${formatarMinutos(a.aguaAcabaEmMin)}` : 'calculando'} tom="agua"
            detalhe="Previsão pela tendência de consumo (reta de mínimos quadrados no Node)." />
        </div>
      </section>

      {/* última hora */}
      <section aria-labelledby="t-hora" className="rounded-lg border border-linha bg-papel p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="t-hora" className="text-xl">Índice de calor na última hora</h2>
          <Link to="/historico" className="inline-flex items-center gap-1 text-sm font-bold text-verde hover:underline">
            Ver o histórico <Icone nome="seta" className="size-4" />
          </Link>
        </div>
        {hora ? (
          <Grafico titulo="índice de calor na última hora" pontos={hora} unidade="°C" faixas={faixasDoIndice(limites)} sombrear="emPausa" rotuloSombra="Equipe em pausa"
            series={[{ chave: 'indiceCalor_c', rotulo: 'Índice de calor', cor: '#1c2420' }]} altura={220} />
        ) : (
          <Carregando texto="Buscando o histórico..." />
        )}
        <p className="mt-2 text-xs text-suave">Fundo colorido: faixas do estado. Faixa verde-clara: equipe em pausa. Dados do STH-Comet.</p>
      </section>

      <Simulador />
    </div>
  )
}
