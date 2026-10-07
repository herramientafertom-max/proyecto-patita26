import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  UnauthorizedError,
  request,
  setAccessToken,
  setUnauthorizedHandler,
} from './api';

describe('request', () => {
  afterEach(() => {
    setAccessToken(null);
    setUnauthorizedHandler(null);
    vi.unstubAllGlobals();
  });

  it('keeps the bearer token in memory and sends it when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('memory-token');

    await request('/protected');

    expect(fetchMock).toHaveBeenCalledWith(
      '/protected',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer memory-token' }),
      }),
    );
    expect(localStorage.getItem('retail_token')).toBeNull();
  });

  it('clears the in-memory session and notifies the app after a 401', async () => {
    const onUnauthorized = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    setAccessToken('memory-token');
    setUnauthorizedHandler(onUnauthorized);

    await expect(request('/protected')).rejects.toBeInstanceOf(UnauthorizedError);

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
