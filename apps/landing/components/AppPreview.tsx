import {
  CalendarIcon,
  ClockIcon,
  HeartIcon,
  MapPinIcon,
  SearchIcon,
  SlidersIcon,
  TicketIcon,
} from '@/components/icons';

/**
 * Mockups das telas do app, reconstruídos em JSX/Tailwind a partir dos
 * componentes reais do feed (EventCard, SegmentedTabs, chips de estilo,
 * StatusLightBadge). Não são screenshots: o preview acompanha o design tokens
 * do tema, então não envelhece junto com um PNG exportado à mão.
 */

/** Moldura de celular. `label` descreve a tela para leitores de tela. */
function PhoneFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="relative w-full max-w-[300px] shrink-0 rounded-[2.25rem] border border-border bg-background p-2 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)]"
    >
      {/* Notch */}
      <div className="absolute left-1/2 top-3.5 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-border" />
      <div className="h-[520px] overflow-hidden rounded-[1.75rem] bg-background">
        <div className="flex h-full flex-col pt-7">{children}</div>
      </div>
    </div>
  );
}

const STATUS_TONES = {
  green: 'var(--color-status-green)',
  yellow: 'var(--color-status-yellow)',
  red: 'var(--color-status-red)',
} as const;

function StatusLight({ tone, label }: { tone: keyof typeof STATUS_TONES; label: string }) {
  const color = STATUS_TONES[tone];
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-background/60 px-2 py-0.5">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="whitespace-nowrap text-[9px] font-medium" style={{ color }}>
        {label}
      </span>
    </span>
  );
}

function Tabs({ active }: { active: 'eventos' | 'bares' }) {
  return (
    <div className="mx-3 flex rounded-full bg-muted p-1">
      {(['eventos', 'bares'] as const).map((tab) => (
        <span
          key={tab}
          className={`flex-1 rounded-full py-1.5 text-center text-[11px] font-semibold capitalize ${
            tab === active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          }`}
        >
          {tab}
        </span>
      ))}
    </div>
  );
}

function FooterItem({
  icon,
  children,
  accent,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-primary">{icon}</span>
      <span className={`text-[10px] ${accent ? 'font-semibold text-primary' : 'text-foreground'}`}>
        {children}
      </span>
    </div>
  );
}

interface MockEvent {
  name: string;
  attraction: string;
  place: string;
  day: string;
  time: string;
  price: string;
  neighborhood: string;
  styles: readonly string[];
  badge?: string;
  status: { tone: keyof typeof STATUS_TONES; label: string };
  attributes: readonly string[];
  /** Gradiente que substitui o banner do evento no mockup. */
  banner: string;
  favorite?: boolean;
}

function EventCardMock({ event }: { event: MockEvent }) {
  return (
    <article className="overflow-hidden rounded-xl bg-card">
      <div className="relative h-[168px]" style={{ background: event.banner }}>
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.85))]" />
        <div className="relative flex h-full flex-col justify-between p-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {event.styles.map((style) => (
                <span
                  key={style}
                  className="rounded-full bg-background/70 px-2 py-0.5 text-[9px] font-medium text-foreground"
                >
                  {style}
                </span>
              ))}
            </div>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background/40">
              <HeartIcon
                size={12}
                filled={event.favorite}
                className={event.favorite ? 'text-primary' : 'text-foreground'}
              />
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {event.badge ? (
              <span className="w-fit rounded-full bg-[linear-gradient(135deg,#F9A91F,#FF4DA6)] px-2 py-0.5 text-[9px] font-bold text-background">
                {event.badge}
              </span>
            ) : null}
            <h3 className="font-[family-name:var(--font-heading)] text-[15px] font-bold leading-tight text-foreground">
              {event.name}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {event.attraction} · {event.place}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between bg-popover px-3 py-2">
        <div className="flex flex-col gap-1.5">
          <FooterItem icon={<CalendarIcon size={11} />}>{event.day}</FooterItem>
          <FooterItem icon={<MapPinIcon size={11} />}>{event.neighborhood}</FooterItem>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <FooterItem icon={<ClockIcon size={11} />}>{event.time}</FooterItem>
          <FooterItem icon={<TicketIcon size={11} />} accent>
            {event.price}
          </FooterItem>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-popover px-3 pb-2.5 pt-2">
        <div className="flex min-w-0 flex-1 gap-1 overflow-hidden">
          {event.attributes.map((attribute) => (
            <span
              key={attribute}
              className="shrink-0 whitespace-nowrap rounded-full bg-surface px-1.5 py-0.5 text-[8px] text-muted-foreground"
            >
              {attribute}
            </span>
          ))}
        </div>
        <StatusLight tone={event.status.tone} label={event.status.label} />
      </div>
    </article>
  );
}

