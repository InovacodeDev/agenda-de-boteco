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
  };
}
