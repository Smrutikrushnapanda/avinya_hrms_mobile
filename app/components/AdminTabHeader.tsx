import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { darkTheme, lightTheme } from "../constants/colors";
import { getInboxMessages } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import useMessageStore from "../../store/useMessageStore";
import { io, Socket } from "socket.io-client";
import HeaderBackground from "./HeaderBackground";

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || "https://avinya-hrms-backend.onrender.com";

interface AdminTabHeaderProps {
  title: string;
}

const AdminTabHeader = ({ title }: AdminTabHeaderProps) => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const { unreadCount, setUnreadCount, incrementUnread } = useMessageStore();

  const fetchUnreadCount = async () => {
    try {
      const response = await getInboxMessages();
      const data = Array.isArray(response.data) ? response.data : [];
      const unread = data.filter((m) => m.status === "UNREAD").length;
      setUnreadCount(unread);
    } catch {
      // ignore fetch errors
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    let socket: Socket | null = null;
    try {
      socket = io(SOCKET_URL, {
        auth: { token: accessToken },
        transports: ["websocket"],
      });

      socket.on("message:new", () => {
        incrementUnread(1);
      });
    } catch {
      // ignore socket errors
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [accessToken]);

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <HeaderBackground />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleWrapper}>
            <View style={styles.titlePill}>
              <Text style={styles.titleText} numberOfLines={1}>
                {title}
              </Text>
            </View>
          </View>

          <View style={styles.rightSection}>
            <TouchableOpacity onPress={() => router.push("/(screen)/message")}>
              <View style={styles.notificationIcon}>
                <Ionicons name="notifications" size={20} color={colors.primary} />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? "99+" : String(unreadCount)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 110,
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  titleWrapper: {
    flexShrink: 1,
  },
  titlePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  titleText: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: "#fff",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 8,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
});

export default AdminTabHeader;
