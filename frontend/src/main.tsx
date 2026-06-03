import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { appMeta } from './config/appMeta';
import 'sonner/dist/styles.css';
import './index.css';

document.title = appMeta.title;

const root = document.getElementById('root');
if (!root) {
  throw new Error('Elemento #root não encontrado');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
