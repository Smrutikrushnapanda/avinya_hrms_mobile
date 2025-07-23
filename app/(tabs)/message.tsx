import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Header from "app/components/Header";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import { darkTheme, lightTheme } from "../constants/colors";

const Message = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const navigation = useNavigation();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [isComingSoon, setIsComingSoon] = useState(true); // Toggle this to show/hide overlay

  const [notifications, setNotifications] = useState([
    {
      id: "1",
      initials: "HR",
      title: "HR Panchsoft",
      subtitle: "Project Update - Q4 Review",
      message:
        "Hi team, I wanted to share the latest updates on our Q4 project review. The metrics are looking great and we're on track to...",
      time: "02:30 PM",
      isNew: true,
    },
    {
      id: "2",
      initials: "DT",
      title: "Design Team",
      subtitle: "UI Components Review",
      message:
        "We've completed the initial review of the new UI components. The feedback from the team has been incorporated and we're ready...",
      time: "01:30 PM",
      isNew: true,
    },
    {
      id: "3",
      initials: "MD",
      title: "Marketing Department",
      subtitle: "Campaign Performance Report",
      message:
        "Hi team, I wanted to share the latest updates on our Q4 project review...",
      time: "Yesterday",
      isNew: false,
    },
    {
      id: "4",
      initials: "HR",
      title: "HR Panchsoft",
      subtitle: "Policy Reminder",
      message:
        "Friendly reminder: Submit your monthly timesheet by the 5th of every month...",
      time: "Yesterday",
      isNew: false,
    },
    {
      id: "5",
      initials: "HR",
      title: "HR Panchsoft",
      subtitle: "Leave Policy Update",
      message:
        "We've updated our leave policy effective from 1st August. Please check the HR portal...",
      time: "Dt: 22-05-2025",
      isNew: false,
    },
    {
      id: "6",
      initials: "TL",
      title: "Team Lead",
      subtitle: "Appreciation",
      message:
        "Kudos to the team for completing the project ahead of schedule! Excellent work!",
      time: "Dt: 22-05-2025",
      isNew: false,
    },
    {
      id: "7",
      initials: "HR",
      title: "HR Panchsoft",
      subtitle: "Celebration",
      message:
        "Happy Birthday, Smruti! May your day be filled with joy, laughter, and sweet surprises...",
      time: "Dt: 22-05-2025",
      isNew: false,
    },
    {
      id: "8",
      initials: "MN",
      title: "Manager",
      subtitle: "Performance Review Reminder",
      message:
        "Please complete your self-review form by Friday. 1-on-1 reviews will start next week.",
      time: "Dt: 22-05-2025",
      isNew: false,
    },
  ]);

  const handleRead = (id: any) => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((item) =>
        item.id === id ? { ...item, isNew: false } : item
      )
    );
  };

  const handleMessagePress = (item: any) => {
    handleRead(item.id);
    router.push({
      pathname: "/MessagaDetails",
      params: {
        message: JSON.stringify(item), // pass as string for safety
      },
    });
  };

  const filteredData = notifications.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(search.toLowerCase()) ||
      item.message.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Notifications" />
      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <View style={styles.searchWrapper}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search Message ..."
              placeholderTextColor="#999"
              style={styles.searchInput}
            />
            <Feather name="search" size={20} color="#0077B6" />
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {filteredData.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.notificationCard,
                  item.isNew && styles.notificationCardUnread,
                ]}
                onPress={() => handleMessagePress(item)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.initials}</Text>
                  {item.isNew && <View style={styles.notificationBadge} />}
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[styles.title, item.isNew && styles.textUnread]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[styles.time, item.isNew && styles.textUnread]}
                    >
                      {item.time}
                    </Text>
                  </View>
                  <Text
                    style={[styles.subtitle, item.isNew && styles.textUnread]}
                  >
                    {item.subtitle}
                  </Text>
                  <Text
                    style={[styles.message, item.isNew && styles.textUnread]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.message}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                    Tap to read more
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Coming Soon Overlay */}
      {isComingSoon && (
        <View style={styles.overlay}>
          <View style={styles.comingSoonContainer}>
            <Feather name="message-circle" size={60} color="#fff" />
            <Text style={styles.comingSoonText}>Coming Soon</Text>
            <Text style={styles.comingSoonSubtext}>
              Notification management feature is under development
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

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
  card: {
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    flex: 1,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F8FB",
    borderRadius: moderateScale(10),
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(8),
    marginBottom: verticalScale(16),
  },
  searchInput: {
    flex: 1,
    color: "#000",
    fontSize: moderateScale(14),
  },
  scrollContent: {
    paddingBottom: verticalScale(100),
  },
  notificationCard: {
    flexDirection: "row",
    paddingVertical: verticalScale(12),
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    backgroundColor: "#fff",
  },
  notificationCardUnread: {
    backgroundColor: "#F5F5F5",
  },
  avatar: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: "#0077B6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: horizontalScale(12),
    position: "relative",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
  },
  notificationBadge: {
    width: moderateScale(10),
    height: moderateScale(10),
    borderRadius: moderateScale(5),
    backgroundColor: "#FF0000",
    position: "absolute",
    top: verticalScale(-2),
    right: horizontalScale(-2),
    borderWidth: 1,
    borderColor: "#fff",
  },
  notificationContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(2),
  },
  title: {
    fontWeight: "600",
    fontSize: moderateScale(14),
    color: "#000",
  },
  time: {
    fontSize: moderateScale(12),
    color: "#999",
  },
  subtitle: {
    fontWeight: "500",
    color: "#0077B6",
    marginBottom: verticalScale(2),
  },
  message: {
    color: "#555",
    fontSize: moderateScale(12),
  },
  textUnread: {
    color: "#000",
    fontWeight: "700",
  },

  // Coming Soon Overlay Styles
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  comingSoonContainer: {
    alignItems: "center",
    padding: moderateScale(30),
    backgroundColor: "rgba(0, 0, 0, 0)",
    borderRadius: moderateScale(20),
  },
  comingSoonText: {
    color: "#fff",
    fontSize: moderateScale(20),
    fontWeight: "bold",
    marginTop: verticalScale(20),
    textAlign: "center",
  },
  comingSoonSubtext: {
    color: "#ccc",
    fontSize: moderateScale(16),
    marginTop: verticalScale(10),
    textAlign: "center",
  },
  dismissButton: {
    marginTop: verticalScale(20),
    paddingHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(10),
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  dismissButtonText: {
    color: "#fff",
    fontSize: moderateScale(14),
    fontWeight: "500",
  },
});

export default Message;
