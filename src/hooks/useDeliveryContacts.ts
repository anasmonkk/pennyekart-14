import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryContact { name: string | null; phone: string | null }

export function useDeliveryContacts(orderIds: string[], userId: string, enabled = true) {
  const ids = [...new Set(orderIds)].sort();
  return useQuery({
    queryKey: ["delivery-order-contacts", userId, ids],
    enabled: enabled && !!userId && ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const contacts: Record<string, DeliveryContact> = {};
      for (let start = 0; start < ids.length; start += 100) {
        const { data, error } = await supabase.functions.invoke("delivery-order-location", {
          body: { action: "contacts", order_ids: ids.slice(start, start + 100) },
        });
        if (error || data?.error) throw new Error("Could not load customer contacts");
        Object.assign(contacts, data?.contacts ?? {});
      }
      return contacts;
    },
  });
}