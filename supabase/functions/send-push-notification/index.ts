// Independent FCM push sender. Does not touch the internal notifications system.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function normalizeMobile(raw: string): string {
  let s = String(raw || "").replace(/\D/g, "");
  if (s.startsWith("91") && s.length > 10) s = s.slice(2);
  s = s.replace(/^0+/, "");
  if (s.length > 10) s = s.slice(-10);
  return s;
}

async function isElifeAgent(mobile: string): Promise<boolean> {
  if (mobile.length !== 10) return false;
  const url = Deno.env.get("ELIFE_SUPABASE_URL");
  const key = Deno.env.get("ELIFE_SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return false;
  const elife = createClient(url, key);
  const variants = [mobile, `91${mobile}`, `0${mobile}`];
  const probes = [
    { table: "pennyekart_agents", cols: ["mobile"] },
    { table: "members", cols: ["mobile", "mobile_number", "phone", "whatsapp_number"] },
  ];
  for (const p of probes) for (const col of p.cols) for (const v of variants) {
    const { data, error } = await elife.from(p.table).select("id").eq(col, v).limit(1);
    if (error) break;
    if (data?.length) return true;
  }
  return false;
}

const b64url = (buf: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf as ArrayBuffer);
  let s = ""; bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function getAccessToken(clientEmail: string, privateKeyRaw: string): Promise<string> {
  const pem = privateKeyRaw.replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({
    iss: clientEmail, scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }))}`;
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${b64url(sig)}` }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Google token error [${res.status}]: ${body.error_description ?? body.error}`);
  return body.access_token;
}

const isValidLink = (u: string) => u === "" || (u.startsWith("/") && !u.startsWith("//")) || /^https:\/\/[^\s]+$/.test(u);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const sb = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    // Auth + admin check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return json({ error: "Unauthorized" }, 401);
    const [{ data: isSuper }, { data: hasPerm }] = await Promise.all([
      userClient.rpc("is_super_admin"),
      userClient.rpc("has_permission", { _permission_name: "read_settings" }),
    ]);
    if (!isSuper && !hasPerm) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const title = String(body.title ?? "").trim();
    const message = String(body.message ?? "").trim();
    const imageUrl = String(body.image_url ?? "").trim();
    const linkUrl = String(body.link_url ?? "").trim();
    const audience = String(body.target_audience ?? "all");
    const localBodyIds: string[] = Array.isArray(body.target_local_body_ids) ? body.target_local_body_ids.map(String) : [];
    if (!["preview", "send"].includes(action)) return json({ error: "Invalid action" }, 400);
    if (!["all", "agents", "panchayath"].includes(audience)) return json({ error: "Invalid audience" }, 400);
    if (audience === "panchayath" && !localBodyIds.length) return json({ error: "Select at least one panchayath" }, 400);

    // Recipients
    let q = sb.from("profiles").select("user_id, fcm_token, mobile_number").not("fcm_token", "is", null).neq("fcm_token", "");
    if (audience === "panchayath") q = q.in("local_body_id", localBodyIds);
    const { data: rows, error: rowsErr } = await q.limit(10000);
    if (rowsErr) throw rowsErr;
    let recipients = rows ?? [];
    if (audience === "agents") {
      const checks = await Promise.all(recipients.map((r) => isElifeAgent(normalizeMobile(r.mobile_number ?? ""))));
      recipients = recipients.filter((_, i) => checks[i]);
    }
    const byToken = new Map<string, string>();
    for (const r of recipients) if (r.fcm_token && !byToken.has(r.fcm_token)) byToken.set(r.fcm_token, r.user_id);

    if (action === "preview") return json({ device_count: byToken.size });

    if (!title || title.length > 200) return json({ error: "Title is required (max 200 chars)" }, 400);
    if (!message || message.length > 1000) return json({ error: "Message is required (max 1000 chars)" }, 400);
    if (!isValidLink(linkUrl)) return json({ error: "Link must start with / or https://" }, 400);
    if (imageUrl && !/^https:\/\/\S+$/.test(imageUrl)) return json({ error: "Image URL must start with https://" }, 400);

    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");
    if (!projectId || !clientEmail || !privateKey) return json({ error: "Firebase secrets are not configured" }, 500);

    const { data: campaign, error: cErr } = await sb.from("push_campaigns").insert({
      title, message, image_url: imageUrl || null, link_url: linkUrl || null, target_audience: audience,
      target_local_body_ids: audience === "panchayath" ? localBodyIds : null, status: "sending", created_by: userId,
    }).select("id").single();
    if (cErr) throw cErr;

    let sent = 0, failed = 0, cleared = 0;
    try {
      const accessToken = await getAccessToken(clientEmail, privateKey);
      const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
      const tokens = [...byToken.keys()];
      for (let i = 0; i < tokens.length; i += 20) {
        await Promise.all(tokens.slice(i, i + 20).map(async (token) => {
          const msg: Record<string, unknown> = {
            token,
            notification: { title, body: message, ...(imageUrl ? { image: imageUrl } : {}) },
            data: { url: linkUrl, campaign_id: campaign.id },
            android: { priority: "high", notification: { channel_id: "default_notification_channel", ...(imageUrl ? { image: imageUrl } : {}) } },
          };
          try {
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ message: msg }),
            });
            if (res.ok) { sent++; await res.body?.cancel(); return; }
            failed++;
            const errBody = await res.json().catch(() => ({}));
            const code = errBody?.error?.details?.find((d: any) => d.errorCode)?.errorCode ?? errBody?.error?.status;
            const permanent = res.status === 404 || code === "UNREGISTERED" ||
              (res.status === 400 && (code === "INVALID_ARGUMENT") && /token/i.test(errBody?.error?.message ?? ""));
            if (permanent) {
              const { error } = await sb.from("profiles").update({ fcm_token: null } as never).eq("fcm_token", token);
              if (!error) cleared++;
            } else {
              console.error(`FCM send failed [${res.status}] ${code ?? ""}`);
            }
          } catch (e) {
            failed++;
            console.error("FCM network error:", e instanceof Error ? e.message : e);
          }
        }));
      }
      await sb.from("push_campaigns").update({
        sent_count: sent, failed_count: failed, invalid_tokens_cleared: cleared,
        status: sent > 0 || tokens.length === 0 ? "sent" : "failed", sent_at: new Date().toISOString(),
      }).eq("id", campaign.id);
    } catch (e) {
      await sb.from("push_campaigns").update({ status: "failed", sent_count: sent, failed_count: failed, invalid_tokens_cleared: cleared }).eq("id", campaign.id);
      throw e;
    }
    return json({ campaign_id: campaign.id, sent, failed, invalid_tokens_cleared: cleared, total: byToken.size });
  } catch (e) {
    console.error("send-push-notification error:", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
