// Classes COMPLETAS (o Tailwind só enxerga texto escrito por inteiro no código).
const TONS = {
  normal: 'before:bg-normal',
  atencao: 'before:bg-atencao',
  critico: 'before:bg-critico',
  perigo: 'before:bg-perigo',
  falha: 'before:bg-falha',
  agua: 'before:bg-agua',
  neutro: 'before:bg-suave/40',
  marca: 'before:bg-verde',
}

/**
 * Cartão padrão do site: superfície clara, borda fina e uma faixa colorida na esquerda
 * que indica o estado (a cor nunca é a única pista: o texto do cartão diz o mesmo).
 * `as` troca a tag (ex.: "li").
 */
export default function Cartao({ as: Tag = 'div', tom = 'neutro', className = '', children, ...resto }) {
  return (
    <Tag
      className={`relative overflow-hidden rounded-lg border border-linha bg-papel before:absolute before:inset-y-0 before:left-0 before:w-1 ${TONS[tom] ?? TONS.neutro} ${className}`}
      {...resto}
    >
      {children}
    </Tag>
  )
}
