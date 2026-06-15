import {
  APP_SCHEME,
  buildDirectionsUrl,
  buildEstablishmentShareUrl,
  buildEventShareUrl,
  buildWhatsAppUrl,
} from './links';

describe('buildDirectionsUrl', () => {
  it('monta a URL universal do Google Maps com lat,lng', () => {
    expect(buildDirectionsUrl({ lat: -27.5915, lng: -48.5234 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-27.5915,-48.5234',
    );
  });

  it('ignora o label na URL (apenas informativo)', () => {
    expect(
      buildDirectionsUrl({ lat: -27.5915, lng: -48.5234, label: 'Boteco do Zé' }),
    ).toBe('https://www.google.com/maps/dir/?api=1&destination=-27.5915,-48.5234');
  });
});

describe('buildWhatsAppUrl', () => {
  it('monta o link wa.me sem texto', () => {
    expect(buildWhatsAppUrl('5548999990001')).toBe('https://wa.me/5548999990001');
  });

  it('anexa ?text= URL-encoded quando fornecido', () => {
    expect(buildWhatsAppUrl('5548999990001', 'Olá, quero reservar')).toBe(
      'https://wa.me/5548999990001?text=Ol%C3%A1%2C%20quero%20reservar',
    );
  });

  it('não anexa ?text= para string vazia', () => {
    expect(buildWhatsAppUrl('5548999990001', '')).toBe(
      'https://wa.me/5548999990001',
    );
  });
});

describe('buildEventShareUrl', () => {
  it('gera o deep link de scheme quando não há baseUrl', () => {
    expect(buildEventShareUrl({ slugOrId: 'e1' })).toBe(
      'agenda-de-boteco://event/e1',
    );
  });

  it('usa a constante APP_SCHEME no deep link', () => {
    expect(buildEventShareUrl({ slugOrId: 'e1' })).toBe(`${APP_SCHEME}://event/e1`);
  });

  it('gera URL https com citySlug', () => {
    expect(
      buildEventShareUrl(
        { slugOrId: 'samba-na-varanda', citySlug: 'floripa' },
        'https://agenda.example.com',
      ),
    ).toBe('https://agenda.example.com/eventos/floripa/samba-na-varanda');
  });

  it('gera URL https sem citySlug (omite o segmento de cidade)', () => {
    expect(
      buildEventShareUrl({ slugOrId: 'samba-na-varanda' }, 'https://agenda.example.com'),
    ).toBe('https://agenda.example.com/eventos/samba-na-varanda');
  });

  it('normaliza a barra final do baseUrl (sem dupla barra)', () => {
    expect(
      buildEventShareUrl(
        { slugOrId: 'e1', citySlug: 'floripa' },
        'https://agenda.example.com/',
      ),
    ).toBe('https://agenda.example.com/eventos/floripa/e1');
  });

  it('produz o mesmo resultado com e sem barra final no baseUrl', () => {
    const withSlash = buildEventShareUrl({ slugOrId: 'e1' }, 'https://x.com/');
    const withoutSlash = buildEventShareUrl({ slugOrId: 'e1' }, 'https://x.com');
    expect(withSlash).toBe(withoutSlash);
    expect(withSlash).toBe('https://x.com/eventos/e1');
  });

  it('faz URL-encode de slug e citySlug com caracteres especiais', () => {
    expect(
      buildEventShareUrl(
        { slugOrId: 'samba & forró', citySlug: 'são paulo' },
        'https://x.com',
      ),
    ).toBe('https://x.com/eventos/s%C3%A3o%20paulo/samba%20%26%20forr%C3%B3');
  });

  it('faz URL-encode do slug também no deep link de scheme', () => {
    expect(buildEventShareUrl({ slugOrId: 'a/b' })).toBe(
      'agenda-de-boteco://event/a%2Fb',
    );
  });
});

describe('buildEstablishmentShareUrl', () => {
  it('gera o deep link de scheme quando não há baseUrl', () => {
    expect(buildEstablishmentShareUrl({ slugOrId: 'b1' })).toBe(
      'agenda-de-boteco://establishment/b1',
    );
  });

  it('gera URL https com citySlug', () => {
    expect(
      buildEstablishmentShareUrl(
        { slugOrId: 'boteco-do-ze', citySlug: 'floripa' },
        'https://agenda.example.com',
      ),
    ).toBe('https://agenda.example.com/bares/floripa/boteco-do-ze');
  });

  it('gera URL https sem citySlug (omite o segmento de cidade)', () => {
    expect(
      buildEstablishmentShareUrl({ slugOrId: 'boteco-do-ze' }, 'https://agenda.example.com'),
    ).toBe('https://agenda.example.com/bares/boteco-do-ze');
  });

  it('normaliza a barra final do baseUrl (sem dupla barra)', () => {
    expect(
      buildEstablishmentShareUrl(
        { slugOrId: 'b1', citySlug: 'floripa' },
        'https://agenda.example.com/',
      ),
    ).toBe('https://agenda.example.com/bares/floripa/b1');
  });

  it('faz URL-encode de slug e citySlug com caracteres especiais', () => {
    expect(
      buildEstablishmentShareUrl(
        { slugOrId: 'bar do zé', citySlug: 'são paulo' },
        'https://x.com',
      ),
    ).toBe('https://x.com/bares/s%C3%A3o%20paulo/bar%20do%20z%C3%A9');
  });
});
