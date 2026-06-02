import { handleSupabaseAuthCallback } from "../../../lib/supabase-auth-callback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleSupabaseAuthCallback(request);
}
