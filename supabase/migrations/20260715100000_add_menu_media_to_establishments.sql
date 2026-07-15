-- Migration adding columns to establishments table for menu media (PDF or Photos).
ALTER TABLE public.establishments
ADD COLUMN menu_pdf_url TEXT,
ADD COLUMN menu_photo_urls TEXT[] NOT NULL DEFAULT '{}';
