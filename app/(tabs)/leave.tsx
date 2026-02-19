import { Feather } from "@expo/vector-icons";
import AdminTabHeader from "app/components/AdminTabHeader";
import LeaveSkeleton from "app/Loaders/LeaveSkeleton";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import CustomDialog from "../components/CustomDialog";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import { getLeaveBalance, getLeaveRequests, getPendingLeaves } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import { darkTheme, lightTheme } from "../constants/colors";

const Leave = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;

  const [selectedTab, setSelectedTab] = React.useState("All");
  const [fabOpen, setFabOpen] = useState(false);
  const [isApprover, setIsApprover] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const [dialogVisible, setDialogVisible] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<string>("INFO");
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [dialogMessage, setDialogMessage] = useState<string>("");
  const [dialogButtons, setDialogButtons] = useState<Array<{text: string, onPress: () => void, style?: 'default' | 'cancel' | 'destructive'}>>([]);

  const showDialog = (
    type: string,
    title: string,
    message: string,
    buttons?: {text: string, onPress?: () => void, style?: 'default' | 'cancel' | 'destructive'}[]
  ) => {
    setDialogType(type);
    setDialogTitle(title);
    setDialogMessage(message);
    if (buttons && buttons.length > 0) {
      setDialogButtons(buttons.map(btn => ({
        text: btn.text,
        onPress: btn.onPress || (() => setDialogVisible(false)),
        style: btn.style
      })));
    } else {
      setDialogButtons([{ text: "OK", onPress: () => setDialogVisible(false) }]);
    }
    setDialogVisible(true);
  };

  // Animation values
  const slideValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const bounceValue = useRef(new Animated.Value(0)).current;

  const route = useRouter();
  const { user } = useAuthStore();
  const userId = user?.userId;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  };

  const fetchLeaveData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [balanceRes, requestsRes, pendingRes] = await Promise.allSettled([
        getLeaveBalance(userId),
        getLeaveRequests(userId),
        getPendingLeaves(userId),
      ]);

      if (balanceRes.status === "fulfilled") {
        const data = balanceRes.value?.data ?? [];
        setLeaveBalances(Array.isArray(data) ? data : []);
      }

      if (requestsRes.status === "fulfilled") {
        const data = requestsRes.value?.data ?? [];
        setLeaveRequests(Array.isArray(data) ? data : []);
      }

      if (pendingRes.status === "fulfilled") {
        const data = pendingRes.value?.data ?? [];
        const list = Array.isArray(data) ? data : [];
        setPendingCount(list.length);
        setIsApprover(list.length > 0);
      } else {
        setPendingCount(0);
        setIsApprover(false);
      }
    } catch (error) {
      showDialog("DANGER", "Leave Load Failed", "Unable to load leave data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchLeaveData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchLeaveData]);

  // Animation effect for FAB actions (when isApprover is true)
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

  // Bounce animation for main FAB
  useEffect(() => {
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceValue, {
          toValue: -10, // Move up 10 pixels
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(bounceValue, {
          toValue: 0, // Return to original position
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    bounceAnimation.start();
    return () => bounceAnimation.stop(); // Cleanup on unmount
  }, [bounceValue]);

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  useFocusEffect(
    useCallback(() => {
      fetchLeaveData();
    }, [fetchLeaveData])
  );

  // Removed periodic auto-refresh; rely on focus + pull-to-refresh instead.

  const toggleFab = () => {
    if (isApprover) {
      setFabOpen(!fabOpen);
    } else {
      route.push("/(screen)/leaveForm");
    }
  };

  const handleAddLeave = () => {
    route.push("/(screen)/leaveForm");
    setFabOpen(false);
  };

  const handleApprove = () => {
    route.push("/(screen)/LeaveApproval");
    setFabOpen(false);
  };

  const translateY = slideValue.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  const tabs = ["All", "Pending", "Approved", "Rejected"];

  const normalizeStatus = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (!s) return "Unknown";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const filteredLeaves =
    selectedTab === "All"
      ? leaveRequests
      : leaveRequests.filter(
          (item) => normalizeStatus(item.status) === selectedTab
        );

  const hasPendingRequests =
    pendingCount > 0 ||
    leaveRequests.some((leave) => normalizeStatus(leave.status) === "Pending");

  if (loading) {
    return <LeaveSkeleton colors={colors} />;
  }

  const getApprovalState = (leave: any) => {
    let managerStatus: "pending" | "approved" | "rejected" = "pending";
    let hrStatus: "pending" | "approved" | "rejected" = "pending";

    const approvals = Array.isArray(leave?.approvals) ? leave.approvals : [];
    const level1 = approvals.find((a: any) => a.level === 1);
    const level2 = approvals.find((a: any) => a.level === 2);

    if (level1?.status === "APPROVED") managerStatus = "approved";
    if (level1?.status === "REJECTED") managerStatus = "rejected";

    if (level2?.status === "APPROVED") hrStatus = "approved";
    if (level2?.status === "REJECTED") hrStatus = "rejected";

    if (leave?.status === "APPROVED") {
      managerStatus = "approved";
      hrStatus = "approved";
    } else if (leave?.status === "REJECTED") {
      if (managerStatus === "pending") managerStatus = "rejected";
    }

    const showManager =
      (Boolean(level2) && Boolean(level1)) || Boolean(leave?.requiresManagerApproval);
    return { managerStatus, hrStatus, showManager };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Main Content */}
      <View style={styles.contentWrapper}>
        <AdminTabHeader title="Leave" />

        {/* Summary Card */}
        <View style={styles.cardWrapper}>
          <View style={[styles.card, { backgroundColor: colors.white }]}>
            <View style={styles.triangle} />
            <View style={styles.triangle2} />
            <View style={styles.triangle3} />
            <View style={styles.triangle4} />
            <View style={styles.contentContainer}>
              {leaveBalances.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No leave balances available</Text>
                </View>
              )}
              {leaveBalances.map((balance, index) => (
                <View key={balance.id || index}>
                  <View style={styles.leaveRow}>
                    <View style={[styles.iconWrapper, { backgroundColor: "#E3F2FD" }]}>
                      <Feather name="calendar" size={20} color="#2196F3" />
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.typeText}>
                        {balance.leaveType?.name || "Leave"}
                      </Text>
                      <Text style={styles.labelText}>Balance</Text>
                    </View>
                    <View style={styles.rightContainer}>
                      <Text style={styles.countText}>
                        {balance.closingBalance ?? 0}
                      </Text>
                      <Text style={styles.dateText}>Available</Text>
                    </View>
                  </View>
                  {index < leaveBalances.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredLeaves.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No leave requests found</Text>
            </View>
          )}
          {filteredLeaves.map((leave) => (
            <View key={leave.id} style={styles.leaveCard}>
              <View style={styles.leaveCardHeader}>
                <Text style={styles.leaveDateText}>
                  {formatDate(leave.createdAt)}
                </Text>
                <Text style={styles.leaveTypeText}>
                  {leave.leaveType?.name || "Leave"}
                </Text>
              </View>
              <View style={styles.leaveCardBody}>
                <View>
                  <Text style={styles.cardLabel}>Leave Date</Text>
                  <Text style={styles.cardValue}>
                    {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.cardLabel}>Total Leave</Text>
                  <Text style={styles.cardValue}>
                    {leave.numberOfDays ??
                      leave.totalDays ??
                      leave.days ??
                      leave.duration ??
                      "-"}
                  </Text>
                </View>
              </View>
              <View style={styles.statusContainer}>
                <Feather
                  name={
                    normalizeStatus(leave.status) === "Approved"
                      ? "check-circle"
                      : normalizeStatus(leave.status) === "Pending"
                      ? "clock"
                      : "x-circle"
                  }
                  size={16}
                  color={
                    normalizeStatus(leave.status) === "Approved"
                      ? "#4CAF50"
                      : normalizeStatus(leave.status) === "Pending"
                      ? "#FF9800"
                      : "#F44336"
                  }
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        normalizeStatus(leave.status) === "Approved"
                          ? "#4CAF50"
                          : normalizeStatus(leave.status) === "Pending"
                          ? "#FF9800"
                          : "#F44336",
                    },
                  ]}
                >
                  {normalizeStatus(leave.status)}
                </Text>
              </View>

              <LeaveTimeline status={getApprovalState(leave)} />
            </View>
          ))}
        </ScrollView>

        {/* Overlay for FAB actions */}
        {isApprover && fabOpen && (
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setFabOpen(false)}
          />
        )}

        {/* FAB Actions Container - only show when isApprover is true */}
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
                <Text style={styles.fabActionSubText}>Leaves</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fabActionBox, { backgroundColor: "#2196F3" }]}
              onPress={handleAddLeave}
            >
              <View style={styles.fabActionContent}>
                <View style={styles.fabActionIconContainer}>
                  <Feather name="plus" size={20} color="#fff" />
                </View>
                <Text style={styles.fabActionText}>Add Leave</Text>
                <Text style={styles.fabActionSubText}>Request</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {/* Main Floating Action Button */}
        <Animated.View
          style={[
            styles.fab,
            {
              transform: [
                { translateX: -moderateScale(28) }, // Same positioning as TimeSlips
                { translateY: bounceValue }, // Bounce animation
              ],
            },
          ]}
        >
          <TouchableOpacity onPress={toggleFab}>
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
        </Animated.View>
      </View>
      <CustomDialog isVisible={dialogVisible} type={dialogType as any} title={dialogTitle} message={dialogMessage} buttons={dialogButtons} onCancel={() => setDialogVisible(false)} />
    </View>
  );
};

