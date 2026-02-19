import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";

interface LeaveWebProps {
  colors: any;
  leaveBalances: any[];
  leaveRequests: any[];
  selectedTab: string;
  onTabChange: (tab: string) => void;
  onAddLeave: () => void;
  onApprove: () => void;
  isApprover: boolean;
}

export const LeaveWeb: React.FC<LeaveWebProps> = ({
  colors,
  leaveBalances,
  leaveRequests,
  selectedTab,
  onTabChange,
  onAddLeave,
  onApprove,
  isApprover,
}) => {
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.webContainer}>
        <View style={[styles.webCard, { backgroundColor: colors.white }]}>
          <Text style={styles.webTitle}>Leave Balance</Text>
          <View style={styles.webBalanceGrid}>
            {leaveBalances.map((balance, index) => (
              <View key={balance.id || index} style={styles.webBalanceBox}>
                <View style={styles.webBalanceIcon}>
                  <Feather name="calendar" size={24} color="#2196F3" />
                </View>
                <Text style={styles.webBalanceType}>
                  {balance.leaveType?.name || "Leave"}
                </Text>
                <Text style={styles.webBalanceValue}>
                  {balance.closingBalance ?? 0}
                </Text>
                <Text style={styles.webBalanceLabel}>Available</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.webActionBar}>
          <View style={styles.webTabBar}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => onTabChange(tab)}
                style={[
                  styles.webTabItem,
                  selectedTab === tab && styles.webTabItemActive,
                ]}
              >
                <Text
                  style={[
                    styles.webTabText,
                    selectedTab === tab && styles.webTabTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.webButtonGroup}>
            <TouchableOpacity
              style={[styles.webActionButton, { backgroundColor: "#2196F3" }]}
              onPress={onAddLeave}
            >
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.webActionButtonText}>Add Leave</Text>
            </TouchableOpacity>
            {isApprover && (
              <TouchableOpacity
                style={[styles.webActionButton, { backgroundColor: "#4CAF50" }]}
                onPress={onApprove}
              >
                <Feather name="check-circle" size={18} color="#fff" />
                <Text style={styles.webActionButtonText}>Approve</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.webLeaveList, { backgroundColor: colors.white }]}>
          <ScrollView>
            {filteredLeaves.map((leave) => (
              <View key={leave.id} style={styles.webLeaveCard}>
                <View style={styles.webLeaveCardHeader}>
                  <View>
                    <Text style={styles.webLeaveType}>
                      {leave.leaveType?.name || "Leave"}
                    </Text>
                    <Text style={styles.webLeaveDate}>
                      {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.webLeaveStatus,
                      {
                        backgroundColor: getStatusBgColor(
                          normalizeStatus(leave.status)
                        ),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.webLeaveStatusText,
                        {
                          color: getStatusColor(
                            normalizeStatus(leave.status)
                          ),
                        },
                      ]}
                    >
                      {normalizeStatus(leave.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.webLeaveCardBody}>
                  <View style={styles.webLeaveDetail}>
                    <Text style={styles.webLeaveDetailLabel}>Days</Text>
                    <Text style={styles.webLeaveDetailValue}>
                      {leave.numberOfDays ??
                        leave.totalDays ??
                        leave.days ??
                        leave.duration ??
                        "-"}
                    </Text>
                  </View>
                  <View style={styles.webLeaveDetail}>
                    <Text style={styles.webLeaveDetailLabel}>Applied On</Text>
                    <Text style={styles.webLeaveDetailValue}>
                      {formatDate(leave.createdAt)}
                    </Text>
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
  webCard: {
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
  webTitle: {
    fontSize: moderateScale(24),
    fontWeight: "700",
    color: "#035F91",
    marginBottom: verticalScale(20),
  },
  webBalanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: horizontalScale(20),
  },
  webBalanceBox: {
    flex: 1,
    minWidth: horizontalScale(150),
    backgroundColor: "#F8FAFC",
    padding: moderateScale(20),
    borderRadius: moderateScale(8),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  webBalanceIcon: {
    marginBottom: verticalScale(12),
  },
  webBalanceType: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(8),
  },
  webBalanceValue: {
    fontSize: moderateScale(28),
    fontWeight: "700",
    color: "#2196F3",
    marginBottom: verticalScale(4),
  },
  webBalanceLabel: {
    fontSize: moderateScale(12),
    color: "#666",
  },
  webActionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(20),
    gap: horizontalScale(20),
  },
  webTabBar: {
    flexDirection: "row",
    gap: horizontalScale(8),
    flex: 1,
  },
  webTabItem: {
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  webTabItemActive: {
    backgroundColor: "#005F90",
    borderColor: "#005F90",
  },
  webTabText: {
    fontSize: moderateScale(13),
    color: "#666",
    fontWeight: "600",
  },
  webTabTextActive: {
    color: "#fff",
  },
  webButtonGroup: {
    flexDirection: "row",
    gap: horizontalScale(12),
  },
  webActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    gap: horizontalScale(8),
  },
  webActionButtonText: {
    color: "#fff",
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  webLeaveList: {
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: "#E8ECEF",
    maxHeight: verticalScale(600),
  },
  webLeaveCard: {
    padding: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  webLeaveCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: verticalScale(12),
  },
  webLeaveType: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: "#333",
    marginBottom: verticalScale(4),
  },
  webLeaveDate: {
    fontSize: moderateScale(12),
    color: "#666",
  },
  webLeaveStatus: {
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(6),
  },
  webLeaveStatusText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  webLeaveCardBody: {
    flexDirection: "row",
    gap: horizontalScale(20),
  },
  webLeaveDetail: {
    flex: 1,
  },
  webLeaveDetailLabel: {
    fontSize: moderateScale(12),
    color: "#666",
    marginBottom: verticalScale(4),
  },
  webLeaveDetailValue: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
});
