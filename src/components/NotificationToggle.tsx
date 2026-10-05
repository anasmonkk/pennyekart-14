import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { enableNotifications, isNativeApp, getPushStatus } from "@/lib/native";

/** Reads the real permission state (phone app or browser). */
const isGranted = async (): Promise<boolean> => {
  if (isNativeApp()) {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const perm = await PushNotifications.checkPermissions();
      return perm.receive === "granted";
    } catch {
      return false;
    }
  }
  return typeof Notification !== "undefined" && Notification.permission === "granted";
};

const NotificationToggle = () => {
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    let resumeListener: { remove: () => Promise<void> } | null = null;
    const refreshPermission = () => {
      void isGranted().then((granted) => { if (alive) setOn(granted); });
    };
    refreshPermission();

    if (isNativeApp()) {
      void import("@capacitor/app").then(({ App }) => App.addListener("resume", refreshPermission)).then((listener) => {
        if (alive) resumeListener = listener;
        else void listener.remove();
      }).catch(() => {});
    } else {
      window.addEventListener("focus", refreshPermission);
      document.addEventListener("visibilitychange", refreshPermission);
    }

    return () => {
      alive = false;
      if (resumeListener) void resumeListener.remove();
      if (!isNativeApp()) {
        window.removeEventListener("focus", refreshPermission);
        document.removeEventListener("visibilitychange", refreshPermission);
      }
    };
  }, []);

  if (on === null) return null;
  const st = isNativeApp() ? getPushStatus() : null;
  return (
    <div className="space-y-1">
    <Button variant="outline" className="w-full gap-2" disabled={busy || on} onClick={async () => {
      setBusy(true);
      const ok = await enableNotifications();
      setBusy(false);
      if (ok) { setOn(true); toast.success("Notifications turned on"); }
      else toast.info("Notifications could not be turned on. You can turn them on later in your phone settings.");
    }}>
      <Bell className="h-4 w-4" /> {on ? "Notifications enabled" : "Turn on notifications"}
    </Button>
    {st && (
      <p className="text-[10px] text-muted-foreground text-center">
        Push: {st.stage}{st.tokenTail ? ` …${st.tokenTail}` : ""}{st.error ? ` (${st.error.slice(0, 80)})` : ""}
      </p>
    )}
    </div>
  );
};

export default NotificationToggle;
