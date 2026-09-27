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
  const [utilityImages, setUtilityImages] = useState<{ url: string; name: string }[]>([]);

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

  // Show the active Utility category imagery in the mobile shortcut.
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("utility_service_categories")
        .select("name, image_url")
        .eq("is_active", true)
        .order("sort_order");
      if (mounted) setUtilityImages((data ?? [])
        .filter((category) => Boolean(category.image_url))
        .map((category) => ({ url: category.image_url as string, name: category.name })));
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
              {isUtility && utilityImages.length > 0 ? (
                <span aria-hidden="true" className="block h-5 w-full overflow-hidden">
                  <span className="utility-marquee-track h-full items-center">
                    {[0, 1].map((copy) => (
                      <span key={copy} className="inline-flex shrink-0 items-center gap-2 pr-2">
                        {utilityImages.map((image) => (
                          <img key={`${image.url}-${image.name}`} src={image.url} alt="" loading="lazy" className="h-5 w-5 shrink-0 rounded-full object-cover" />
                        ))}
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
