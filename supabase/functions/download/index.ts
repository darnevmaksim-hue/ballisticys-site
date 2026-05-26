import "@supabase/functions-js/edge-runtime.d.ts";

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

function getUserFromJWT(authHeader: string | null): { id: string; email?: string } | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const payload = JSON.parse(atob(authHeader.slice(7).split(".")[1]));
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const modName = url.searchParams.get("mod");
  const mcVersion = url.searchParams.get("mc");

  if (!modName || !mcVersion) {
    return new Response(JSON.stringify({ error: "Missing mod or mc param" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const key = `${modName}|${mcVersion}`;
  let fileName = FILE_MAP[key] || FALLBACK[`${modName}|any`];
  if (!fileName) {
    return new Response(JSON.stringify({ error: "Unknown mod/version" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = getUserFromJWT(req.headers.get("Authorization"));
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check permissions via Supabase Admin API
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Check if user is admin/vip
  const profileResp = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const profiles = await profileResp.json();
  const role = profiles?.[0]?.role;

  if (role === "admin" || role === "vip") {
    // Authorized — proxy file
    return proxyFile(fileName);
  }

  // Check for approved download request
  const reqResp = await fetch(
    `${supabaseUrl}/rest/v1/download_requests?user_id=eq.${user.id}&mod_name=eq.${encodeURIComponent(modName)}&mc_version=eq.${mcVersion}&status=eq.approved&select=id&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const requests = await reqResp.json();

  if (Array.isArray(requests) && requests.length > 0) {
    return proxyFile(fileName);
  }

  return new Response(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
});

async function proxyFile(fileName: string): Promise<Response> {
  const fileUrl = `${GITHUB_RAW}/${encodeURIComponent(fileName)}`;
  const resp = await fetch(fileUrl);

  if (!resp.ok) {
    return new Response(JSON.stringify({ error: "File not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const blob = await resp.blob();

  return new Response(blob, {
    status: 200,
    headers: {
      "Content-Type": resp.headers.get("Content-Type") || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": blob.size.toString(),
      "Cache-Control": "no-cache",
    },
  });
}
