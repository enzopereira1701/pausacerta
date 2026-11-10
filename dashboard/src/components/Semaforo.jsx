/**
 * O semáforo da traseira do caminhão, desenhado. Luz apagada fica escura; acesa brilha.
 * `piscar` faz as luzes acesas piscarem (PERIGO, em pausa, falha), como no Node.
 * `horizontal` deita o semáforo; `pequeno` é a versão de tabela.
 */
const CORES = { vermelho: '#e5372a', amarelo: '#f2b705', verde: '#34b35a' }
const ORDEM = ['vermelho', 'amarelo', 'verde']

export default function Semaforo({ luzes, piscar = false, horizontal = false, pequeno = false, className = '' }) {
  const texto = ORDEM.filter((c) => luzes[c]).join(' e ') || 'apagado'
  return (
    <div
      role="img"
      aria-label={`Semáforo: ${texto}${piscar ? ', piscando' : ''}`}
      className={`inline-flex ${pequeno ? 'gap-1 rounded-lg p-1' : 'gap-2 rounded-2xl p-2.5'} bg-[#1d2421] shadow-inner ${horizontal ? 'flex-row' : 'flex-col'} ${className}`}
    >
      {ORDEM.map((cor) => {
        const acesa = luzes[cor]
        return (
          <span
            key={cor}
            className={`block rounded-full ${pequeno ? 'size-3.5' : 'size-9 md:size-11'} ${acesa && piscar ? 'piscar' : ''}`}
            style={{
              background: acesa ? CORES[cor] : '#36403b',
              boxShadow: acesa ? `0 0 ${pequeno ? 6 : 18}px ${pequeno ? 0 : 2}px ${CORES[cor]}99, inset 0 -3px 6px #0003` : 'inset 0 2px 5px #0006',
            }}
          />
        )
      })}
    </div>
  )
}
