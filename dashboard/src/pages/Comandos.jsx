import { useState } from 'react'
import Aviso from '../components/Aviso'
import Botao from '../components/Botao'
import Cartao from '../components/Cartao'
import { Campo } from '../components/Campo'
import Distintivo from '../components/Distintivo'
import { Carregando } from '../components/Estado'
import Icone from '../components/Icone'
import { PADROES } from '../data/constantes'
import { useApp } from '../hooks/useApp'
import { usePolling } from '../hooks/usePolling'
import * as api from '../services/api'
import { formatarHora } from '../utils/formatacao'

/**
 * Cada comando: os campos (rótulo, ajuda, mínimo, máximo), como validar e o texto do que muda no Node.
 * O valor vai ao Node como "a,b,c" (Ultralight: pcn001@setRegime|300,90,50).
 */
const COMANDOS = {
  setRegime: {
    titulo: 'Regime de pausas',
    icone: 'pausa',
    texto: 'Quando o Node acende "pausa recomendada". Quem define é a empresa com a segurança do trabalho; os números padrão são exemplos.',
    campos: [
      { rotulo: 'Pausa mínima', unidade: 's', min: 10, max: 3600, ajuda: 'Pausa mais curta que isso não conta (mas nunca é bloqueada).' },
      { rotulo: 'Máx. em ATENÇÃO', unidade: 'min', min: 1, max: 480, ajuda: 'Minutos sem pausa até recomendar.' },
      { rotulo: 'Máx. em CRÍTICO', unidade: 'min', min: 1, max: 480, ajuda: 'Vale também para PERIGO.' },
    ],
    validar: (v) => (v[2] > v[1] ? 'Em CRÍTICO o limite precisa ser menor ou igual ao de ATENÇÃO (faz mais calor).' : null),
    atalhos: [
      { rotulo: 'Exemplo de campo (5 min, 90, 50)', valor: PADROES.regime },
      { rotulo: 'Demonstração no Wokwi (20 s, 3, 1)', valor: PADROES.regimeDemo },
    ],
  },
  setLimites: {
    titulo: 'Limites do índice de calor',
    icone: 'termometro',
    texto: 'Índice de calor a partir do qual começam ATENÇÃO, CRÍTICO e PERIGO. O padrão são as faixas da NOAA; o Node usa histerese de 1 °C para descer.',
    campos: [
      { rotulo: 'ATENÇÃO', unidade: '°C', min: 15, max: 60 },
      { rotulo: 'CRÍTICO', unidade: '°C', min: 15, max: 60 },
      { rotulo: 'PERIGO', unidade: '°C', min: 15, max: 60 },
    ],
    validar: (v) => (!(v[0] < v[1] && v[1] < v[2]) ? 'Os limites precisam subir: ATENÇÃO < CRÍTICO < PERIGO.' : null),
    atalhos: [{ rotulo: 'Faixas da NOAA (27, 32, 41)', valor: PADROES.limites }],
  },
  setGalao: {
    titulo: 'Galão de água',
    icone: 'gota',
    texto: 'Medidas do galão para o cálculo do nível (do sensor na tampa até a água) e a partir de quando a água conta como quente.',
    campos: [
      { rotulo: 'Cheio', unidade: 'cm', min: 2, max: 200, ajuda: 'Do sensor até a água, galão cheio.' },
      { rotulo: 'Vazio', unidade: 'cm', min: 3, max: 400, ajuda: 'Do sensor até o fundo.' },
      { rotulo: 'Água quente', unidade: '°C', min: 15, max: 50, ajuda: 'Não há valor na norma; a NR-09 pede água fresca.' },
    ],
    validar: (v) => (v[0] >= v[1] ? 'A distância com o galão cheio precisa ser menor que a com ele vazio.' : null),
    atalhos: [{ rotulo: 'Galão de 20 L (5, 45, 30)', valor: PADROES.galao }],
  },
  setIntervalo: {
    titulo: 'Intervalo de envio',
    icone: 'relogio',
    texto: 'De quanto em quanto tempo o Node envia, mesmo sem mudança. Quando o estado muda, ele envia na hora.',
    campos: [{ rotulo: 'Enviar a cada', unidade: 's', min: 10, max: 3600 }],
    validar: () => null,
    atalhos: [{ rotulo: 'Padrão (60 s)', valor: [PADROES.intervalo] }],
  },
}

const STATUS = {
  PENDING: { tom: 'atencao', texto: 'Aguardando o Node', icone: 'relogio' },
  OK: { tom: 'normal', texto: 'Confirmado pelo Node', icone: 'check' },
  ERROR: { tom: 'critico', texto: 'O Node recusou', icone: 'alerta' },
  SEM_RESPOSTA: { tom: 'critico', texto: 'Sem resposta do Node', icone: 'alerta' },
}

function valorAtual(nome, config) {
  if (!config) return null
  if (nome === 'setRegime') return config.regime
  if (nome === 'setLimites') return config.limites
  if (nome === 'setGalao') return config.galao
  return [config.intervalo]
}

/** Status do último envio de um comando (pendente, confirmado, recusado). */
function StatusEnvio({ envio }) {
  if (!envio) return <p className="text-xs text-suave">Ainda não enviado nesta sessão.</p>
  const s = STATUS[envio.status] ?? STATUS.PENDING
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-suave">
      <Distintivo tom={s.tom} icone={s.icone}>{s.texto}</Distintivo>
      <span className="numero">"{envio.valor || '(vazio)'}" enviado às {formatarHora(envio.em)}{envio.confirmadoEm ? `, ok às ${formatarHora(envio.confirmadoEm)}` : ''}</span>
    </p>
  )
}

