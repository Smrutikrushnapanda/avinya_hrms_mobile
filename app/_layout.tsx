import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import { Appearance, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AlertNotificationRoot } from "react-native-alert-notification";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { io, Socket } from "socket.io-client";
import useAuthStore from "../store/useUserStore";
import { getEmployees } from "../api/api";

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || "https://avinya-hrms-backend.onrender.com";

export default function RootLayout() {
  Appearance.setColorScheme("light");
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const [employees, setEmployees] = useState<any[]>([]);
  const [banner, setBanner] = useState<{
    visible: boolean;
    conversationId?: string;
    title?: string;
    message?: string;
    avatar?: string;
  }>({ visible: false });

  useEffect(() => {
    const load = async () => {
      if (!user?.organizationId) return;
      try {
        const res = await getEmployees(user.organizationId);
        const data = res.data?.data || res.data || [];
        setEmployees(Array.isArray(data) ? data : []);
      } catch {
        // ignore
      }
    };
    load();
  }, [user?.organizationId]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, any>();
    employees.forEach((e) => map.set(e.userId, e));
    return map;
  }, [employees]);

  const resolveUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${SOCKET_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  useEffect(() => {
    if (!accessToken) return;
    let socket: Socket | null = null;
    try {
      socket = io(SOCKET_URL, {
        auth: { token: accessToken },
        transports: ["websocket"],
      });

      socket.on("chat:message", (payload: any) => {
        if (!payload?.conversationId) return;
        const senderId = payload?.message?.senderId;
        if (senderId && senderId === user?.userId) return;
        const sender = senderId ? employeeMap.get(senderId) : null;
        const title = sender
          ? `${sender.firstName || ""} ${sender.lastName || ""}`.trim()
          : "New message";
        const messageText =
          payload?.message?.text ||
          (payload?.message?.attachments?.length ? "Attachment" : "New message");
        const avatarUrl = sender?.photoUrl || "";
        setBanner({
          visible: true,
          conversationId: payload.conversationId,
          title,
          message: messageText,
          avatar: avatarUrl,
        });
        setTimeout(() => {
          setBanner((prev) => ({ ...prev, visible: false }));
        }, 3500);
      });
    } catch {
      // ignore
    }
    return () => {
      if (socket) socket.disconnect();
    };
  }, [accessToken, employeeMap]);

  return (
    <AlertNotificationRoot>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" translucent={true} />
          {banner.visible && (
            <TouchableOpacity
              style={styles.banner}
              onPress={() => {
                if (banner.conversationId) {
                  router.push({
                    pathname: "/(screen)/chat/[id]",
                    params: {
                      id: banner.conversationId,
                      title: banner.title || "Chat",
                      avatar: banner.avatar || "",
                    },
                  });
                }
                setBanner((prev) => ({ ...prev, visible: false }));
              }}
            >
              <View style={styles.bannerAvatar}>
                {banner.avatar ? (
                  <Image
                    source={{ uri: resolveUrl(banner.avatar) }}
                    style={styles.bannerAvatarImg}
                  />
                ) : (
                  <Text style={styles.bannerAvatarText}>
                    {(banner.title || "C").charAt(0)}
                  </Text>
                )}
              </View>
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>{banner.title}</Text>
                <Text style={styles.bannerMsg} numberOfLines={1}>
                  {banner.message}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          <SafeAreaView
            style={{ flex: 1, backgroundColor: "transparent" }}
            edges={["right", "left", "bottom"]}
          >
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "fade",
              }}
            />
          </SafeAreaView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AlertNotificationRoot>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 20,
    backgroundColor: "#0F172A",
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  bannerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 10,
  },
  bannerAvatarImg: {
    width: "100%",
    height: "100%",
  },
  bannerAvatarText: {
    color: "#fff",
    fontWeight: "700",
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  bannerMsg: {
    color: "#cbd5e1",
    fontSize: 11,
    marginTop: 2,
  },
});
