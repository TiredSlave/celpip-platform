import {
  authCallbackDynamic,
  authCallbackRuntime,
  handleSupabaseAuthCallback,
} from "../../../lib/supabase-auth-callback";

export const dynamic = authCallbackDynamic;
export const runtime = authCallbackRuntime;

export async function GET(request: Request) {
  return handleSupabaseAuthCallback(request);
}
