// Entrada de la aplicación y configuración de React Query — docs/tecnica/04. admin-web.md §2
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'maplibre-gl/dist/maplibre-gl.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import type { ApiError } from './core/api-client';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // No reintentar errores de negocio (4xx); sí fallos transitorios.
      retry: (failureCount, error) => {
        const status = (error as ApiError | undefined)?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
