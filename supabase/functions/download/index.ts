import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const GITHUB_RAW = "https://raw.githubusercontent.com/darnevmaksim-hue/ballisticys-site/mod-files/downloads";

const FILE_MAP: Record<string, string> = {
  "Ballistics Calculator (Fabric)|1.21.1": "ballistic-calculator-2.0.0-1.21.1-fabric.jar",
  "Ballistics Calculator (Fabric)|1.20.1": "bbb-fabric-port-2.0pre4-fabric-port.jar",
  "Ballistics Calculator (Forge)|1.21.1": "ballistic-calculator-2.0.0-1.21.1-forge.jar",
  "Ballistics Calculator (Forge)|1.20.1": "blur-mod-1.0.0-forge.jar",
  "Ballistics Calculator (NeoForge)|1.21.1": "ballistic-calculator-2.0.0-1.21.1-neoforge.jar",
  "Ballistics Calculator (NeoForge)|1.20.1": "ballistic-calculator-1.0.0-1.20.1-neoforge.jar",
};

const FALLBACK: Record<string, string> = {
  "Ballisticys Injector Toolkit|any": "ballisticys-injector-toolkit.zip",
};

async function getUserFromJWT(authHeader: string | null): Promise<{ id: string; email?: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const modName = url.searchParams.get("mod");
  const mcVersion = url.searchParams.get("mc");

  if (!modName || !mcVersion) {
    return jsonResponse({ error: "Missing mod or mc param" }, 400);
  }

  const key = `${modName}|${mcVersion}`;
  let fileName = FILE_MAP[key] || FALLBACK[`${modName}|any`];
  if (!fileName) {
    return jsonResponse({ error: "Unknown mod/version" }, 404);
  }

  const user = await getUserFromJWT(req.headers.get("Authorization"));
  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const profileResp = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const profiles = await profileResp.json();
  const role = profiles?.[0]?.role;

  if (role === "admin" || role === "vip") {
    return proxyFile(fileName);
  }

  const reqResp = await fetch(
    `${supabaseUrl}/rest/v1/download_requests?user_id=eq.${user.id}&mod_name=eq.${encodeURIComponent(modName)}&mc_version=eq.${encodeURIComponent(mcVersion)}&status=eq.approved&select=id&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const requests = await reqResp.json();

  if (Array.isArray(requests) && requests.length > 0) {
    return proxyFile(fileName);
  }

  return jsonResponse({ error: "Forbidden" }, 403);
});

async function proxyFile(fileName: string): Promise<Response> {
  const fileUrl = `${GITHUB_RAW}/${encodeURIComponent(fileName)}`;
  const resp = await fetch(fileUrl);

  if (!resp.ok) {
    return new Response(JSON.stringify({ error: "File not found" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const blob = await resp.blob();

  return new Response(blob, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": resp.headers.get("Content-Type") || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": blob.size.toString(),
      "Cache-Control": "no-cache",
    },
  });
}
