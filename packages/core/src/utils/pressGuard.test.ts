import { createPressGuard } from './pressGuard';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('createPressGuard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('executa o handler imediatamente na primeira chamada, repassando argumentos', () => {
    const handler = jest.fn();
    const guarded = createPressGuard().guard(handler);

    guarded('evento-1', 42);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('evento-1', 42);
  });

  it('ignora chamadas dentro da janela de cooldown', () => {
    const handler = jest.fn();
    const guarded = createPressGuard({ cooldownMs: 600 }).guard(handler);

    guarded();
    jest.advanceTimersByTime(599);
    guarded();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('libera nova chamada após o cooldown expirar', () => {
    const handler = jest.fn();
    const guarded = createPressGuard({ cooldownMs: 600 }).guard(handler);

    guarded();
    jest.advanceTimersByTime(600);
    guarded();

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('usa 600ms como cooldown default', () => {
    const handler = jest.fn();
    const guarded = createPressGuard().guard(handler);

    guarded();
    jest.advanceTimersByTime(599);
    guarded();
    expect(handler).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    guarded();
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('mantém o lock enquanto um handler async estiver pendente, mesmo após o cooldown', async () => {
    const { promise, resolve } = deferred<void>();
    const handler = jest.fn(() => promise);
    const guarded = createPressGuard({ cooldownMs: 600 }).guard(handler);

    guarded();
    jest.advanceTimersByTime(2000);
    guarded();
    expect(handler).toHaveBeenCalledTimes(1);

    resolve();
    await flushMicrotasks();
    guarded();
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('mantém o cooldown mínimo mesmo se o handler async resolver antes', async () => {
    const handler = jest.fn(() => Promise.resolve());
    const guarded = createPressGuard({ cooldownMs: 600 }).guard(handler);

    guarded();
    await flushMicrotasks();
    jest.advanceTimersByTime(300);
    guarded();
    expect(handler).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(300);
    guarded();
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('não trava permanentemente quando o handler async rejeita', async () => {
    const { promise, reject } = deferred<void>();
    const handler = jest.fn(() => promise);
    const guarded = createPressGuard({ cooldownMs: 600 }).guard(handler);

    guarded();
    reject(new Error('falhou'));
    await flushMicrotasks();
    jest.advanceTimersByTime(600);
    guarded();

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('propaga exceção síncrona sem travar permanentemente', () => {
    const handler = jest.fn(() => {
      throw new Error('boom');
    });
    const guarded = createPressGuard({ cooldownMs: 600 }).guard(handler);

    expect(() => guarded()).toThrow('boom');
    jest.advanceTimersByTime(600);
    expect(() => guarded()).toThrow('boom');

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('instâncias diferentes não compartilham lock', () => {
    const handlerA = jest.fn();
    const handlerB = jest.fn();
    const guardedA = createPressGuard().guard(handlerA);
    const guardedB = createPressGuard().guard(handlerB);

    guardedA();
    guardedB();

    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1);
  });

  it('handlers criados pelo mesmo guard compartilham o lock', () => {
    const pressGuard = createPressGuard({ cooldownMs: 600 });
    const handlerA = jest.fn();
    const handlerB = jest.fn();
    const guardedA = pressGuard.guard(handlerA);
    const guardedB = pressGuard.guard(handlerB);

    guardedA();
    guardedB();

    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).not.toHaveBeenCalled();
  });
});
