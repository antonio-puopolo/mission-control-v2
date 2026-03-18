import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HammCharacter } from './components/HammCharacter'
import './components/HammCharacter.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HammCharacter />
  </StrictMode>,
)
