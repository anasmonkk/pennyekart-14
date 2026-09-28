import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  roles: { id: string; name: string }[];
  onCreated: () => void;
}

const empty = { full_name: "", email: "", password: "", role_id: "" };

const AddAdminDialog = ({ roles, onCreated }: Props) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    if (!form.full_name.trim() || !form.email.trim() || form.password.length < 8 || !form.role_id) {
      toast({ title: "Fill all fields", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("create-admin", { body: form });
    setSaving(false);
    const msg = (data as any)?.error || error?.message;
    if (msg) {
      let detail = msg;
      try { detail = (await (error as any)?.context?.json())?.error ?? msg; } catch { /* ignore */ }
      toast({ title: "Could not add admin", description: detail, variant: "destructive" });
      return;
    }
    toast({ title: "Admin added", description: `${form.email} can now sign in at the admin login.` });
    setForm(empty);
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><UserPlus className="mr-1.5 h-4 w-4" /> Add Admin</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Admin</DialogTitle>
          <DialogDescription>
            Create an admin login and choose a role. Edit what each role can access in{" "}
            <Link to="/admin/roles" className="underline">Roles & Permissions</Link>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Full name</Label><Input maxLength={100} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Password</Label><Input type="password" maxLength={72} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /></div>
          <div>
            <Label>Role</Label>
            <Select value={form.role_id} onValueChange={(v) => setForm({ ...form, role_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => <SelectItem key={r.id} value={r.id} className="capitalize">{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Adding..." : "Add Admin"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAdminDialog;
