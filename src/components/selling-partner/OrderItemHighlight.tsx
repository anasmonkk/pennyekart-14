import type { ReactNode } from "react";
import { Package } from "lucide-react";

interface Props {
  name: string;
  quantity?: number;
  variant?: string | null;
  image?: string | null;
  children?: ReactNode;
}

/** Presentation only: keeps each purchased item distinct without changing order data. */
export default function OrderItemHighlight({ name, quantity, variant, image, children }: Props) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-md border border-primary/25 border-l-4 border-l-primary bg-primary/5 p-2.5">
      {image ? (
        <img src={image} alt={name} className="h-10 w-10 shrink-0 rounded object-cover" />
      ) : (
        <Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="whitespace-normal break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{name}</p>
        {(variant || quantity != null) && (
          <p className="whitespace-normal break-words text-xs text-muted-foreground">
            {variant}{variant && quantity != null ? " · " : ""}{quantity != null && `Qty: ${quantity}`}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

export interface HighlightedOrderItem {
  id?: string;
  name?: string;
  product_name?: string;
  quantity?: number;
  variant?: string;
  image_url?: string;
  image?: string;
}

export function HighlightedOrderItems({ items }: { items: HighlightedOrderItem[] }) {
  return (
    <div className="min-w-0 space-y-2">
      {items.length === 0 && <p className="text-xs text-muted-foreground">No item details available</p>}
      {items.map((item, index) => (
        <OrderItemHighlight key={`${item.id ?? "item"}-${index}`} name={item.name || item.product_name || "Product"}
          quantity={item.quantity || 1} variant={item.variant} image={item.image_url || item.image} />
      ))}
    </div>
  );
}