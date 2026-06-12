import {
  buildEventDate,
  formatRelativeDay,
  formatTime,
  isOpenNow,
  isWeekend,
  relativeTime,
} from './dates';

// Quarta-feira, 10 de junho de 2026, 12:00 local — base fixa para determinismo.
const FIXED_NOW = new Date(2026, 5, 10, 12, 0, 0);

function localIso(
  year: number,
  monthIndex: number,
  day: number,
  hour = 12,
  minute = 0,
): string {
  return new Date(year, monthIndex, day, hour, minute, 0, 0).toISOString();
}

describe('buildEventDate', () => {
  const base = new Date(2026, 5, 10, 12, 34, 56, 789);

  it('aplica offset de dias e hora fixa, zerando minuto/segundo/ms', () => {
    expect(buildEventDate(0, 20, { base })).toBe(
      new Date(2026, 5, 10, 20, 0, 0, 0).toISOString(),
    );
  });

  it('aceita minuto customizado via options', () => {
    expect(buildEventDate(2, 21, { minute: 30, base })).toBe(
      new Date(2026, 5, 12, 21, 30, 0, 0).toISOString(),
    );
  });

  it('aceita offsets negativos', () => {
    expect(buildEventDate(-1, 9, { base })).toBe(
      new Date(2026, 5, 9, 9, 0, 0, 0).toISOString(),
    );
  });

  it('cruza viradas de mês', () => {
    expect(buildEventDate(25, 18, { base })).toBe(
      new Date(2026, 6, 5, 18, 0, 0, 0).toISOString(),
    );
  });
});

describe('formatRelativeDay', () => {
  it('retorna Hoje para o mesmo dia local', () => {
    expect(formatRelativeDay(localIso(2026, 5, 10, 23), FIXED_NOW)).toBe('Hoje');
  });

  it('retorna Amanhã para o dia seguinte', () => {
    expect(formatRelativeDay(localIso(2026, 5, 11, 0), FIXED_NOW)).toBe('Amanhã');
  });

  it('retorna o dia da semana até 6 dias à frente', () => {
    expect(formatRelativeDay(localIso(2026, 5, 12), FIXED_NOW)).toBe('Sex');
    expect(formatRelativeDay(localIso(2026, 5, 13), FIXED_NOW)).toBe('Sáb');
    expect(formatRelativeDay(localIso(2026, 5, 16), FIXED_NOW)).toBe('Ter');
  });

  it('retorna data abreviada a partir de 7 dias', () => {
    expect(formatRelativeDay(localIso(2026, 5, 17), FIXED_NOW)).toBe('17 De Jun.');
    expect(formatRelativeDay(localIso(2026, 6, 5), FIXED_NOW)).toBe('05 De Jul.');
  });
});

describe('formatTime', () => {
  it('formata HH:mm no fuso local com zero à esquerda', () => {
    expect(formatTime(localIso(2026, 5, 10, 20, 5))).toBe('20:05');
    expect(formatTime(localIso(2026, 5, 10, 9, 0))).toBe('09:00');
    expect(formatTime(localIso(2026, 5, 10, 0, 30))).toBe('00:30');
  });
});

describe('relativeTime', () => {
  function minutesAgo(minutes: number): string {
    return new Date(FIXED_NOW.getTime() - minutes * 60_000).toISOString();
  }

  it('retorna agora para menos de 1 minuto', () => {
    expect(relativeTime(FIXED_NOW.toISOString(), FIXED_NOW)).toBe('agora');
    expect(relativeTime(minutesAgo(0.5), FIXED_NOW)).toBe('agora');
  });

  it('retorna X min até 59 minutos', () => {
    expect(relativeTime(minutesAgo(5), FIXED_NOW)).toBe('5 min');
    expect(relativeTime(minutesAgo(59), FIXED_NOW)).toBe('59 min');
  });

  it('retorna X h até 23 horas', () => {
    expect(relativeTime(minutesAgo(60), FIXED_NOW)).toBe('1 h');
    expect(relativeTime(minutesAgo(3 * 60), FIXED_NOW)).toBe('3 h');
    expect(relativeTime(minutesAgo(23 * 60 + 59), FIXED_NOW)).toBe('23 h');
  });

  it('retorna X d a partir de 24 horas', () => {
    expect(relativeTime(minutesAgo(24 * 60), FIXED_NOW)).toBe('1 d');
    expect(relativeTime(minutesAgo(2 * 24 * 60), FIXED_NOW)).toBe('2 d');
  });
});

