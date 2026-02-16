import { Feather } from "@expo/vector-icons";
import Header from "app/components/Header";
import { darkTheme, lightTheme } from "app/constants/colors";
import { useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  Animated,
  RefreshControl,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import {
  horizontalScale,
  moderateScale,
  verticalScale,
} from "utils/metrics";
import {
  getAllTimeslipsByEmployee,
  getEmployeeProfile,
  batchApproveUpdate,
} from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import TimeslipApproveSkeleton from "app/Loaders/TimeslipApproveSkeleton";

interface Approval {
  id: string;
  action: "PENDING" | "APPROVED" | "REJECTED";
  remarks: string | null;
  acted_at: string | null;
  total_steps: number;
  current_step: boolean;
}

interface TimeslipEntry {
  id: string;
  date: string;
  corrected_in: string | null;
  corrected_out: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason?: string;
  approval: Approval;
  approvalId?: string;
  employee: {
    firstName: string;
    lastName: string;
  };
}

// Debounce utility
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

const TimeslipApprove = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const [timestampEntries, setTimestampEntries] = useState<TimeslipEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [checkAll, setCheckAll] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"Pending" | "All">("Pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedReasons, setExpandedReasons] = useState<{ [key: string]: boolean }>({});
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Animation values
  const approveScale = useRef(new Animated.Value(1)).current;
  const rejectScale = useRef(new Animated.Value(1)).current;

  // Format utilities
  const formatDate = (isoString: string | null): string => {
    if (!isoString) return "Not recorded";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const formatTime = (isoString: string | null): string => {
    if (!isoString) return "Not recorded";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "Invalid time";
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Invalid time";
    }
  };

  const truncateReason = (reason: string | undefined, wordLimit: number = 8): string => {
    if (!reason) return "No reason provided";
    const words = reason.split(" ");
    if (words.length <= wordLimit) return reason;
    return words.slice(0, wordLimit).join(" ") + "...";
  };

  const toggleReasonExpansion = (id: string) => {
    setExpandedReasons((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Fetch profile and timeslips
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.userId) {
        setError("User ID not found");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const profileRes = await getEmployeeProfile(user.userId);
        const empId = profileRes.data.id;
        setEmployeeId(empId);
        const timeslipRes = await getAllTimeslipsByEmployee(empId, 10, 1);
        const allTimeslips = timeslipRes.data.data
          .map((entry: TimeslipEntry, index: number) => ({
            ...entry,
            id: entry.id || `fallback-${index}`, // Fallback for missing id
            approvalId: entry.approval?.id,
          }));
        console.log("Timeslips:", allTimeslips); // Debug log
        setTimestampEntries(allTimeslips);
      } catch (err: any) {
        setError("Failed to load data");
        console.error("Error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };
    fetchData();
  }, [user?.userId]);

  // Pull-to-refresh
  const fetchTimeslips = async () => {
    if (!employeeId) return;
    try {
      setRefreshing(true);
      const res = await getAllTimeslipsByEmployee(employeeId, 10, 1);
      const allTimeslips = res.data.data
        .map((entry: TimeslipEntry, index: number) => ({
          ...entry,
          id: entry.id || `fallback-${index}`, // Fallback for missing id
          approvalId: entry.approval?.id,
        }));
      setTimestampEntries(allTimeslips);
    } catch (err: any) {
      setError("Failed to load timeslips");
      console.error("Error fetching timeslips:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = debounce(() => {
    setRefreshing(true);
    fetchTimeslips();
  }, 300);

  const countPendingTimeslips = () =>
    timestampEntries.filter((entry) => entry.status === "PENDING").length;

  const handleCheckAll = () => {
    if (checkAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(
        filteredTimestamps
          .filter((entry) => entry.status === "PENDING")
          .map((entry) => entry.id)
      );
    }
    setCheckAll(!checkAll);
  };

  const handleCheckboxToggle = (id: string) => {
    const entry = timestampEntries.find((e) => e.id === id);
    if (entry?.status !== "PENDING") return;
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id]
    );
    setCheckAll(false);
  };

  const handleButtonPressIn = (scale: Animated.Value) => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const handleButtonPressOut = (scale: Animated.Value) => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  const handleUpdateStatus = async (
    ids: string[],
    status: "APPROVED" | "REJECTED"
  ) => {
    if (ids.length === 0) return;
    const approvalIds = timestampEntries
      .filter((entry) => ids.includes(entry.id))
      .map((entry) => entry.approvalId)
      .filter((id): id is string => !!id);

    setTimestampEntries((prev) =>
      prev.map((entry) =>
        ids.includes(entry.id) ? { ...entry, status } : entry
      )
    );
    setSelectedIds([]);
    setCheckAll(false);

    try {
      await batchApproveUpdate(approvalIds, status, "Status updated");
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update timeslip status");
      setTimestampEntries((prev) =>
        prev.map((entry) =>
          ids.includes(entry.id) ? { ...entry, status: "PENDING" } : entry
        )
      );
    }
  };

  const getStatusColor = (
    status: "PENDING" | "APPROVED" | "REJECTED" | undefined
  ) => {
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

  const filteredTimestamps = timestampEntries.filter((entry) =>
    selectedTab === "Pending"
      ? entry.status === "PENDING"
      : entry.status === "APPROVED" || entry.status === "REJECTED"
  );

  const renderTimeslipCard = ({ item: entry }: { item: TimeslipEntry }) => (
    <View style={styles.timestampCard}>
      <View style={[styles.dateBadge, { backgroundColor: colors.primary }]}>
        <Text style={[styles.cardHeaderText, { color: colors.white }]}>
          {formatDate(entry.date)}
        </Text>
      </View>

      {entry.status === "PENDING" && (
        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            onPress={() => handleCheckboxToggle(entry.id)}
            style={styles.checkbox}
          >
            <Feather
              name={selectedIds.includes(entry.id) ? "check-square" : "square"}
              size={moderateScale(20)}
              color={selectedIds.includes(entry.id) ? "#005F90" : "#6B7280"}
            />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statusContainer}>
        <Feather
          name={
            entry.status === "APPROVED"
              ? "check-circle"
              : entry.status === "PENDING"
              ? "clock"
              : "x-circle"
          }
          size={16}
          color={getStatusColor(entry.status)}
        />
        <Text
          style={[styles.statusText, { color: getStatusColor(entry.status) }]}
        >
          {entry.status}
        </Text>
      </View>

      <View style={styles.timeEntriesContainer}>
        <View style={styles.timeEntry}>
          <View style={styles.timeEntryHeader}>
            <View style={[styles.entryIcon, { backgroundColor: "#E3F2FD" }]}>
              <Feather name="log-in" size={16} color="#2196F3" />
            </View>
            <Text style={styles.entryLabel}>Check In</Text>
          </View>
          <Text
            style={entry.corrected_in ? styles.timeValue : styles.noTimeValue}
          >
            {formatTime(entry.corrected_in)}
          </Text>
        </View>
        <View style={styles.verticalDivider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <View style={[styles.dividerDot, { backgroundColor: colors.primary }]} />
        </View>
        <View style={styles.timeEntry}>
          <View style={styles.timeEntryHeader}>
            <View style={[styles.entryIcon, { backgroundColor: "#FFF3E0" }]}>
              <Feather name="log-out" size={16} color="#FF9800" />
            </View>
            <Text style={styles.entryLabel}>Check Out</Text>
          </View>
          <Text
            style={entry.corrected_out ? styles.timeValue : styles.noTimeValue}
          >
            {formatTime(entry.corrected_out)}
          </Text>
        </View>
      </View>

      <View style={styles.reasonContainer}>
        <View style={styles.reasonHeader}>
          <View style={styles.reasonHeaderContent}>
            <View style={[styles.entryIcon, { backgroundColor: "#ECEFF1" }]}>
              <Feather name="info" size={16} color="#607D8B" />
            </View>
            <Text style={styles.entryLabel}>Reason</Text>
          </View>
          <Text style={styles.employeeName}>
            {`${entry.employee.firstName} ${entry.employee.lastName}`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => toggleReasonExpansion(entry.id)}>
          <Text
            style={styles.reasonText}
            numberOfLines={expandedReasons[entry.id] ? undefined : 2}
          >
            {expandedReasons[entry.id]
              ? entry.reason || "No reason provided"
              : truncateReason(entry.reason)}
          </Text>
        </TouchableOpacity>
      </View>

      {entry.status === "PENDING" && selectedIds.length === 0 && (
        <View style={styles.individualButtonContainer}>
          <TouchableOpacity
            style={[styles.individualButton, styles.approveButton]}
            onPress={() => handleUpdateStatus([entry.id], "APPROVED")}
          >
            <Feather name="check" size={16} color="#fff" />
            <Text style={styles.individualButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.individualButton, styles.rejectButton]}
            onPress={() => handleUpdateStatus([entry.id], "REJECTED")}
          >
            <Feather name="x" size={16} color="#fff" />
            <Text style={styles.individualButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return <TimeslipApproveSkeleton />;
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Text style={{ color: colors.text, fontSize: moderateScale(16) }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Approve Timeslips" />

      {/* Stats Card */}
      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: "#FFFFFF", borderColor: "#E8ECEF" }]}>
          <View style={[styles.triangle, { borderTopColor: "#E1F4FF" }]} />
          <View style={[styles.triangle2, { borderTopColor: "#E1F4FF" }]} />
          <View style={[styles.tulipArea, { borderTopColor: "#E1F4FF" }]} />
          <View style={[styles.triangle4, { borderTopColor: "#E1F4FF" }]} />
          <View style={styles.contentContainer}>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: "#64748B" }]} />
                <Text style={styles.statNumber}>{timestampEntries.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: "#F59E0B" }]} />
                <Text style={[styles.statNumber, { color: "#F59E0B" }]}>
                  {countPendingTimeslips()}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: "#005F90" }]} />
                <Text style={[styles.statNumber, { color: "#005F90" }]}>
                  {selectedIds.length}
                </Text>
                <Text style={styles.statLabel}>Selected</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(["Pending", "All"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            style={[styles.tabItem, selectedTab === tab && styles.tabItemActive]}
          >
            <Text
              style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedTab === "Pending" && (
        <View style={styles.checkAllContainer}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={handleCheckAll}
          >
            <Text style={styles.checkAllText}>Check All</Text>
            <Feather
              name={checkAll ? "check-square" : "square"}
              size={moderateScale(20)}
              color={checkAll ? "#005F90" : "#6B7280"}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Timeslip List */}
      <FlatList
        data={filteredTimestamps}
        renderItem={renderTimeslipCard}
        keyExtractor={(item, index) => item.id || `fallback-${index}`}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="clock" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              No {selectedTab.toLowerCase()} timeslips found
            </Text>
          </View>
        }
      />

      {selectedTab === "Pending" && selectedIds.length > 0 && (
        <View style={styles.buttonContainer}>
          <Animated.View
            style={{ transform: [{ scale: approveScale }], flex: 1 }}
          >
            <TouchableOpacity
              style={[styles.actionButton, styles.bulkApproveButton]}
              onPress={() => handleUpdateStatus(selectedIds, "APPROVED")}
              onPressIn={() => handleButtonPressIn(approveScale)}
              onPressOut={() => handleButtonPressOut(approveScale)}
            >
              <Feather name="check-circle" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
          </Animated.View>
          <Animated.View
            style={{ transform: [{ scale: rejectScale }], flex: 1 }}
          >
            <TouchableOpacity
              style={[styles.actionButton, styles.bulkRejectButton]}
              onPress={() => handleUpdateStatus(selectedIds, "REJECTED")}
              onPressIn={() => handleButtonPressIn(rejectScale)}
              onPressOut={() => handleButtonPressOut(rejectScale)}
            >
              <Feather name="x-circle" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </Animated.View>
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
  tulipArea: {
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
  contentContainer: {
    zIndex: 2,
    position: "relative",
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
    marginHorizontal: horizontalScale(8),
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f8f9fa",
    borderRadius: moderateScale(38),
    marginTop: verticalScale(10),
    marginHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(6),
  },
  tabItem: {
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(38),
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
  checkAllContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(16),
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkAllText: {
    marginRight: horizontalScale(8),
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#1F2937",
  },
  checkbox: {
    position: "absolute",
    top: moderateScale(-22),
    left: moderateScale(-6),
    zIndex: 1,
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
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
    padding: moderateScale(16),
    paddingTop: verticalScale(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    borderBottomLeftRadius: moderateScale(8),
    zIndex: 1,
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(4),
  },
  cardHeaderText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  statusText: {
    marginLeft: horizontalScale(6),
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  reasonHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  employeeName: {
    fontSize: moderateScale(12),
    fontWeight: "500",
    color: "#4B5563",
    textAlign: "right",
    flex: 1,
  },
  timeEntriesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  timeEntry: {
    flex: 1,
  },
  timeEntryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(8),
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
    fontWeight: "500",
    color: "#888",
  },
  timeValue: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
  noTimeValue: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#D1D5DB",
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
    borderRadius: moderateScale(1),
  },
  dividerDot: {
    position: "absolute",
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
  },
  reasonContainer: {
    marginBottom: verticalScale(12),
  },
  reasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(8),
    justifyContent: "space-between",
  },
  reasonText: {
    fontSize: moderateScale(14),
    fontWeight: "400",
    color: "#4B5563",
  },
  individualButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: verticalScale(12),
  },
  individualButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(8),
    paddingHorizontal: horizontalScale(16),
    borderRadius: moderateScale(20),
    flex: 1,
    marginHorizontal: horizontalScale(4),
  },
  approveButton: {
    backgroundColor: "#10B981",
  },
  rejectButton: {
    backgroundColor: "#EF4444",
  },
  individualButtonText: {
    color: "#fff",
    fontSize: moderateScale(12),
    fontWeight: "600",
    marginLeft: horizontalScale(4),
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
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: horizontalScale(24),
    paddingVertical: verticalScale(20),
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(24),
    marginHorizontal: horizontalScale(12),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  bulkApproveButton: {
    backgroundColor: "#10B981",
  },
  bulkRejectButton: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: moderateScale(14),
    fontWeight: "700",
    marginLeft: horizontalScale(8),
  },
});

export default TimeslipApprove;