import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Scene } from './components/Scene';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Scene />
  </StrictMode>,
);
