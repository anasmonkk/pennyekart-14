import { adminClient, corsHeaders, getUserId, json } from "../_shared/auth.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const staffUserId = await getUserId(req);
  if (!staffUserId) return json({ error: "Please sign in again." }, 401);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "Invalid request." }, 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const action = body.action;
  const admin = adminClient();
  if (action === "contacts") {
    const ids = body.order_ids;
    if (!Array.isArray(ids) || ids.length > 100 || !ids.every((id) => typeof id === "string" && UUID.test(id))) {
      return json({ error: "Invalid orders." }, 400);
    }
    if (!ids.length) return json({ contacts: {} });
    const { data: assigned, error: assignedError } = await admin.from("orders")
      .select("id, user_id").in("id", ids).eq("assigned_delivery_staff_id", staffUserId);
    if (assignedError) return json({ error: "Could not load order contacts." }, 500);
    const userIds = [...new Set((assigned ?? []).flatMap((o) => o.user_id ? [o.user_id] : []))];
    if (!userIds.length) return json({ contacts: {} });
    const { data: profiles, error: contactsError } = await admin.from("profiles")
      .select("user_id, full_name, mobile_number").in("user_id", userIds);
    if (contactsError) return json({ error: "Could not load customer contacts." }, 500);
    const contacts: Record<string, unknown> = {};
    for (const order of assigned ?? []) {
      const profile = profiles?.find((p) => p.user_id === order.user_id);
      if (profile) contacts[order.id] = { name: profile.full_name, phone: profile.mobile_number };
    }
    return json({ contacts });
  }
  const orderId = typeof body.order_id === "string" ? body.order_id : "";
  if (!UUID.test(orderId) || (action !== "get" && action !== "save")) {
    return json({ error: "Invalid order or action." }, 400);
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, user_id, assigned_delivery_staff_id, shipping_address")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) {
    console.error("delivery-order-location order lookup failed:", orderError.message);
    return json({ error: "Could not check this delivery order." }, 500);
  }
  if (!order || order.assigned_delivery_staff_id !== staffUserId || !order.user_id) {
    return json({ error: "This order is not assigned to you." }, 403);
  }

  if (action === "get") {
    const { data: addresses, error: addressError } = await admin
      .from("customer_addresses")
      .select("latitude, longitude")
      .eq("user_id", order.user_id)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);
    if (addressError) {
      console.error("delivery-order-location address lookup failed:", addressError.message);
      return json({ error: "Could not load the customer's saved location." }, 500);
    }
    const savedAddress = addresses?.[0];
    if (savedAddress?.latitude != null && savedAddress?.longitude != null) {
      return json({ location: { lat: savedAddress.latitude, lng: savedAddress.longitude }, source: "address" });
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("latitude, longitude")
      .eq("user_id", order.user_id)
      .maybeSingle();
    if (profileError) {
      console.error("delivery-order-location profile lookup failed:", profileError.message);
      return json({ error: "Could not load the customer's saved location." }, 500);
    }
    if (profile?.latitude != null && profile?.longitude != null) {
      return json({ location: { lat: profile.latitude, lng: profile.longitude }, source: "profile" });
    }
    return json({ location: null });
  }

  const latitude = body.latitude;
  const longitude = body.longitude;
  if (typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return json({ error: "The captured map coordinates are invalid." }, 400);
  }

  const addressLine = typeof order.shipping_address === "string" ? order.shipping_address.trim().slice(0, 500) : "";
  if (!addressLine) return json({ error: "This order has no delivery address to save with the map pin." }, 400);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("full_name, mobile_number")
    .eq("user_id", order.user_id)
    .maybeSingle();
  if (profileError) {
    console.error("delivery-order-location customer lookup failed:", profileError.message);
    return json({ error: "Could not load customer details." }, 500);
  }
  const phone = String(profile?.mobile_number ?? "").replace(/\D/g, "").slice(-10);
  if (phone.length !== 10) return json({ error: "The customer's profile has no valid phone number, so this pin cannot be saved." }, 400);

  const { data: duplicate, error: duplicateError } = await admin
    .from("customer_addresses")
    .select("id")
    .eq("user_id", order.user_id)
    .eq("latitude", latitude)
    .eq("longitude", longitude)
    .limit(1)
    .maybeSingle();
  if (duplicateError) {
    console.error("delivery-order-location duplicate check failed:", duplicateError.message);
    return json({ error: "Could not check existing saved locations." }, 500);
  }
  if (duplicate) return json({ ok: true, already_saved: true });

  const { error: insertError } = await admin.from("customer_addresses").insert({
    user_id: order.user_id,
    label: "Delivery location",
    contact_name: String(profile?.full_name ?? "Customer").trim().slice(0, 100) || "Customer",
    contact_phone: phone,
    address_line1: addressLine,
    state: "Kerala",
    latitude,
    longitude,
    is_default: false,
  });
  if (insertError) {
    console.error("delivery-order-location address save failed:", insertError.message);
    return json({ error: "Could not save the pin to the customer's address book." }, 500);
  }

  return json({ ok: true });
});