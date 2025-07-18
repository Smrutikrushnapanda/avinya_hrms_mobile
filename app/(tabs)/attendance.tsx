import { FontAwesome } from "@expo/vector-icons";
import Header from "app/components/Header";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { darkTheme, lightTheme } from "../constants/colors";

// Sample attendance data with different statuses and dates
const attendanceData = [
  {
    date: "Wed, Jan 15, 2025",
    inTime: "09:00 AM",
    outTime: "06:00 PM",
    status: "present",
  },
  {
    date: "Tue, Jan 14, 2025",
    inTime: "10:30 AM",
    outTime: "06:00 PM",
    status: "late",
  },
  {
    date: "Mon, Jan 13, 2025",
    inTime: "09:00 AM",
    outTime: "01:00 PM",
    status: "halfday",
  },
  { date: "Sun, Jan 12, 2025", inTime: null, outTime: null, status: "absent" },
  {
    date: "Sat, Jan 11, 2025",
    inTime: "09:00 AM",
    outTime: "06:00 PM",
    status: "present",
  },
  {
    date: "Fri, Jan 10, 2025",
    inTime: "09:15 AM",
    outTime: "06:00 PM",
    status: "late",
  },
  {
    date: "Thu, Jan 09, 2025",
    inTime: "09:00 AM",
    outTime: "06:00 PM",
    status: "present",
  },
  { date: "Wed, Jan 08, 2025", inTime: null, outTime: null, status: "absent" },
];

const Attendance = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;

  const [visibleItems, setVisibleItems] = useState(5); // Initially show 5 items
  const [isComingSoon, setIsComingSoon] = useState(true); // Toggle this to show/hide overlay

  // Function to get badge color and text based on status
  const getBadgeProps = (status: string) => {
    switch (status) {
      case "absent":
        return { color: "#FF4444", text: "Absent" };
      case "late":
        return { color: "#FFBB33", text: "Late" };
      case "halfday":
        return { color: "#00B8D9", text: "Half Day" };
      default:
        return { color: "#00C851", text: "In Time" };
    }
  };

  // Function to handle "Show More" button press
  const handleShowMore = () => {
    setVisibleItems((prev) => Math.min(prev + 3, attendanceData.length)); // Show 3 more items, up to max
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <Header title="Attendance" />
        <View style={styles.cardWrapper}>
          <View style={[styles.card, { backgroundColor: colors.white }]}>
            <View style={styles.statsContainer}>
              {/* Box 1 - Total Working Days */}
              <View
                style={[styles.cardinner, { backgroundColor: colors.white }]}
              >
                <View style={styles.circleDecoration} />
                <View style={styles.cardContentinner}>
                  <View style={styles.labelRow}>
                    <View style={[styles.dot, { backgroundColor: "green" }]} />
                    <Text style={[styles.labelText, { color: colors.text }]}>
                      Total working days of this month
                    </Text>
                  </View>
                  <Text style={styles.valueText}>30</Text>
                </View>
              </View>

              {/* Box 2 - Employee Working Days */}
              <View
                style={[styles.cardinner, { backgroundColor: colors.white }]}
              >
                <View style={styles.circleDecoration} />
                <View style={styles.cardContentinner}>
                  <View style={styles.labelRow}>
                    <View
                      style={[styles.dot, { backgroundColor: "#035F91" }]}
                    />
                    <Text style={[styles.labelText, { color: colors.text }]}>
                      Employee Working Days
                    </Text>
                  </View>
                  <Text style={styles.valueText}>27</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.activities}>
            <Text style={[styles.sectionDetails, { color: colors.text }]}>
              Your activity
            </Text>
            {/* Independent ScrollView for activity section */}
            <ScrollView
              style={styles.activityScroll}
              contentContainerStyle={{ paddingBottom: 20 }}
              nestedScrollEnabled
            >
              {attendanceData.slice(0, visibleItems).map((item, index) => {
                const { color: badgeColor, text: badgeText } = getBadgeProps(
                  item.status
                );
                return (
                  <View key={index} style={styles.attendanceCard}>
                    {/* Header Ribbon */}
                    <View
                      style={[styles.ribbon, { backgroundColor: badgeColor }]}
                    >
                      <Text style={styles.ribbonText}>{badgeText}</Text>
                    </View>

                    {/* Left Icon + Date */}
                    <View style={styles.leftSection}>
                      <View style={styles.iconCircle}>
                        <FontAwesome
                          name="calendar"
                          size={16}
                          color="#035F91"
                        />
                      </View>
                      <Text style={styles.dateText}>{item.date}</Text>
                    </View>

                    {/* In/Out Times */}
                    <View style={styles.rightSection}>
                      {item.inTime ? (
                        <View style={styles.timeRow}>
                          <FontAwesome name="clock-o" size={14} color="#999" />
                          <Text style={styles.timeText}>In: {item.inTime}</Text>
                        </View>
                      ) : (
                        <View style={styles.timeRow}>
                          <FontAwesome name="clock-o" size={14} color="#999" />
                          <Text style={styles.timeText}>In: --</Text>
                        </View>
                      )}
                      {item.outTime ? (
                        <View style={styles.timeRow}>
                          <FontAwesome name="clock-o" size={14} color="#999" />
                          <Text style={styles.timeText}>
                            Out: {item.outTime}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.timeRow}>
                          <FontAwesome name="clock-o" size={14} color="#999" />
                          <Text style={styles.timeText}>Out: --</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
              {visibleItems < attendanceData.length && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={handleShowMore}
                >
                  <Text style={styles.showMoreText}>
                    <FontAwesome name="angle-down" size={18} color="#026D94" />
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      {/* Coming Soon Overlay */}
      {isComingSoon && (
        <View style={styles.overlay}>
          <View style={styles.comingSoonContainer}>
            <FontAwesome name="clock-o" size={60} color="#fff" />
            <Text style={styles.comingSoonText}>Coming Soon</Text>
            <Text style={styles.comingSoonSubtext}>
              Attendance management feature is under development
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
    marginTop: -90,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  cardinner: {
    width: "48%",
    borderRadius: 12,
    padding: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: "relative",
  },
  cardContentinner: {
    zIndex: 2,
  },
  circleDecoration: {
    position: "absolute",
    bottom: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#C6F3FF",
    zIndex: 1,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  labelText: {
    fontSize: 12,
    flexShrink: 1,
    minHeight: 50,
  },
  valueText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  attendanceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionDetails: {
    fontSize: 17,
    fontWeight: "800",
  },
  activities: {
    marginTop: 20,
  },
  activityScroll: {
    maxHeight: 400, // Adjust height as needed
  },
  ribbon: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 8,
  },
  ribbonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1.3,
  },
  iconCircle: {
    backgroundColor: "#E1F4FF",
    padding: 8,
    borderRadius: 50,
    marginRight: 10,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  rightSection: {
    flex: 1.2,
    justifyContent: "center",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  timeText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#333",
  },
  showMoreButton: {
    backgroundColor: "transparent",
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  showMoreText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Coming Soon Overlay Styles
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)", // Semi-transparent black overlay
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000, // High z-index to ensure it's on top
  },
  comingSoonContainer: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "rgba(0, 0, 0, 0)",
    borderRadius: 20,
  },
  comingSoonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    textAlign: "center",
  },
  comingSoonSubtext: {
    color: "#ccc",
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
  },
  dismissButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  dismissButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default Attendance;
