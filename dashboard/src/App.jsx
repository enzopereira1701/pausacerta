import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Footer from './components/Footer'
import Header from './components/Header'
import Toasts from './components/Toasts'
import Comandos from './pages/Comandos'
import Error from './pages/Error'
import Historico from './pages/Historico'
import Home from './pages/Home'
import Painel from './pages/Painel'

/** Volta para o topo a cada troca de página. */
function RolarParaOTopo() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** Estrutura do site: menu no topo, a página da rota, rodapé e avisos. */
export default function App() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen flex-col bg-creme text-tinta">
      <RolarParaOTopo />
      <Header />
      <main className={`flex-1 ${pathname === '/' ? '' : 'pt-16 md:pt-20'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/painel" element={<Painel />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/comandos" element={<Comandos />} />
          <Route path="*" element={<Error />} />
        </Routes>
      </main>
      <Footer />
      <Toasts />
    </div>
  )
}
