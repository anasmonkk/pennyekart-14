import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { enableNotifications, isNativeApp } from "@/lib/native";

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

  if (on === null || on) return null;
  return (
    <Button variant="outline" className="w-full gap-2" disabled={busy} onClick={async () => {
      setBusy(true);
      const ok = await enableNotifications();
      setBusy(false);
      if (ok) { setOn(true); toast.success("Notifications turned on"); }
      else toast.info("Notifications are off. You can turn them on later in your phone settings.");
    }}>
      <Bell className="h-4 w-4" /> Turn on notifications
    </Button>
  );
};

export default NotificationToggle;
