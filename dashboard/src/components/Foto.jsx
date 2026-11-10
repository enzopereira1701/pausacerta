import { useState } from 'react'
import Icone from './Icone'

/**
 * Imagem do site que ainda pode não existir. As fotos ficam em public/img/ e são geradas
 * pelo grupo com os prompts de docs/prompts-imagens.md. Enquanto o arquivo não existe,
 * aparece um quadro verde com o nome do arquivo esperado (o site continua funcionando).
 */
export default function Foto({ arquivo, alt = '', className = '', prioridade = false }) {
  const [falhou, setFalhou] = useState(false)
  if (falhou) {
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={`flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-verde to-verde-escuro p-4 text-center text-creme/70 ${className}`}
      >
        <Icone nome="sol" className="size-7 text-amarelo/80" />
        <span className="text-xs font-bold">imagem a gerar</span>
        <code className="text-[11px]">public/img/{arquivo}</code>
      </div>
    )
  }
  return (
    <img
      src={`/img/${arquivo}`}
      alt={alt}
      className={`object-cover ${className}`}
      loading={prioridade ? 'eager' : 'lazy'}
      fetchPriority={prioridade ? 'high' : undefined}
      onError={() => setFalhou(true)}
    />
  )
}
