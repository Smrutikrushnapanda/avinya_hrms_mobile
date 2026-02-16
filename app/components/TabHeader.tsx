import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import useAuthStore from "../../store/useUserStore";
import useMessageStore from "../../store/useMessageStore";
import { darkTheme, lightTheme } from "../constants/colors";
import { getInboxMessages } from "../../api/api";
import { io, Socket } from "socket.io-client";
import HeaderBackground from "./HeaderBackground";

const SOCKET_URL = "http://10.0.2.2:8080";

const { width: screenWidth } = Dimensions.get("window");

const TabHeader = () => {
  const systemColorScheme = useColorScheme() ?? "light";
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === "dark");
  const colors = isDarkMode ? darkTheme : lightTheme;

  const router = useRouter();
  const { user, fetchEmployeeProfile, loading, error } = useAuthStore();
  const { accessToken } = useAuthStore();
  const { unreadCount, setUnreadCount, incrementUnread } = useMessageStore();

  // Fetch employee profile if profileImage or designation is missing
  useEffect(() => {
    if (user?.userId && (!user.profileImage || !user.designation)) {
      fetchEmployeeProfile(user.userId);
    }
  }, [user, fetchEmployeeProfile]);

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

  // Create full name from user data
  const fullName = user
    ? `${user.firstName || ""} ${user.middleName || ""} ${user.lastName || ""}`.trim()
    : "";
  const displayName = fullName || (loading && !user ? "Loading..." : "User");
  const displayTitle = user?.designation || "Employee";

  const handleProfilePress = () => {
    router.push("/(screen)/ProfilePage"); // Navigate to profile page
  };

  const handleNotificationPress = () => {
    router.push("/(screen)/message");
  };

  return (
    <View style={[styles.headerContainer, { backgroundColor: colors.primary }]}>
      <HeaderBackground />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.profileSection}
            onPress={handleProfilePress}
            activeOpacity={0.8}
          >
            <View style={styles.headerProfileContainer}>
              <Image
                source={{
                  uri: user?.profileImage || "https://cdn-icons-png.flaticon.com/512/9187/9187532.png",
                }}
                style={styles.headerProfileImage}
              />
            </View>
            <View style={styles.textSection}>
              {error ? (
                <Text style={[styles.name, { color: colors.white }]}>Error</Text>
              ) : (
                <>
                  <View style={styles.namePill}>
                    <Text style={[styles.name, { color: colors.white }]}>
                      {displayName}
                    </Text>
                  </View>
                  <Text style={[styles.title, { color: colors.white }]}>
                    {displayTitle}
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.rightSection}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={handleNotificationPress}
            >
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
  headerContainer: {
    backgroundColor: "#1e7ba8",
    paddingBottom: 110,
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    zIndex: 2,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerProfileContainer: {
    position: "relative",
    marginRight: 12,
  },
  headerProfileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  textSection: {
    flex: 1,
  },
  namePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  title: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationButton: {
    marginLeft: 4,
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
  welcomeSection: {
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    opacity: 0.9,
    fontWeight: "400",
  },
});

export default TabHeader;
