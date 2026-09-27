import { Home, Tag, MessageCircle, Wrench, PlayCircle, Wallet } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { openChat, useChatAvailable } from "@/lib/chatControls";
import { Button } from "@/components/ui/button";

/* continuous horizontal marquee for the utility services category images */
const MARQUEE_KEYFRAMES = `
@keyframes utility-marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.utility-marquee-track {
  display: flex;
  width: max-content;
  white-space: nowrap;
  animation: utility-marquee 18s linear infinite;
}
.utility-marquee-track:hover, .utility-marquee-track:focus-within { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .utility-marquee-track { animation: none; }
}
`;

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const chatAvailable = useChatAvailable();
  const [utilityServices, setUtilityServices] = useState<string[]>([]);

  useEffect(() => {
    if (user && profile?.user_type === 'customer') {
      supabase
        .from('customer_wallets')
        .select('balance')
        .eq('customer_user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setWalletBalance(data.balance);
        });
    }
  }, [user, profile]);

  // Use the same active, approved listings shown on the Utility page.
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("utility_services")
        .select("name")
        .eq("is_active", true)
        .eq("is_approved", true)
        .order("sort_order");
      if (mounted) setUtilityServices([...new Set((data ?? []).map((service) => service.name.trim()).filter(Boolean))]);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const tabs = [
    { icon: Home, label: "Home", path: "/" },
    { icon: PlayCircle, label: "Play", path: "/play" },
    ...(user && walletBalance !== null
      ? [{ icon: Wallet, label: `₹${walletBalance}`, path: "/customer/wallet" }]
      : [{ icon: Tag, label: "Top Deals", path: "/" }]),
    { icon: MessageCircle, label: "Chat", path: "chat" },
    { icon: Wrench, label: "Utility", path: "/utility-services" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden">
      <style>{MARQUEE_KEYFRAMES}</style>
      <div className="flex items-center justify-around py-2">
        {tabs.map((t) => {
          const isUtility = t.label === "Utility";
          const isChat = t.path === "chat";
          const active =
            location.pathname === t.path && t.path !== "/"
              ? true
              : t.path === "/" && t.label === "Home" && location.pathname === "/"
                ? true
                : false;
          return (
            <Button
              variant="ghost"
              key={t.label}
              onClick={() => (isChat ? openChat() : navigate(t.path))}
              disabled={isChat && chatAvailable !== true}
              aria-label={t.label}
              className={`relative h-auto w-1/5 min-w-0 flex-col gap-0.5 overflow-hidden rounded-none p-0 text-[10px] font-medium transition-colors hover:bg-transparent ${
                active
                  ? "text-primary"
                  : t.path === "/customer/wallet"
                    ? "text-emerald-600"
                    : "text-muted-foreground hover:text-foreground"
              } ${isChat && chatAvailable !== true ? "opacity-50" : ""}`}
            >
              {isUtility && utilityServices.length > 0 ? (
                <span aria-hidden="true" className="block h-5 w-full overflow-hidden text-primary">
                  <span className="utility-marquee-track h-full items-center text-[10px] font-semibold">
                    {[0, 1].map((copy) => (
                      <span key={copy} className="inline-flex shrink-0 items-center gap-3 pr-3">
                        {utilityServices.map((name) => <span key={name}>{name}</span>)}
                      </span>
                    ))}
                  </span>
                </span>
              ) : (
                <t.icon className="h-5 w-5" />
              )}
              <span>{t.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
