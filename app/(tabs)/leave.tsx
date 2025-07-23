import { Feather } from "@expo/vector-icons";
import Header from "app/components/Header";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import { darkTheme, lightTheme } from "../constants/colors";

const Leave = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;

  const [selectedTab, setSelectedTab] = useState("All");
  const [isComingSoon, setIsComingSoon] = useState(true); // Toggle this to show/hide overlay

  const route = useRouter();

  // Animation values
  const scaleValue = useRef(new Animated.Value(1)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  // Create continuous floating animation
  useEffect(() => {
    const createFloatingAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    const createPulseAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    createFloatingAnimation();
    createPulseAnimation();
  }, []);

  const handleFABPress = () => {
    // Rotation animation on press
    Animated.sequence([
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(rotateValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Handle apply leave navigation
    console.log("Navigate to apply leave screen");
  };

  const rotateInterpolate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "135deg"],
  });

  const leaveApplications = [
    {
      id: 1,
      date: "27 May 2025",
      type: "Sick Leave",
      from: "20 May",
      to: "22 May",
      days: "2 Days",
      status: "Pending",
    },
    {
      id: 2,
      date: "01 June 2025",
      type: "Casual Leave",
      from: "20 June",
      to: "22 June",
      days: "2 Days",
      status: "Approved",
    },
    {
      id: 3,
      date: "27 Feb 2025",
      type: "Casual Leave",
      from: "10 Feb",
      to: "11 Feb",
      days: "1 Days",
      status: "Rejected",
    },
    {
      id: 4,
      date: "01 June 2025",
      type: "Casual Leave",
      from: "20 June",
      to: "22 June",
      days: "2 Days",
      status: "Approved",
    },
  ];

  const tabs = ["All", "Pending", "Approved", "Rejected"];

  const filteredLeaves =
    selectedTab === "All"
      ? leaveApplications
      : leaveApplications.filter((item) => item.status === selectedTab);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Leave" />

      {/* Summary Card */}
      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          {/* Casual Leave */}
          <View style={styles.leaveRow}>
            <View style={[styles.iconWrapper, { backgroundColor: "#E3F2FD" }]}>
              <Feather name="calendar" size={20} color="#2196F3" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.typeText}>Casual Leave (CL)</Text>
              <Text style={styles.labelText}>Last Used</Text>
            </View>
            <View style={styles.rightContainer}>
              <Text style={styles.countText}>15</Text>
              <Text style={styles.dateText}>28-05-2025</Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* Sick Leave */}
          <View style={styles.leaveRow}>
            <View style={[styles.iconWrapper, { backgroundColor: "#FFEBEE" }]}>
              <Feather name="heart" size={20} color="#F44336" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.typeText}>Sick Leave (SL)</Text>
              <Text style={styles.labelText}>Last Used</Text>
            </View>
            <View style={styles.rightContainer}>
              <Text style={styles.countText}>10</Text>
              <Text style={styles.dateText}>10-03-2025</Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* Earned Leave */}
          <View style={styles.leaveRow}>
            <View style={[styles.iconWrapper, { backgroundColor: "#E8F5E9" }]}>
              <Feather name="briefcase" size={20} color="#4CAF50" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.typeText}>Earned Leave (EL)</Text>
              <Text style={styles.labelText}>Last Used</Text>
            </View>
            <View style={styles.rightContainer}>
              <Text style={styles.countText}>05</Text>
              <Text style={styles.dateText}>08-01-2025</Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* Floating Holiday */}
          <View style={styles.leaveRow}>
            <View style={[styles.iconWrapper, { backgroundColor: "#F3E5F5" }]}>
              <Feather name="star" size={20} color="#7E57C2" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.typeText}>Floating Holidays (FH)</Text>
              <Text style={styles.labelText}>Last Used</Text>
            </View>
            <View style={styles.rightContainer}>
              <Text style={styles.countText}>02</Text>
              <Text style={styles.dateText}>21-12-2025</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            style={[
              styles.tabItem,
              selectedTab === tab && styles.tabItemActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Leave Applications */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredLeaves.map((leave) => (
          <View key={leave.id} style={styles.leaveCard}>
            <View style={styles.leaveCardHeader}>
              <Text style={styles.leaveDateText}>{leave.date}</Text>
              <Text style={styles.leaveTypeText}>{leave.type}</Text>
            </View>
            <View style={styles.leaveCardBody}>
              <View>
                <Text style={styles.cardLabel}>Leave Date</Text>
                <Text style={styles.cardValue}>
                  {leave.from} - {leave.to}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.cardLabel}>Total Leave</Text>
                <Text style={styles.cardValue}>{leave.days}</Text>
              </View>
            </View>
            <View style={styles.statusContainer}>
              <Feather
                name={
                  leave.status === "Approved"
                    ? "check-circle"
                    : leave.status === "Pending"
                    ? "clock"
                    : "x-circle"
                }
                size={16}
                color={
                  leave.status === "Approved"
                    ? "#4CAF50"
                    : leave.status === "Pending"
                    ? "#FF9800"
                    : "#F44336"
                }
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      leave.status === "Approved"
                        ? "#4CAF50"
                        : leave.status === "Pending"
                        ? "#FF9800"
                        : "#F44336",
                  },
                ]}
              >
                {leave.status}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => {
          route.push("/(screen)/leaveForm");
        }}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Coming Soon Overlay */}
      {isComingSoon && (
        <View style={styles.overlay}>
          <View style={styles.comingSoonContainer}>
            <Feather name="calendar" size={60} color="#fff" />
            <Text style={styles.comingSoonText}>Coming Soon</Text>
            <Text style={styles.comingSoonSubtext}>
              Leave management feature is under development
            </Text>
            {/* Optional: Add a button to dismiss the overlay for testing */}
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
  },
  card: {
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
  },
  leaveRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(10),
  },
  iconWrapper: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    justifyContent: "center",
    alignItems: "center",
    marginRight: horizontalScale(12),
  },
  textContainer: {
    flex: 1,
  },
  typeText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
  labelText: {
    fontSize: moderateScale(12),
    color: "#888",
  },
  rightContainer: {
    alignItems: "flex-end",
  },
  countText: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#2196F3",
  },
  dateText: {
    fontSize: moderateScale(12),
    color: "#888",
  },
  divider: {
    height: verticalScale(0.5),
    backgroundColor: "#ccc",
    marginVertical: verticalScale(8),
    marginLeft: horizontalScale(48),
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f5f5f5",
    borderRadius: moderateScale(16),
    marginTop: verticalScale(24),
    marginHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(8),
  },
  tabItem: {
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
  },
  tabItemActive: {
    backgroundColor: "#005F90",
  },
  tabText: {
    fontSize: moderateScale(14),
    color: "#666",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#fff",
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: horizontalScale(20),
    paddingTop: verticalScale(20),
  },
  scrollContent: {
    paddingBottom: verticalScale(100),
  },
  leaveCard: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: verticalScale(16),
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowRadius: moderateScale(2),
  },
  leaveCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  leaveDateText: {
    fontWeight: "600",
    fontSize: moderateScale(14),
    color: "#333",
  },
  leaveTypeText: {
    fontWeight: "500",
    fontSize: moderateScale(14),
    color: "#666",
  },
  leaveCardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  cardLabel: {
    fontSize: moderateScale(12),
    color: "#888",
  },
  cardValue: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    marginLeft: horizontalScale(6),
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  floatingButton: {
    position: "absolute",
    bottom: verticalScale(100),
    left: "76%",
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: "#005F90",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(6),
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

export default Leave;