describe('isWeekend', () => {
  it('retorna true para sábado e domingo', () => {
    expect(isWeekend(localIso(2026, 5, 13))).toBe(true);
    expect(isWeekend(localIso(2026, 5, 14))).toBe(true);
  });

  it('retorna false para dias úteis', () => {
    expect(isWeekend(localIso(2026, 5, 10))).toBe(false);
    expect(isWeekend(localIso(2026, 5, 12))).toBe(false);
  });
});

describe('isOpenNow', () => {
  // Referências locais: 08/jun seg · 09 ter · 10 qua · 11 qui · 12 sex · 13 sáb · 14 dom · 15 seg
  describe('Ter-Dom 17h às 01h (cruza meia-noite)', () => {
    const hours = 'Ter-Dom 17h às 01h';

    it('aberto na quarta às 18h', () => {
      expect(isOpenNow(hours, new Date(2026, 5, 10, 18, 0))).toBe(true);
    });

    it('fechado na quarta antes das 17h', () => {
      expect(isOpenNow(hours, new Date(2026, 5, 10, 16, 59))).toBe(false);
    });

    it('aberto na madrugada de segunda (janela iniciada no domingo)', () => {
      expect(isOpenNow(hours, new Date(2026, 5, 15, 0, 30))).toBe(true);
    });

    it('fechado na segunda à noite (fora dos dias)', () => {
      expect(isOpenNow(hours, new Date(2026, 5, 15, 18, 0))).toBe(false);
    });

    it('fechado na madrugada de terça (segunda não abre)', () => {
      expect(isOpenNow(hours, new Date(2026, 5, 9, 0, 30))).toBe(false);
    });
  });

  describe('Qua, Sex, Sáb 21h às 03h (lista de dias)', () => {
    const hours = 'Qua, Sex, Sáb 21h às 03h';

    it('aberto na quarta às 22h', () => {
      expect(isOpenNow(hours, new Date(2026, 5, 10, 22, 0))).toBe(true);
    });

    it('aberto na madrugada de quinta (janela da quarta)', () => {
      expect(isOpenNow(hours, new Date(2026, 5, 11, 2, 0))).toBe(true);
    });

    it('fechado na quinta à noite', () => {
      expect(isOpenNow(hours, new Date(2026, 5, 11, 22, 0))).toBe(false);
    });

    it('fechado na madrugada de sexta (quinta não abre)', () => {
      expect(isOpenNow(hours, new Date(2026, 5, 12, 2, 0))).toBe(false);
    });

    it('aberto no sábado às 23h30', () => {
      expect(isOpenNow(hours, new Date(2026, 5, 13, 23, 30))).toBe(true);
    });
  });

  describe('Todos os dias 16h às 02h', () => {
    const hours = 'Todos os dias 16h às 02h';

    it('aberto em qualquer dia dentro da janela', () => {
      expect(isOpenNow(hours, new Date(2026, 5, 8, 17, 0))).toBe(true);
      expect(isOpenNow(hours, new Date(2026, 5, 14, 1, 30))).toBe(true);
    });

    it('fechado fora da janela', () => {
      expect(isOpenNow(hours, new Date(2026, 5, 10, 3, 0))).toBe(false);
      expect(isOpenNow(hours, new Date(2026, 5, 10, 15, 59))).toBe(false);
    });
  });

  describe('Ter-Sáb 19h às 00h (fecha exatamente à meia-noite)', () => {
    const hours = 'Ter-Sáb 19h às 00h';

    it('aberto na terça às 23h', () => {
      expect(isOpenNow(hours, new Date(2026, 5, 9, 23, 0))).toBe(true);
    });

    it('fechado após a meia-noite', () => {
      expect(isOpenNow(hours, new Date(2026, 5, 10, 0, 30))).toBe(false);
    });

    it('fechado antes das 19h', () => {
      expect(isOpenNow(hours, new Date(2026, 5, 9, 18, 0))).toBe(false);
    });
  });

  describe('formatos não reconhecidos', () => {
    it('retorna false sem padrão de horário', () => {
      expect(isOpenNow('Fechado para reforma', FIXED_NOW)).toBe(false);
    });

    it('retorna false sem dias reconhecíveis', () => {
      expect(isOpenNow('17h às 01h', FIXED_NOW)).toBe(false);
    });
  });
});
