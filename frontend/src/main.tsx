import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider }         from '@/context/AuthContext';
import { ToastProvider }        from '@/context/ToastContext';
import { RegistrationProvider } from '@/context/RegistrationContext';
import ErrorBoundary            from '@/components/ErrorBoundary/ErrorBoundary';
import './styles/global.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <RegistrationProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </RegistrationProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
