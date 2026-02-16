import { Feather } from "@expo/vector-icons";
import Header from "app/components/Header";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import { approveLeave, getPendingLeaves } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import { darkTheme, lightTheme } from "../constants/colors";

const LeaveApproval = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;

  const { user } = useAuthStore();
  const userId = user?.userId;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  };

  const loadPending = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getPendingLeaves(userId);
      const data = res.data ?? [];
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert("Leave Approvals", "Failed to load pending approvals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, [userId]);

  const handleAction = async (item: any, status: "APPROVED" | "REJECTED") => {
    if (!userId) return;
    setActionLoading(item.id);
    try {
      await approveLeave(item.leaveRequest?.id || item.id, userId, {
        approve: status === "APPROVED",
        remarks: "",
      });
      Alert.alert(
        "Leave Approvals",
        status === "APPROVED" ? "Leave approved." : "Leave rejected."
      );
      loadPending();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to update leave request.";
      Alert.alert("Leave Approvals", message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Leave Approvals" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Leave Approvals" />

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No pending approvals</Text>
          </View>
        )}

        {items.map((item) => {
          const request = item.leaveRequest || item;
          const employeeName =
            request.user?.firstName || request.user?.lastName
              ? `${request.user?.firstName || ""} ${request.user?.lastName || ""}`.trim()
              : "Employee";
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{employeeName}</Text>
                <Text style={styles.cardType}>
                  {request.leaveType?.name || "Leave"}
                </Text>
              </View>
              <View style={styles.cardBody}>
                <View>
                  <Text style={styles.cardLabel}>Dates</Text>
                  <Text style={styles.cardValue}>
                    {formatDate(request.startDate)} - {formatDate(request.endDate)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.cardLabel}>Days</Text>
                  <Text style={styles.cardValue}>
                    {request.numberOfDays ??
                      request.totalDays ??
                      request.days ??
                      "-"}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() =>
                    Alert.alert(
                      "Reject Leave",
                      "Are you sure you want to reject this leave request?",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Reject", onPress: () => handleAction(item, "REJECTED") },
                      ]
                    )
                  }
                  disabled={actionLoading === item.id}
                >
                  {actionLoading === item.id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name="x" size={16} color="#fff" />
                      <Text style={styles.actionText}>Reject</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleAction(item, "APPROVED")}
                  disabled={actionLoading === item.id}
                >
                  {actionLoading === item.id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name="check" size={16} color="#fff" />
                      <Text style={styles.actionText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default LeaveApproval;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: horizontalScale(16),
  },
  scrollContent: {
    paddingBottom: verticalScale(24),
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(14),
    padding: moderateScale(16),
    marginTop: verticalScale(12),
    borderWidth: 1,
    borderColor: "#E8ECEF",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(8),
  },
  cardTitle: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
  cardType: {
    fontSize: moderateScale(12),
    color: "#666",
  },
  cardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  cardLabel: {
    fontSize: moderateScale(12),
    color: "#888",
  },
  cardValue: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    color: "#333",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: horizontalScale(6),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(10),
    flex: 1,
  },
  rejectButton: {
    backgroundColor: "#F44336",
    marginRight: horizontalScale(8),
  },
  approveButton: {
    backgroundColor: "#4CAF50",
    marginLeft: horizontalScale(8),
  },
  actionText: {
    color: "#fff",
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  emptyState: {
    paddingVertical: verticalScale(20),
    alignItems: "center",
  },
  emptyText: {
    fontSize: moderateScale(13),
    color: "#8A8A8A",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
