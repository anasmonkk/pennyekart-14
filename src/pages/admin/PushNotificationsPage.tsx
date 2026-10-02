import { useEffect, useState, useCallback } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, RotateCcw, Smartphone } from "lucide-react";

type Audience = "all" | "agents" | "panchayath";
interface Form { title: string; message: string; image_url: string; link_url: string; target_audience: Audience; target_local_body_ids: string[]; }
interface Campaign extends Form { id: string; sent_count: number; failed_count: number; invalid_tokens_cleared: number; status: string; sent_at: string | null; created_at: string; }

const empty: Form = { title: "", message: "", image_url: "", link_url: "", target_audience: "all", target_local_body_ids: [] };
const audienceLabel: Record<string, string> = { all: "All users", agents: "e-Life agents", panchayath: "Selected panchayaths" };

const invoke = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("send-push-notification", { body });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try { msg = (await error.context.json()).error ?? msg; } catch { /* ignore */ }
    }
    throw new Error(msg);
  }
  return data;
};

const PushNotificationsPage = () => {
  const [form, setForm] = useState<Form>(empty);
  const [bodies, setBodies] = useState<{ id: string; name: string }[]>([]);
  const [history, setHistory] = useState<Campaign[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; invalid_tokens_cleared: number } | null>(null);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from("push_campaigns" as never).select("*").order("created_at", { ascending: false }).limit(100);
    setHistory((data as unknown as Campaign[]) ?? []);
  }, []);

  useEffect(() => {
    supabase.from("locations_local_bodies").select("id, name").eq("is_active", true).order("name").then(({ data }) => setBodies(data ?? []));
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (form.target_audience === "panchayath" && !form.target_local_body_ids.length) { setCount(0); return; }
    setCounting(true);
    const t = setTimeout(() => {
      invoke({ action: "preview", target_audience: form.target_audience, target_local_body_ids: form.target_local_body_ids })
        .then((d) => setCount(d.device_count))
        .catch(() => setCount(null))
        .finally(() => setCounting(false));
    }, 300);
    return () => clearTimeout(t);
  }, [form.target_audience, form.target_local_body_ids]);

  const validate = () => {
    if (!form.title.trim() || !form.message.trim()) return "Title and message are required";
    const l = form.link_url.trim();
    if (l && !(l.startsWith("/") || l.startsWith("https://"))) return "Link must start with / or https://";
    if (form.image_url.trim() && !form.image_url.trim().startsWith("https://")) return "Image URL must start with https://";
    if (form.target_audience === "panchayath" && !form.target_local_body_ids.length) return "Select at least one panchayath";
    return null;
  };

  const openConfirm = () => {
    const err = validate();
    if (err) return toast({ title: err, variant: "destructive" });
    setResult(null); setConfirm(true);
  };

  const send = async () => {
    setSending(true);
    try {
      const d = await invoke({ action: "send", ...form });
      setResult(d);
      toast({ title: `Push sent to ${d.sent} device${d.sent === 1 ? "" : "s"}` });
      loadHistory();
    } catch (e) {
      toast({ title: "Push failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
      setConfirm(false);
      loadHistory();
    } finally { setSending(false); }
  };

  const resend = (c: Campaign) => {
    setForm({ title: c.title, message: c.message, image_url: c.image_url ?? "", link_url: c.link_url ?? "",
      target_audience: c.target_audience, target_local_body_ids: c.target_local_body_ids ?? [] });
    setResult(null); setConfirm(true);
  };

  const toggleBody = (id: string) => setForm((f) => ({ ...f, target_local_body_ids: f.target_local_body_ids.includes(id)
    ? f.target_local_body_ids.filter((x) => x !== id) : [...f.target_local_body_ids, id] }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Push Notifications</h1>
          <p className="text-sm text-muted-foreground">Send phone push messages to the Android app. Separate from internal notifications.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Create push</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Title</Label><Input maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Message</Label><Textarea maxLength={1000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
            <div><Label>Image URL (optional)</Label><Input placeholder="https://..." value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
            <div>
              <Label>Link (optional)</Label>
              <Input placeholder="/product/ID, /orders or https://..." value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">Links starting with / open inside the app.</p>
            </div>
            <div>
              <Label>Audience</Label>
              <Select value={form.target_audience} onValueChange={(v) => setForm({ ...form, target_audience: v as Audience })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  <SelectItem value="agents">e-Life agents</SelectItem>
                  <SelectItem value="panchayath">Selected panchayaths</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.target_audience === "panchayath" && (
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {bodies.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.target_local_body_ids.includes(b.id)} onCheckedChange={() => toggleBody(b.id)} />{b.name}
                  </label>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Smartphone className="h-4 w-4 text-primary" />
                {counting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span><strong>{count ?? "—"}</strong> Android devices will receive this</span>}
              </div>
              <Button onClick={openConfirm} className="gap-2"><Send className="h-4 w-4" /> Send push</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Push history</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Title</TableHead><TableHead>Message</TableHead><TableHead>Audience</TableHead>
                <TableHead>Sent</TableHead><TableHead>Failed</TableHead><TableHead>Status</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {history.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No pushes sent yet</TableCell></TableRow>}
                {history.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(c.sent_at ?? c.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{c.message}</TableCell>
                    <TableCell className="text-sm">{audienceLabel[c.target_audience] ?? c.target_audience}</TableCell>
                    <TableCell>{c.sent_count}</TableCell>
                    <TableCell>{c.failed_count}</TableCell>
                    <TableCell><Badge variant={c.status === "sent" ? "default" : c.status === "failed" ? "destructive" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="outline" className="gap-1" onClick={() => resend(c)}><RotateCcw className="h-3 w-3" /> Resend</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirm} onOpenChange={(o) => !sending && setConfirm(o)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{result ? "Push sent" : "Send this push?"}</DialogTitle></DialogHeader>
          {result ? (
            <div className="space-y-1 text-sm">
              <p>Sent: <strong>{result.sent}</strong></p>
              <p>Failed: <strong>{result.failed}</strong></p>
              <p>Invalid tokens cleared: <strong>{result.invalid_tokens_cleared}</strong></p>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Title:</span> {form.title}</p>
              <p><span className="text-muted-foreground">Message:</span> {form.message}</p>
              <p><span className="text-muted-foreground">Link:</span> {form.link_url || "None (opens the app)"}</p>
              <p><span className="text-muted-foreground">Audience:</span> {audienceLabel[form.target_audience]}</p>
              <p><span className="text-muted-foreground">Devices:</span> {count ?? "unknown"}</p>
            </div>
          )}
          <DialogFooter>
            {result ? <Button onClick={() => { setConfirm(false); setForm(empty); }}>Done</Button> : (
              <>
                <Button variant="outline" disabled={sending} onClick={() => setConfirm(false)}>Cancel</Button>
                <Button disabled={sending} onClick={send} className="gap-2">{sending && <Loader2 className="h-4 w-4 animate-spin" />} Send push</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default PushNotificationsPage;
