import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  const supabase = createClient(supabaseUrl, serviceKey);

  // Проверяем JWT вызывающего
  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
  });
  if (!userResp.ok) {
    return jsonResponse({ error: "Invalid token" }, 401);
  }
  const caller = await userResp.json();

  // Проверяем роль — только admin
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();
  if (callerProfile?.role !== "admin") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const { user_id } = await req.json();
  if (!user_id) {
    return jsonResponse({ error: "Missing user_id" }, 400);
  }

  // Обнуляем ссылки без on delete cascade
  await Promise.all([
    supabase.from("promo_codes").update({ used_by: null }).eq("used_by", user_id),
    supabase.from("promo_codes").update({ created_by: null }).eq("created_by", user_id),
    supabase.from("access_keys").update({ used_by: null }).eq("used_by", user_id),
    supabase.from("access_keys").update({ created_by: null }).eq("created_by", user_id),
    supabase.from("mod_access").delete().eq("user_id", user_id),
    supabase.from("download_requests").update({ reviewed_by: null }).eq("reviewed_by", user_id),
  ]);

  // Удаляем профиль (каскадно — vip_subscriptions, user_activity, download_requests)
  const { error: delProfileErr, count } = await supabase
    .from("profiles")
    .delete({ count: "exact" })
    .eq("id", user_id);
  if (delProfileErr) {
    return jsonResponse({ error: "Failed to delete profile: " + delProfileErr.message }, 500);
  }
  if (count === 0) {
    return jsonResponse({ error: "Profile not found" }, 404);
  }

  // Удаляем пользователя из auth через Admin API
  const deleteResp = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${user_id}`,
    { method: "DELETE", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  if (!deleteResp.ok) {
    const err = await deleteResp.text();
    return jsonResponse({ error: "Failed to delete user: " + err }, 500);
  }

  return jsonResponse({ success: true }, 200);
});
