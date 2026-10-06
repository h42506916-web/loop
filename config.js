/* Loop - Supabase connection settings.
   Only ever put the PUBLISHABLE (or legacy anon) key here: it is safe to ship because
   Row Level Security (supabase/001_init.sql) decides what visitors can read or change.
   Never put the service_role / secret key in this file. */
window.LOOP_CONFIG = {
  SUPABASE_URL: 'https://jtpkbjutlxroyyuancra.supabase.co',
  SUPABASE_KEY: 'sb_publishable_mqC5Br74DXdoMDzOvKpRxQ_A-Jdc9DH'
};
