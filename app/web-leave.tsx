import { Feather } from "@expo/vector-icons";
import Header from "app/components/Header";
import React, { useCallback, useEffect, useState } from "react";
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
import { getLeaveBalance, getLeaveRequests } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import {
  horizontalScale,
  moderateScale,
  verticalScale,
} from "utils/metrics";
import { darkTheme, lightTheme } from "../constants/colors";

const LeaveWeb = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const { user } = useAuthStore();

  const [selectedTab, setSelectedTab] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);

  const tabs = ["All", "Pending", "Approved", "Rejected"];

  const normalizeStatus = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (!s) return "Unknown";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  };

  const fetchLeaveData = useCallback(async () => {
    if (!user?.userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [balanceRes, requestsRes] = await Promise.allSettled([
        getLeaveBalance(user.userId),
        getLeaveRequests(user.userId),
      ]);

      if (balanceRes.status === "fulfilled") {
        const data = balanceRes.value?.data ?? [];
        setLeaveBalances(Array.isArray(data) ? data : []);
      }

      if (requestsRes.status === "fulfilled") {
        const data = requestsRes.value?.data ?? [];
        setLeaveRequests(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching leave data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLeaveData();
    setRefreshing(false);
  }, [fetchLeaveData]);

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  const filteredLeaves =
    selectedTab === "All"
      ? leaveRequests
      : leaveRequests.filter(
          (item) => normalizeStatus(item.status) === selectedTab
        );

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "Approved":
        return "#4CAF50";
      case "Pending":
        return "#FF9800";
      case "Rejected":
        return "#F44336";
      default:
        return "#666";
    }
  };

  const getStatusBgColor = (status: string): string => {
    switch (status) {
      case "Approved":
        return "#E8F5E9";
      case "Pending":
        return "#FFF3E0";
      case "Rejected":
        return "#FFEBEE";
      default:
        return "#F5F5F5";
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#026D94" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Leave" />
      <View style={styles.webContainer}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={styles.title}>Leave Balance</Text>
          <View style={styles.balanceGrid}>
            {leaveBalances.map((balance, index) => (
              <View key={balance.id || index} style={styles.balanceBox}>
                <View style={styles.balanceIcon}>
                  <Feather name="calendar" size={24} color="#2196F3" />
                </View>
                <Text style={styles.balanceType}>
                  {balance.leaveType?.name || "Leave"}
                </Text>
                <Text style={styles.balanceValue}>
                  {balance.closingBalance ?? 0}
                </Text>
                <Text style={styles.balanceLabel}>Available</Text>
              </View>
            ))}
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
          style={styles.leaveList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredLeaves.map((leave) => (
            <View key={leave.id} style={[styles.leaveCard, { backgroundColor: colors.white }]}>
              <View style={styles.leaveCardHeader}>
                <View>
                  <Text style={styles.leaveType}>
                    {leave.leaveType?.name || "Leave"}
                  </Text>
                  <Text style={styles.leaveDate}>
                    {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.leaveStatus,
                    {
                      backgroundColor: getStatusBgColor(
                        normalizeStatus(leave.status)
                      ),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.leaveStatusText,
                      {
                        color: getStatusColor(normalizeStatus(leave.status)),
                      },
                    ]}
                  >
                    {normalizeStatus(leave.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.leaveCardBody}>
                <View style={styles.leaveDetail}>
                  <Text style={styles.leaveDetailLabel}>Days</Text>
                  <Text style={styles.leaveDetailValue}>
                    {leave.numberOfDays ??
                      leave.totalDays ??
                      leave.days ??
                      leave.duration ??
                      "-"}
                  </Text>
                </View>
                <View style={styles.leaveDetail}>
                  <Text style={styles.leaveDetailLabel}>Applied On</Text>
                  <Text style={styles.leaveDetailValue}>
                    {formatDate(leave.createdAt)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
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
  balanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: horizontalScale(20),
  },
  balanceBox: {
    flex: 1,
    minWidth: horizontalScale(150),
    backgroundColor: "#F8FAFC",
    padding: moderateScale(20),
    borderRadius: moderateScale(8),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  balanceIcon: {
    marginBottom: verticalScale(12),
  },
  balanceType: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(8),
  },
  balanceValue: {
    fontSize: moderateScale(28),
    fontWeight: "700",
    color: "#2196F3",
    marginBottom: verticalScale(4),
  },
  balanceLabel: {
    fontSize: moderateScale(12),
    color: "#666",
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
  leaveList: {
    flex: 1,
  },
  leaveCard: {
    borderRadius: moderateScale(8),
    padding: moderateScale(16),
    marginBottom: verticalScale(16),
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  leaveCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: verticalScale(12),
  },
  leaveType: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: "#333",
    marginBottom: verticalScale(4),
  },
  leaveDate: {
    fontSize: moderateScale(12),
    color: "#666",
  },
  leaveStatus: {
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(6),
  },
  leaveStatusText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  leaveCardBody: {
    flexDirection: "row",
    gap: horizontalScale(20),
  },
  leaveDetail: {
    flex: 1,
  },
  leaveDetailLabel: {
    fontSize: moderateScale(12),
    color: "#666",
    marginBottom: verticalScale(4),
  },
  leaveDetailValue: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
});

export default LeaveWeb;
