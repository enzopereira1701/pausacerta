import { useCallback, useMemo, useState } from 'react'
import { AppContext } from './AppContext'
import { INTERVALO_ATUALIZACAO_MS } from '../data/constantes'
import { usePolling } from '../hooks/usePolling'
import * as api from '../services/api'

/**
 * Estado que várias telas usam ao mesmo tempo:
 * a leitura atual da equipe (Painel, selo do menu) e os avisos (toasts).
 */
export function AppProvider({ children }) {
  const [equipe, setEquipe] = useState(null) // resposta de api.obterEquipe()
  const [erro, setErro] = useState(null)
  const [toasts, setToasts] = useState([])

  const removerToast = useCallback((id) => setToasts((lista) => lista.filter((t) => t.id !== id)), [])
  const avisar = useCallback(
    (mensagem, tipo = 'ok') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((lista) => [...lista, { id, mensagem, tipo }])
      setTimeout(() => removerToast(id), 4500)
    },
    [removerToast],
  )

  const atualizar = useCallback(async () => {
    try {
      const dados = await api.obterEquipe()
      setEquipe(dados)
      setErro(null)
    } catch (e) {
      setErro(e.message)
    }
  }, [])

  // leitura da equipe a cada 5 s, em todas as telas
  usePolling(
    async (aindaVale) => {
      try {
        const dados = await api.obterEquipe()
        if (!aindaVale()) return
        setEquipe(dados)
        setErro(null)
      } catch (e) {
        if (aindaVale()) setErro(e.message)
      }
    },
    INTERVALO_ATUALIZACAO_MS,
    'equipe',
  )

  const valor = useMemo(
    () => ({ equipe, erro, carregando: !equipe && !erro, toasts, avisar, removerToast, atualizar }),
    [equipe, erro, toasts, avisar, removerToast, atualizar],
  )
  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>
}
