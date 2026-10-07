// Sends a new utility-service request alert only to its service provider.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const b64url = (buf: ArrayBuffer | string) => {
  const bytes = typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  let value = "";
  bytes.forEach((byte) => (value += String.fromCharCode(byte)));
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function getAccessToken(clientEmail: string, privateKeyRaw: string): Promise<string> {
  const pem = privateKeyRaw.replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const der = Uint8Array.from(atob(pem), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }))}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64url(signature)}`,
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Google token error [${response.status}]: ${body.error_description ?? body.error}`);
  return body.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: "Server configuration is incomplete" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await userClient.auth.getClaims(authHeader.slice("Bearer ".length));
    const userId = claims?.claims?.sub;
    if (typeof userId !== "string") return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const requestId = String(body.request_id ?? "");
    if (!UUID.test(requestId)) return json({ error: "Invalid request_id" }, 400);

    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: request, error: requestError } = await sb.from("utility_service_requests")
      .select("id, service_id, customer_user_id, status, created_at, utility_push_sent_at")
      .eq("id", requestId)
      .maybeSingle();
    if (requestError) throw requestError;
    if (!request || request.customer_user_id !== userId) return json({ error: "Request not found" }, 404);
    if (request.status !== "pending") return json({ sent: false, reason: "not_pending" });
    if (request.utility_push_sent_at) return json({ sent: false, reason: "already_sent" });
    if (Date.now() - new Date(request.created_at).getTime() > 15 * 60 * 1000) {
      return json({ sent: false, reason: "too_old" });
    }

    const { data: claimed } = await sb.from("utility_service_requests")
      .update({ utility_push_sent_at: new Date().toISOString() })
      .eq("id", requestId)
      .is("utility_push_sent_at", null)
      .select("id");
    if (!claimed?.length) return json({ sent: false, reason: "already_sent" });

    const { data: service, error: serviceError } = await sb.from("utility_services")
      .select("provider_user_id, name")
      .eq("id", request.service_id)
      .maybeSingle();
    if (serviceError) throw serviceError;
    if (!service?.provider_user_id) return json({ sent: false, reason: "no_provider" });

    const { data: provider, error: providerError } = await sb.from("profiles")
      .select("fcm_token")
      .eq("user_id", service.provider_user_id)
      .eq("user_type", "selling_partner")
      .eq("seller_type", "utility")
      .maybeSingle();
    if (providerError) throw providerError;
    const token = provider?.fcm_token;
    if (!token) return json({ sent: false, reason: "no_token" });

    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");
    if (!projectId || !clientEmail || !privateKey) return json({ error: "Firebase secrets are not configured" }, 500);

    const accessToken = await getAccessToken(clientEmail, privateKey);
    const url = `/utility-partner/dashboard?tab=requests&request=${requestId}`;
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: {
        token,
        notification: {
          title: "New Service Request",
          body: `A customer requested ${service.name}. Tap to view the request.`,
        },
        data: { type: "utility_request", request_id: requestId, url },
        android: { priority: "high", notification: { channel_id: "default_notification_channel" } },
      } }),
    });

    if (response.ok) {
      await response.body?.cancel();
      return json({ sent: true });
    }
    const errorBody = await response.json().catch(() => ({}));
    const code = errorBody?.error?.details?.find((detail: { errorCode?: string }) => detail.errorCode)?.errorCode
      ?? errorBody?.error?.status;
    const permanent = response.status === 404 || code === "UNREGISTERED"
      || (response.status === 400 && code === "INVALID_ARGUMENT" && /token/i.test(errorBody?.error?.message ?? ""));
    if (permanent) {
      await sb.from("profiles").update({ fcm_token: null }).eq("user_id", service.provider_user_id);
      return json({ sent: false, reason: "invalid_token_cleared" });
    }
    console.error(`Utility request push failed [${response.status}] ${code ?? ""}`);
    return json({ sent: false, reason: "fcm_error", status: response.status, details: errorBody });
  } catch (error) {
    console.error("send-utility-request-push error:", error instanceof Error ? error.message : error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});