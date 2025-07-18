import Header from "app/components/Header";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
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
    marginTop: -90,
    paddingHorizontal: 20,
    zIndex: 10,
    flex: 1,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    flex: 1,
  },
  statsContainer: {
    marginTop: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0077B6",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  time: {
    fontSize: 12,
    color: "#999",
  },
  messageBox: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  messageText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
});