const FEED_EVENTS: readonly MockEvent[] = [
  {
    name: 'Samba do Cais',
    attraction: 'Grupo Fundo de Quintal',
    place: 'Boteco do Cais',
    day: 'Hoje',
    time: '20h — 02h',
    price: 'R$ 20',
    neighborhood: 'Centro',
    styles: ['🥁 Samba', '🎷 MPB'],
    badge: 'Promoção',
    status: { tone: 'green', label: 'Acontecendo agora' },
    // Dois chips curtos: no mockup de 300px, três competiriam com o semáforo e
    // todos sairiam truncados. O card real cabe três numa tela inteira.
    attributes: ['Ao vivo', 'Pet Friendly'],
    banner: 'linear-gradient(135deg,#7c2d5a,#2a1330)',
    favorite: true,
  },
  {
    name: 'Rock na Lagoa',
    attraction: 'Banda Retrovisor',
    place: 'Bar da Lagoa',
    day: 'Amanhã',
    time: '21h — 01h',
    price: 'Entrada franca',
    neighborhood: 'Lagoa da Conceição',
    styles: ['🎸 Rock'],
    status: { tone: 'yellow', label: 'Começa em 1h' },
    attributes: ['Passa jogo', 'Estacionamento'],
    banner: 'linear-gradient(135deg,#1b4a5c,#12202a)',
  },
];

export function FeedPreview() {
  return (
    <PhoneFrame label="Tela do feed do app, com abas de eventos e bares, busca e cards de eventos da cidade">
      <div className="flex items-center justify-between px-3 pb-2.5">
        <div className="flex items-center gap-1 text-primary">
          <MapPinIcon size={13} />
          <span className="text-[11px] font-semibold text-foreground">Florianópolis</span>
        </div>
        <span className="text-[10px] text-muted-foreground">Trocar</span>
      </div>

      <div className="mb-2.5 flex items-center gap-2 px-3">
        <div className="flex h-8 flex-1 items-center gap-2 rounded-full bg-input px-3">
          <SearchIcon size={13} className="text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Buscar evento ou bar</span>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <SlidersIcon size={14} />
        </span>
      </div>

      <Tabs active="eventos" />

      {/* A lista continua além da moldura: o fade no rodapé faz o corte parecer
          scroll (como no app), em vez de um card partido ao meio. */}
      <div className="relative mt-2.5 flex-1 overflow-hidden">
        <div className="flex flex-col gap-2.5 px-3">
          {FEED_EVENTS.map((event) => (
            <EventCardMock key={event.name} event={event} />
          ))}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-[linear-gradient(to_bottom,transparent,var(--color-background))]"
        />
      </div>
    </PhoneFrame>
  );
}

const FILTER_GROUPS: readonly { title: string; chips: readonly { label: string; on?: boolean }[] }[] =
  [
    {
      title: 'Cidade',
      chips: [
        { label: 'Florianópolis', on: true },
        { label: 'São José', on: true },
        { label: 'Palhoça' },
      ],
    },
    {
      title: 'Estilo musical',
      chips: [
        { label: '🥁 Samba', on: true },
        { label: '🎸 Rock' },
        { label: '🤠 Sertanejo' },
        { label: '🎷 MPB' },
        { label: '🎹 Eletrônica' },
      ],
    },
    {
      title: 'Diferenciais do bar',
      chips: [
        { label: 'Pet Friendly', on: true },
        { label: 'Passa jogo' },
        { label: 'Mesa na calçada', on: true },
        { label: 'Opções veganas' },
        { label: 'Estacionamento' },
        { label: 'Acessível' },
      ],
    },
  ];

