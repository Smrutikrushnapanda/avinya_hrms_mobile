import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";

interface TimeSlipsWebProps {
  colors: any;
  timestampEntries: any[];
  selectedTab: string;
  onTabChange: (tab: string) => void;
  onAddTimeSlip: () => void;
  onApprove: () => void;
  isApprover: boolean;
  timestampData: any;
}

export const TimeSlipsWeb: React.FC<TimeSlipsWebProps> = ({
  colors,
  timestampEntries,
  selectedTab,
  onTabChange,
  onAddTimeSlip,
  onApprove,
  isApprover,
  timestampData,
}) => {
  const tabs = ["All", "Pending", "Approved", "Rejected"];

  const filteredTimestamps = timestampEntries.filter((entry) => {
    if (selectedTab === "All") return true;
    return entry.status === selectedTab.toUpperCase();
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.webContainer}>
        <View style={[styles.webCard, { backgroundColor: colors.white }]}>
          <Text style={styles.webTitle}>Time Slips Summary</Text>
          <View style={styles.webStatsGrid}>
            <View style={styles.webStatBox}>
              <Text style={styles.webStatLabel}>Total</Text>
              <Text style={styles.webStatValue}>{timestampData.all}</Text>
            </View>
            <View style={styles.webStatBox}>
              <Text style={styles.webStatLabel}>Pending</Text>
              <Text style={[styles.webStatValue, { color: "#F59E0B" }]}>
                {timestampData.pending}
              </Text>
            </View>
            <View style={styles.webStatBox}>
              <Text style={styles.webStatLabel}>Approved</Text>
              <Text style={[styles.webStatValue, { color: "#10B981" }]}>
                {timestampData.approved}
              </Text>
            </View>
            <View style={styles.webStatBox}>
              <Text style={styles.webStatLabel}>Rejected</Text>
              <Text style={[styles.webStatValue, { color: "#EF4444" }]}>
                {timestampData.rejected}
              </Text>
            </View>
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
              onPress={onAddTimeSlip}
            >
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.webActionButtonText}>Add Time Slip</Text>
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

        <View style={[styles.webTableContainer, { backgroundColor: colors.white }]}>
          <View style={styles.webTableHeader}>
            <Text style={[styles.webTableCell, { flex: 1.5 }]}>Date</Text>
            <Text style={[styles.webTableCell, { flex: 1.5 }]}>Check In</Text>
            <Text style={[styles.webTableCell, { flex: 1.5 }]}>Check Out</Text>
            <Text style={[styles.webTableCell, { flex: 1 }]}>Status</Text>
          </View>
          <ScrollView style={styles.webTableBody}>
            {filteredTimestamps.map((entry) => (
              <View key={entry.id.toString()} style={styles.webTableRow}>
                <Text style={[styles.webTableCell, { flex: 1.5 }]}>
                  {entry.date}
                </Text>
                <Text style={[styles.webTableCell, { flex: 1.5 }]}>
                  {entry.checkIn?.time || "--"}
                </Text>
                <Text style={[styles.webTableCell, { flex: 1.5 }]}>
                  {entry.checkOut?.time || "--"}
                </Text>
                <View style={[styles.webTableCell, { flex: 1 }]}>
                  <View
                    style={[
                      styles.webStatusBadge,
                      { backgroundColor: getStatusColor(entry.status) },
                    ]}
                  >
                    <Text style={styles.webStatusText}>{entry.status}</Text>
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
  webStatsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: horizontalScale(20),
  },
  webStatBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: moderateScale(20),
    borderRadius: moderateScale(8),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  webStatLabel: {
    fontSize: moderateScale(14),
    color: "#666",
    marginBottom: verticalScale(8),
    fontWeight: "500",
  },
  webStatValue: {
    fontSize: moderateScale(32),
    fontWeight: "700",
    color: "#035F91",
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
  webTableContainer: {
    borderRadius: moderateScale(8),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8ECEF",
    maxHeight: verticalScale(600),
  },
  webTableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECEF",
  },
  webTableBody: {
    flex: 1,
  },
  webTableRow: {
    flexDirection: "row",
    paddingHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    alignItems: "center",
  },
  webTableCell: {
    fontSize: moderateScale(13),
    color: "#333",
    fontWeight: "500",
  },
  webStatusBadge: {
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(6),
    alignItems: "center",
  },
  webStatusText: {
    color: "#fff",
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
});
