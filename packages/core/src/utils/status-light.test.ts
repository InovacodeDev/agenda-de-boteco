import {
  establishmentStatusLight,
  eventStatusLight,
  isEventVisibleInFeed,
} from './status-light';

/** Base determinística: quarta-feira, 10/jun/2026, 18h00 local. */
const WED_18H = new Date(2026, 5, 10, 18, 0);

function isoAt(base: Date, hoursOffset: number): string {
  return new Date(base.getTime() + hoursOffset * 3_600_000).toISOString();
}

describe('eventStatusLight', () => {
  it('amarelo com dias restantes quando falta mais de um dia', () => {
    const light = eventStatusLight(isoAt(WED_18H, 48), isoAt(WED_18H, 52), WED_18H);
    expect(light).toEqual({ tone: 'yellow', label: 'Faltam 2 dias' });
  });

  it('usa singular quando falta exatamente um dia', () => {
    const light = eventStatusLight(isoAt(WED_18H, 24), isoAt(WED_18H, 28), WED_18H);
    expect(light).toEqual({ tone: 'yellow', label: 'Falta 1 dia' });
  });

  it('amarelo em horas quando falta menos de um dia', () => {
    const light = eventStatusLight(isoAt(WED_18H, 3), isoAt(WED_18H, 7), WED_18H);
    expect(light).toEqual({ tone: 'yellow', label: 'Faltam 3h' });
  });

  it('amarelo em minutos na última hora antes de começar', () => {
    const light = eventStatusLight(isoAt(WED_18H, 0.5), isoAt(WED_18H, 4), WED_18H);
    expect(light).toEqual({ tone: 'yellow', label: 'Começa em 30 min' });
  });

  it('verde enquanto o evento está rolando', () => {
    const light = eventStatusLight(isoAt(WED_18H, -1), isoAt(WED_18H, 3), WED_18H);
    expect(light).toEqual({ tone: 'green', label: 'Rolando agora' });
  });

  it('laranja na última hora do evento', () => {
    const light = eventStatusLight(isoAt(WED_18H, -3), isoAt(WED_18H, 0.5), WED_18H);
    expect(light).toEqual({ tone: 'orange', label: 'Termina em breve' });
  });

  it('vermelho depois de encerrado', () => {
    const light = eventStatusLight(isoAt(WED_18H, -5), isoAt(WED_18H, -1), WED_18H);
    expect(light).toEqual({ tone: 'red', label: 'Encerrado' });
  });

  it('trata a virada verde→laranja exatamente em 1h restante', () => {
    const light = eventStatusLight(isoAt(WED_18H, -3), isoAt(WED_18H, 1), WED_18H);
    expect(light?.tone).toBe('orange');
  });

  it('retorna null para datas inválidas', () => {
    expect(eventStatusLight('não é data', isoAt(WED_18H, 1), WED_18H)).toBeNull();
  });
});

describe('establishmentStatusLight', () => {
  // 'Ter-Dom 17h às 01h' — quarta está dentro dos dias de abertura.
  const HOURS = 'Ter-Dom 17h às 01h';

  it('verde quando aberto e longe de fechar', () => {
    const light = establishmentStatusLight(HOURS, new Date(2026, 5, 10, 18, 0));
    expect(light).toEqual({ tone: 'green', label: 'Aberto' });
  });

  it('laranja na última hora antes de fechar', () => {
    // fecha 01h; às 00h30 falta meia hora
    const light = establishmentStatusLight(HOURS, new Date(2026, 5, 11, 0, 30));
    expect(light).toEqual({ tone: 'orange', label: 'Fecha em 1h' });
  });

  it('amarelo quando abre dentro de 12h', () => {
    // quarta 14h, abre às 17h
    const light = establishmentStatusLight(HOURS, new Date(2026, 5, 10, 14, 0));
    expect(light).toEqual({ tone: 'yellow', label: 'Abre em 3h' });
  });

  it('vermelho quando a próxima abertura está longe', () => {
    // segunda 10h: não abre segunda, próxima abertura é terça 17h (>12h)
    const light = establishmentStatusLight(HOURS, new Date(2026, 5, 15, 10, 0));
    expect(light).toEqual({ tone: 'red', label: 'Fechado' });
  });

  it('trata janela que cruza a meia-noite como aberto de madrugada', () => {
    // segunda 00h30 ainda é a janela iniciada no domingo
    const light = establishmentStatusLight(HOURS, new Date(2026, 5, 15, 0, 30));
    expect(light?.tone).toBe('orange');
  });

  it('retorna null para horário em formato desconhecido', () => {
    expect(establishmentStatusLight('sob consulta', WED_18H)).toBeNull();
  });

  it('funciona com lista de dias avulsos', () => {
    const light = establishmentStatusLight('Qua, Sex, Sáb 21h às 03h', new Date(2026, 5, 10, 22, 0));
    expect(light).toEqual({ tone: 'green', label: 'Aberto' });
  });
});

describe('isEventVisibleInFeed', () => {
  it('mantém visível evento que ainda não terminou', () => {
    expect(isEventVisibleInFeed(isoAt(WED_18H, 4), WED_18H)).toBe(true);
  });

  it('mantém visível durante todo o dia em que terminou', () => {
    // terminou às 2h da manhã de hoje; ainda aparece às 18h
    expect(isEventVisibleInFeed(new Date(2026, 5, 10, 2, 0).toISOString(), WED_18H)).toBe(true);
  });

  it('esconde a partir do dia seguinte ao término', () => {
    // terminou ontem 23h; hoje 18h já não aparece
    expect(isEventVisibleInFeed(new Date(2026, 5, 9, 23, 0).toISOString(), WED_18H)).toBe(false);
  });

  it('mantém visível quando a data é inválida (falha para o lado seguro)', () => {
    expect(isEventVisibleInFeed('data quebrada', WED_18H)).toBe(true);
  });
});
