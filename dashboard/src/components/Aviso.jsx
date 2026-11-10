import Icone from './Icone'

const ESTILOS = {
  bloqueia: { caixa: 'border-critico/40 bg-critico/10 text-critico', icone: 'fechar' },
  alerta: { caixa: 'border-critico/40 bg-critico/10 text-critico', icone: 'alerta' },
  forte: { caixa: 'border-atencao/50 bg-atencao/10 text-tinta', icone: 'alerta' },
  leve: { caixa: 'border-linha bg-papel text-tinta', icone: 'info' },
  info: { caixa: 'border-linha bg-papel text-tinta', icone: 'info' },
  ok: { caixa: 'border-normal/40 bg-normal/10 text-normal', icone: 'check' },
}

/** Caixa de aviso com ícone. `nivel` escolhe a cor e o ícone. */
export default function Aviso({ nivel = 'info', titulo, children, className = '' }) {
  const e = ESTILOS[nivel] ?? ESTILOS.info
  return (
    <div role={nivel === 'bloqueia' || nivel === 'alerta' ? 'alert' : 'status'} className={`flex gap-2.5 rounded-md border px-3 py-2.5 text-sm ${e.caixa} ${className}`}>
      <Icone nome={e.icone} className="mt-0.5 size-4" />
      <div>
        {titulo && <p className="font-bold">{titulo}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
}
