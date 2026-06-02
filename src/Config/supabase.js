import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://xsgmppaxpmfbvtyryirn.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZ21wcGF4cG1mYnZ0eXJ5aXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzIwNTMsImV4cCI6MjA5MDEwODA1M30.DwKo78kxJjZ8z0aGhEIrEqWlV9G4EPp62YGWpB1TggU"

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lockSessionAcrossTabs: false,
    flowType: "pkce",
  },
});