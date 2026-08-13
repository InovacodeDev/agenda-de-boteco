import { z } from 'zod';

export const musicStyleSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
});

export const citySchema = z.object({
  id: z.string(),
  name: z.string(),
  uf: z.string().length(2),
  lat: z.number(),
  lng: z.number(),
  slug: z.string().optional(),
});

export const menuItemSchema = z.object({
  name: z.string(),
  price: z.number().nonnegative(),
});

export const priceRangeSchema = z.enum(['$', '$$', '$$$', '$$$$']);

/**
 * Atributos do estabelecimento. Espelha o enum `establishment_attribute_enum`
 * do banco — a ordem e os rótulos de exibição ficam em
 * `data/establishment-attributes.ts` (ESTABLISHMENT_ATTRIBUTES).
 */
export const establishmentAttributeSchema = z.enum([
  'pet-friendly',
  'kids-area',
  'accessible-pcd',
  'parking',
  'outdoor-space',
  'work-friendly',
  'free-wifi',
  'air-conditioning',
  'live-music',
  'dj-set',
  'cozy-romantic',
  'lively-party',
  'scenic-view',
  'live-sports',
  'sports-audio-on',
  'big-screen-tvs',
  'national-soccer',
  'international-soccer',
  'other-sports',
  'game-day-deals',
  'cheering-environment',
  'vegan-options',
  'vegetarian-options',
  'gluten-free-lactose-free',
  'kids-menu',
  'signature-cocktails',
  'craft-beer',
  'good-for-groups',
  'great-for-dates',
  'happy-hour',
  'lgbtq-friendly',
  'family-friendly',
  'accepts-meal-voucher',
  'accepts-reservations',
  'free-entry',
  'counter-service',
]);

export const establishmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  // Aceitam string vazia: no onboarding do painel logo e capa são opcionais, e
  // o bar nasce sem elas até o dono subir as imagens em /perfil. Exigir URL
  // aqui deixava o estabelecimento gravado mas ilegível — o parse quebrava na
  // leitura. A UI já trata ausência de imagem.
  logo_url: z.union([z.string().url(), z.literal('')]),
  cover_url: z.union([z.string().url(), z.literal('')]),
  address: z.string(),
  neighborhood: z.string(),
  city_id: z.string(),
  lat: z.number(),
  lng: z.number(),
  whatsapp: z.string(),
  instagram: z.string().optional(),
  opening_hours: z.string(),
  menu_items: z.array(menuItemSchema).default([]),
  price_range: priceRangeSchema,
  ambiance: z.string(),
  rating_avg: z.number().min(0).max(5),
  rating_count: z.number().int().nonnegative(),
  attributes: z.array(establishmentAttributeSchema).default([]),
  slug: z.string().optional(),
  menu_pdf_url: z.string().url().nullable().optional(),
  menu_photo_urls: z.array(z.string().url()).default([]),
});

/** Espelha `event_status_enum` do banco. 'draft' não aparece no feed público. */
export const eventStatusSchema = z.enum(['draft', 'published']);

export const eventSchema = z.object({
  id: z.string(),
  name: z.string(),
  attraction: z.string(),
  description: z.string(),
  // Aceita string vazia, pelo mesmo motivo de logo_url/cover_url: o banner é
  // opcional no formulário do dono e a coluna é NOT NULL, então um evento sem
  // imagem grava '' — exigir URL aqui gravava o evento e quebrava o parse na
  // leitura. A UI já trata ausência de banner.
  banner_url: z.union([z.string().url(), z.literal('')]),
  photo_urls: z.array(z.string().url()).default([]),
  music_style_ids: z.array(z.string()),
  establishment_id: z.string(),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  /** 0 = entrada Free */
  cover_charge: z.number().nonnegative(),
  courtesy: z.string().optional(),
  promo: z.string().optional(),
  slug: z.string().optional(),
  /**
   * Default 'published' espelha o default do banco: evento gravado antes da
   * coluna existir (e mock sem o campo) continua público ao ser lido.
   */
  status: eventStatusSchema.default('published'),
  /** Lotação do evento; só o painel do dono usa. null = dono não controla. */
  capacity: z.number().int().positive().nullable().optional(),
  /** Agrupa as ocorrências geradas por recorrência. null = evento único. */
  recurrence_group_id: z.string().nullable().optional(),
  /** Post/reel do Instagram que divulga o evento. Valor inválido é descartado. */
  instagram_post_url: z
    .string()
    .optional()
    .catch(undefined)
    .transform((value) =>
      value && z.string().url().safeParse(value).success ? value : undefined,
    ),
});

export const eventAttractionSchema = z.object({
  id: z.string(),
  event_id: z.string(),
  name: z.string(),
  position: z.number().int().nonnegative().default(0),
});

export const notificationTypeSchema = z.enum([
  'style',
  'city',
  'favorite',
  'promo',
]);

export const notificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  type: notificationTypeSchema,
  created_at: z.string().datetime({ offset: true }),
  read: z.boolean(),
  event_id: z.string().optional(),
  establishment_id: z.string().optional(),
});

/**
 * Schemas de input para escrita (admin). Derivam dos schemas de leitura via
 * .omit()/.partial() — não redefinem campos, então mudanças no schema base
 * propagam automaticamente. Campos derivados (gerados por default/trigger do
 * banco) ficam de fora; o id é opcional (gerado no cliente quando ausente).
 */
export const establishmentWriteSchema = establishmentSchema
  .omit({ rating_avg: true, rating_count: true })
  .partial({ id: true });

export const eventWriteSchema = eventSchema.partial({ id: true });

export const notificationWriteSchema = notificationSchema
  .omit({ created_at: true, read: true })
  .partial({ id: true });

export type MusicStyle = z.infer<typeof musicStyleSchema>;
export type City = z.infer<typeof citySchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
export type PriceRange = z.infer<typeof priceRangeSchema>;
export type EstablishmentAttribute = z.infer<typeof establishmentAttributeSchema>;
export type Establishment = z.infer<typeof establishmentSchema>;
export type Event = z.infer<typeof eventSchema>;
export type EventStatus = z.infer<typeof eventStatusSchema>;
export type EventAttraction = z.infer<typeof eventAttractionSchema>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type AppNotification = z.infer<typeof notificationSchema>;
export type EstablishmentWriteInput = z.infer<typeof establishmentWriteSchema>;
export type EventWriteInput = z.infer<typeof eventWriteSchema>;
export type NotificationWriteInput = z.infer<typeof notificationWriteSchema>;

// Labels amigáveis para os enums — o usuário nunca vê o valor cru.
// Ficam junto do schema (fonte única) para mobile/web/admin reusarem.
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  style: 'Estilo musical',
  city: 'Cidade',
  favorite: 'Favorito',
  promo: 'Promoção',
};

export const PRICE_RANGE_LABELS: Record<PriceRange, string> = {
  $: '$ · Econômico',
  $$: '$$ · Moderado',
  $$$: '$$$ · Caro',
  $$$$: '$$$$ · Premium',
};
