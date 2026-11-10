import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AppProvider } from './context/AppProvider.jsx'
import './index.css'
import './css/animacoes.css'

// Ponto de entrada: monta o App dentro do #root do index.html.
// BrowserRouter = rotas (/painel, /historico...). AppProvider = estado global (leitura da equipe e avisos).
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)
