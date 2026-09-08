type SupabaseServerEnvironment = Record<string, string | undefined> & {
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export function getSupabaseServerKey(environment: SupabaseServerEnvironment = process.env) {
  return environment.SUPABASE_SECRET_KEY || environment.SUPABASE_SERVICE_ROLE_KEY;
}

export function supabaseApiHeaders(apiKey: string, options: { accessToken?: string; contentType?: string } = {}) {
  const headers: Record<string, string> = { apikey: apiKey };
  const bearer = options.accessToken || (apiKey.startsWith("sb_secret_") ? "" : apiKey);
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (options.contentType) headers["Content-Type"] = options.contentType;
  return headers;
}
