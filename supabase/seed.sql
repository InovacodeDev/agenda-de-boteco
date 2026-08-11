-- Seed espelhando apps/mobile/src/data/mock.ts (mesmos ids e valores).
-- Datas reproduzem buildEventDate(daysFromNow, hour, minute?) do mock:
--   (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')
--     + make_interval(days => N, hours => H, mins => M)) AT TIME ZONE 'America/Sao_Paulo'
-- O mock usa a hora LOCAL do device; ancorar as datas em America/Sao_Paulo faz a
-- copy das notificações ("começa às 20h") bater com a exibição no device do
-- público-alvo (ex.: ev1 às 20h em SP = 23:00Z no horário padrão UTC-3).
-- URLs seguem buildUnsplashUrl(photoId, w = 1200, h = 700):
--   https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w={w}&h={h}&q=80
-- Colunas location (trigger PostGIS) e slug (trigger slugify) são geradas automaticamente.

-- 10 music_styles
INSERT INTO public.music_styles (id, name, emoji) VALUES
  ('pagode', 'Pagode', '🥁'),
  ('samba', 'Samba', '🎶'),
  ('sertanejo', 'Sertanejo', '🤠'),
  ('rock', 'Rock', '🎸'),
  ('mpb', 'MPB', '🎤'),
  ('jazz', 'Jazz', '🎷'),
  ('eletronica', 'Eletrônica', '🎧'),
  ('forro', 'Forró', '🪗'),
  ('standup', 'Stand-up', '🎙️'),
  ('blues', 'Blues', '🎺')
ON CONFLICT (id) DO NOTHING;

-- 6 cities
INSERT INTO public.cities (id, name, uf, lat, lng) VALUES
  ('fln', 'Florianópolis', 'SC', -27.5954, -48.548),
  ('sao', 'São Paulo', 'SP', -23.5505, -46.6333),
  ('rio', 'Rio de Janeiro', 'RJ', -22.9068, -43.1729),
  ('cwb', 'Curitiba', 'PR', -25.4284, -49.2733),
  ('poa', 'Porto Alegre', 'RS', -30.0346, -51.2177),
  ('bhz', 'Belo Horizonte', 'MG', -19.9167, -43.9345)
ON CONFLICT (id) DO NOTHING;

-- 8 establishments
INSERT INTO public.establishments
  (id, name, description, logo_url, cover_url, address, neighborhood, city_id, lat, lng, whatsapp, instagram, opening_hours, menu_items, price_range, ambiance, rating_avg, rating_count, attributes)
