import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tailwind.css';
import './i18n';
import { ThemeProvider } from './theme/ThemeProvider';
import App from './App';

import { HelmetProvider } from 'react-helmet-async';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>
);

