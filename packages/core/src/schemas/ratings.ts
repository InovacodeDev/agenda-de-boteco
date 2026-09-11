import { z } from 'zod';

export const ratingValueSchema = z.number().int().min(1).max(5);

export const establishmentRatingSchema = z.object({
  id: z.string().uuid(),
  establishment_id: z.string(),
  user_id: z.string().uuid().nullable().optional(),
  rating: ratingValueSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export const upsertEstablishmentRatingSchema = z.object({
  establishmentId: z.string().min(1, 'ID do estabelecimento é obrigatório'),
  rating: ratingValueSchema,
});

export const ratingDistributionSchema = z.object({
  1: z.number().int().nonnegative(),
  2: z.number().int().nonnegative(),
  3: z.number().int().nonnegative(),
  4: z.number().int().nonnegative(),
  5: z.number().int().nonnegative(),
});

export const establishmentRatingsSummarySchema = z.object({
  avg: z.number().min(0).max(5),
  count: z.number().int().nonnegative(),
  distribution: ratingDistributionSchema,
});

export type RatingValue = z.infer<typeof ratingValueSchema>;
export type EstablishmentRating = z.infer<typeof establishmentRatingSchema>;
export type UpsertEstablishmentRatingInput = z.infer<typeof upsertEstablishmentRatingSchema>;
export type RatingDistribution = z.infer<typeof ratingDistributionSchema>;
export type EstablishmentRatingsSummary = z.infer<typeof establishmentRatingsSummarySchema>;
