import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { darkTheme, lightTheme } from "../constants/colors";

const { width: screenWidth } = Dimensions.get("window");

const TabHeader = () => {
  const systemColorScheme = useColorScheme() ?? "light";
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === "dark");
  const colors = isDarkMode ? darkTheme : lightTheme;

  const router = useRouter();
  const { user } = useAuthStore();

  // Create full name from user data
  const fullName = user
    ? `${user.firstName || ""} ${user.middleName || ""} ${user.lastName || ""}`.trim()
    : "User";

  const handleProfilePress = () => {
    router.push("/(screen)/ProfilePage"); // Navigate to profile page
  };

  const handleNotificationPress = () => {
    router.push("/(tabs)/message");
  };

  return (
    <View style={[styles.headerContainer, { backgroundColor: colors.primary }]}>
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
              <View style={styles.headerStatusIndicator} />
            </View>
            <View style={styles.textSection}>
              <Text style={[styles.name, { color: colors.white }]}>
                {fullName}
              </Text>
              <Text style={[styles.title, { color: colors.white }]}>
                {user?.designation || "Employee"}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.rightSection}>

            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={handleNotificationPress}
            >
              <View style={styles.notificationIcon}>
                <Ionicons name="notifications" size={20} color={colors.primary} />
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>2</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Welcome message */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: colors.white }]}>
            Welcome back, {user?.firstName || "User"}! 👋
          </Text>
          <Text style={[styles.subtitleText, { color: colors.white }]}>
            Have a productive day at work
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: { 
    backgroundColor: "#1e7ba8",
    paddingBottom: 20,
  },
  header: { 
    paddingTop: 60, 
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
    borderColor: "rgba(255,255,255,0.3)",
  },
  headerStatusIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#fff",
  },
  textSection: { 
    flex: 1 
  },
  name: { 
    fontSize: 18, 
    fontWeight: "600", 
    color: "white", 
    marginBottom: 2 
  },
  title: { 
    fontSize: 14, 
    color: "rgba(255,255,255,0.8)", 
    fontWeight: "400" 
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
    backgroundColor: "rgba(255,255,255,0.9)",
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