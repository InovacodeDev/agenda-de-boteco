#!/bin/bash

supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > src/types/supabase.ts
