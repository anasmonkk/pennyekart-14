// Transactional FCM push to Selling Partners for a newly created order.
// Separate from the admin campaign sender (send-push-notification).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const b64url = (buf: ArrayBuffer | string) => {
  const bytes = typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const sb = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    // Trusted caller: the signed-in customer who owns the order.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.order_id ?? "");
    if (!UUID.test(orderId)) return json({ error: "Invalid order_id" }, 400);

    const { data: order, error: oErr } = await sb.from("orders")
      .select("id, user_id, seller_id, items, created_at, seller_push_sent_at").eq("id", orderId).maybeSingle();
    if (oErr) throw oErr;
    if (!order || order.user_id !== userId) return json({ error: "Order not found" }, 404);
    if (order.seller_push_sent_at) return json({ skipped: "already_sent" });
    if (Date.now() - new Date(order.created_at).getTime() > 15 * 60 * 1000) return json({ skipped: "too_old" });

    // Claim once (prevents duplicate sends on retries).
    const { data: claimed } = await sb.from("orders").update({ seller_push_sent_at: new Date().toISOString() } as never)
      .eq("id", orderId).is("seller_push_sent_at", null).select("id");
    if (!claimed?.length) return json({ skipped: "already_sent" });

    // Sellers: same relationship as get_orders_for_seller (orders.seller_id OR item ids in seller_products).
    const sellerIds = new Set<string>();
    if (order.seller_id) sellerIds.add(order.seller_id);
    const itemIds = (Array.isArray(order.items) ? order.items : [])
      .map((it: any) => String(it?.id ?? "")).filter((id: string) => UUID.test(id));
    if (itemIds.length) {
      const { data: sps } = await sb.from("seller_products").select("seller_id").in("id", itemIds);
      for (const s of sps ?? []) if (s.seller_id) sellerIds.add(s.seller_id);
    }
    if (!sellerIds.size) return json({ sent: 0, sellers: 0 });

    const { data: profs } = await sb.from("profiles").select("user_id, fcm_token")
      .in("user_id", [...sellerIds]).eq("user_type", "selling_partner").not("fcm_token", "is", null).neq("fcm_token", "");
    const tokens = [...new Set((profs ?? []).map((p: any) => p.fcm_token as string))];
    if (!tokens.length) return json({ sent: 0, sellers: sellerIds.size });

    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");
    if (!projectId || !clientEmail || !privateKey) return json({ error: "Firebase secrets are not configured" }, 500);

    const accessToken = await getAccessToken(clientEmail, privateKey);
    const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    const shortRef = orderId.slice(0, 8).toUpperCase();
    const url = `/selling-partner/dashboard?tab=orders&order=${orderId}`;
    let sent = 0, failed = 0, cleared = 0;

    await Promise.all(tokens.map(async (token) => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ message: {
            token,
            notification: { title: "New Order Received", body: `You have received a new order (#${shortRef}). Tap to view the order.` },
            data: { type: "seller_order", order_id: orderId, orderId, url },
            android: { priority: "high", notification: { channel_id: "default_notification_channel" } },
          } }),
        });
        if (res.ok) { sent++; await res.body?.cancel(); return; }
        failed++;
        const errBody = await res.json().catch(() => ({}));
        const code = errBody?.error?.details?.find((d: any) => d.errorCode)?.errorCode ?? errBody?.error?.status;
        const permanent = res.status === 404 || code === "UNREGISTERED" ||
          (res.status === 400 && code === "INVALID_ARGUMENT" && /token/i.test(errBody?.error?.message ?? ""));
        if (permanent) {
          const { error } = await sb.from("profiles").update({ fcm_token: null } as never).eq("fcm_token", token);
          if (!error) cleared++;
        } else console.error(`Seller order push failed [${res.status}] ${code ?? ""}`);
      } catch (e) {
        failed++;
        console.error("Seller order push network error:", e instanceof Error ? e.message : e);
      }
    }));
    return json({ sent, failed, invalid_tokens_cleared: cleared, sellers: sellerIds.size });
  } catch (e) {
    console.error("send-seller-order-push error:", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
