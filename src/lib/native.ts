import { Capacitor } from "@capacitor/core";

/**
 * Set to true ONLY after android/app/google-services.json (Firebase) is added.
 * Without it, PushNotifications.register() throws a native
 * "Default FirebaseApp is not initialized" exception on the CapacitorPlugins
 * thread, which kills the app (cannot be caught from JavaScript).
 */
export const PUSH_CONFIGURED = true;

/**
 * True only when running inside the native Android/iOS shell.
 * Everything native must be gated behind this so the web app is untouched.
 */
export const isNativeApp = () => Capacitor.isNativePlatform();

export const nativePlatform = (): "android" | "ios" | "web" =>
  Capacitor.getPlatform() as "android" | "ios" | "web";

const FCM_TOKEN_KEY = "pennyekart_fcm_token";

/** Saves the FCM token to the signed-in user's profile. Never throws. */
const saveFcmToken = async (token: string, knownUserId?: string) => {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    let userId = knownUserId;
    if (!userId) {
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user.id;
    }
    if (!userId) return; // kept locally; saved after sign-in
    const { error } = await supabase
      .from("profiles")
      .update({ fcm_token: token } as never)
      .eq("user_id", userId);
    if (error) throw error;
    console.log("FCM token saved");
  } catch (err) {
    console.error("FCM token save failed:", err);
  }
};

/**
 * One-time native bootstrap. Safe to call on the web — it no-ops there.
 *
 * - Themed status bar
 * - Hides the native splash screen once React has mounted
 * - Android hardware back button: navigates back in history, or moves the
 *   app to the background when already at the top level
 * - Push notifications: registers only if already granted; never prompts at launch.
 */
export const initNativeApp = async () => {
  if (!isNativeApp()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#1a120b" });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch {
    // status bar plugin unavailable — ignore
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    // Give the web splash a moment, then drop the native one.
    setTimeout(() => SplashScreen.hide().catch(() => {}), 800);
  } catch {
    // ignore
  }

  try {
    const { App } = await import("@capacitor/app");
    await App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.minimizeApp();
      }
    });
  } catch {
    // ignore
  }

  try {
    // Listeners only — permission is NOT requested at launch. It is requested
    // from the profile ("Turn on notifications") after an explanation popup.
    const { PushNotifications } = await import("@capacitor/push-notifications");

    // Attached once here, before any register() call (also reused by enableNotifications).
    await PushNotifications.addListener("registration", (token) => {
      console.log("FCM token received");
      try { localStorage.setItem(FCM_TOKEN_KEY, token.value); } catch { /* ignore */ }
      void saveFcmToken(token.value);
    });

    // Save a pending token once the user signs in (or on session restore).
    const { supabase } = await import("@/integrations/supabase/client");
    supabase.auth.onAuthStateChange((event, session) => {
      if (!session || (event !== "SIGNED_IN" && event !== "INITIAL_SESSION")) return;
      let pending: string | null = null;
      try { pending = localStorage.getItem(FCM_TOKEN_KEY); } catch { /* ignore */ }
      if (pending) setTimeout(() => void saveFcmToken(pending!, session.user.id), 0);
    });
    await PushNotifications.addListener("registrationError", (error) => {
      console.error("FCM registration error:", error);
    });
    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("Push notification received:", notification);
    });

    const perm = await PushNotifications.checkPermissions();
    if (PUSH_CONFIGURED && perm.receive === "granted") {
      await PushNotifications.register();
    }
    await PushNotifications.addListener("pushNotificationActionPerformed", async (action) => {
      // Running app: navigates via React Router now. Cold start: queued until the router mounts.
      const { pushTargetFromData, requestPushNavigation } = await import("@/lib/pushNavigation");
      const target = pushTargetFromData(action.notification.data as Record<string, unknown> | undefined);
      if (target) requestPushNavigation(target);
    });
  } catch {
    // push unavailable (e.g. missing google-services.json yet) — ignore
  }
};

/** Explains, then asks for notification permission. Returns true when granted. */
export const enableNotifications = async (): Promise<boolean> => {
  const { explainPermission } = await import("@/lib/permissionPrompt");
  if (!(await explainPermission("notifications"))) return false;
  if (isNativeApp()) {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== "granted") return false;
      if (PUSH_CONFIGURED) await PushNotifications.register();
      return true;
    } catch { return false; }
  }
  if (typeof Notification === "undefined") return false;
  return (await Notification.requestPermission()) === "granted";
};
