import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  beforeEach(() => localStorage.clear());
  it('muestra el acceso de demostración de forma accesible', () => {
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>);
    expect(screen.getByRole('heading', { name: 'Retail en terreno' })).toBeInTheDocument();
    expect(screen.getByLabelText('Clave de demostración')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
  });
});
