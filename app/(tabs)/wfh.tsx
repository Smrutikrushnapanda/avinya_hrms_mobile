import { Feather } from "@expo/vector-icons";
import AdminTabHeader from "app/components/AdminTabHeader";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { getWfhBalance, getWfhRequests } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import { darkTheme, lightTheme } from "../constants/colors";

const Wfh = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const route = useRouter();

  const { user } = useAuthStore();
  const userId = user?.userId;

  const [selectedTab, setSelectedTab] = useState("All");
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wfhBalance, setWfhBalance] = useState<any>(null);
  const bounceValue = useRef(new Animated.Value(0)).current;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  };

  const normalizeStatus = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (!s) return "Unknown";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const fetchWfhData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [reqRes, balRes] = await Promise.allSettled([
        getWfhRequests(userId),
        getWfhBalance(userId),
      ]);
      const data =
        reqRes.status === "fulfilled" ? reqRes.value?.data ?? [] : [];
      setRequests(Array.isArray(data) ? data : []);
      if (balRes.status === "fulfilled") {
        setWfhBalance(balRes.value?.data ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWfhData();
  }, [fetchWfhData]);

  useFocusEffect(
    useCallback(() => {
      fetchWfhData();
    }, [fetchWfhData])
  );

  useEffect(() => {
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceValue, {
          toValue: -10,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(bounceValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    bounceAnimation.start();
    return () => bounceAnimation.stop();
  }, [bounceValue]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchWfhData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchWfhData]);

  const tabs = ["All", "Pending", "Approved", "Rejected"];
  const filtered =
    selectedTab === "All"
      ? requests
      : requests.filter((r) => normalizeStatus(r.status) === selectedTab);

  const getApprovalState = (req: any) => {
    let managerStatus: "pending" | "approved" | "rejected" = "pending";
    let hrStatus: "pending" | "approved" | "rejected" = "pending";
    const approvals = Array.isArray(req?.approvals) ? req.approvals : [];
    const level1 = approvals.find((a: any) => a.level === 1);
    const level2 = approvals.find((a: any) => a.level === 2);

    if (level1?.status === "APPROVED") managerStatus = "approved";
    if (level1?.status === "REJECTED") managerStatus = "rejected";
    if (level2?.status === "APPROVED") hrStatus = "approved";
    if (level2?.status === "REJECTED") hrStatus = "rejected";

    if (req?.status === "APPROVED") {
      managerStatus = "approved";
      hrStatus = "approved";
    } else if (req?.status === "REJECTED") {
      if (managerStatus === "pending") managerStatus = "rejected";
    }

    const showManager = Boolean(level2) && Boolean(level1);
    return { managerStatus, hrStatus, showManager };
  };

  const handleAddWfh = () => {
    route.push("/(screen)/wfhForm");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.contentWrapper}>
        <AdminTabHeader title="WFH" />

        <View style={styles.cardWrapper}>
          <View style={[styles.card, { backgroundColor: colors.white }]}>
            <View style={styles.triangle} />
            <View style={styles.triangle2} />
            <View style={styles.triangle3} />
            <View style={styles.triangle4} />
            <View style={styles.contentContainer}>
              <View style={styles.leaveRow}>
                <View style={[styles.iconWrapper, { backgroundColor: "#E3F2FD" }]}>
                  <Feather name="home" size={20} color="#2196F3" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.typeText}>WFH</Text>
                  <Text style={styles.labelText}>Balance</Text>
                </View>
                <View style={styles.rightContainer}>
                  <Text style={styles.countText}>
                    {wfhBalance?.closingBalance ?? 0}
                  </Text>
                  <Text style={styles.dateText}>Available</Text>
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {!loading && filtered.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No WFH requests found</Text>
            </View>
          )}
          {filtered.map((req) => (
            <View key={req.id} style={styles.leaveCard}>
              <View style={styles.leaveCardHeader}>
                <Text style={styles.leaveDateText}>
                  {formatDate(req.createdAt)}
                </Text>
                <Text style={styles.leaveTypeText}>WFH</Text>
              </View>
              <View style={styles.leaveCardBody}>
                <View>
                  <Text style={styles.cardLabel}>Dates</Text>
                  <Text style={styles.cardValue}>
                    {formatDate(req.date)} - {formatDate(req.endDate || req.date)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.cardLabel}>Days</Text>
                  <Text style={styles.cardValue}>{req.numberOfDays ?? "-"}</Text>
                </View>
              </View>
              <View style={styles.statusContainer}>
                <Feather
                  name={
                    normalizeStatus(req.status) === "Approved"
                      ? "check-circle"
                      : normalizeStatus(req.status) === "Pending"
                      ? "clock"
                      : "x-circle"
                  }
                  size={16}
                  color={
                    normalizeStatus(req.status) === "Approved"
                      ? "#4CAF50"
                      : normalizeStatus(req.status) === "Pending"
                      ? "#FF9800"
                      : "#F44336"
                  }
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        normalizeStatus(req.status) === "Approved"
                          ? "#4CAF50"
                          : normalizeStatus(req.status) === "Pending"
                          ? "#FF9800"
                          : "#F44336",
                    },
                  ]}
                >
                  {normalizeStatus(req.status)}
                </Text>
              </View>

              <ApprovalTimeline status={getApprovalState(req)} />
            </View>
          ))}
        </ScrollView>

        <Animated.View
          style={[
            styles.fab,
            {
              transform: [
                { translateX: -moderateScale(28) },
                { translateY: bounceValue },
              ],
            },
          ]}
        >
          <TouchableOpacity onPress={handleAddWfh}>
            <Feather name="plus" size={24} color="#ffffffff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const ApprovalTimeline = ({
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
  contentWrapper: {
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
  fab: {
    position: "absolute",
    bottom: verticalScale(60),
    left: "85%",
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
});

export default Wfh;