export function FiltersPreview() {
  return (
    <PhoneFrame label="Tela de filtros do app, com seleção de cidades, estilos musicais, distância e diferenciais do bar">
      <div className="flex items-center justify-between border-b border-border px-3 pb-2.5">
        <span className="font-[family-name:var(--font-heading)] text-[13px] font-bold text-foreground">
          Filtros
        </span>
        <span className="text-[10px] font-semibold text-primary">Limpar</span>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden px-3 py-3">
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Distância
          </span>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-foreground">Perto de mim</span>
            <span className="flex h-4 w-7 items-center rounded-full bg-primary p-0.5">
              <span className="ml-auto h-3 w-3 rounded-full bg-primary-foreground" />
            </span>
          </div>
          <div className="h-1 rounded-full bg-muted">
            <div className="h-full w-2/5 rounded-full bg-primary" />
          </div>
          <span className="text-[9px] text-muted-foreground">até 5 km de você</span>
        </div>

        {FILTER_GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {group.chips.map((chip) => (
                <span
                  key={chip.label}
                  className={`rounded-full px-2 py-1 text-[9px] font-medium ${
                    chip.on
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface text-muted-foreground'
                  }`}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3">
        <span className="flex h-9 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          Ver 18 resultados
        </span>
      </div>
    </PhoneFrame>
  );
}

/** Pinos posicionados em % — o mapa é decorativo, não precisa de coords reais. */
const MAP_PINS: readonly { top: string; left: string; active?: boolean }[] = [
  { top: '22%', left: '28%' },
  { top: '38%', left: '62%', active: true },
  { top: '58%', left: '35%' },
  { top: '70%', left: '68%' },
  { top: '46%', left: '18%' },
];

export function MapPreview() {
  return (
    <PhoneFrame label="Tela de mapa do app, com bares próximos marcados e o card do bar selecionado">
      <div className="flex items-center gap-2 px-3 pb-2.5">
        <div className="flex h-8 flex-1 items-center gap-2 rounded-full bg-input px-3">
          <SearchIcon size={13} className="text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Bares por perto</span>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden bg-surface">
        {/* Malha viária estilizada */}
        <svg
          className="absolute inset-0 h-full w-full text-border"
          viewBox="0 0 300 460"
          preserveAspectRatio="none"
          aria-hidden
        >
          <rect width="300" height="460" fill="#141414" />
          <g stroke="currentColor" strokeWidth="6" strokeLinecap="round">
            <path d="M-10 120 L310 90" />
            <path d="M-10 250 L310 300" />
            <path d="M60 -10 L90 470" />
            <path d="M210 -10 L180 470" />
          </g>
          <path
            d="M-10 380 Q120 340 310 400 L310 470 L-10 470 Z"
            fill="#0e2a33"
            stroke="#1b4a5c"
            strokeWidth="2"
          />
        </svg>

        {MAP_PINS.map((pin) => (
          <span
            key={`${pin.top}-${pin.left}`}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ top: pin.top, left: pin.left }}
          >
            <MapPinIcon
              size={pin.active ? 26 : 18}
              className={pin.active ? 'text-primary' : 'text-muted-foreground'}
            />
          </span>
        ))}

        <div className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-2.5 rounded-xl bg-card p-2.5">
          <div
            className="h-11 w-11 shrink-0 rounded-lg"
            style={{ background: 'linear-gradient(135deg,#7c2d5a,#2a1330)' }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-[family-name:var(--font-heading)] text-[12px] font-bold text-foreground">
              Boteco do Cais
            </p>
            <p className="text-[9px] text-muted-foreground">Centro · 850m de mim</p>
            <div className="mt-1 flex items-center gap-1">
              <StatusLight tone="green" label="Aberto agora" />
              <span className="text-[9px] text-accent">★ 4,7</span>
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
