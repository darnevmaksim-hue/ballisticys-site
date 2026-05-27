import "@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
  });
  if (!userResp.ok) {
    return jsonResponse({ error: "Invalid token" }, 401);
  }
  const caller = await userResp.json();

  const profileResp = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${caller.id}&select=role`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const profiles = await profileResp.json();
  if (profiles?.[0]?.role !== "admin") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const { user_id } = await req.json();
  if (!user_id) {
    return jsonResponse({ error: "Missing user_id" }, 400);
  }

  const apiHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  // Обнуляем ссылки без on delete cascade
  const nullifyRefs = [
    fetch(`${supabaseUrl}/rest/v1/promo_codes?used_by=eq.${user_id}`, {
      method: "PATCH", headers: { ...apiHeaders, "Content-Type": "application/json" },
      body: '{"used_by":null}',
    }),
    fetch(`${supabaseUrl}/rest/v1/promo_codes?created_by=eq.${user_id}`, {
      method: "PATCH", headers: { ...apiHeaders, "Content-Type": "application/json" },
      body: '{"created_by":null}',
    }),
    fetch(`${supabaseUrl}/rest/v1/download_requests?reviewed_by=eq.${user_id}`, {
      method: "PATCH", headers: { ...apiHeaders, "Content-Type": "application/json" },
      body: '{"reviewed_by":null}',
    }),
  ];
  await Promise.all(nullifyRefs);

  // Удаляем профиль (каскадно удалит vip_subscriptions, user_activity, download_requests)
  const profileResp = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${user_id}`,
    { method: "DELETE", headers: apiHeaders }
  );
  if (!profileResp.ok) {
    const err = await profileResp.text();
    return jsonResponse({ error: "Failed to delete profile: " + err }, 500);
  }

  // Удаляем пользователя из auth
  const deleteResp = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${user_id}`,
    {
      method: "DELETE",
      headers: apiHeaders,
    }
  );

  if (!deleteResp.ok) {
    const err = await deleteResp.text();
    return jsonResponse({ error: "Failed to delete user: " + err }, 500);
  }

  return jsonResponse({ success: true }, 200);
});
