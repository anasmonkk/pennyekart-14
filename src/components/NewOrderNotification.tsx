import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Package, Eye, CheckCircle2 } from "lucide-react";
import OrderDetailDialog from "@/components/OrderDetailDialog";

interface PendingOrder {
  id: string;
  status: string;
  total: number;
  shipping_address: string | null;
  created_at: string;
  items: any;
}

interface Props {
  userId: string;
  /** 'delivery' polls orders assigned to this staff; 'seller' polls orders for seller */
  role: "delivery" | "seller";
  onAccept?: (orderId: string) => void;
  onRefresh?: () => void;
}

const POLL_INTERVAL = 30 * 1000; // 30 seconds

const PENDING_STATUSES: Record<Props["role"], string[]> = {
  delivery: ["pending", "seller_accepted"],
  seller: ["seller_confirmation_pending", "pending"],
};

/** Accepted but not yet finished — these get a "Finish" button. */
const IN_PROGRESS_STATUSES: Record<Props["role"], string[]> = {
  delivery: ["accepted", "out_for_delivery"],
  seller: ["seller_accepted", "self_delivery_pickup", "self_delivery_shipped"],
};

const NewOrderNotification = ({ userId, role, onAccept, onRefresh }: Props) => {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [inProgressOrders, setInProgressOrders] = useState<PendingOrder[]>([]);
  const [open, setOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [detailOrder, setDetailOrder] = useState<PendingOrder | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const prevCountRef = useRef(0);

  const playSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const beep = (freq: number, delay: number) => {
        setTimeout(() => {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            gain.gain.value = 0.3;
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          } catch {}
        }, delay);
      };
      beep(800, 0);
      beep(1000, 400);
    } catch {}
  };

  const applyOrders = useCallback(
    (all: PendingOrder[]) => {
      const pending = all.filter((o) => PENDING_STATUSES[role].includes(o.status));
      const active = all.filter((o) => IN_PROGRESS_STATUSES[role].includes(o.status));
      const fresh = pending.filter((o) => !dismissedIds.has(o.id));
      if (fresh.length > 0 && fresh.length > prevCountRef.current) {
        playSound();
        setOpen(true);
      }
      prevCountRef.current = fresh.length;
      setPendingOrders(pending);
      setInProgressOrders(active);
    },
    [role, dismissedIds]
  );

  const fetchPending = useCallback(async () => {
    try {
      if (role === "seller") {
        const { data, error } = await supabase.rpc("get_orders_for_seller", { seller_user_id: userId });
        if (error) return;
        applyOrders((data as PendingOrder[]) ?? []);
        return;
      }
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total, shipping_address, created_at, items")
        .eq("assigned_delivery_staff_id", userId)
        .in("status", [...PENDING_STATUSES.delivery, ...IN_PROGRESS_STATUSES.delivery])
        .order("created_at", { ascending: false });
      if (error) return;
      applyOrders((data as PendingOrder[]) ?? []);
    } catch {
      // silent
    }
  }, [userId, role, applyOrders]);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPending]);

  // Realtime: react instantly to new / changed orders
  useEffect(() => {
    const channel = supabase
      .channel(`order-notify-${role}-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchPending();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, userId, fetchPending]);

  const updateStatus = async (orderId: string, status: string) => {
    setBusyId(orderId);
    const { error } = await supabase.from("orders").update({ status } as any).eq("id", orderId);
    setBusyId(null);
    if (error) return false;
    onRefresh?.();
    await fetchPending();
    return true;
  };

  const handleAccept = async (orderId: string) => {
    const newStatus = role === "delivery" ? "accepted" : "seller_accepted";
    const ok = await updateStatus(orderId, newStatus);
    if (ok) {
      setDismissedIds((prev) => new Set([...prev, orderId]));
      if (role === "seller") {
        supabase.functions.invoke("send-delivery-order-push", { body: { order_id: orderId } }).catch(() => {});
      }
      onAccept?.(orderId);
    }
  };

  const handleFinish = async (orderId: string) => {
    await updateStatus(orderId, "delivered");
  };

  const handleDismiss = (orderId: string) => {
    setDismissedIds((prev) => new Set([...prev, orderId]));
  };

  const undismissedOrders = pendingOrders.filter((o) => !dismissedIds.has(o.id));
  const totalBadge = undismissedOrders.length + inProgressOrders.length;

  if (pendingOrders.length === 0 && inProgressOrders.length === 0) return null;

  const renderItems = (order: PendingOrder) =>
    Array.isArray(order.items) && order.items.length > 0 ? (
      <div className="space-y-1 border-t pt-2">
        {order.items.slice(0, 4).map((item: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2">
            {item.image_url && (
              <img src={item.image_url} alt={item.name} className="h-8 w-8 rounded border object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{item.name || item.id?.slice(0, 8)}</p>
              <p className="text-[10px] text-muted-foreground">
                Qty: {item.quantity || 1} · ₹{item.price ?? 0}
              </p>
            </div>
          </div>
        ))}
        {order.items.length > 4 && (
          <p className="text-[10px] text-muted-foreground">+{order.items.length - 4} more items</p>
        )}
      </div>
    ) : null;

  return (
    <>
      {/* Floating notification bell */}
      {totalBadge > 0 && (
        <button
          onClick={() => setOpen(true)}
          className={`fixed bottom-20 right-4 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg transition-all ${
            undismissedOrders.length > 0 ? "animate-bounce hover:animate-none" : ""
          }`}
        >
          <Bell className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
            {totalBadge}
          </span>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Orders / Requests
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {pendingOrders.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  New requests ({pendingOrders.length})
                </p>
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`border rounded-lg p-3 space-y-2 transition-opacity ${
                      dismissedIds.has(order.id) ? "opacity-40" : "bg-accent/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium">#{order.id.slice(0, 8)}</span>
                      <Badge variant="secondary">₹{order.total}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {order.shipping_address || "No address"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                    {renderItems(order)}
                    {!dismissedIds.has(order.id) && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={busyId === order.id}
                          onClick={() => handleAccept(order.id)}
                        >
                          {busyId === order.id ? "Accepting..." : "Accept"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDetailOrder(order)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDismiss(order.id)}>
                          Later
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {inProgressOrders.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  In progress ({inProgressOrders.length})
                </p>
                {inProgressOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium">#{order.id.slice(0, 8)}</span>
                      <Badge variant="outline">{order.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {order.shipping_address || "No address"}
                    </p>
                    {renderItems(order)}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={busyId === order.id}
                        onClick={() => handleFinish(order.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        {busyId === order.id ? "Finishing..." : "Finish"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDetailOrder(order)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <OrderDetailDialog order={detailOrder} open={!!detailOrder} onOpenChange={(v) => { if (!v) setDetailOrder(null); }} />
    </>
  );
};

export default NewOrderNotification;
