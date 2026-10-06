import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import OrderNotificationDialog from "@/components/OrderNotificationDialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Settings as SettingsIcon, Eye, Volume2, VolumeX, AlarmClock } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

interface PendingOrder {
  id: string;
  status: string;
  total: number;
  shipping_address: string | null;
  created_at: string;
  items: any;
}

const PENDING_STATUSES = ["pending", "seller_confirmation_pending"];
const SETTINGS_KEY = "admin_pending_orders_notify";
const SUPPRESS_KEY = "admin_pending_orders_snoozed_ids";

interface Settings {
  enabled: boolean;
  intervalMinutes: number;
  sound: boolean;
  autoPopup: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  intervalMinutes: 2,
  sound: true,
  autoPopup: true,
};

const loadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
};

const AdminPendingOrdersNotification = () => {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canSee = isSuperAdmin || hasPermission("read_orders");
  const navigate = useNavigate();

  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const snoozedIdsRef = useRef<Set<string>>(
    (() => {
      try {
        const raw = sessionStorage.getItem(SUPPRESS_KEY);
        return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
      } catch {
        return new Set<string>();
      }
    })()
  );
  const prevCountRef = useRef(0);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const playBeep = useCallback(() => {
    if (!settings.sound) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const beep = (freq: number, delay: number) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          gain.gain.value = 0.25;
          osc.start();
          osc.stop(ctx.currentTime + 0.25);
        }, delay);
      };
      beep(880, 0);
      beep(1100, 300);
    } catch {}
  }, [settings.sound]);

  const fetchPending = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, status, total, shipping_address, created_at, items")
      .in("status", PENDING_STATUSES)
      .order("created_at", { ascending: false });
    if (error) return;
    const list = (data as PendingOrder[]) ?? [];

    const newOnes = list.filter((o) => !seenIdsRef.current.has(o.id));
    const isFirstRun = prevCountRef.current === 0 && seenIdsRef.current.size === 0;

    list.forEach((o) => seenIdsRef.current.add(o.id));
    setOrders(list);

    // Only alert for orders the admin hasn't snoozed yet.
    const unsnoozedNew = newOnes.filter((o) => !snoozedIdsRef.current.has(o.id));
    const shouldAlert =
      unsnoozedNew.length > 0 ||
      (isFirstRun && list.some((o) => !snoozedIdsRef.current.has(o.id)));

    if (shouldAlert) {
      playBeep();
      if (settings.autoPopup) setOpen(true);
    }
    prevCountRef.current = list.length;
  }, [playBeep, settings.autoPopup]);

  useEffect(() => {
    if (!canSee || !settings.enabled) return;
    fetchPending();
    const ms = Math.max(0.25, settings.intervalMinutes) * 60 * 1000;
    const interval = setInterval(fetchPending, ms);
    return () => clearInterval(interval);
  }, [canSee, settings.enabled, settings.intervalMinutes, fetchPending]);

  const saveSettings = (next: Settings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {}
  };

  if (!canSee) return null;

  return (
    <>
      {/* Floating bell — left on mobile to avoid ChatBot overlap, right on desktop */}
      <div className="fixed bottom-20 left-3 sm:left-auto sm:right-4 z-50 flex flex-col items-start sm:items-end gap-2">
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full shadow-md bg-background/80 backdrop-blur-sm"
              title="Notification settings"
            >
              <SettingsIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 sm:w-72">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Pending Orders Alerts</h4>
              <div className="flex items-center justify-between">
                <Label htmlFor="np-enabled" className="text-xs">Enable polling</Label>
                <Switch
                  id="np-enabled"
                  checked={settings.enabled}
                  onCheckedChange={(v) => saveSettings({ ...settings, enabled: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="np-popup" className="text-xs">Auto-open popup</Label>
                <Switch
                  id="np-popup"
                  checked={settings.autoPopup}
                  onCheckedChange={(v) => saveSettings({ ...settings, autoPopup: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="np-sound" className="text-xs flex items-center gap-1">
                  {settings.sound ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                  Sound
                </Label>
                <Switch
                  id="np-sound"
                  checked={settings.sound}
                  onCheckedChange={(v) => saveSettings({ ...settings, sound: v })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="np-interval" className="text-xs">Repeat interval (minutes)</Label>
                <Input
                  id="np-interval"
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={settings.intervalMinutes}
                  onChange={(e) =>
                    saveSettings({
                      ...settings,
                      intervalMinutes: Math.max(0.25, Number(e.target.value) || 1),
                    })
                  }
                />
                <p className="text-[10px] text-muted-foreground">
                  Re-check every {settings.intervalMinutes} min. Beeps when new pending orders arrive.
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {orders.length > 0 && (
          <button
            onClick={() => setOpen(true)}
            className="relative flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-[#0a1f44] via-[#0f5132] to-[#d4af37] text-white shadow-lg shadow-[#0a1f44]/40 animate-bounce hover:animate-none transition-all hover:scale-105 active:scale-95 ring-2 ring-[#d4af37]/40"
            title="Pending orders"
          >
            <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="absolute -top-1 -right-1 bg-gradient-to-br from-[#d4af37] to-[#b8860b] text-[#0a1f44] text-[10px] sm:text-xs font-bold rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center shadow-md ring-1 ring-white/60">
              {orders.length}
            </span>
          </button>
        )}
      </div>

      <OrderNotificationDialog
        open={open} onOpenChange={setOpen} title="Pending orders" pending={orders} showTabs={false}
        renderActions={() => <Button className="w-full h-11 delivery-gradient" onClick={() => { setOpen(false); navigate("/admin/orders"); }}>
          <Eye className="mr-2 h-4 w-4" />Open in Orders
        </Button>}
        footer={orders.length > 0 ? <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-auto min-h-11 whitespace-normal" onClick={() => {
            orders.forEach((o) => snoozedIdsRef.current.add(o.id));
            try { sessionStorage.setItem(SUPPRESS_KEY, JSON.stringify([...snoozedIdsRef.current])); } catch {}
            setOpen(false);
          }}><AlarmClock className="mr-1.5 h-4 w-4 shrink-0" />Show me Later</Button>
          <Button className="h-auto min-h-11 whitespace-normal delivery-gradient" onClick={() => { setOpen(false); navigate("/admin/orders"); }}>
            <Eye className="mr-1.5 h-4 w-4 shrink-0" />View All Orders
          </Button>
        </div> : undefined}
      />
    </>
  );
}

export default AdminPendingOrdersNotification;
