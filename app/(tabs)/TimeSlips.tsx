import { Feather } from "@expo/vector-icons";
import Header from "app/components/Header";
import { darkTheme, lightTheme } from "app/constants/colors";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import {
  getEmployeeProfile,
  getTimeslipsByEmployee,
  getAuthProfile,
} from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import TimeSlipsSkeleton from "../Loaders/TimeSlipsSkeleton";

// TypeScript Interfaces
interface TimestampEntry {
  id: string | number;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  checkIn: {
    time: string | null;
    location: string;
  } | null;
  checkOut: {
    time: string | null;
    location: string;
  } | null;
}

interface EmployeeProfileResponse {
  data: {
    id: string | number;
    workEmail: string;
  };
}

interface TimeslipResponse {
  data: {
    data: Array<{
      id: string | number;
      date: string;
      corrected_in: string | null;
      corrected_out: string | null;
      missing_type: "IN" | "OUT" | "BOTH" | null;
      status: "PENDING" | "APPROVED" | "REJECTED";
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface AuthProfileResponse {
  data: {
    isApprover: boolean;
    userId: string | number;
    email: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    dob: string;
    gender: string;
    mobileNumber: string;
    mustChangePassword: boolean;
    organizationId: string;
    roles: Array<{ id: string; roleName: string }>;
    userName: string;
  };
}

interface User {
  userId: string | number;
}

type Tab = "All" | "Pending" | "Approved" | "Rejected";

export default function TimeSlips() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const [selectedTab, setSelectedTab] = useState<Tab>("All");
  const [fabOpen, setFabOpen] = useState<boolean>(false);
  const [timestampEntries, setTimestampEntries] = useState<TimestampEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isApprover, setIsApprover] = useState<boolean>(false);
  const [employeeId, setEmployeeId] = useState<string | number | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const router = useRouter();
  const { user, isAuthenticated, initializeAuth } = useAuthStore();

  // Animation values
  const slideValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  // Initialize auth store on component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeAuth();
      } catch (err) {
        console.error("❌ Error initializing auth:", err);
        setError("Authentication failed. Please login again.");
        setLoading(false);
      }
    };

    if (!isAuthenticated && !user) {
      initialize();
    }
  }, [isAuthenticated, user, initializeAuth]);

  // Fetch auth profile to determine if user is an approver
  useEffect(() => {
    const fetchAuthProfile = async () => {
      if (!user?.userId || !isAuthenticated) return;
      
      try {
        const response: AuthProfileResponse = await getAuthProfile();
        setIsApprover(response.data.isApprover);
      } catch (err) {
        console.error("❌ Error fetching auth profile:", err);
        setIsApprover(false);
      }
    };

    fetchAuthProfile();
  }, [user?.userId, isAuthenticated]);

  // Fetch employee profile and timeslips
  const fetchTimeslips = async () => {
    // Early return if user is not authenticated or userId is missing
    if (!isAuthenticated || !user?.userId) {
      console.log("⚠️ User not authenticated or userId missing:", { isAuthenticated, userId: user?.userId });
      setError("Please login to view timeslips");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      setRefreshing(true);
      setError(null); // Clear any previous errors

      console.log("🔄 Fetching timeslips for userId:", user.userId);

      // Fetch employee profile to get employee ID
      const response: EmployeeProfileResponse = await getEmployeeProfile(
        user.userId
      );
      const empId = response.data.id;
      setEmployeeId(empId);

      if (!empId) {
        throw new Error("Employee ID not found in profile");
      }

      console.log("✅ Employee ID found:", empId);

      // Fetch timeslips using employee ID
      const timeslipResponse: TimeslipResponse = await getTimeslipsByEmployee(empId, 10, 1);
      const timeslips = timeslipResponse.data.data;

      const formattedEntries: TimestampEntry[] = timeslips.map((slip) => {
        // Validate status
        const status = ["PENDING", "APPROVED", "REJECTED"].includes(slip.status)
          ? slip.status
          : "PENDING"; // Fallback to "PENDING" if invalid

        return {
          id: slip.id,
          date: new Date(slip.date).toLocaleDateString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          status,
          checkIn:
            slip.missing_type === "IN" || slip.missing_type === "BOTH"
              ? {
                  time: slip.corrected_in
                    ? new Date(slip.corrected_in).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : null,
                  location: response.data.workEmail?.includes(
                    "mycompany.com"
                  )
                    ? "Office - Main Building"
                    : "Remote Work",
                }
              : null,
          checkOut:
            slip.missing_type === "OUT" || slip.missing_type === "BOTH"
              ? {
                  time: slip.corrected_out
                    ? new Date(slip.corrected_out).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : null,
                  location: response.data.workEmail?.includes(
                    "mycompany.com"
                  )
                    ? "Office - Main Building"
                    : "Remote Work",
                }
              : null,
        };
      });

      setTimestampEntries(formattedEntries);
      setError(null);
      console.log("✅ Timeslips fetched successfully:", formattedEntries.length);

    } catch (err: unknown) {
      console.error("❌ Error fetching timeslips:", err);
      
      if (err instanceof Error) {
        if (err.message.includes("404")) {
          setError("No timeslips or employee profile found");
          setTimestampEntries([]);
        } else if (err.message.includes("401") || err.message.includes("unauthorized")) {
          setError("Session expired. Please login again.");
        } else {
          setError("Failed to fetch timeslip data. Please try again.");
        }
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch timeslips when user data is available and authenticated
  useEffect(() => {
    if (isAuthenticated && user?.userId) {
      fetchTimeslips();
    }
  }, [user?.userId, isAuthenticated]);

  // Animation effect for FAB (only when isApprover is true)
  useEffect(() => {
    if (isApprover && fabOpen) {
      Animated.parallel([
        Animated.spring(slideValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [fabOpen, isApprover]);

  const toggleFab = () => {
    if (isApprover) {
      setFabOpen(!fabOpen);
    } else {
      router.push("/(screen)/addTimeSlip");
    }
  };

  const handleAddTimeStamp = () => {
    router.push("/(screen)/addTimeSlip");
    setFabOpen(false);
  };

  const handleApprove = () => {
    router.push("/(screen)/TimeslipApprove");
    setFabOpen(false);
  };

  const handleSeeStatus = (entryId: string | number) => {
    const route = `/(screen)/timeslip/${entryId}`;
    console.log("➡️ Redirecting to:", route);
    router.push(route);
  };

  // Handle pull-to-refresh
  const onRefresh = () => {
    if (isAuthenticated && user?.userId) {
      setRefreshing(true);
      fetchTimeslips();
    }
  };

  // Calculate summary data
  const timestampData = {
    all: timestampEntries.length,
    pending: timestampEntries.filter((entry) => entry.status === "PENDING").length,
    approved: timestampEntries.filter((entry) => entry.status === "APPROVED").length,
    rejected: timestampEntries.filter((entry) => entry.status === "REJECTED").length,
  };

  const tabs: Tab[] = ["All", "Pending", "Approved", "Rejected"];

  const filteredTimestamps = (timestampEntries || []).filter((entry) => {
    if (selectedTab === "All") return true;
    return entry.status === selectedTab.toUpperCase();
  });

  const hasPendingRequests = timestampEntries.some(
    (entry) => entry.status === "PENDING"
  );

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "APPROVED":
        return "#10B981";
      case "PENDING":
        return "#F59E0B";
      case "REJECTED":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const translateY = slideValue.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  // Show loading while initializing or fetching
  if (loading || (!isAuthenticated && !error)) {
    return <TimeSlipsSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
            padding: horizontalScale(20),
          },
        ]}
      >
        <Feather name="alert-circle" size={48} color="#EF4444" />
        <Text style={{ 
          color: colors.text, 
          fontSize: moderateScale(16),
          textAlign: "center",
          marginTop: verticalScale(16),
          marginBottom: verticalScale(24),
        }}>
          {error}
        </Text>
        {error.includes("login") && (
          <TouchableOpacity
            style={{
              backgroundColor: "#005F90",
              paddingHorizontal: horizontalScale(24),
              paddingVertical: verticalScale(12),
              borderRadius: moderateScale(8),
            }}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={{ color: "#fff", fontSize: moderateScale(14), fontWeight: "600" }}>
              Go to Login
            </Text>
          </TouchableOpacity>
        )}
        {!error.includes("login") && (
          <TouchableOpacity
            style={{
              backgroundColor: "#005F90",
              paddingHorizontal: horizontalScale(24),
              paddingVertical: verticalScale(12),
              borderRadius: moderateScale(8),
            }}
            onPress={onRefresh}
          >
            <Text style={{ color: "#fff", fontSize: moderateScale(14), fontWeight: "600" }}>
              Retry
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Time Slips" />
      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <View style={styles.triangle} />
          <View style={styles.triangle2} />
          <View style={styles.triangle3} />
          <View style={styles.triangle4} />
          <View style={styles.contentContainer}>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <View
                  style={[styles.statDot, { backgroundColor: "#64748B" }]}
                />
                <Text style={styles.statNumber}>{timestampData.all}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View
                  style={[styles.statDot, { backgroundColor: "#F59E0B" }]}
                />
                <Text style={[styles.statNumber, { color: "#F59E0B" }]}>
                  {timestampData.pending}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View
                  style={[styles.statDot, { backgroundColor: "#10B981" }]}
                />
                <Text style={[styles.statNumber, { color: "#10B981" }]}>
                  {timestampData.approved}
                </Text>
                <Text style={styles.statLabel}>Approved</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
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
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
            colors={[colors.primary]}
          />
        }
      >
        {filteredTimestamps.map((entry) => (
          <View key={entry.id.toString()} style={styles.timestampCard}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>{entry.date}</Text>
            </View>
            <View style={styles.timeEntriesContainer}>
              <View style={styles.timeEntry}>
                <View style={styles.timeEntryHeader}>
                  <View
                    style={[styles.entryIcon, { backgroundColor: "#E3F2FD" }]}
                  >
                    <Feather name="log-in" size={16} color="#2196F3" />
                  </View>
                  <Text style={styles.entryLabel}>Check In</Text>
                </View>
                {entry.checkIn && typeof entry.checkIn.time === "string" ? (
                  <View style={styles.timeDetails}>
                    <Text style={styles.timeValue}>{entry.checkIn.time}</Text>
                    <View style={styles.statusContainer}>
                      <View
                        style={[
                          styles.statusIndicator,
                          {
                            backgroundColor: getStatusColor(entry.status || "PENDING"),
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(entry.status || "PENDING") },
                        ]}
                      >
                        {entry.status || "--"}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.timeDetails}>
                    <Text style={styles.noTimeValue}>Not recorded</Text>
                    <View style={styles.statusContainer}>
                      <View
                        style={[
                          styles.statusIndicator,
                          { backgroundColor: "#9CA3AF" },
                        ]}
                      />
                      <Text style={[styles.statusText, { color: "#9CA3AF" }]}>
                        --
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              <View style={styles.verticalDivider}>
                <View style={styles.dividerLine} />
                <View style={styles.dividerDot} />
              </View>
              <View style={styles.timeEntry}>
                <View style={styles.timeEntryHeader}>
                  <View
                    style={[styles.entryIcon, { backgroundColor: "#FFF3E0" }]}
                  >
                    <Feather name="log-out" size={16} color="#FF9800" />
                  </View>
                  <Text style={styles.entryLabel}>Check Out</Text>
                </View>
                {entry.checkOut && typeof entry.checkOut.time === "string" ? (
                  <View style={styles.timeDetails}>
                    <Text style={styles.timeValue}>{entry.checkOut.time}</Text>
                    <View style={styles.statusContainer}>
                      <View
                        style={[
                          styles.statusIndicator,
                          {
                            backgroundColor: getStatusColor(entry.status || "PENDING"),
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(entry.status || "PENDING") },
                        ]}
                      >
                        {entry.status || "--"}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.timeDetails}>
                    <Text style={styles.noTimeValue}>Not recorded</Text>
                    <View style={styles.statusContainer}>
                      <View
                        style={[
                          styles.statusIndicator,
                          { backgroundColor: "#9CA3AF" },
                        ]}
                      />
                      <Text style={[styles.statusText, { color: "#9CA3AF" }]}>
                        --
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.actionButtonContainer}>
              <TouchableOpacity
                style={styles.seeStatusButton}
                onPress={() => handleSeeStatus(entry.id)}
              >
                <Feather name="eye" size={16} color="#005F90" />
                <Text style={styles.seeStatusText}>See Details</Text>
                <Feather name="chevron-right" size={16} color="#005F90" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {filteredTimestamps.length === 0 && (
          <View style={styles.emptyContainer}>
            <Feather name="clock" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              No {selectedTab.toLowerCase()} timeslips found
            </Text>
          </View>
        )}
      </ScrollView>
      {isApprover && fabOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setFabOpen(false)}
        />
      )}
      {isApprover ? (
        <Animated.View
          style={[
            styles.fabActionsContainer,
            {
              transform: [{ translateY }],
              opacity: opacityValue,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.fabActionBox, { backgroundColor: "#4CAF50" }]}
            onPress={handleApprove}
          >
            <View style={styles.fabActionContent}>
              <View style={styles.fabActionIconContainer}>
                <Feather name="check-circle" size={20} color="#fff" />
                {hasPendingRequests && (
                  <View style={styles.actionNotificationDot} />
                )}
              </View>
              <Text style={styles.fabActionText}>Approve</Text>
              <Text style={styles.fabActionSubText}>Requests</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabActionBox, { backgroundColor: "#2196F3" }]}
            onPress={handleAddTimeStamp}
          >
            <View style={styles.fabActionContent}>
              <View style={styles.fabActionIconContainer}>
                <Feather name="plus" size={20} color="#fff" />
              </View>
              <Text style={styles.fabActionText}>Add Time</Text>
              <Text style={styles.fabActionSubText}>Slip</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ) : null}
      <TouchableOpacity style={styles.fab} onPress={toggleFab}>
        <Animated.View
          style={{
            transform: [
              {
                rotate: isApprover ? (fabOpen ? "45deg" : "0deg") : "0deg",
              },
            ],
          }}
        >
          <Feather
            name={isApprover ? "menu" : "plus"}
            size={24}
            color="#ffffffff"
          />
        </Animated.View>
        {hasPendingRequests && isApprover && !fabOpen && (
          <View style={styles.mainFabNotificationDot} />
        )}
      </TouchableOpacity>
    </View>
  );
}

// Styles (unchanged)
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
    borderRadius: moderateScale(20),
    padding: moderateScale(50),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    borderWidth: 1,
    borderColor: "#E8ECEF",
    backgroundColor: "#FFFFFF",
    position: "relative",
    overflow: "hidden",
  },
  contentContainer: {
    zIndex: 2,
    position: "relative",
  },
  triangle: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#E1F4FF",
    borderRightColor: "transparent",
  },
  triangle2: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#E1F4FF",
    borderRightColor: "transparent",
    transform: [{ rotate: "180deg" }],
  },
  triangle3: {
    position: "absolute",
    bottom: 10,
    left: 10,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#E1F4FF",
    borderRightColor: "transparent",
    transform: [{ rotate: "270deg" }],
  },
  triangle4: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#E1F4FF",
    borderRightColor: "transparent",
    transform: [{ rotate: "90deg" }],
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDot: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    marginBottom: verticalScale(8),
  },
  statNumber: {
    fontSize: moderateScale(24),
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: verticalScale(4),
  },
  statLabel: {
    fontSize: moderateScale(12),
    color: "#6B7280",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: moderateScale(40),
    backgroundColor: "#E5E7EB",
    marginHorizontal: horizontalScale(16),
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f8f9fa",
    borderRadius: moderateScale(12),
    marginTop: verticalScale(24),
    marginHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(6),
  },
  tabItem: {
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
  },
  tabItemActive: {
    backgroundColor: "#005F90",
  },
  tabText: {
    fontSize: moderateScale(13),
    color: "#666",
    fontWeight: "600",
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
    paddingBottom: verticalScale(120),
  },
  timestampCard: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(16),
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowRadius: moderateScale(4),
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  dateBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#005F90",
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(6),
    borderBottomLeftRadius: moderateScale(8),
    zIndex: 1,
  },
  dateBadgeText: {
    color: "#fff",
    fontSize: moderateScale(10),
    fontWeight: "700",
  },
  timeEntriesContainer: {
    flexDirection: "row",
    padding: moderateScale(16),
    paddingTop: moderateScale(20),
  },
  timeEntry: {
    flex: 1,
  },
  timeEntryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  entryIcon: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    justifyContent: "center",
    alignItems: "center",
    marginRight: horizontalScale(8),
  },
  entryLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#6B7280",
  },
  timeDetails: {
    alignItems: "flex-start",
  },
  timeValue: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: verticalScale(8),
  },
  noTimeValue: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#D1D5DB",
    marginBottom: verticalScale(8),
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    marginRight: horizontalScale(6),
  },
  statusText: {
    fontSize: moderateScale(11),
    fontWeight: "600",
  },
  verticalDivider: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: horizontalScale(16),
    position: "relative",
  },
  dividerLine: {
    width: 1,
    height: moderateScale(60),
    backgroundColor: "#E5E7EB",
    borderRadius: moderateScale(1),
  },
  dividerDot: {
    position: "absolute",
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
    backgroundColor: "#005F90",
  },
  actionButtonContainer: {
    padding: moderateScale(16),
    paddingTop: moderateScale(12),
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  seeStatusButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  seeStatusText: {
    flex: 1,
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#005F90",
    marginLeft: horizontalScale(12),
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(60),
  },
  emptyText: {
    fontSize: moderateScale(16),
    color: "#999",
    marginTop: verticalScale(16),
    textAlign: "center",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 999,
  },
  fabActionsContainer: {
    position: "absolute",
    bottom: verticalScale(130),
    right: horizontalScale(20),
    flexDirection: "row",
    gap: horizontalScale(12),
    zIndex: 1000,
  },
  fabActionBox: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(16),
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(3) },
    shadowOpacity: 0.25,
    shadowRadius: moderateScale(6),
  },
  fabActionContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  fabActionIconContainer: {
    position: "relative",
    marginBottom: verticalScale(4),
  },
  fabActionText: {
    color: "#fff",
    fontSize: moderateScale(11),
    fontWeight: "700",
    textAlign: "center",
  },
  fabActionSubText: {
    color: "#fff",
    fontSize: moderateScale(9),
    fontWeight: "500",
    textAlign: "center",
    opacity: 0.9,
  },
  fab: {
    position: "absolute",
    bottom: verticalScale(60),
    left: "85%",
    transform: [{ translateX: -moderateScale(28) }],
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
    zIndex: 1001,
  },
  actionNotificationDot: {
    position: "absolute",
    top: moderateScale(-2),
    right: moderateScale(-2),
    width: moderateScale(10),
    height: moderateScale(10),
    borderRadius: moderateScale(5),
    backgroundColor: "#FF4444",
    borderWidth: 2,
    borderColor: "#fff",
  },
  mainFabNotificationDot: {
    position: "absolute",
    top: moderateScale(4),
    right: moderateScale(4),
    width: moderateScale(12),
    height: moderateScale(12),
    borderRadius: moderateScale(6),
    backgroundColor: "#FF4444",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
