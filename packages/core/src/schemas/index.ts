import { z } from 'zod';

export const barSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  created_at: z.string().datetime(),
  rating: z.number().min(0).max(5),
});

export type Bar = z.infer<typeof barSchema>;
