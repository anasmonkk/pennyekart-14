import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Package, ArrowRightLeft, History, ArrowLeft } from "lucide-react";

interface StockItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  purchase_price: number;
  batch_number: string | null;
  expiry_date: string | null;
  godown_id: string;
  godown_name: string;
}

interface Transfer {
  id: string;
  product_name: string;
  quantity: number;
  from_godown_name: string;
  to_godown_name: string;
  status: string;
  transfer_type: string;
  created_at: string;
}

interface Godown {
  id: string;
  name: string;
}

interface Props {
  userId: string;
  assignedWards: { local_body_name: string; ward_number: number; local_body_id?: string }[];
}

const DeliveryStock = ({ userId, assignedWards }: Props) => {
  const { toast } = useToast();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [section, setSection] = useState("menu");

  // Transfer form
  const [transferProduct, setTransferProduct] = useState("");
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferQty, setTransferQty] = useState("");

  const fetchData = async () => {
    setLoading(true);

    // Get godowns linked to staff's assigned wards
    const localBodyIds = [...new Set(assignedWards.map(w => w.local_body_id).filter(Boolean))];
    
    if (localBodyIds.length === 0) {
      setLoading(false);
      return;
    }

    // Get godown IDs from godown_wards matching staff's ward assignments
    const wardConditions = assignedWards.map(w => ({
      local_body_id: w.local_body_id,
      ward_number: w.ward_number,
    }));

    const { data: godownWards } = await supabase
      .from("godown_wards")
      .select("godown_id, local_body_id, ward_number")
      .in("local_body_id", localBodyIds as string[]);

    // Filter to only matching wards
    const matchingGodownIds = [...new Set(
      (godownWards ?? [])
        .filter(gw => wardConditions.some(wc => wc.local_body_id === gw.local_body_id && wc.ward_number === gw.ward_number))
        .map(gw => gw.godown_id)
    )];

    if (matchingGodownIds.length === 0) {
      setLoading(false);
      return;
    }

    const [godownsRes, stockRes, transfersRes, productsRes] = await Promise.all([
      supabase.from("godowns").select("id, name").in("id", matchingGodownIds),
      supabase.from("godown_stock").select("*").in("godown_id", matchingGodownIds),
      supabase.from("stock_transfers").select("*")
        .or(`from_godown_id.in.(${matchingGodownIds.join(",")}),to_godown_id.in.(${matchingGodownIds.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("products").select("id, name"),
    ]);

    const godownMap: Record<string, string> = {};
    (godownsRes.data ?? []).forEach((g: any) => { godownMap[g.id] = g.name; });
    setGodowns(godownsRes.data as Godown[] ?? []);

    const productMap: Record<string, string> = {};
    (productsRes.data ?? []).forEach((p: any) => { productMap[p.id] = p.name; });

    setStock((stockRes.data ?? []).map((s: any) => ({
      ...s,
      product_name: productMap[s.product_id] ?? "Unknown",
      godown_name: godownMap[s.godown_id] ?? "Unknown",
    })));

    // For transfers, we also need all godown names (from/to may be outside assigned)
    const allGodownIds = [...new Set([
      ...matchingGodownIds,
      ...(transfersRes.data ?? []).map((t: any) => t.from_godown_id),
      ...(transfersRes.data ?? []).map((t: any) => t.to_godown_id),
    ])];
    const { data: allGodowns } = await supabase.from("godowns").select("id, name").in("id", allGodownIds);
    const allGodownMap: Record<string, string> = {};
    (allGodowns ?? []).forEach((g: any) => { allGodownMap[g.id] = g.name; });

    setTransfers((transfersRes.data ?? []).map((t: any) => ({
      ...t,
      product_name: productMap[t.product_id] ?? "Unknown",
      from_godown_name: allGodownMap[t.from_godown_id] ?? "Unknown",
      to_godown_name: allGodownMap[t.to_godown_id] ?? "Unknown",
    })));

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [userId, assignedWards.length]);

  const filteredStock = stock.filter((s) =>
    !productFilter || s.product_name.toLowerCase().includes(productFilter.toLowerCase())
  );

  const filteredTransfers = transfers.filter((t) => {
    if (dateFrom && new Date(t.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(t.created_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  const uniqueProducts = [...new Map(stock.map(s => [s.product_id, { id: s.product_id, name: s.product_name }])).values()];
  const sectionCards = [
    { value: "stock", label: "Current Stock", icon: Package, sub: `${uniqueProducts.length} products` },
    { value: "transfer", label: "Transfer", icon: ArrowRightLeft, sub: `${godowns.length} godowns` },
    { value: "history", label: "Transfer History", icon: History, sub: `${transfers.length} transfers` },
  ];

  const handleTransfer = async () => {
    if (!transferProduct || !transferFrom || !transferTo || !transferQty || transferFrom === transferTo) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    const qty = parseInt(transferQty);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      return;
    }
    // Check source stock
    const sourceStock = stock.find(s => s.product_id === transferProduct && s.godown_id === transferFrom);
    if (!sourceStock || sourceStock.quantity < qty) {
      toast({ title: "Insufficient stock", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("stock_transfers").insert({
      product_id: transferProduct,
      from_godown_id: transferFrom,
      to_godown_id: transferTo,
      quantity: qty,
      transfer_type: "manual",
      created_by: userId,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Transfer created" });
    setTransferProduct(""); setTransferFrom(""); setTransferTo(""); setTransferQty("");
    fetchData();
  };

  if (loading) return <p className="text-muted-foreground p-4">Loading stock...</p>;

  if (godowns.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No godowns assigned to your wards yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs value={section} onValueChange={setSection}>
      {section === "menu" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Stock features">
          {sectionCards.map((feature) => (
            <Button
              key={feature.value}
              variant="outline"
              onClick={() => setSection(feature.value)}
              className="h-auto min-h-36 min-w-0 flex-col gap-2 whitespace-normal rounded-lg bg-card p-5 text-center shadow-sm hover:bg-muted/40"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <feature.icon className="h-6 w-6 text-primary" />
              </span>
              <span className="text-sm font-semibold">{feature.label}</span>
              <span className="text-xs font-normal text-muted-foreground">{feature.sub}</span>
            </Button>
          ))}
        </div>
      ) : (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSection("menu")} className="-ml-2 gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to features
          </Button>
          <h2 className="text-base font-semibold">{sectionCards.find((feature) => feature.value === section)?.label}</h2>
        </div>
      )}

      <TabsContent value="stock">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Input placeholder="Search product..." value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="max-w-xs" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Godown</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStock.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No stock</TableCell></TableRow>
                  ) : filteredStock.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.product_name}</TableCell>
                      <TableCell>{s.godown_name}</TableCell>
                      <TableCell><Badge variant={s.quantity > 0 ? "default" : "destructive"}>{s.quantity}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.batch_number ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.expiry_date ? new Date(s.expiry_date).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="transfer">
        <Card>
          <CardHeader><CardTitle>Create Stock Transfer</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Product</label>
                <Select value={transferProduct} onValueChange={setTransferProduct}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {uniqueProducts.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">From Godown</label>
                <Select value={transferFrom} onValueChange={setTransferFrom}>
                  <SelectTrigger><SelectValue placeholder="From" /></SelectTrigger>
                  <SelectContent>
                    {godowns.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">To Godown</label>
                <Select value={transferTo} onValueChange={setTransferTo}>
                  <SelectTrigger><SelectValue placeholder="To" /></SelectTrigger>
                  <SelectContent>
                    {godowns.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Quantity</label>
                <Input type="number" value={transferQty} onChange={(e) => setTransferQty(e.target.value)} placeholder="Qty" />
              </div>
              <div className="flex items-end">
                <Button onClick={handleTransfer}>Create Transfer</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">From</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">To</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No transfers</TableCell></TableRow>
                  ) : filteredTransfers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{t.product_name}</TableCell>
                      <TableCell className="text-sm">{t.from_godown_name}</TableCell>
                      <TableCell className="text-sm">{t.to_godown_name}</TableCell>
                      <TableCell>{t.quantity}</TableCell>
                      <TableCell><Badge variant={t.status === "completed" ? "default" : "secondary"}>{t.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default DeliveryStock;
