import { useContext } from 'react'
import { AppContext } from '../context/AppContext'

/** Acesso ao estado global (leitura da equipe e avisos). */
export function useApp() {
  const contexto = useContext(AppContext)
  if (!contexto) throw new Error('useApp precisa estar dentro de <AppProvider>.')
  return contexto
}
