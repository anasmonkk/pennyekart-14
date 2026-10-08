import { Check, MapPin, Phone, XCircle } from "lucide-react";
import OrderItemHighlight from "@/components/selling-partner/OrderItemHighlight";
import { NotificationDialogFrame } from "@/components/OrderNotificationDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UtilityRequest } from "@/lib/utilityServices";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requests: UtilityRequest[];
  serviceName: (id: string) => string;
  onAccept: (id: string) => void;
  onCancel?: (id: string) => void;
  onRemindLater?: () => void;
}

export default function UtilityRequestNotificationDialog({ open, onOpenChange, requests, serviceName, onAccept, onCancel, onRemindLater }: Props) {
  const pending = requests.filter((request) => request.status === "pending");
  return (
    <NotificationDialogFrame open={open} onOpenChange={onOpenChange} title="Service requests" description={`${pending.length} new · awaiting action`}>
      {pending.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No pending requests</p>}
      {pending.map((request) => (
        <article key={request.id} className="space-y-3 rounded-lg border bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold">#{request.id.slice(0, 8)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(request.created_at).toLocaleString()}</p>
            </div>
            {!!request.total_amount && <span className="shrink-0 text-base font-semibold text-primary">₹{Number(request.total_amount).toLocaleString("en-IN")}</span>}
          </div>
          <Badge variant="secondary" className="whitespace-normal">Awaiting acceptance</Badge>
          <div className="min-w-0 space-y-1">
            <p className="break-words font-semibold">{request.contact_name}</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{request.contact_phone}</span></p>
          </div>
          <OrderItemHighlight name={serviceName(request.service_id)} variant={request.variant_label} quantity={request.quantity ?? 1} />
          {request.address && <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{request.address}</span></p>}
          {request.latitude != null && request.longitude != null && (
            <a className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline" href={`https://www.google.com/maps/search/?api=1&query=${request.latitude},${request.longitude}`} target="_blank" rel="noreferrer"><MapPin className="h-4 w-4 shrink-0" />Open location on map</a>
          )}
          <div className="grid grid-cols-1 gap-2 border-t pt-3">
            <Button className="delivery-gradient h-11" onClick={() => onAccept(request.id)}><Check className="mr-2 h-4 w-4" />Accept request</Button>
            {onCancel && (
              <Button variant="outline" className="h-11 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => onCancel(request.id)}>
                <XCircle className="mr-2 h-4 w-4" />Cancel request
              </Button>
            )}
            <Button variant="ghost" className="h-10" onClick={() => (onRemindLater ? onRemindLater() : onOpenChange(false))}>Remind me later</Button>
          </div>
        </article>
      ))}
    </NotificationDialogFrame>
  );
}