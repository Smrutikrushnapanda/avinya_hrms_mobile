import { Ionicons } from "@expo/vector-icons";
import Header from "app/components/Header";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import { darkTheme, lightTheme } from "../constants/colors";

const MessagaDetails = () => {
  const { message } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;

  const msg = typeof message === "string" ? JSON.parse(message) : message;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Message Detail" />
      <View style={styles.cardWrapper}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color="#005F90" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <View style={styles.statsContainer}>
            <View style={styles.headerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{msg.initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{msg.title}</Text>
                <Text style={styles.subtitle}>{msg.subtitle}</Text>
              </View>
              <Text style={styles.time}>{msg.time}</Text>
            </View>

            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{msg.message}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default MessagaDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardWrapper: {
    marginTop: verticalScale(-90),
    paddingHorizontal: horizontalScale(20),
    zIndex: 10,
    flex: 1,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(6),
    paddingVertical: verticalScale(6),
    paddingHorizontal: horizontalScale(4),
  },
  backText: {
    fontSize: moderateScale(12),
    color: "#005F90",
    fontWeight: "600",
  },
  card: {
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: horizontalScale(0),
      height: verticalScale(2),
    },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    flex: 1,
  },
  statsContainer: {
    marginTop: verticalScale(10),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(16),
    gap: horizontalScale(10),
  },
  avatar: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    backgroundColor: "#0077B6",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: moderateScale(16),
  },
  title: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#000",
  },
  subtitle: {
    fontSize: moderateScale(14),
    color: "#666",
  },
  time: {
    fontSize: moderateScale(12),
    color: "#999",
  },
  messageBox: {
    paddingTop: verticalScale(10),
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  messageText: {
    fontSize: moderateScale(15),
    color: "#333",
    lineHeight: moderateScale(22),
  },
});
