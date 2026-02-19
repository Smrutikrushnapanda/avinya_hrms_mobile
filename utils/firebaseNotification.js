import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  requestPermission,
  getToken,
  onMessage,
  onTokenRefresh,
  onNotificationOpenedApp,
  getInitialNotification,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";

const app = getApp();
const messaging = getMessaging(app);

// 🔹 Ask permission
export async function requestUserPermission() {
  const authStatus = await requestPermission(messaging);
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL;

  console.log("✅ Permission:", authStatus);
  return enabled;
}

// 🔹 Get FCM token
export async function getFCMToken() {
  try {
    const token = await getToken(messaging);
    if (token) {
      console.log("📲 FCM Token:", token);
      await AsyncStorage.setItem("fcmToken", token);
    }
  } catch (err) {
    console.error("❌ FCM token error:", err);
  }
}

// 🔹 Foreground + background listeners
export function registerNotificationListeners(onNotification) {
  // Foreground
  const unsubscribeOnMessage = onMessage(messaging, async (remoteMessage) => {
    console.log("📩 Foreground message:", remoteMessage);
    const title = remoteMessage.notification?.title || "New Notification";
    const body = remoteMessage.notification?.body || "You got a message!";
    if (onNotification) {
      onNotification(title, body);
    }
  });

  // App opened from background
  const unsubscribeOnOpen = onNotificationOpenedApp(messaging, (remoteMessage) => {
    console.log("🔔 App opened from background:", remoteMessage.notification);
  });

  // App opened from quit
  getInitialNotification(messaging).then((remoteMessage) => {
    if (remoteMessage) {
      console.log("🚀 App opened from quit:", remoteMessage.notification);
    }
  });

  return () => {
    unsubscribeOnMessage();
    unsubscribeOnOpen();
  };
}

// 🔹 Token refresh listener
export function registerTokenRefresh() {
  return onTokenRefresh(messaging, async (token) => {
    console.log("🔄 Token refreshed:", token);
    await AsyncStorage.setItem("fcmToken", token);
  });
}
