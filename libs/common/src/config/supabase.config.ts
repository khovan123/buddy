export function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseRoleKey) {
    throw Error('Need supabase config');
  }
  return {
    supabaseUrl,
    supabaseRoleKey,
  };
}
