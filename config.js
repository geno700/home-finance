// App settings. Leave the two Supabase values empty to run in demo mode
// (sample data, saved only in this browser). See README.md for setup.
export const config = {
  // Shared with the residential building app; this app's tables live in their own "finance" schema.
  supabaseUrl: 'https://gzvknfvqyqfynainxgur.supabase.co',
  // Publishable (anon) key: safe to be public. Never put the service_role / secret key here.
  supabaseAnonKey: 'sb_publishable_M7QzNvmL2Tto6-QnkTr0rQ_-Y0ueJok',
  // Database schema that holds this app's tables (see supabase/schema.sql).
  dbSchema: 'finance',
  // Public address of the app, used in invite links. Leave empty to use the current address.
  appUrl: '',
};
