import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

const signInWithPassword = vi.fn();
vi.mock('./auth', () => ({
  supabase: { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }) } },
  signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
  signOut: vi.fn(),
}));

import App from './App';

describe('App con Supabase Auth configurado', () => {
  afterEach(cleanup);
  it('muestra el acceso con cuenta y oculta el acceso demo', () => {
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>);
    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.queryByLabelText('Clave de demostración')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Perfil para pruebas locales')).not.toBeInTheDocument();
  });

  it('informa credenciales inválidas sin abrir sesión', async () => {
    signInWithPassword.mockRejectedValueOnce(new Error('Correo o contraseña incorrectos.'));
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>);
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'persona@example.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'incorrecta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.'));
    expect(signInWithPassword).toHaveBeenCalledWith('persona@example.com', 'incorrecta');
  });
});
