import AccountSettingsSection from "@/components/AccountSettingsSection";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Truck, Wallet, Package, User, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import DeliveryOrders from "@/components/delivery/DeliveryOrders";
import DeliveryWallet from "@/components/delivery/DeliveryWallet";
import DeliveryStock from "@/components/delivery/DeliveryStock";
import NotificationToggle from "@/components/NotificationToggle";
import NewOrderNotification from "@/components/NewOrderNotification";

interface Order {
  id: string;
  status: string;
  total: number;
  shipping_address: string | null;
  created_at: string;
  items: any;
  user_id: string | null;
}

const DeliveryStaffDashboard = () => {
  const focusOrderId = new URLSearchParams(window.location.search).get("order");
  const { user, profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState(focusOrderId ? "orders" : "home");
  const [orders, setOrders] = useState<Order[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [earningBalance, setEarningBalance] = useState<number>(0);
  const [deliveryType, setDeliveryType] = useState<"fixed" | "part_time">("fixed");
  const [assignedWards, setAssignedWards] = useState<{ local_body_name: string; ward_number: number; local_body_id?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [localBodies, setLocalBodies] = useState<{ id: string; name: string; ward_count: number }[]>([]);
  const [profileForm, setProfileForm] = useState({ full_name: "", mobile_number: "", local_body_id: "", ward_number: "" });
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    supabase.from("locations_local_bodies").select("id, name, ward_count").eq("is_active", true).order("name")
      .then(({ data }) => setLocalBodies((data as { id: string; name: string; ward_count: number }[]) ?? []));
  }, []);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name ?? "",
        mobile_number: (profile as any).mobile_number ?? "",
        local_body_id: (profile as any).local_body_id ?? "",
        ward_number: (profile as any).ward_number ? String((profile as any).ward_number) : "",
      });
    }
  }, [profile]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profileForm.full_name.trim() || null,
      mobile_number: profileForm.mobile_number.trim() || null,
      local_body_id: profileForm.local_body_id || null,
      ward_number: profileForm.ward_number ? Number(profileForm.ward_number) : null,
    }).eq("user_id", user.id);
    setProfileSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated successfully!" });
  };

  useEffect(() => {
    if (!focusOrderId || loading) return;
    const t = setTimeout(() => {
      const el = Array.from(document.querySelectorAll(`[id="order-${focusOrderId}"]`)).find((e) => (e as HTMLElement).offsetParent) as HTMLElement | undefined;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 4000);
    }, 300);
    return () => clearTimeout(t);
  }, [focusOrderId, loading, orders]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [ordersRes, walletRes, wardsRes, lbRes, profileRes] = await Promise.all([
      supabase.from("orders").select("*").eq("assigned_delivery_staff_id", user.id).order("created_at", { ascending: false }),
      supabase.from("delivery_staff_wallets").select("*").eq("staff_user_id", user.id).maybeSingle(),
      supabase.from("delivery_staff_ward_assignments").select("*").eq("staff_user_id", user.id),
      supabase.from("locations_local_bodies").select("id, name"),
      supabase.from("profiles").select("delivery_type").eq("user_id", user.id).maybeSingle(),
    ]);

    setOrders((ordersRes.data as Order[]) ?? []);
    setWalletBalance(walletRes.data?.balance ?? 0);
    setEarningBalance((walletRes.data as any)?.earning_balance ?? 0);

    // Determine delivery type from profile
    const dtype = (profileRes.data as any)?.delivery_type ?? "fixed";
    setDeliveryType(dtype === "part_time" ? "part_time" : "fixed");

    const lbs = lbRes.data ?? [];
    setAssignedWards((wardsRes.data ?? []).map((w: any) => {
      const lb = lbs.find((l) => l.id === w.local_body_id);
      return { local_body_name: lb?.name ?? "", ward_number: w.ward_number, local_body_id: w.local_body_id };
    }));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const pendingCount = orders.filter((o) => !["delivered", "cancelled", "return_requested", "return_accepted", "return_collected", "return_confirmed"].includes(o.status)).length;

  // Simple launcher cards shown on the home screen
  const homeCards = [
    { tab: "orders", label: "Orders", icon: Truck, sub: `${pendingCount} pending` },
    { tab: "wallet", label: "Wallet", icon: Wallet, sub: `₹${walletBalance}` },
    { tab: "stock", label: "Stock", icon: Package, sub: assignedWards.length ? `${assignedWards.length} ward${assignedWards.length === 1 ? "" : "s"} assigned` : "Assigned stock" },
    { tab: "profile", label: "Profile", icon: User, sub: profile?.full_name || "Your details" },
  ];

  return (
    <div className="delivery-blue min-h-screen bg-background">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Pennyekart" className="h-8" />
          <div>
            <span className="font-semibold text-foreground">Delivery Partner</span>
            {deliveryType === "part_time" && (
              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Part-time</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{profile?.full_name}</span>
          <Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4 space-y-6">
        <NotificationToggle />

        {/* Greeting */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground">
          <p className="text-sm opacity-90">Hi {profile?.full_name?.split(" ")[0] || "there"} 👋</p>
          <h2 className="text-xl font-bold">
            {pendingCount > 0 ? `${pendingCount} order${pendingCount > 1 ? "s" : ""} pending delivery` : "All deliveries are up to date"}
          </h2>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : user ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {activeTab === "home" ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {homeCards.map((c) => (
                  <button key={c.tab} onClick={() => setActiveTab(c.tab)} className="text-left">
                    <Card className="h-full shadow-sm transition-colors hover:bg-muted/40">
                      <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <c.icon className="h-6 w-6 text-primary" />
                        </span>
                        <span className="text-sm font-semibold">{c.label}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-full">{c.sub}</span>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("home")} className="mb-3 -ml-2 gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Home
              </Button>
            )}

            <TabsContent value="orders">
              <DeliveryOrders orders={orders} userId={user.id} onRefresh={fetchData} />
            </TabsContent>
            <TabsContent value="wallet">
              <DeliveryWallet
                userId={user.id}
                walletBalance={walletBalance}
                earningBalance={earningBalance}
                deliveryType={deliveryType}
              />
            </TabsContent>
            <TabsContent value="stock">
              <DeliveryStock userId={user.id} assignedWards={assignedWards} />
            </TabsContent>
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> My Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="dp_name">Full Name</Label>
                      <Input id="dp_name" value={profileForm.full_name} onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))} maxLength={100} />
                    </div>
                    <div>
                      <Label htmlFor="dp_mobile">Mobile Number</Label>
                      <Input id="dp_mobile" type="tel" value={profileForm.mobile_number} onChange={(e) => setProfileForm((f) => ({ ...f, mobile_number: e.target.value.replace(/\D/g, "").slice(0, 10) }))} maxLength={10} />
                    </div>
                    <div>
                      <Label>Panchayath / Municipality</Label>
                      <Select value={profileForm.local_body_id} onValueChange={(v) => setProfileForm((f) => ({ ...f, local_body_id: v, ward_number: "" }))}>
                        <SelectTrigger><SelectValue placeholder="Select panchayath" /></SelectTrigger>
                        <SelectContent>
                          {localBodies.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Ward</Label>
                      <Select value={profileForm.ward_number} onValueChange={(v) => setProfileForm((f) => ({ ...f, ward_number: v }))} disabled={!profileForm.local_body_id}>
                        <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: localBodies.find((l) => l.id === profileForm.local_body_id)?.ward_count ?? 0 }, (_, i) => i + 1).map((w) => (
                            <SelectItem key={w} value={String(w)}>Ward {w}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Button type="submit" disabled={profileSaving}>{profileSaving ? "Saving..." : "Save Profile"}</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
        <AccountSettingsSection className="space-y-3 pt-4" />
      </main>
      {user && (
        <NewOrderNotification
          userId={user.id}
          role="delivery"
          onRefresh={fetchData}
        />
      )}
    </div>
  );
};

export default DeliveryStaffDashboard;
