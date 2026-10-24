import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import '@fontsource-variable/inter';
import '@fontsource/amiri-quran';
import '@fontsource/amiri/400.css';
import '@fontsource/amiri/700.css';
import './styles/index.css';
import { App } from './app/App';
import { routes } from './app/routes';
import { createDefaultServices } from './app/services';

const services = createDefaultServices();
const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App services={services} router={router} />
  </StrictMode>,
);
