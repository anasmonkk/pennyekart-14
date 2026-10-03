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
    isGranted().then((g) => { if (alive) setOn(g); });
    return () => { alive = false; };
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
