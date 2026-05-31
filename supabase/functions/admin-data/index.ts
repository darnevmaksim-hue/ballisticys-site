import "@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function apiFetch(path: string, supabaseUrl: string, serviceKey: string, options?: RequestInit) {
  const resp = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    ...options,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API error ${resp.status}: ${text}`);
  }
  return resp.json();
}

function generateCode(length = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function verifyAdmin(token: string, supabaseUrl: string, serviceKey: string) {
  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
  });
  if (!userResp.ok) throw new Error("Invalid token");
  const caller = await userResp.json();
  const profiles = await apiFetch(`profiles?id=eq.${caller.id}&select=role`, supabaseUrl, serviceKey);
  if (!Array.isArray(profiles) || profiles[0]?.role !== "admin") throw new Error("Forbidden");
  return caller;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const caller = await verifyAdmin(token, supabaseUrl, serviceKey);
    const url = new URL(req.url);
    const type = url.searchParams.get("type");

    // GET — fetch data
    if (req.method === "GET") {
      let data: unknown;
      switch (type) {
        case "promo":
          data = await apiFetch("promo_codes?order=created_at.desc", supabaseUrl, serviceKey);
          break;
        case "users":
          data = await apiFetch("profiles?order=created_at.desc&limit=50", supabaseUrl, serviceKey);
          break;
        case "vip": {
          const profiles = await apiFetch(
            "profiles?select=id%2Cemail%2Crole&or=(role.eq.admin%2Crole.eq.vip)&limit=50",
            supabaseUrl,
            serviceKey
          );
          const subs = await apiFetch("vip_subscriptions?is_active=eq.true&select=*", supabaseUrl, serviceKey);
          data = { profiles, subs };
          break;
        }
        case "requests":
          data = await apiFetch("download_requests?order=created_at.desc&limit=50", supabaseUrl, serviceKey);
          break;
        default:
          return jsonResponse({ error: `Unknown type: ${type}` }, 400);
      }
      return jsonResponse({ data }, 200);
    }

    // POST — mutations
    if (req.method === "POST") {
      const body = await req.json();

      switch (type) {
        case "create_promo": {
          const code = body.code || generateCode(12);
          await apiFetch("promo_codes", supabaseUrl, serviceKey, {
            method: "POST",
            body: JSON.stringify({
              code,
              duration_hours: body.duration_hours ?? 0,
              created_by: caller.id,
            }),
          });
          return jsonResponse({ success: true, code }, 200);
        }

        case "change_role": {
          const { user_id, role, dur_hours } = body;
          await apiFetch(`profiles?id=eq.${user_id}`, supabaseUrl, serviceKey, {
            method: "PATCH",
            body: JSON.stringify({ role }),
          });
          if (role === "vip") {
            const hours = parseInt(dur_hours) || 720;
            const endTime = hours > 0
              ? new Date(Date.now() + hours * 3600000).toISOString()
              : "2999-12-31T23:59:59Z";
            await apiFetch("vip_subscriptions", supabaseUrl, serviceKey, {
              method: "POST",
              body: JSON.stringify({
                user_id,
                start_time: new Date().toISOString(),
                end_time: endTime,
                is_active: true,
              }),
            });
          } else {
            await apiFetch(
              `vip_subscriptions?user_id=eq.${user_id}&is_active=eq.true`,
              supabaseUrl,
              serviceKey,
              { method: "PATCH", body: JSON.stringify({ is_active: false }) }
            );
          }
          return jsonResponse({ success: true }, 200);
        }

        case "approve_request": {
          const { req_id, dur_hours } = body;
          const hours = dur_hours || 24;
          const code = generateCode(12);
          await apiFetch("promo_codes", supabaseUrl, serviceKey, {
            method: "POST",
            body: JSON.stringify({ code, duration_hours: hours, created_by: caller.id }),
          });
          await apiFetch(`download_requests?id=eq.${req_id}`, supabaseUrl, serviceKey, {
            method: "PATCH",
            body: JSON.stringify({
              status: "approved",
              reviewed_by: caller.id,
              reviewed_at: new Date().toISOString(),
              approved_promo_code: code,
              approved_promo_duration: hours,
            }),
          });
          return jsonResponse({ success: true, code, hours }, 200);
        }

        case "deny_request": {
          const { req_id } = body;
          await apiFetch(`download_requests?id=eq.${req_id}`, supabaseUrl, serviceKey, {
            method: "PATCH",
            body: JSON.stringify({
              status: "denied",
              reviewed_by: caller.id,
              reviewed_at: new Date().toISOString(),
            }),
          });
          return jsonResponse({ success: true }, 200);
        }

        default:
          return jsonResponse({ error: `Unknown action: ${type}` }, 400);
      }
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
