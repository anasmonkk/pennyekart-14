import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import ImageUpload from "@/components/admin/ImageUpload";
import UtilitySellerRegistrations from "@/components/admin/UtilitySellerRegistrations";

import { Plus, Pencil, Trash2, Wrench, Phone, MapPin, Package } from "lucide-react";
import VariantManager from "@/components/utility/VariantManager";
import {
  CATEGORY_TYPES, unitsForCategoryType, REQUEST_STATUSES, formatServicePrice, priceUnitLabel, statusLabel,
  type UtilityCategory, type UtilityService, type UtilityRequest,
} from "@/lib/utilityServices";

const emptyCategory = { name: "", description: "", icon: "", image_url: "", sort_order: 0, is_active: true, category_type: "service" };
const emptyService = {
  name: "", description: "", image_url: "", category_id: "", price: 0, price_unit: "fixed",
  contact_phone: "", contact_whatsapp: "", coverage_area: "", is_active: true, is_approved: true, sort_order: 0,
  requires_location: true, local_body_id: "", ward_number: "",
};

interface LocalBody { id: string; name: string; body_type: string; ward_count: number; }

const UtilityServicesPage = () => {
  const [categories, setCategories] = useState<UtilityCategory[]>([]);
  const [services, setServices] = useState<UtilityService[]>([]);
  const [requests, setRequests] = useState<UtilityRequest[]>([]);
  const [providers, setProviders] = useState<Record<string, string>>({});
  const [localBodies, setLocalBodies] = useState<LocalBody[]>([]);
  const [tab, setTab] = useState("categories");

  const [catForm, setCatForm] = useState(emptyCategory);
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catOpen, setCatOpen] = useState(false);

  const [svcForm, setSvcForm] = useState(emptyService);
  const [svcEditId, setSvcEditId] = useState<string | null>(null);
  const [svcOpen, setSvcOpen] = useState(false);
  const [packsFor, setPacksFor] = useState<UtilityService | null>(null);

  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  const fetchAll = async () => {
    const [cats, svcs, reqs, profs, lbs] = await Promise.all([
      supabase.from("utility_service_categories").select("*").order("sort_order"),
      supabase.from("utility_services").select("*").order("created_at", { ascending: false }),
      supabase.from("utility_service_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, mobile_number").eq("user_type", "selling_partner"),
      supabase.from("locations_local_bodies").select("id, name, body_type, ward_count").eq("is_active", true).order("sort_order"),
    ]);
    setLocalBodies((lbs.data as LocalBody[]) ?? []);
    setCategories((cats.data as UtilityCategory[]) ?? []);
    setServices((svcs.data as UtilityService[]) ?? []);
    setRequests((reqs.data as UtilityRequest[]) ?? []);
    const map: Record<string, string> = {};
    (profs.data ?? []).forEach((p: any) => {
      map[p.user_id] = p.full_name || p.mobile_number || "Partner";
    });
    setProviders(map);
  };

  useEffect(() => { fetchAll(); }, []);

  const saveCategory = async () => {
    if (!catForm.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const payload = { ...catForm, image_url: catForm.image_url || null, icon: catForm.icon || null, description: catForm.description || null };
    const { error } = catEditId
      ? await supabase.from("utility_service_categories").update(payload).eq("id", catEditId)
      : await supabase.from("utility_service_categories").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCatOpen(false); setCatForm(emptyCategory); setCatEditId(null); fetchAll();
  };

  const saveService = async () => {
    if (!svcForm.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const payload = {
      ...svcForm,
      category_id: svcForm.category_id || null,
      image_url: svcForm.image_url || null,
      description: svcForm.description || null,
      contact_phone: svcForm.contact_phone || null,
      contact_whatsapp: svcForm.contact_whatsapp || null,
      coverage_area: svcForm.coverage_area || null,
      local_body_id: svcForm.local_body_id || null,
      ward_number: svcForm.local_body_id && svcForm.ward_number ? parseInt(svcForm.ward_number) || null : null,
    };
    const { error } = svcEditId
      ? await supabase.from("utility_services").update(payload).eq("id", svcEditId)
      : await supabase.from("utility_services").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setSvcOpen(false); setSvcForm(emptyService); setSvcEditId(null); fetchAll();
  };

  const toggleServiceField = async (id: string, field: "is_active" | "is_approved" | "requires_location", value: boolean) => {
    const { error } = await supabase.from("utility_services").update({ [field]: value }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const updateRequestStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("utility_service_requests").update({ status }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Request updated" }); fetchAll(); }
  };

  const deleteRow = async (table: "utility_service_categories" | "utility_services" | "utility_service_requests", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const openCatEdit = (c: UtilityCategory) => {
    setCatForm({
      name: c.name, description: c.description ?? "", icon: c.icon ?? "",
      image_url: c.image_url ?? "", sort_order: c.sort_order, is_active: c.is_active,
      category_type: c.category_type ?? "service",
    });
    setCatEditId(c.id); setCatOpen(true);
  };

  const openSvcEdit = (s: UtilityService) => {
    setSvcForm({
      name: s.name, description: s.description ?? "", image_url: s.image_url ?? "",
      category_id: s.category_id ?? "", price: Number(s.price ?? 0), price_unit: s.price_unit ?? "fixed",
      contact_phone: s.contact_phone ?? "", contact_whatsapp: s.contact_whatsapp ?? "",
      coverage_area: s.coverage_area ?? "", is_active: s.is_active, is_approved: s.is_approved, sort_order: s.sort_order,
      requires_location: s.requires_location ?? true,
      local_body_id: s.local_body_id ?? "", ward_number: s.ward_number ? String(s.ward_number) : "",
    });
    setSvcEditId(s.id); setSvcOpen(true);
  };

  const selectedCat = categories.find((c) => c.id === svcForm.category_id);
  const selectedCatIsProduct = selectedCat?.category_type === "product";
  const svcUnits = unitsForCategoryType(selectedCat?.category_type);

  const handleCategoryChange = (v: string) => {
    const id = v === "none" ? "" : v;
    const cat = categories.find((c) => c.id === id);
    const units = unitsForCategoryType(cat?.category_type);
    const keep = units.some((u) => u.value === svcForm.price_unit);
    setSvcForm({ ...svcForm, category_id: id, price_unit: keep ? svcForm.price_unit : units[0].value });
  };

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";
  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? "—";
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center gap-2">
        <Wrench className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Utility Services</h1>
          <p className="text-sm text-muted-foreground">Outsourced / outside services, their categories and customer requests</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="categories">Categories <Badge variant="outline" className="ml-2">{categories.length}</Badge></TabsTrigger>
          <TabsTrigger value="services">Services <Badge variant="outline" className="ml-2">{services.length}</Badge></TabsTrigger>
          <TabsTrigger value="requests">Requests <Badge variant="outline" className="ml-2">{pendingCount}</Badge></TabsTrigger>
          <TabsTrigger value="sellers">Seller Registrations</TabsTrigger>
        </TabsList>


        {/* CATEGORIES */}
        <TabsContent value="categories" className="mt-4">
          <div className="mb-3 flex justify-end">
            {hasPermission("create_services") && (
              <Dialog open={catOpen} onOpenChange={(v) => { setCatOpen(v); if (!v) { setCatForm(emptyCategory); setCatEditId(null); } }}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Category</Button></DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{catEditId ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name</Label><Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Electrical Work" /></div>
                    <div>
                      <Label>Type</Label>
                      <Select value={catForm.category_type} onValueChange={(v) => setCatForm({ ...catForm, category_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Product categories use item units (G / Kg / Nos); service categories keep the usual price types.
                      </p>
                    </div>
                    <div><Label>Description</Label><Textarea value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} rows={2} /></div>
                    <div><Label>Icon Name (Lucide)</Label><Input value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} placeholder="e.g. Plug, Hammer" /></div>
                    <ImageUpload bucket="categories" value={catForm.image_url} onChange={(url) => setCatForm({ ...catForm, image_url: url })} label="Category Image" />
                    <div><Label>Sort Order</Label><Input type="number" value={catForm.sort_order} onChange={(e) => setCatForm({ ...catForm, sort_order: +e.target.value })} /></div>
                    <div className="flex items-center gap-2"><Switch checked={catForm.is_active} onCheckedChange={(v) => setCatForm({ ...catForm, is_active: v })} /><Label>Active</Label></div>
                    <Button className="w-full" onClick={saveCategory}>Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="admin-table-wrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.name}
                      {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.category_type === "product" ? "default" : "outline"}>
                        {c.category_type === "product" ? "Product" : "Service"}
                      </Badge>
                    </TableCell>
                    <TableCell>{services.filter((s) => s.category_id === c.id).length}</TableCell>
                    <TableCell>{c.sort_order}</TableCell>
                    <TableCell>{c.is_active ? "✓" : "✗"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {hasPermission("update_services") && <Button variant="ghost" size="sm" onClick={() => openCatEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>}
                        {hasPermission("delete_services") && <Button variant="ghost" size="sm" onClick={() => deleteRow("utility_service_categories", c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No utility categories yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* SERVICES */}
        <TabsContent value="services" className="mt-4">
          <div className="mb-3 flex justify-end">
            {hasPermission("create_services") && (
              <Dialog open={svcOpen} onOpenChange={(v) => { setSvcOpen(v); if (!v) { setSvcForm(emptyService); setSvcEditId(null); } }}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Service</Button></DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{svcEditId ? "Edit Service" : "New Utility Service"}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name</Label><Input value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} /></div>
                    <div>
                      <Label>Category</Label>
                      <Select value={svcForm.category_id || "none"} onValueChange={(v) => handleCategoryChange(v)}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Description</Label><Textarea value={svcForm.description} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} rows={3} /></div>
                    <ImageUpload bucket="categories" value={svcForm.image_url} onChange={(url) => setSvcForm({ ...svcForm, image_url: url })} label="Service Image" />
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Price (₹)</Label><Input type="number" min="0" value={svcForm.price} onChange={(e) => setSvcForm({ ...svcForm, price: +e.target.value })} /></div>
                      <div>
                        <Label>{selectedCatIsProduct ? "Item Unit" : "Price Type"}</Label>
                        <Select value={svcForm.price_unit} onValueChange={(v) => setSvcForm({ ...svcForm, price_unit: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{svcUnits.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Contact Phone</Label><Input value={svcForm.contact_phone} onChange={(e) => setSvcForm({ ...svcForm, contact_phone: e.target.value })} /></div>
                      <div><Label>WhatsApp</Label><Input value={svcForm.contact_whatsapp} onChange={(e) => setSvcForm({ ...svcForm, contact_whatsapp: e.target.value })} /></div>
                    </div>
                    <div><Label>Coverage Area</Label><Input value={svcForm.coverage_area} onChange={(e) => setSvcForm({ ...svcForm, coverage_area: e.target.value })} placeholder="e.g. Malappuram district" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Available in Panchayath</Label>
                        <Select value={svcForm.local_body_id || "all"} onValueChange={(v) => setSvcForm({ ...svcForm, local_body_id: v === "all" ? "" : v, ward_number: "" })}>
                          <SelectTrigger><SelectValue placeholder="All areas" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All areas (everywhere)</SelectItem>
                            {localBodies.map((lb) => <SelectItem key={lb.id} value={lb.id}>{lb.name} ({lb.body_type})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Ward (optional)</Label>
                        <Input type="number" min="1" value={svcForm.ward_number} onChange={(e) => setSvcForm({ ...svcForm, ward_number: e.target.value })} placeholder="All wards" disabled={!svcForm.local_body_id} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-1">Pick a panchayath to show this service only to customers of that area. Leave as "All areas" to show it to everyone.</p>
                    <div><Label>Sort Order</Label><Input type="number" value={svcForm.sort_order} onChange={(e) => setSvcForm({ ...svcForm, sort_order: +e.target.value })} /></div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2"><Switch checked={svcForm.is_active} onCheckedChange={(v) => setSvcForm({ ...svcForm, is_active: v })} /><Label>Active</Label></div>
                      <div className="flex items-center gap-2"><Switch checked={svcForm.is_approved} onCheckedChange={(v) => setSvcForm({ ...svcForm, is_approved: v })} /><Label>Approved</Label></div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border p-3">
                      <Switch checked={svcForm.requires_location} onCheckedChange={(v) => setSvcForm({ ...svcForm, requires_location: v })} />
                      <div>
                        <Label>Location required</Label>
                        <p className="text-xs text-muted-foreground">Turn off for listings that do not need the customer's address or map location.</p>
                      </div>
                    </div>
                    <Button className="w-full" onClick={saveService}>Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="admin-table-wrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.name}
                      {s.coverage_area && <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{s.coverage_area}</div>}
                    </TableCell>
                    <TableCell>{categoryName(s.category_id)}</TableCell>
                    <TableCell className="text-sm">{s.provider_user_id ? (providers[s.provider_user_id] ?? "Partner") : <Badge variant="outline">In-house</Badge>}</TableCell>
                    <TableCell>
                      {formatServicePrice(Number(s.price), s.price_unit)}
                      <div className="text-xs text-muted-foreground">{priceUnitLabel(s.price_unit)}</div>
                    </TableCell>
                    <TableCell><Switch checked={s.is_approved} onCheckedChange={(v) => toggleServiceField(s.id, "is_approved", v)} /></TableCell>
                    <TableCell><Switch checked={s.is_active} onCheckedChange={(v) => toggleServiceField(s.id, "is_active", v)} /></TableCell>
                    <TableCell><Switch checked={s.requires_location ?? true} onCheckedChange={(v) => toggleServiceField(s.id, "requires_location", v)} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {hasPermission("update_services") && categories.find((c) => c.id === s.category_id)?.category_type === "product" && (
                          <Button variant="ghost" size="sm" onClick={() => setPacksFor(s)} title="Manage packs"><Package className="h-3.5 w-3.5" /></Button>
                        )}
                        {hasPermission("update_services") && <Button variant="ghost" size="sm" onClick={() => openSvcEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>}
                        {hasPermission("delete_services") && <Button variant="ghost" size="sm" onClick={() => deleteRow("utility_services", s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {services.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No utility services yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* REQUESTS */}
        <TabsContent value="requests" className="mt-4">
          <div className="admin-table-wrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Preferred Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.contact_name}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{r.contact_phone}</div>
                      {r.address && <div className="text-xs text-muted-foreground">{r.address}</div>}
                    </TableCell>
                    <TableCell>{serviceName(r.service_id)}</TableCell>
                    <TableCell className="text-sm">
                      {r.variant_label ? (
                        <>
                          <div className="font-medium">{r.variant_label} × {r.quantity ?? 1}</div>
                          {r.total_amount ? <div className="text-xs text-muted-foreground">₹{Number(r.total_amount)}</div> : null}
                        </>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{r.preferred_date ?? "—"}</TableCell>
                    <TableCell className="max-w-[220px] text-xs text-muted-foreground">{r.notes ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => updateRequestStatus(r.id, v)}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>{REQUEST_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {hasPermission("delete_services") && <Button variant="ghost" size="sm" onClick={() => deleteRow("utility_service_requests", r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </TableCell>
                  </TableRow>
                ))}
                {requests.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No service requests yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Latest status: {requests[0] ? statusLabel(requests[0].status) : "—"}</p>
        </TabsContent>

        {/* SELLER REGISTRATIONS */}
        <TabsContent value="sellers" className="mt-4">
          <UtilitySellerRegistrations />
        </TabsContent>
      </Tabs>

      {packsFor && (
        <VariantManager
          serviceId={packsFor.id}
          serviceName={packsFor.name}
          open={!!packsFor}
          onOpenChange={(v) => !v && setPacksFor(null)}
        />
      )}
    </AdminLayout>
  );
};

export default UtilityServicesPage;