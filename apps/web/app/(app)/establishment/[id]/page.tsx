'use client';

import {
  buildDirectionsUrl,
  buildWhatsAppUrl,
  FEATURES,
  getAttributeMeta,
  indexById,
  musicStylesForEvent,
  upcomingEventsForEstablishment,
  useEstablishmentQuery,
  useEventsByEstablishmentQuery,
  useFavoritesStore,
  useMusicStylesQuery,
} from '@agenda/core';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { EstablishmentDetailAgendaItem } from '@/components/establishment/EstablishmentDetailAgendaItem';
import { EstablishmentDetailMenuItem } from '@/components/establishment/EstablishmentDetailMenuItem';
import { UnderConstruction } from '@/components/feedback/UnderConstruction';
import {
  ArrowLeftIcon,
  AttributeIcon,
  ClockIcon,
  HeartIcon,
  MapPinIcon,
  SparklesIcon,
  StarIcon,
} from '@/components/ui/icons';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { useRequireAuth } from '@/hooks/useRequireAuth';

const TABS = ['Sobre', 'Agenda', 'Cardápio', 'Reviews'];

function RatingStars({ avg, count }: { avg: number; count: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <StarIcon size={14} className="text-accent" />
      <span className="text-[13px] font-[family-name:var(--font-body)] font-semibold text-foreground">
        {avg.toFixed(1)}
      </span>
      <span className="text-[13px] font-[family-name:var(--font-body)] text-muted-foreground">
        ({count})
      </span>
    </span>
  );
}

function AboutCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-card px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[12px] font-[family-name:var(--font-body)] text-muted-foreground">
          {label}
        </span>
      </div>
      <span className="text-[14px] font-[family-name:var(--font-body)] font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}

function EstablishmentDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? '';
  const [activeTab, setActiveTab] = useState(0);
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  const establishmentQuery = useEstablishmentQuery(id);
  const establishment = establishmentQuery.data;
  // O service/core já ordena a agenda por starts_at asc.
  const { data: agendaData } = useEventsByEstablishmentQuery(id);
  const { data: musicStyles } = useMusicStylesQuery();
  const stylesById = useMemo(() => indexById(musicStyles ?? []), [musicStyles]);

  const upcoming = useMemo(
    () => upcomingEventsForEstablishment(agendaData ?? [], id, new Date(), 5),
    [agendaData, id],
  );

  const isFavorite = useFavoritesStore((state) =>
    establishment ? state.establishmentIds.includes(establishment.id) : false,
  );
  const toggleEstablishment = useFavoritesStore((state) => state.toggleEstablishment);
  const requireAuth = useRequireAuth();

  if (establishmentQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <p className="text-[14px] font-[family-name:var(--font-body)] text-muted-foreground">
          Carregando…
        </p>
      </div>
    );
  }

  if (!establishment) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <p className="text-[14px] font-[family-name:var(--font-body)] text-muted-foreground">
          Estabelecimento não encontrado.
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col">
      <div className="relative -mx-4 h-65 sm:mx-0 sm:overflow-hidden sm:rounded-2xl">
        {/* ponytail: <img> evita config de remotePatterns do next/image p/ covers externos */}
        <img
          src={establishment.cover_url}
          alt={establishment.name}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => router.back()}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/60 text-foreground transition-opacity hover:opacity-80"
        >
          <ArrowLeftIcon size={18} />
        </button>
        <button
          type="button"
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Favoritar estabelecimento'}
          onClick={() => requireAuth(() => toggleEstablishment(establishment.id))}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/60 transition-opacity hover:opacity-80"
        >
          <HeartIcon
            size={18}
            filled={isFavorite}
            className={isFavorite ? 'text-primary' : 'text-foreground'}
          />
        </button>
      </div>

      <div className="flex flex-col gap-4 pt-4">
        {/* z-10: a logo sobe sobre a capa, que vem antes no fluxo e a cobriria. */}
        <div className="relative z-10 -mt-14 flex items-end gap-3">
          <img
            src={establishment.logo_url}
            alt={`Logo ${establishment.name}`}
            className="h-16 w-16 shrink-0 rounded-2xl border-2 border-background object-cover"
          />
          <p className="pb-1 text-[12px] font-[family-name:var(--font-body)] text-muted-foreground">
            {establishment.ambiance} · {establishment.price_range}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-[24px] font-[family-name:var(--font-heading)] font-bold leading-tight text-foreground">
            {establishment.name}
          </h1>
          <RatingStars avg={establishment.rating_avg} count={establishment.rating_count} />
        </div>

        <p className="text-[14px] font-[family-name:var(--font-body)] leading-5 text-foreground">
          {establishment.description}
        </p>

        <div className="flex flex-wrap gap-2">
          {establishment.attributes.map((attributeId) => {
            const meta = getAttributeMeta(attributeId);
            return (
              <span
                key={attributeId}
                title={meta.description}
                className="flex items-center gap-1.5 rounded-full bg-surface-elevated px-3 py-1.5 text-[12px] font-[family-name:var(--font-body)] text-foreground"
              >
                <AttributeIcon icon={meta.icon} size={13} className="text-primary" />
                {meta.label}
              </span>
            );
          })}
        </div>

        <SegmentedTabs tabs={TABS} activeIndex={activeTab} onChange={setActiveTab} />

        {activeTab === 0 ? (
          <div className="flex flex-col gap-3">
            <AboutCard
              label="Endereço"
              value={`${establishment.address} · ${establishment.neighborhood}`}
              icon={<MapPinIcon size={13} className="text-primary" />}
            />
            <AboutCard
              label="Horário"
              value={establishment.opening_hours}
              icon={<ClockIcon size={13} className="text-muted-foreground" />}
            />
            {establishment.instagram ? (
              <AboutCard
                label="Instagram"
                value={establishment.instagram}
                icon={<SparklesIcon size={13} className="text-primary" />}
              />
            ) : null}
          </div>
        ) : null}

        {activeTab === 1 ? (
          <div className="flex flex-col gap-3">
            {upcoming.length === 0 ? (
              <p className="text-[14px] font-[family-name:var(--font-body)] text-muted-foreground">
                Nenhum evento agendado por aqui ainda.
              </p>
            ) : (
              upcoming.map((event) => (
                <EstablishmentDetailAgendaItem
                  key={event.id}
                  event={event}
                  styles={musicStylesForEvent(event, stylesById)}
                />
              ))
            )}
          </div>
        ) : null}

        {activeTab === 2 ? (
          <div className="flex flex-col gap-6">
            {establishment.menu_pdf_url ? (
              <div className="flex flex-col gap-2">
                <span className="text-[14px] font-[family-name:var(--font-body)] font-semibold text-foreground">Cardápio Digital</span>
                <a
                  href={establishment.menu_pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface-elevated text-[14px] font-[family-name:var(--font-body)] font-semibold text-foreground transition-opacity hover:opacity-80"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width={16}
                    height={16}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Visualizar/Baixar Cardápio (PDF)
                </a>
              </div>
            ) : null}

            {establishment.menu_photo_urls && establishment.menu_photo_urls.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-[14px] font-[family-name:var(--font-body)] font-semibold text-foreground">Fotos do Cardápio</span>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {establishment.menu_photo_urls.map((photoUrl) => (
                    <button
                      key={photoUrl}
                      type="button"
                      onClick={() => setActivePhotoUrl(photoUrl)}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border hover:opacity-90 animate-fade-in"
                    >
                      <img
                        src={photoUrl}
                        alt="Foto do cardápio"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <span className="text-[14px] font-[family-name:var(--font-body)] font-semibold text-foreground">Itens do Cardápio</span>
              {establishment.menu_items.length === 0 && !establishment.menu_pdf_url && (!establishment.menu_photo_urls || establishment.menu_photo_urls.length === 0) ? (
                <p className="text-[14px] font-[family-name:var(--font-body)] text-muted-foreground">
                  Cardápio não informado.
                </p>
              ) : establishment.menu_items.length === 0 ? (
                <p className="text-[13px] font-[family-name:var(--font-body)] text-muted-foreground">
                  Nenhum prato/bebida avulso listado.
                </p>
              ) : (
                establishment.menu_items.map((item) => (
                  <EstablishmentDetailMenuItem key={item.name} item={item} />
                ))
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 3 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-card p-6">
            <RatingStars avg={establishment.rating_avg} count={establishment.rating_count} />
            <p className="text-center text-[13px] font-[family-name:var(--font-body)] text-muted-foreground">
              Avaliações de {establishment.rating_count} pessoas que já curtiram a noite por aqui.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pb-4">
          <a
            href={buildWhatsAppUrl(establishment.whatsapp)}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 flex-1 items-center justify-center rounded-full bg-primary text-[15px] font-[family-name:var(--font-body)] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            WhatsApp
          </a>
          <a
            href={buildDirectionsUrl({ lat: establishment.lat, lng: establishment.lng })}
            target="_blank"
            rel="noreferrer"
            aria-label="Como chegar"
            className="flex h-11 items-center justify-center rounded-full border-[0.5px] border-foreground/50 bg-background px-4 text-[15px] font-[family-name:var(--font-body)] font-semibold text-foreground transition-opacity hover:opacity-90"
          >
            <MapPinIcon size={16} />
          </a>
        </div>
      </div>

      {activePhotoUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            onClick={() => setActivePhotoUrl(null)}
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-opacity hover:opacity-80"
          >
            <svg
              viewBox="0 0 24 24"
              width={20}
              height={20}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <img
            src={activePhotoUrl}
            alt="Foto do cardápio ampliada"
            className="max-h-[80vh] max-w-full object-contain"
          />

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <a
              href={activePhotoUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-[14px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <svg
                viewBox="0 0 24 24"
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Baixar Foto
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function EstablishmentDetailPage() {
  if (!FEATURES.establishmentDetail) {
    return (
      <UnderConstruction
        version="v2"
        title="Os botecos estão se arrumando"
        description='Em breve você explora cada bar por dentro: cardápio, fotos, agenda completa e aquele papo de "bora pra cá hoje?". Tá vindo na v2 — aguenta firme que a rodada tá chegando.'
      />
    );
  }
  return <EstablishmentDetailContent />;
}
