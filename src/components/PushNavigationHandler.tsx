import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { registerPushNavigator } from "@/lib/pushNavigation";

/** Mounted inside the router; consumes queued push-notification taps. */
const PushNavigationHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const cleanup = registerPushNavigator((url) => {
      if (window.location.pathname + window.location.search === url) return;
      // Let auth/redirects settle on cold start before navigating.
      setTimeout(() => navigate(url), 50);
    });
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  void location;
  return null;
};

export default PushNavigationHandler;
