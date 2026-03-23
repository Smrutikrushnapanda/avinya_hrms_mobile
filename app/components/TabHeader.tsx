import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
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
import { getInboxMessages, getOrganization } from "../../api/api";
import { io, Socket } from "socket.io-client";
import HeaderBackground from "./HeaderBackground";

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || "https://avinyahrms.duckdns.org";

const DEFAULT_HOME_HEADER_COLOR = "#026D94";

const getHexRgb = (color?: string): { r: number; g: number; b: number } | null => {
  if (!color) return null;
  const cleaned = color.trim().replace("#", "");
  if (cleaned.length !== 3 && cleaned.length !== 6) return null;

  const hex =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : cleaned;

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) return null;
  return { r, g, b };
};

const isLightHeaderColor = (color?: string) => {
  const rgb = getHexRgb(color);
  if (!rgb) return false;
  const luminance =
    (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.62;
};

const isMediaActive = (startDate?: string, endDate?: string) => {
  if (!startDate && !endDate) return true;
  const today = new Date();
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

  if (start && Number.isNaN(start.getTime())) return false;
  if (end && Number.isNaN(end.getTime())) return false;

  if (start && today < start) return false;
  if (end && today > end) return false;

  return true;
};

const TabHeader = () => {
  const colorScheme = useColorScheme() ?? "light";
  const isDarkMode = colorScheme === "dark";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;

  const router = useRouter();
  const { user, fetchEmployeeProfile, loading, error } = useAuthStore();
  const { accessToken } = useAuthStore();
  const { unreadCount, setUnreadCount, incrementUnread } = useMessageStore();
  const [headerColor, setHeaderColor] = useState(DEFAULT_HOME_HEADER_COLOR);
  const [headerMediaUrl, setHeaderMediaUrl] = useState<string | null>(null);
  const isLightHeaderBackground =
    !headerMediaUrl && isLightHeaderColor(headerColor || colors.primary);
  const headerPrimaryTextColor = isLightHeaderBackground
    ? colors.text
    : colors.onPrimary;
  const headerSecondaryTextColor = isLightHeaderBackground
    ? colors.textSecondary
    : "rgba(255,255,255,0.82)";
  const namePillBg = isLightHeaderBackground
    ? "rgba(255,255,255,0.76)"
    : "rgba(0,0,0,0.18)";
  const namePillBorder = isLightHeaderBackground
    ? "rgba(15,23,42,0.14)"
    : "rgba(255,255,255,0.25)";
  const profileImageBorder = isLightHeaderBackground
    ? "rgba(15,23,42,0.22)"
    : "rgba(255,255,255,0.5)";
  const notificationIconColor = isLightHeaderBackground
    ? colors.text
    : colors.primary;
  const controlBg = isDarkMode
    ? "rgba(9,15,27,0.82)"
    : isLightHeaderBackground
    ? "rgba(255,255,255,0.72)"
    : "rgba(255,255,255,0.92)";
  const controlBorder = isDarkMode
    ? colors.border
    : isLightHeaderBackground
    ? "rgba(15,23,42,0.14)"
    : "rgba(255,255,255,0.35)";

  // Fetch employee profile if profileImage or designation is missing
  useEffect(() => {
    if (user?.userId && (!user.profileImage || !user.designation)) {
      fetchEmployeeProfile(user.userId);
    }
  }, [user, fetchEmployeeProfile]);

  const loadHeaderConfig = useCallback(async () => {
    if (!user?.organizationId) return;
    try {
      const res = await getOrganization(user.organizationId);
      const org = res.data || {};
      setHeaderColor(org.homeHeaderBackgroundColor || DEFAULT_HOME_HEADER_COLOR);
      if (
        org.homeHeaderMediaUrl &&
        isMediaActive(org.homeHeaderMediaStartDate, org.homeHeaderMediaEndDate)
      ) {
        setHeaderMediaUrl(org.homeHeaderMediaUrl);
      } else {
        setHeaderMediaUrl(null);
      }
    } catch {
      setHeaderColor(DEFAULT_HOME_HEADER_COLOR);
      setHeaderMediaUrl(null);
    }
  }, [user?.organizationId]);

  useEffect(() => {
    loadHeaderConfig();
  }, [loadHeaderConfig]);

  useFocusEffect(
    useCallback(() => {
      loadHeaderConfig();
    }, [loadHeaderConfig])
  );

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
    <View style={[styles.headerContainer, { backgroundColor: headerColor || colors.primary }]}>
      <HeaderBackground backgroundColor={headerColor} mediaUrl={headerMediaUrl} />
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
                  uri:
                    user?.profileImage ||
                    "https://cdn-icons-png.flaticon.com/512/9187/9187532.png",
                }}
                style={[
                  styles.headerProfileImage,
                  { borderColor: profileImageBorder },
                ]}
              />
            </View>
            <View style={styles.textSection}>
              {error ? (
                <Text style={[styles.name, { color: headerPrimaryTextColor }]}>Error</Text>
              ) : (
                <>
                  <View
                    style={[
                      styles.namePill,
                      {
                        backgroundColor: namePillBg,
                        borderColor: namePillBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.name, { color: headerPrimaryTextColor }]}>
                      {displayName}
                    </Text>
                  </View>
                  <Text style={[styles.title, { color: headerSecondaryTextColor }]}>
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
              <View
                style={[
                  styles.notificationIcon,
                  { backgroundColor: controlBg, borderColor: controlBorder },
                ]}
              >
                <Ionicons
                  name="notifications"
                  size={20}
                  color={notificationIconColor}
                />
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
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingBottom: 110,
    overflow: "hidden",
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
  },
  textSection: {
    flex: 1,
  },
  namePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  title: {
    fontSize: 14,
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