VALUES
  (
    'e1',
    'Boteco do Zé',
    'Boteco tradicional com chope gelado, petiscos generosos e roda de samba aos fins de semana.',
    'https://images.unsplash.com/photo-1546195643-70f48f9c5b87?auto=format&fit=crop&w=200&h=200&q=80',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&h=700&q=80',
    'Rua Lauro Linhares, 589',
    'Trindade',
    'fln',
    -27.5915,
    -48.5234,
    '5548999990001',
    '@botecodoze',
    'Ter-Dom 17h às 01h',
    '[{"name": "Bolinho de bacalhau", "price": 38}, {"name": "Chope 300ml", "price": 12}, {"name": "Porção de calabresa", "price": 42}]'::jsonb,
    '$$',
    'Boteco',
    4.7,
    312,
    ARRAY['pet-friendly', 'outdoor-space', 'live-music', 'craft-beer', 'good-for-groups', 'accepts-meal-voucher']::public.establishment_attribute_enum[]
  ),
  (
    'e2',
    'Garage Pub',
    'Pub estilo industrial com cervejas artesanais e bandas de rock toda semana.',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=200&h=200&q=80',
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=1200&h=700&q=80',
    'Av. Mauro Ramos, 1102',
    'Centro',
    'fln',
    -27.5969,
    -48.5495,
    '5548999990002',
    '@garagepub',
    'Qua-Sáb 19h às 03h',
    '[{"name": "IPA artesanal", "price": 22}, {"name": "Burger duplo", "price": 48}]'::jsonb,
    '$$$',
    'Pub',
    4.5,
    198,
    ARRAY['craft-beer', 'live-music', 'live-sports', 'big-screen-tvs', 'good-for-groups', 'free-wifi']::public.establishment_attribute_enum[]
  ),
  (
    'e3',
    'Cantinho Sertanejo',
    'Casa moderna com pista, dupla sertaneja todo fim de semana e drinks autorais.',
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=200&h=200&q=80',
    'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?auto=format&fit=crop&w=1200&h=700&q=80',
    'Rod. SC-401, Km 4',
    'Saco Grande',
    'fln',
    -27.561,
    -48.514,
    '5548999990003',
    '@cantinhosertanejo',
    'Sex-Sáb 22h às 05h',
    '[]'::jsonb,
    '$$$',
    'Bar',
    4.3,
    421,
    ARRAY['lively-party', 'dj-set', 'parking', 'good-for-groups', 'air-conditioning']::public.establishment_attribute_enum[]
  ),
  (
    'e4',
    'Vinil MPB Bar',
    'Bar intimista com música ao vivo todas as noites: MPB, jazz e bossa.',
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=200&h=200&q=80',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&h=700&q=80',
    'Rua Bocaiúva, 2334',
    'Agronômica',
    'fln',
    -27.5763,
    -48.5457,
    '5548999990004',
    '@vinilmpb',
    'Ter-Sáb 19h às 00h',
    '[]'::jsonb,
    '$$$',
    'Lounge',
    4.8,
    156,
    ARRAY['live-music', 'cozy-romantic', 'great-for-dates', 'accepts-reservations', 'signature-cocktails', 'vegetarian-options']::public.establishment_attribute_enum[]
  ),
  (
    'e5',
    'Choperia Vila',
    'Choperia ampla no coração da Vila Madalena, palco aberto e ambiente jovial.',
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=200&h=200&q=80',
    'https://images.unsplash.com/photo-1538488881038-e252a119ace7?auto=format&fit=crop&w=1200&h=700&q=80',
    'Rua Aspicuelta, 421',
    'Vila Madalena',
    'sao',
    -23.5546,
    -46.6913,
    '5511999990005',
    '@choperiavila',
    'Todos os dias 16h às 02h',
    '[]'::jsonb,
    '$$',
    'Choperia',
    4.6,
    587,
    ARRAY['happy-hour', 'live-music', 'pet-friendly', 'outdoor-space', 'kids-area', 'family-friendly']::public.establishment_attribute_enum[]
  ),
  (
    'e6',
    'Lapa 40 Graus',
    'Casa noturna na Lapa com samba, pagode e rodas que viram a madrugada.',
    'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?auto=format&fit=crop&w=200&h=200&q=80',
    'https://images.unsplash.com/photo-1571266028243-d220c6a4dbd8?auto=format&fit=crop&w=1200&h=700&q=80',
    'Rua Riachuelo, 97',
    'Lapa',
    'rio',
    -22.9133,
    -43.1796,
    '5521999990006',
    '@lapa40graus',
    'Qui-Dom 21h às 05h',
    '[]'::jsonb,
    '$$$',
    'Bar',
    4.4,
    1023,
    ARRAY['live-music', 'lively-party', 'signature-cocktails', 'lgbtq-friendly', 'counter-service']::public.establishment_attribute_enum[]
  ),
  (
    'e7',
    'Forró da Esquina',
    'Forró pé de serra todas as quartas e sábados, ambiente animado.',
    'https://images.unsplash.com/photo-1571266028243-d220c6a4dbd8?auto=format&fit=crop&w=200&h=200&q=80',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&h=700&q=80',
    'Rua Augusta, 1900',
    'Consolação',
    'sao',
    -23.5567,
    -46.661,
    '5511999990007',
    NULL,
    'Qua, Sex, Sáb 21h às 03h',
    '[]'::jsonb,
    '$$',
    'Bar',
    4.5,
    287,
    ARRAY['live-music', 'good-for-groups', 'accessible-pcd', 'free-entry']::public.establishment_attribute_enum[]
  ),
  (
    'e8',
    'Subsolo Eletrônica',
    'Club underground com line-up de DJs nacionais e internacionais.',
    'https://images.unsplash.com/photo-1571266028243-d220c6a4dbd8?auto=format&fit=crop&w=200&h=200&q=80',
    'https://images.unsplash.com/photo-1571266028243-d220c6a4dbd8?auto=format&fit=crop&w=1200&h=700&q=80',
    'Rua da Consolação, 3000',
    'Jardins',
    'sao',
    -23.5612,
    -46.6589,
    '5511999990008',
    NULL,
    'Sex-Sáb 23h às 07h',
    '[]'::jsonb,
    '$$$$',
    'Lounge',
    4.6,
    754,
    ARRAY['dj-set', 'lively-party', 'scenic-view', 'signature-cocktails', 'lgbtq-friendly']::public.establishment_attribute_enum[]
  )
