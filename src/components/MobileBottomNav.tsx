import { Home, Tag, MessageCircle, Wrench, PlayCircle, Wallet } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { openChat, useChatAvailable } from "@/lib/chatControls";

/* continuous horizontal marquee for the utility services list */
const MARQUEE_KEYFRAMES = `
@keyframes utility-marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.utility-marquee-track {
  display: inline-flex;
  white-space: nowrap;
  animation: utility-marquee 12s linear infinite;
}
.utility-marquee-track:hover { animation-play-state: paused; }
`;

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const chatAvailable = useChatAvailable();
  const [utilityImages, setUtilityImages] = useState<string[]>([]);
  const [imgIdx, setImgIdx] = useState(0);

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

  // Load utility service category images for the cycling attention animation
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("utility_service_categories")
        .select("image_url")
        .eq("is_active", true)
        .order("sort_order");
      setUtilityImages(
        (data ?? [])
          .map((c: any) => c.image_url as string)
          .filter(Boolean)
      );
    };
    load();
  }, []);

  useEffect(() => {
    if (utilityImages.length < 2) return;
    const t = setInterval(() => setImgIdx((i) => (i + 1) % utilityImages.length), 2500);
    return () => clearInterval(t);
  }, [utilityImages.length]);

  const tabs = [
    { icon: Home, label: "Home", path: "/" },
    { icon: PlayCircle, label: "Play", path: "/play" },
    ...(user && walletBalance !== null
      ? [{ icon: Wallet, label: `₹${walletBalance}`, path: "/customer/wallet" }]
      : [{ icon: Tag, label: "Top Deals", path: "/" }]),
    { icon: MessageCircle, label: "Chat", path: "chat" },
    { icon: Wrench, label: "Utility", path: "/utility-services" },
  ];

  const currentImg = utilityImages[imgIdx];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden">
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
            <button
              key={t.label}
              onClick={() => (isChat ? openChat() : navigate(t.path))}
              disabled={isChat && chatAvailable !== true}
              aria-label={t.label}
              className={`relative flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                active
                  ? "text-primary"
                  : t.path === "/customer/wallet"
                    ? "text-emerald-600"
                    : "text-muted-foreground hover:text-foreground"
              } ${isChat && chatAvailable !== true ? "opacity-50" : ""}`}
            >
              {isUtility && currentImg ? (
                <span className="relative flex h-5 w-5 items-center justify-center overflow-hidden">
                  <img
                    key={currentImg}
                    src={currentImg}
                    alt="Utility"
                    className="h-full w-full animate-fade-in rounded-full object-cover"
                    loading="lazy"
                  />
                </span>
              ) : (
                <t.icon className="h-5 w-5" />
              )}
              {/* Attention ping for Utility */}
              {isUtility && (
                <span className="absolute right-1 top-0 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
              )}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
