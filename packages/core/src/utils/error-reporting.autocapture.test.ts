import { sanitizeCaptureEvent } from './error-reporting';

describe('Regra de negócio: sanitizeCaptureEvent cobre exceção autocapturada e pessoa', () => {
  it('redige e-mail e JWT em $exception_list, $exception_message e $exception_values', () => {
    const result = sanitizeCaptureEvent({
      event: '$exception',
      properties: {
        $exception_message: 'falhou para joao@x.com',
        $exception_values: ['token eyJa.eyJb.c'],
        $exception_list: [{ type: 'Error', value: 'duplicate key (email)=(a@b.com)' }],
      },
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('joao@x.com');
    expect(serialized).not.toContain('a@b.com');
    expect(serialized).not.toContain('eyJa.eyJb.c');
    expect(result?.properties?.$exception_list).toEqual([
      { type: 'Error', value: 'duplicate key [email]' },
    ]);
  });

  it('limpa URL sensível em $set, $set_once e propriedades *_url', () => {
    const dirty = 'https://x.com/client/login?next=%2Fa&code=abc#access_token=t';
    const result = sanitizeCaptureEvent({
      event: '$pageview',
      properties: {
        $set: { $initial_current_url: dirty },
        $set_once: { $initial_referrer: dirty },
        $pathname: '/client/login',
      },
      $set_once: { $initial_current_url: dirty },
    } as {
      event: string;
      properties: Record<string, unknown>;
      $set_once: Record<string, unknown>;
    });
    expect(JSON.stringify(result)).not.toMatch(/access_token|code=abc/);
  });
});

describe('Tratamento de erro: sanitizeCaptureEvent', () => {
  it('null continua null e evento sem properties não lança', () => {
    expect(sanitizeCaptureEvent(null)).toBeNull();
    expect(
      sanitizeCaptureEvent({ event: 'x' } as { properties?: Record<string, unknown> }),
    ).toEqual({
      event: 'x',
    });
  });
});
