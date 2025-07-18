import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { darkTheme, lightTheme } from "../constants/colors";

const Header = ({ title = "" }) => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const navigation = useNavigation();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <View style={styles.backCircle}>
              <Ionicons name="arrow-back" size={20} color="#1e7ba8" />
            </View>
          </TouchableOpacity>

          {/* Title (moved next to back icon) */}
          <View style={styles.titleWrapper}>
            <Text
              style={[styles.titleText, { color: "#fff" }]}
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>

          {/* Right Section */}
          <View style={styles.rightSection}>
            <View style={styles.notificationSection}>
              <TouchableOpacity onPress={() => router.push("/(tabs)/message")}>
                <View style={styles.notificationIcon}>
                  <Ionicons name="notifications" size={20} color="#1e7ba8" />
                  <View style={styles.notificationBadge}>
                    <Text style={styles.badgeText}>2</Text>
                  </View>
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
    paddingTop: 60,
    paddingBottom: 130,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    paddingRight: 10,
    zIndex: 2,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  titleWrapper: {
    marginLeft: 10, // Add spacing from the back button
    flexShrink: 1,
  },
  titleText: {
    fontSize: 22,
    fontWeight: "900",
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
    backgroundColor: "white",
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
