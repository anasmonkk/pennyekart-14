import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Search, ShieldCheck } from "lucide-react";

interface AdminRow {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  role_id: string | null;
  is_super_admin: boolean;
  is_blocked: boolean;
  last_login_at?: string | null;
}

interface Props {
  users: AdminRow[];
  roles: { id: string; name: string }[];
  canEdit: boolean;
  onChanged: () => void;
}

const AdminsPanel = ({ users, roles, canEdit, onChanged }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const admins = useMemo(() => {
    const s = q.trim().toLowerCase();
    return users
      .filter((u) => u.is_super_admin || u.role_id)
      .filter((u) => !s || [u.full_name, u.email, u.mobile_number].some((v) => v?.toLowerCase().includes(s)))
      .sort((a, b) => Number(b.is_super_admin) - Number(a.is_super_admin) || (a.full_name ?? "").localeCompare(b.full_name ?? ""));
  }, [users, q]);

  const update = async (u: AdminRow, fields: Record<string, unknown>, okMsg: string) => {
    setBusy(u.id);
    const { error } = await supabase.from("profiles").update(fields as any).eq("id", u.id);
    setBusy(null);
    if (error) return toast({ title: "Could not update", description: error.message, variant: "destructive" });
    toast({ title: okMsg });
    onChanged();
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search admins by name, email or mobile..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email / Mobile</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No admins found</TableCell></TableRow>
            )}
            {admins.map((u) => {
              const isSelf = u.user_id === user?.id;
              const locked = !canEdit || u.is_super_admin || isSelf || busy === u.id;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.full_name || "—"}
                    {u.is_super_admin && <Badge className="ml-2"><ShieldCheck className="mr-1 h-3 w-3" />Super admin</Badge>}
                    {isSelf && <Badge variant="outline" className="ml-2">You</Badge>}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{u.email || "—"}</div>
                    <div className="text-muted-foreground">{u.mobile_number}</div>
                  </TableCell>
                  <TableCell>
                    {u.is_super_admin ? (
                      <span className="text-sm text-muted-foreground">Full access</span>
                    ) : (
                      <select
                        className="h-9 rounded-md border bg-background px-2 text-sm capitalize"
                        value={u.role_id ?? ""}
                        disabled={locked}
                        onChange={(e) => {
                          const v = e.target.value || null;
                          if (!v && !window.confirm("Remove admin access for this user?")) return;
                          update(u, { role_id: v }, v ? "Role updated" : "Admin access removed");
                        }}
                      >
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        <option value="">— Remove admin access —</option>
                      </select>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={!u.is_blocked}
                      disabled={locked}
                      onCheckedChange={(on) => update(u, { is_blocked: !on }, on ? "Admin unblocked" : "Admin blocked")}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {!canEdit && <p className="text-xs text-muted-foreground">Only super admins can change admin roles or block admins.</p>}
    </div>
  );
};

export default AdminsPanel;
