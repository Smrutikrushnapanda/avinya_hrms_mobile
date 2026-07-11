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
import { socketURL as SOCKET_URL } from "utils/apiConfig";

interface AdminTabHeaderProps {
  title: string;
  subtitle?: string;
}

const AdminTabHeader = ({ title, subtitle }: AdminTabHeaderProps) => {
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerContent}>
        <View style={styles.titleWrapper}>
          <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitleText, { color: colors.textMuted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity onPress={() => router.push("/(screen)/message")}>
            <View
              style={[
                styles.notificationIcon,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="notifications" size={20} color={colors.text} />
              {unreadCount > 0 && (
                <View style={[styles.notificationBadge, { backgroundColor: colors.red }]}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleWrapper: {
    flexShrink: 1,
  },
  titleText: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  subtitleText: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
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
    borderWidth: 1,
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