ON CONFLICT (id) DO NOTHING;

-- Seed cardápio para Boteco do Zé
UPDATE public.establishments
SET
  menu_pdf_url = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  menu_photo_urls = ARRAY[
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=85',
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=600&q=85'
  ]
WHERE id = 'e1';

-- 12 events
INSERT INTO public.events
  (id, name, attraction, description, banner_url, music_style_ids, establishment_id, starts_at, ends_at, cover_charge, courtesy, promo)
VALUES
  (
    'ev1',
    'Samba na Varanda',
    'Grupo Resenha',
    'A melhor roda de samba da cidade, com clássicos de Fundo de Quintal e Zeca Pagodinho.',
    'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?auto=format&fit=crop&w=1200&h=700&q=80',
    ARRAY['samba', 'pagode'],
    'e1',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 0, hours => 20)) AT TIME ZONE 'America/Sao_Paulo',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 1, hours => 1)) AT TIME ZONE 'America/Sao_Paulo',
    20,
    'Mulheres free até 22h',
    NULL
  ),
  (
    'ev2',
    'Rock Night',
    'Banda The Garage',
    'Os maiores hits do rock clássico em uma noite eletrizante.',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&h=700&q=80',
    ARRAY['rock'],
    'e2',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 0, hours => 22)) AT TIME ZONE 'America/Sao_Paulo',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 1, hours => 3)) AT TIME ZONE 'America/Sao_Paulo',
    30,
    NULL,
    'Combo 2 chopes + 1 burger por R$59'
  ),
  (
    'ev3',
    'Sertanejo Universitário',
    'Dupla João & Marcelo',
    'Modão, sofrência e os hits do momento.',
    'https://images.unsplash.com/photo-1571266028243-d220c6a4dbd8?auto=format&fit=crop&w=1200&h=700&q=80',
    ARRAY['sertanejo'],
    'e3',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 1, hours => 22)) AT TIME ZONE 'America/Sao_Paulo',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 2, hours => 5)) AT TIME ZONE 'America/Sao_Paulo',
    50,
    NULL,
    'Open de chope até meia-noite'
  ),
  (
    'ev4',
    'Noite MPB',
    'Marina Costa Trio',
    'Tributo a Elis Regina, Djavan e Caetano Veloso.',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&h=700&q=80',
    ARRAY['mpb', 'jazz'],
    'e4',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 2, hours => 21)) AT TIME ZONE 'America/Sao_Paulo',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 3, hours => 0)) AT TIME ZONE 'America/Sao_Paulo',
    40,
    NULL,
    NULL
  ),
  (
    'ev5',
    'Happy Hour Acústico',
    'Léo Voz e Violão',
    'Hits dos anos 90 e 2000 em versão acústica para esquentar a noite.',
    'https://images.unsplash.com/photo-1538488881038-e252a119ace7?auto=format&fit=crop&w=1200&h=700&q=80',
    ARRAY['mpb', 'rock'],
    'e5',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 0, hours => 18)) AT TIME ZONE 'America/Sao_Paulo',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 0, hours => 22)) AT TIME ZONE 'America/Sao_Paulo',
    0,
    '1ª caipirinha cortesia',
    NULL
  ),
  (
    'ev6',
    'Pagode da Lapa',
    'Grupo Suingue Carioca',
    'Pagode raiz na Lapa com a melhor energia do Rio.',
    'https://images.unsplash.com/photo-1571266028243-d220c6a4dbd8?auto=format&fit=crop&w=1200&h=700&q=80',
    ARRAY['pagode', 'samba'],
    'e6',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 3, hours => 22)) AT TIME ZONE 'America/Sao_Paulo',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 4, hours => 5)) AT TIME ZONE 'America/Sao_Paulo',
    35,
    NULL,
    NULL
  ),
  (
    'ev7',
    'Forró Raiz',
    'Trio Xote do Bem',
    'Forró pé de serra com aulas grátis a partir das 21h.',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&h=700&q=80',
    ARRAY['forro'],
    'e7',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 2, hours => 21)) AT TIME ZONE 'America/Sao_Paulo',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 3, hours => 3)) AT TIME ZONE 'America/Sao_Paulo',
    25,
    'Aula de forró cortesia',
    NULL
  ),
  (
    'ev8',
    'Techno Underground',
    'DJ Marina K · DJ Pulse',
    'Line-up nacional com techno e house até o amanhecer.',
    'https://images.unsplash.com/photo-1571266028243-d220c6a4dbd8?auto=format&fit=crop&w=1200&h=700&q=80',
    ARRAY['eletronica'],
    'e8',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 4, hours => 23)) AT TIME ZONE 'America/Sao_Paulo',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 5, hours => 7)) AT TIME ZONE 'America/Sao_Paulo',
    80,
    NULL,
    NULL
  ),
  (
    'ev9',
    'Stand-up Comedy Night',
    'Pedro Lima e convidados',
    'Uma noite de risadas com o melhor do humor independente.',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&h=700&q=80',
    ARRAY['standup'],
    'e2',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 5, hours => 21)) AT TIME ZONE 'America/Sao_Paulo',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 5, hours => 23, mins => 30)) AT TIME ZONE 'America/Sao_Paulo',
    40,
    NULL,
    NULL
  ),
  (
    'ev10',
    'Jazz & Vinho',
    'Quarteto Blue Note',
    'Noite intimista com jazz instrumental e carta de vinhos especial.',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&h=700&q=80',
    ARRAY['jazz'],
    'e4',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 6, hours => 20)) AT TIME ZONE 'America/Sao_Paulo',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 6, hours => 23, mins => 30)) AT TIME ZONE 'America/Sao_Paulo',
    60,
    NULL,
    'Taça de vinho + couvert por R$49'
  ),
  (
    'ev11',
    'Samba de Domingo',
    'Grupo Resenha',
    'A roda de samba que toma conta da varanda no domingo à tarde.',
    'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?auto=format&fit=crop&w=1200&h=700&q=80',
    ARRAY['samba'],
    'e1',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 7, hours => 15)) AT TIME ZONE 'America/Sao_Paulo',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 7, hours => 21)) AT TIME ZONE 'America/Sao_Paulo',
    0,
    'Entrada gratuita',
    NULL
  ),
  (
    'ev12',
    'Vila Acústica',
    'Banda Maré Alta',
    'Hits do reggae e MPB em versão acústica.',
    'https://images.unsplash.com/photo-1538488881038-e252a119ace7?auto=format&fit=crop&w=1200&h=700&q=80',
    ARRAY['mpb'],
    'e5',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 1, hours => 20)) AT TIME ZONE 'America/Sao_Paulo',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 2, hours => 0)) AT TIME ZONE 'America/Sao_Paulo',
    15,
    NULL,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- 4 notifications
