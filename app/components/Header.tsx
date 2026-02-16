import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
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

const SOCKET_URL = "http://10.0.2.2:8080";

const Header = ({ title = "" }) => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const navigation = useNavigation();
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
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <View style={styles.backCircle}>
              <Ionicons name="arrow-back" size={20} color="#0b4f73" />
            </View>
          </TouchableOpacity>

          {/* Title (moved next to back icon) */}
          <View style={styles.titleWrapper}>
            <View style={styles.titlePill}>
              <Text
                style={[styles.titleText, { color: "#fff" }]}
                numberOfLines={1}
              >
                {title}
              </Text>
            </View>
          </View>

          {/* Right Section */}
          <View style={styles.rightSection}>
            <View style={styles.notificationSection}>
              <TouchableOpacity onPress={() => router.push("/(screen)/message")}>
                <View style={styles.notificationIcon}>
                  <Ionicons name="notifications" size={20} color="#1e7ba8" />
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
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  header: {
    paddingTop: 40,
    paddingBottom: 110,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },
  backButton: {
    paddingRight: 10,
    zIndex: 2,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  titleWrapper: {
    marginLeft: 10, // Add spacing from the back button
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
  },
  rightSection: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },
  notificationSection: {
    marginLeft: 8,
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
    top: 2,
    right: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 8,
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 8,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
});