const LeaveTimeline = ({
  status,
}: {
  status: {
    managerStatus: "pending" | "approved" | "rejected";
    hrStatus: "pending" | "approved" | "rejected";
    showManager: boolean;
  };
}) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulse]);

  const pendingStyle = {
    transform: [
      {
        scale: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1.15],
        }),
      },
    ],
    opacity: pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 1],
    }),
  };

  const manager = status.managerStatus;
  const hr = status.hrStatus;
  const managerDone = manager === "approved";
  const managerRejected = manager === "rejected";
  const hrDone = hr === "approved";
  const hrRejected = hr === "rejected";
  const showManager = status.showManager;

  return (
    <View style={styles.timelineContainer}>
      <View style={styles.timelineRow}>
        <View style={styles.timelineStep}>
          <View style={[styles.dot, styles.dotApproved]} />
          <Text style={styles.timelineLabel}>Applied</Text>
        </View>

        {showManager ? (
          <>
            <View
              style={[
                styles.line,
                managerDone ? styles.lineApproved : managerRejected ? styles.lineRejected : styles.linePending,
              ]}
            />

            <View style={styles.timelineStep}>
              {manager === "pending" ? (
                <Animated.View style={[styles.dot, styles.dotPending, pendingStyle]} />
              ) : (
                <View
                  style={[
                    styles.dot,
                    managerDone ? styles.dotApproved : styles.dotRejected,
                  ]}
                />
              )}
              <Text style={styles.timelineLabel}>Manager</Text>
            </View>
          </>
        ) : null}

        <View
          style={[
            styles.line,
            hrDone ? styles.lineApproved : hrRejected ? styles.lineRejected : styles.linePending,
          ]}
        />

        <View style={styles.timelineStep}>
          {hr === "pending" && (!showManager || managerDone) ? (
            <Animated.View style={[styles.dot, styles.dotPending, pendingStyle]} />
          ) : (
            <View
              style={[
                styles.dot,
                hrDone ? styles.dotApproved : hrRejected ? styles.dotRejected : styles.dotPending,
              ]}
            />
          )}
          <Text style={styles.timelineLabel}>HR</Text>
        </View>
      </View>
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
    padding: moderateScale(30),
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
    borderTopWidth: moderateScale(40),
    borderRightWidth: moderateScale(40),
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
    borderTopWidth: moderateScale(40),
    borderRightWidth: moderateScale(40),
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
    borderTopWidth: moderateScale(40),
    borderRightWidth: moderateScale(40),
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
    borderTopWidth: moderateScale(40),
    borderRightWidth: moderateScale(40),
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
  leaveCard: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: verticalScale(16),
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowRadius: moderateScale(4),
    borderWidth: 1,
    borderColor: "#F1F5F9",
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
  timelineContainer: {
    marginTop: verticalScale(8),
    backgroundColor: "#F7F9FB",
    borderRadius: moderateScale(10),
    paddingVertical: verticalScale(6),
    paddingHorizontal: horizontalScale(8),
    borderWidth: 1,
    borderColor: "#E6ECF1",
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timelineStep: {
    alignItems: "center",
    width: horizontalScale(54),
  },
  timelineLabel: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(9),
    color: "#4B5563",
    fontWeight: "600",
  },
  dot: {
    width: moderateScale(9),
    height: moderateScale(9),
    borderRadius: moderateScale(5),
  },
  dotApproved: {
    backgroundColor: "#4CAF50",
  },
  dotRejected: {
    backgroundColor: "#F44336",
  },
  dotPending: {
    backgroundColor: "#FF9800",
  },
  line: {
    height: verticalScale(2),
    flex: 1,
    marginHorizontal: horizontalScale(6),
    borderRadius: moderateScale(2),
  },
  lineApproved: {
    backgroundColor: "#4CAF50",
  },
  lineRejected: {
    backgroundColor: "#F44336",
  },
  linePending: {
    backgroundColor: "#FFCC80",
  },
  emptyState: {
    paddingVertical: verticalScale(16),
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: moderateScale(13),
    color: "#8A8A8A",
  },
  comingSoonSubtext: {
    color: "#ccc",
    fontSize: moderateScale(16),
    marginTop: verticalScale(10),
    textAlign: "center",
  },
  contentWrapper: {
    flex: 1,
  },
  // FAB Styles - Same as TimeSlips
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
    left: "85%", // Same position as TimeSlips
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
    top: moderateScale(-14),
    right: moderateScale(-4),
    width: moderateScale(12),
    height: moderateScale(12),
    borderRadius: moderateScale(6),
    backgroundColor: "#FF4444",
    borderWidth: 2,
    borderColor: "#fff",
  },
});

export default Leave;
