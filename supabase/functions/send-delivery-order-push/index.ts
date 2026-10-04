// FCM push to the assigned Delivery Staff member for a newly created order.
// Independent of send-seller-order-push and send-push-notification.
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

    // Trusted callers: the database trigger (internal secret) or the signed-in customer/seller.
    let internal = false;
    const internalHeader = req.headers.get("x-internal-secret");
    if (internalHeader) {
      const { data: secret } = await sb.rpc("get_delivery_push_secret" as never);
      internal = !!secret && secret === internalHeader;
      if (!internal) return json({ error: "Unauthorized" }, 401);
    }
    let userId: string | undefined;
    if (!internal) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
      const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      userId = claims?.claims?.sub as string | undefined;
      if (!userId) return json({ error: "Unauthorized" }, 401);
    }
    console.log("delivery push request", { internal });

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.order_id ?? "");
    if (!UUID.test(orderId)) return json({ error: "Invalid order_id" }, 400);

    const { data: order, error: oErr } = await sb.from("orders")
      .select("id, user_id, seller_id, status, is_self_delivery, assigned_delivery_staff_id, created_at, delivery_push_sent_at").eq("id", orderId).maybeSingle();
    if (oErr) throw oErr;
    if (!order) return json({ error: "Order not found" }, 404);
    // Seller-product orders: delivery staff are notified only after the seller accepts.
    const isSellerOrder = !!order.seller_id;
    if (isSellerOrder) {
      if (!internal && order.seller_id !== userId) return json({ error: "Order not found" }, 404);
      if (order.status !== "seller_accepted") return json({ sent: false, reason: "waiting_for_seller" });
      if (order.is_self_delivery) return json({ sent: false, reason: "self_delivery" });
    } else {
      if (!internal && order.user_id !== userId) return json({ error: "Order not found" }, 404);
      if (Date.now() - new Date(order.created_at).getTime() > 15 * 60 * 1000) return json({ sent: false, reason: "too_old" });
    }
    if (order.delivery_push_sent_at) return json({ sent: false, reason: "already_sent" });

    if (!order.assigned_delivery_staff_id) { console.log("delivery push: no staff assigned"); return json({ sent: false, reason: "no_staff_assigned" }); }

    const { data: claimed } = await sb.from("orders").update({ delivery_push_sent_at: new Date().toISOString() } as never)
      .eq("id", orderId).is("delivery_push_sent_at", null).select("id");
    if (!claimed?.length) return json({ sent: false, reason: "already_sent" });

    const { data: prof } = await sb.from("profiles").select("fcm_token")
      .eq("user_id", order.assigned_delivery_staff_id).eq("user_type", "delivery_staff").maybeSingle();
    const token = (prof as any)?.fcm_token as string | undefined;
    if (!token) { console.log("delivery push: staff has no token"); return json({ sent: false, reason: "no_token" }); }

    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");
    if (!projectId || !clientEmail || !privateKey) return json({ error: "Firebase secrets are not configured" }, 500);

    const accessToken = await getAccessToken(clientEmail, privateKey);
    const url = `/delivery-staff/dashboard?order=${orderId}`;
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: {
        token,
        notification: { title: "New Delivery Order", body: "You have a new order assigned for delivery." },
        data: { type: "delivery_order", order_id: orderId, url },
        android: { priority: "high", notification: { channel_id: "default_notification_channel" } },
      } }),
    });
    if (res.ok) { await res.body?.cancel(); return json({ sent: true, reason: "ok" }); }
    const errBody = await res.json().catch(() => ({}));
    const code = errBody?.error?.details?.find((d: any) => d.errorCode)?.errorCode ?? errBody?.error?.status;
    const permanent = res.status === 404 || code === "UNREGISTERED" ||
      (res.status === 400 && code === "INVALID_ARGUMENT" && /token/i.test(errBody?.error?.message ?? ""));
    if (permanent) {
      await sb.from("profiles").update({ fcm_token: null } as never).eq("user_id", order.assigned_delivery_staff_id);
      return json({ sent: false, reason: "invalid_token_cleared" });
    }
    console.error(`Delivery order push failed [${res.status}] ${code ?? ""}`);
    return json({ sent: false, reason: "fcm_error" });
  } catch (e) {
    console.error("send-delivery-order-push error:", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
