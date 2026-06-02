// AUTO-GENERATED — never hand-edit.
// Regenerate with: pnpm --filter core gen:types
// (requires SUPABASE_PROJECT_ID in the environment)
//
// This placeholder is replaced wholesale by the Supabase CLI output.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      bars: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          rating: number;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          rating?: number;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          rating?: number;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
