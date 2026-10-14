import {
  emptyWeeklySchedule,
  formatOpeningSchedule,
  parseOpeningSchedule,
  type WeeklySchedule,
} from './opening-hours';

function scheduleOf(entries: Record<number, [string, string][]>): WeeklySchedule {
  const schedule = emptyWeeklySchedule();
  for (const [day, shifts] of Object.entries(entries)) {
    schedule[Number(day)] = shifts.map(([open, close]) => ({ open, close }));
  }
  return schedule;
}

const SPLIT: [string, string][] = [
  ['08:00', '12:00'],
  ['18:00', '00:00'],
];

describe('formatOpeningSchedule', () => {
  it('retorna string vazia quando tudo está fechado', () => {
    expect(formatOpeningSchedule(emptyWeeklySchedule())).toBe('');
  });

  it('agrupa dias consecutivos iguais e separa segmentos com ponto e vírgula', () => {
    const schedule = scheduleOf({
      1: SPLIT,
      2: SPLIT,
      3: SPLIT,
      4: SPLIT,
      5: SPLIT,
      6: [['18:00', '02:00']],
    });
    expect(formatOpeningSchedule(schedule)).toBe('Seg-Sex 08h às 12h e 18h às 00h; Sáb 18h às 02h');
  });

  it('usa "Todos os dias" quando os 7 dias são iguais', () => {
    const same: [string, string][] = [['18:00', '02:00']];
    const schedule = scheduleOf({ 0: same, 1: same, 2: same, 3: same, 4: same, 5: same, 6: same });
    expect(formatOpeningSchedule(schedule)).toBe('Todos os dias 18h às 02h');
  });

  it('mostra minutos só quando diferentes de zero', () => {
    expect(formatOpeningSchedule(scheduleOf({ 5: [['18:30', '23:15']] }))).toBe(
      'Sex 18h30 às 23h15',
    );
  });

  it('coloca domingo por último e o junta ao sábado quando iguais', () => {
    const same: [string, string][] = [['20:00', '04:00']];
    expect(formatOpeningSchedule(scheduleOf({ 0: same, 5: same, 6: same }))).toBe(
      'Sex-Dom 20h às 04h',
    );
  });

  it('não agrupa dias iguais que não são consecutivos', () => {
    const same: [string, string][] = [['18:00', '23:00']];
    expect(formatOpeningSchedule(scheduleOf({ 1: same, 3: same }))).toBe(
      'Seg 18h às 23h; Qua 18h às 23h',
    );
  });
});

describe('parseOpeningSchedule', () => {
  it('retorna null para vazio ou texto sem dias e horários', () => {
    expect(parseOpeningSchedule('')).toBeNull();
    expect(parseOpeningSchedule('Fechado para reforma')).toBeNull();
    expect(parseOpeningSchedule('17h às 01h')).toBeNull();
    expect(parseOpeningSchedule('Seg')).toBeNull();
  });

  it('lê intervalo com hífen', () => {
    expect(parseOpeningSchedule('Ter-Dom 17h às 01h')).toEqual(
      scheduleOf({
        0: [['17:00', '01:00']],
        2: [['17:00', '01:00']],
        3: [['17:00', '01:00']],
        4: [['17:00', '01:00']],
        5: [['17:00', '01:00']],
        6: [['17:00', '01:00']],
      }),
    );
  });

  it('lê lista de dias', () => {
    const parsed = parseOpeningSchedule('Qua, Sex, Sáb 21h às 03h');
    expect(parsed?.map((shifts) => shifts.length)).toEqual([0, 0, 0, 1, 0, 1, 1]);
    expect(parsed?.[3]).toEqual([{ open: '21:00', close: '03:00' }]);
  });

  it('lê "Todos os dias"', () => {
    const parsed = parseOpeningSchedule('Todos os dias 16h às 02h');
    expect(parsed?.every((s) => s.length === 1 && s[0]?.open === '16:00')).toBe(true);
  });

  it('lê intervalo com " a " e vírgula antes das horas', () => {
    const parsed = parseOpeningSchedule('Seg a Sáb, 18h às 02h');
    expect(parsed?.map((s) => s.length)).toEqual([0, 1, 1, 1, 1, 1, 1]);
  });

  it('lê intervalo circular', () => {
    const parsed = parseOpeningSchedule('Sex-Dom 20h às 04h');
    expect(parsed?.map((s) => s.length)).toEqual([1, 0, 0, 0, 0, 1, 1]);
  });

  it('lê nomes completos de dias', () => {
    const parsed = parseOpeningSchedule('Segunda a Sexta 18h às 23h');
    expect(parsed?.map((s) => s.length)).toEqual([0, 1, 1, 1, 1, 1, 0]);
    expect(parseOpeningSchedule('Terça-feira e Sábado 18h às 23h')?.map((s) => s.length)).toEqual([
      0, 0, 1, 0, 0, 0, 1,
    ]);
  });

  it('lê minutos e múltiplos turnos', () => {
    expect(parseOpeningSchedule('Sex 08h30 às 12h e 18h às 00h')?.[5]).toEqual([
      { open: '08:30', close: '12:00' },
      { open: '18:00', close: '00:00' },
    ]);
    expect(parseOpeningSchedule('Sex 08h às 12h, 18h às 00h')?.[5]).toHaveLength(2);
  });

  it('ignora segmento inválido mas aproveita os válidos', () => {
    const parsed = parseOpeningSchedule('lixo; Sáb 18h às 02h');
    expect(parsed?.[6]).toEqual([{ open: '18:00', close: '02:00' }]);
  });
});

describe('round-trip', () => {
  const cases: Record<string, WeeklySchedule> = {
    'semana com turnos partidos': scheduleOf({
      1: SPLIT,
      2: SPLIT,
      3: SPLIT,
      6: [['18:30', '02:00']],
    }),
    'todos os dias': scheduleOf({
      0: [['18:00', '02:00']],
      1: [['18:00', '02:00']],
      2: [['18:00', '02:00']],
      3: [['18:00', '02:00']],
      4: [['18:00', '02:00']],
      5: [['18:00', '02:00']],
      6: [['18:00', '02:00']],
    }),
    'domingo isolado': scheduleOf({ 0: [['12:00', '18:00']] }),
    'sábado e domingo iguais': scheduleOf({
      6: [['20:00', '04:00']],
      0: [['20:00', '04:00']],
    }),
  };

  it.each(Object.entries(cases))('%s', (_name, schedule) => {
    expect(parseOpeningSchedule(formatOpeningSchedule(schedule))).toEqual(schedule);
  });
});
