import { Phone, MessageCircle, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeliveryContact } from "@/hooks/useDeliveryContacts";

export default function DeliveryOrderContact({ contact, loading, error }: {
  contact?: DeliveryContact; loading?: boolean; error?: boolean;
}) {
  const digits = contact?.phone?.replace(/\D/g, "") ?? "";
  const whatsapp = digits.length === 10 ? `91${digits}` : digits;
  return (
    <div className="space-y-2 border-t pt-2">
      <div className="flex items-start gap-2 min-w-0">
        <UserRound className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
        <div className="min-w-0 text-sm">
          <p className="font-medium break-words">{contact?.name || (loading ? "Loading contact…" : error ? "Contact unavailable" : "Customer")}</p>
          <p className="text-muted-foreground break-all">{contact?.phone || (!loading && !error ? "No phone number available" : "")}</p>
        </div>
      </div>
      {digits && <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="sm" className="h-10"><a href={`tel:${digits}`}><Phone />Call</a></Button>
        <Button asChild variant="outline" size="sm" className="h-10"><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageCircle />WhatsApp</a></Button>
      </div>}
    </div>
  );
}