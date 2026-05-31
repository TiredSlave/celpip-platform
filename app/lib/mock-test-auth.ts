import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type AuthedSupabase = {
  user: User;
  supabase: SupabaseClient;
};

export async function getAuthedClient(request: Request): Promise<AuthedSupabase | null> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { user, supabase };
}

export async function requireAdmin(request: Request): Promise<AuthedSupabase | { error: Response }> {
  const authed = await getAuthedClient(request);
  if (!authed) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await authed.supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", authed.user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return authed;
}