/** Um cartão de comando: campos, atalhos, validação e envio. */
function CartaoComando({ nome, config, envio, aoEnviar }) {
  const def = COMANDOS[nome]
  const [valores, setValores] = useState(null) // null = mostra o valor atual do Node
  const [enviando, setEnviando] = useState(false)
  const atuais = valorAtual(nome, config)
  const v = valores ?? atuais?.map(String) ?? def.campos.map(() => '')
  const nums = v.map(Number)

  const erroCampo = def.campos.map((c, i) =>
    v[i] === '' || Number.isNaN(nums[i]) ? 'Preencha com um número' : nums[i] < c.min || nums[i] > c.max ? `Entre ${c.min} e ${c.max}` : null,
  )
  const erroGeral = erroCampo.some(Boolean) ? null : def.validar(nums)
  const mudou = atuais && nums.some((n, i) => n !== atuais[i])

  const enviar = async () => {
    setEnviando(true)
    await aoEnviar(nome, nums.join(','))
    setEnviando(false)
    setValores(null)
  }

  return (
    <Cartao tom="marca" className="flex flex-col gap-4 p-5 pl-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl"><Icone nome={def.icone} className="size-6 text-verde" /> {def.titulo}</h2>
        <p className="mt-1 text-sm text-suave">{def.texto}</p>
      </div>
      <div className={`grid gap-3 ${def.campos.length > 1 ? 'sm:grid-cols-3' : 'sm:max-w-xs'}`}>
        {def.campos.map((c, i) => (
          <Campo
            key={c.rotulo}
            rotulo={`${c.rotulo} (${c.unidade})`}
            type="number"
            inputMode="decimal"
            value={v[i]}
            min={c.min}
            max={c.max}
            ajuda={c.ajuda}
            erro={erroCampo[i]}
            onChange={(e) => setValores(v.map((x, j) => (j === i ? e.target.value : x)))}
          />
        ))}
      </div>
      {erroGeral && <Aviso nivel="bloqueia">{erroGeral}</Aviso>}
      <div className="flex flex-wrap gap-2">
        {def.atalhos.map((a) => (
          <button key={a.rotulo} type="button" onClick={() => setValores(a.valor.map(String))} className="rounded-full border border-linha bg-creme px-3 py-1 text-xs font-bold text-tinta hover:border-verde/60">
            {a.rotulo}
          </button>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-linha pt-3">
        <StatusEnvio envio={envio} />
        <Botao icone="enviar" onClick={enviar} carregando={enviando} disabled={!!erroGeral || erroCampo.some(Boolean) || !mudou}>
          Enviar ao Node
        </Botao>
      </div>
      <p className="-mt-2 font-mono text-[11px] text-suave">pcn001@{nome}|{nums.join(',')}</p>
    </Cartao>
  )
}

/** Comandos que descem do dashboard até o Node: backend → Orion → IoT Agent → MQTT → ESP32. */
export default function Comandos() {
  const { equipe, avisar } = useApp()
  const [config, setConfig] = useState(null)
  const pendente = config && Object.values(config.comandos ?? {}).some((c) => c.status === 'PENDING')

  usePolling(
    async (aindaVale) => {
      const c = await api.obterConfig()
      if (aindaVale()) setConfig(c)
    },
    pendente ? 1500 : 5000,
    'config',
  )

  const aoEnviar = async (nome, valor) => {
    try {
      await api.enviarComando(nome, valor)
      setConfig(await api.obterConfig())
      avisar(nome === 'identify' ? 'O semáforo do caminhão vai piscar por 5 segundos.' : 'Comando enviado. Aguardando o Node confirmar.')
    } catch (e) {
      avisar(e.message, 'erro')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-3xl">Comandos</h1>
        <p className="max-w-3xl text-sm text-suave">
          Cada envio vai do backend ao Orion, que repassa pelo IoT Agent e pelo MQTT até o ESP32. O Node responde "ok" e o status aparece aqui.
          A configuração fica guardada na memória do Node: continua valendo sem internet.
        </p>
      </div>

      {equipe && !equipe.online && (
        <Aviso nivel="forte" titulo="O Node está sem conexão">O comando vai por MQTT e só chega se o Node estiver conectado. Envie de novo quando ele voltar.</Aviso>
      )}

      <Cartao tom="marca" className="flex flex-wrap items-center justify-between gap-4 p-5 pl-6">
        <div>
          <h2 className="flex items-center gap-2 text-xl"><Icone nome="semaforo" className="size-6 text-verde" /> Identificar o Node</h2>
          <p className="mt-1 text-sm text-suave">Pisca as três luzes do semáforo por 5 segundos, para achar o caminhão certo na garagem.</p>
          <div className="mt-2"><StatusEnvio envio={config?.comandos?.identify} /></div>
        </div>
        <Botao icone="semaforo" onClick={() => aoEnviar('identify', '')}>Identificar</Botao>
      </Cartao>

      {!config ? (
        <Carregando texto="Lendo a configuração..." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {Object.keys(COMANDOS).map((nome) => (
            <CartaoComando key={nome} nome={nome} config={config} envio={config.comandos?.[nome]} aoEnviar={aoEnviar} />
          ))}
        </div>
      )}
    </div>
  )
}
