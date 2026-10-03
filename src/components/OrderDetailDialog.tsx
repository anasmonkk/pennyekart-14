import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Package, MapPin, Calendar, Navigation, XCircle, RotateCcw, Receipt } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

interface OrderItem {
  id?: string;
  name?: string;
  quantity?: number;
  price?: number;
  mrp?: number;
  image_url?: string;
}

interface Order {
  id: string;
  status: string;
  total: number;
  shipping_address?: string | null;
  created_at: string;
  items: any;
  user_id?: string | null;
  seller_id?: string | null;
  delivery_charge?: number | null;
}

interface Props {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusLabel?: (status: string) => string;
  onCancel?: (orderId: string) => void;
  onRequestReturn?: (orderId: string) => void;
}

const defaultStatusLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const CANCELLABLE = ["pending", "accepted", "confirmed", "packed", "shipped"];

const OrderDetailDialog = ({ order, open, onOpenChange, statusLabel = defaultStatusLabel, onCancel, onRequestReturn }: Props) => {
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    setCustomerLocation(null);
    if (!order?.user_id) return;
    setLoadingLocation(true);
    supabase
      .from("profiles")
      .select("latitude, longitude")
      .eq("user_id", order.user_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.latitude && data?.longitude) {
          setCustomerLocation({ lat: data.latitude, lng: data.longitude });
        }
        setLoadingLocation(false);
      });
  }, [order?.user_id, open]);

  if (!order) return null;

  const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Order #{order.id.slice(0, 8)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status & Date */}
          <div className="flex items-center justify-between">
            <Badge variant={order.status === "delivered" ? "default" : "secondary"}>
              {statusLabel(order.status)}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(order.created_at).toLocaleString()}
            </span>
          </div>

          {/* Address */}
          {order.shipping_address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{order.shipping_address}</span>
            </div>
          )}

          {/* Google Maps Navigation */}
          {customerLocation && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${customerLocation.lat},${customerLocation.lng}`,
                  "_blank"
                );
              }}
            >
              <Navigation className="h-4 w-4 text-primary" />
              Navigate to Customer (Google Maps)
            </Button>
          )}

          <Separator />

          {/* Items */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Items ({items.length})</h4>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No item details available</p>
              ) : (
                items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-lg border p-2">
                    {(item.image_url || item.image) && (
                      <img
                        src={item.image_url || item.image}
                        alt={item.name || "Product"}
                        className="h-12 w-12 rounded-md border object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name || item.id?.slice(0, 8) || "Unknown"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Qty: {item.quantity || 1}</span>
                        {item.price != null && <span>₹{item.price}</span>}
                        {item.mrp != null && item.mrp !== item.price && (
                          <span className="line-through">₹{item.mrp}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-semibold shrink-0">
                      ₹{((item.price ?? 0) * (item.quantity || 1)).toFixed(0)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Separator />

          {/* Bill Details */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-primary" />
              Bill Details
            </h4>
            <div className="rounded-lg border p-3 space-y-1.5 text-sm">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground truncate">
                    {item.name || "Item"} × {item.quantity || 1}
                  </span>
                  <span>₹{((item.price ?? 0) * (item.quantity || 1)).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Delivery Charge</span>
                <span>
                  {order.delivery_charge != null && order.delivery_charge > 0
                    ? `₹${Number(order.delivery_charge).toFixed(2)}`
                    : "Free"}
                </span>
              </div>
              <Separator className="my-1" />
              <div className="flex items-center justify-between font-semibold">
                <span>Grand Total</span>
                <span className="text-base">₹{Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Cancel / Return actions (customer view) */}
          {(onCancel || onRequestReturn) && (
            <>
              <Separator />
              <div className="flex gap-2">
                {onCancel && CANCELLABLE.includes(order.status) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" className="flex-1">
                        <XCircle className="h-4 w-4 mr-1" /> Cancel Order
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel this order? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>No, keep it</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { onCancel(order.id); onOpenChange(false); }}>
                          Yes, cancel
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {onRequestReturn && order.status === "delivered" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="flex-1">
                        <RotateCcw className="h-4 w-4 mr-1" /> Request Return
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Request Return?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A delivery/selling partner will need to confirm the return before stock is restored. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>No, keep it</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { onRequestReturn(order.id); onOpenChange(false); }}>
                          Yes, request return
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailDialog;
