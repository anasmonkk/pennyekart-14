import { adminClient, corsHeaders, getUserId, json } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const callerId = await getUserId(req);
    if (!callerId) return json({ error: "Not signed in" }, 401);
    const admin = adminClient();

    const { data: caller } = await admin.from("profiles").select("is_super_admin").eq("user_id", callerId).maybeSingle();
    if (!caller?.is_super_admin) return json({ error: "Only super admins can add admins" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim().slice(0, 100);
    const roleId = body.role_id ? String(body.role_id) : null;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return json({ error: "Enter a valid email" }, 400);
    if (password.length < 8 || password.length > 72) return json({ error: "Password must be 8–72 characters" }, 400);
    if (!fullName) return json({ error: "Name is required" }, 400);
    if (!roleId) return json({ error: "Select a role" }, 400);

    const { data: role } = await admin.from("roles").select("id").eq("id", roleId).maybeSingle();
    if (!role) return json({ error: "Role not found" }, 400);

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, user_type: "customer" },
    });
    if (error || !created.user) return json({ error: error?.message ?? "Could not create user" }, 400);

    const uid = created.user.id;
    // Profile row is created by trigger; make sure it exists then set role
    const { data: existing } = await admin.from("profiles").select("id").eq("user_id", uid).maybeSingle();
    const fields = { full_name: fullName, email, role_id: roleId, is_approved: true, is_blocked: false };
    const res = existing
      ? await admin.from("profiles").update(fields).eq("user_id", uid)
      : await admin.from("profiles").insert({ user_id: uid, user_type: "customer", ...fields });
    if (res.error) {
      await admin.auth.admin.deleteUser(uid);
      return json({ error: res.error.message }, 400);
    }
    return json({ ok: true, user_id: uid });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