INSERT INTO public.notifications
  (id, title, body, type, created_at, read, event_id, establishment_id)
VALUES
  (
    'n1',
    'Hoje tem pagode perto de você 🥁',
    'Samba na Varanda no Boteco do Zé começa às 20h.',
    'style',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 0, hours => 9)) AT TIME ZONE 'America/Sao_Paulo',
    FALSE,
    'ev1',
    NULL
  ),
  (
    'n2',
    'Novo evento de rock em Florianópolis 🎸',
    'Garage Pub anunciou Rock Night para hoje à noite.',
    'city',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => 0, hours => 8)) AT TIME ZONE 'America/Sao_Paulo',
    FALSE,
    'ev2',
    NULL
  ),
  (
    'n3',
    'Boteco do Zé publicou nova agenda ⭐',
    'Seu favorito acaba de adicionar o Samba de Domingo.',
    'favorite',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => -1, hours => 18)) AT TIME ZONE 'America/Sao_Paulo',
    TRUE,
    'ev11',
    'e1'
  ),
  (
    'n4',
    'Promoção quentinha 🔥',
    'Choperia Vila com happy hour estendido até 20h hoje.',
    'promo',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + make_interval(days => -1, hours => 12)) AT TIME ZONE 'America/Sao_Paulo',
    TRUE,
    NULL,
    'e5'
  )
ON CONFLICT (id) DO NOTHING;
