import { Feather } from "@expo/vector-icons";
import Header from "app/components/Header";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import {
  getEmployeeProfile,
  getTimeslipsByEmployee,
  getAuthProfile,
} from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import {
  horizontalScale,
  moderateScale,
  verticalScale,
} from "utils/metrics";
import { darkTheme, lightTheme } from "../constants/colors";

const TimeSlipsWeb = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const { user, isAuthenticated } = useAuthStore();

  const [selectedTab, setSelectedTab] = useState("All");
  const [timestampEntries, setTimestampEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timestampData, setTimestampData] = useState({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const tabs = ["All", "Pending", "Approved", "Rejected"];

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

  const fetchTimeslips = async () => {
    if (!isAuthenticated || !user?.userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const profileRes = await getEmployeeProfile(user.userId);
      const empId = profileRes.data.id;

      const timeslipRes = await getTimeslipsByEmployee(empId, 10, 1);
      const timeslips = timeslipRes.data.data;

      const formattedEntries = timeslips.map((slip: any) => ({
        id: slip.id,
        date: new Date(slip.date).toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        status: slip.status || "PENDING",
        checkIn: slip.corrected_in
          ? new Date(slip.corrected_in).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--",
        checkOut: slip.corrected_out
          ? new Date(slip.corrected_out).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--",
      }));

      setTimestampEntries(formattedEntries);

      setTimestampData({
        all: formattedEntries.length,
        pending: formattedEntries.filter((e) => e.status === "PENDING").length,
        approved: formattedEntries.filter((e) => e.status === "APPROVED").length,
        rejected: formattedEntries.filter((e) => e.status === "REJECTED").length,
      });
    } catch (error) {
      console.error("Error fetching timeslips:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.userId) {
      fetchTimeslips();
    }
  }, [user?.userId, isAuthenticated]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTimeslips();
    setRefreshing(false);
  };

  const filteredTimestamps = timestampEntries.filter((entry) => {
    if (selectedTab === "All") return true;
    return entry.status === selectedTab.toUpperCase();
  });

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#026D94" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Time Slips" />
      <View style={styles.webContainer}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={styles.title}>Time Slips Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{timestampData.all}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={[styles.statValue, { color: "#F59E0B" }]}>
                {timestampData.pending}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Approved</Text>
              <Text style={[styles.statValue, { color: "#10B981" }]}>
                {timestampData.approved}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Rejected</Text>
              <Text style={[styles.statValue, { color: "#EF4444" }]}>
                {timestampData.rejected}
              </Text>
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

        <View style={[styles.tableContainer, { backgroundColor: colors.white }]}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 1.5 }]}>Date</Text>
            <Text style={[styles.tableCell, { flex: 1.5 }]}>Check In</Text>
            <Text style={[styles.tableCell, { flex: 1.5 }]}>Check Out</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Status</Text>
          </View>
          <ScrollView
            style={styles.tableBody}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {filteredTimestamps.map((entry) => (
              <View key={entry.id.toString()} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>
                  {entry.date}
                </Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>
                  {entry.checkIn}
                </Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>
                  {entry.checkOut}
                </Text>
                <View style={[styles.tableCell, { flex: 1 }]}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(entry.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>{entry.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webContainer: {
    flex: 1,
    padding: horizontalScale(40),
    maxWidth: 1400,
    alignSelf: "center",
    width: "100%",
  },
  card: {
    borderRadius: moderateScale(12),
    padding: moderateScale(30),
    marginBottom: verticalScale(30),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#E8ECEF",
  },
  title: {
    fontSize: moderateScale(24),
    fontWeight: "700",
    color: "#035F91",
    marginBottom: verticalScale(20),
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: horizontalScale(20),
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: moderateScale(20),
    borderRadius: moderateScale(8),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statLabel: {
    fontSize: moderateScale(14),
    color: "#666",
    marginBottom: verticalScale(8),
    fontWeight: "500",
  },
  statValue: {
    fontSize: moderateScale(32),
    fontWeight: "700",
    color: "#035F91",
  },
  tabBar: {
    flexDirection: "row",
    gap: horizontalScale(8),
    marginBottom: verticalScale(20),
  },
  tabItem: {
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabItemActive: {
    backgroundColor: "#005F90",
    borderColor: "#005F90",
  },
  tabText: {
    fontSize: moderateScale(13),
    color: "#666",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
  },
  tableContainer: {
    borderRadius: moderateScale(8),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8ECEF",
    maxHeight: verticalScale(600),
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECEF",
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    alignItems: "center",
  },
  tableCell: {
    fontSize: moderateScale(13),
    color: "#333",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(6),
    alignItems: "center",
  },
  statusText: {
    color: "#fff",
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
});

export default TimeSlipsWeb;
