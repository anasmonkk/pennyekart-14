import { useState } from "react";
import { Bell, CheckCircle2, Clock, Eye, MapPin, Package } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeliveryOrderContact from "./DeliveryOrderContact";
import { useDeliveryContacts } from "@/hooks/useDeliveryContacts";

interface Order {
  id: string; status: string; total: number; shipping_address: string | null;
  created_at: string; items: unknown;
}
interface Props {
  open: boolean; onOpenChange: (open: boolean) => void; userId: string;
  pending: Order[]; active: Order[]; dismissedIds: Set<string>; busyId: string | null;
  onAccept: (id: string) => void; onFinish: (id: string) => void;
  onLater: (id: string) => void; onDetail: (order: Order) => void;
}

export default function DeliveryOrderNotificationDialog(props: Props) {
  const [tab, setTab] = useState("new");
  const contacts = useDeliveryContacts([...props.pending, ...props.active].map((o) => o.id), props.userId, props.open);
  const selectedTab = tab === "new" && !props.pending.length && props.active.length ? "active" : tab;
  const orders = selectedTab === "new" ? props.pending : props.active;
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="delivery-blue w-[calc(100%-1.5rem)] max-w-md max-h-[calc(100dvh-2rem)] flex flex-col gap-0 overflow-hidden rounded-lg p-0 [&>button]:text-primary-foreground [&>button]:h-8 [&>button]:w-8 [&>button]:flex [&>button]:items-center [&>button]:justify-center">
        <DialogHeader className="delivery-gradient shrink-0 px-4 py-5 pr-14 text-left text-primary-foreground">
          <DialogTitle className="flex items-center gap-2 font-body text-xl tracking-normal"><Bell className="h-5 w-5" />Delivery orders</DialogTitle>
          <DialogDescription className="text-primary-foreground/90">{props.pending.length} new · {props.active.length} in progress</DialogDescription>
        </DialogHeader>
        <Tabs value={selectedTab} onValueChange={setTab} className="shrink-0 border-b px-4 py-3">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="new" className="h-9 gap-2"><Package className="h-4 w-4" />New ({props.pending.length})</TabsTrigger>
            <TabsTrigger value="active" className="h-9 gap-2"><Clock className="h-4 w-4" />In progress ({props.active.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!orders.length && <p className="py-8 text-center text-sm text-muted-foreground">No {selectedTab === "new" ? "new orders" : "orders in progress"}</p>}
          {orders.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const busy = props.busyId === order.id;
            return <article key={order.id} className="rounded-lg border bg-card p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="font-mono text-sm font-semibold">#{order.id.slice(0, 8)}</p><p className="text-xs text-muted-foreground mt-1">{new Date(order.created_at).toLocaleString()}</p></div>
                <span className="shrink-0 text-base font-semibold text-primary">₹{order.total.toLocaleString("en-IN")}</span>
              </div>
              <Badge variant="secondary" className="whitespace-normal">{selectedTab === "new" ? props.dismissedIds.has(order.id) ? "Saved for later" : "Awaiting acceptance" : order.status.replace(/_/g, " ")}</Badge>
              <DeliveryOrderContact contact={contacts.data?.[order.id]} loading={contacts.isLoading || contacts.isFetching} error={contacts.isError} />
              {contacts.isError && <Button variant="outline" size="sm" onClick={() => contacts.refetch()}>Retry contact</Button>}
              <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0 mt-0.5" /><span className="break-words min-w-0">{order.shipping_address || "No delivery address"}</span></p>
              {!!items.length && <div className="border-t pt-3 space-y-2">
                {items.slice(0, 3).map((item, index) => <div key={index} className="flex gap-2 items-center">
                  {item.image_url && <img src={item.image_url} alt={item.name || "Product"} className="h-10 w-10 shrink-0 rounded border object-cover" />}
                  <div className="min-w-0"><p className="text-sm font-medium break-words">{item.name || "Product"}</p><p className="text-xs text-muted-foreground">Qty: {item.quantity || 1} · ₹{item.price ?? 0}</p></div>
                </div>)}
                {items.length > 3 && <p className="text-xs text-muted-foreground">+{items.length - 3} more items</p>}
              </div>}
              <div className="grid grid-cols-[1fr_auto] gap-2 border-t pt-3">
                <Button className="h-11 delivery-gradient" disabled={props.busyId !== null} onClick={() => selectedTab === "new" ? props.onAccept(order.id) : props.onFinish(order.id)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />{busy ? "Updating…" : selectedTab === "new" ? "Accept order" : "Finish delivery"}
                </Button>
                <Button variant="outline" className="h-11 w-11 p-0" aria-label={`View order ${order.id.slice(0, 8)}`} title="View order" onClick={() => props.onDetail(order)}><Eye className="h-4 w-4" /></Button>
                {selectedTab === "new" && !props.dismissedIds.has(order.id) && <Button variant="ghost" className="col-span-2 h-10" onClick={() => props.onLater(order.id)}>Later</Button>}
              </div>
            </article>;
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}