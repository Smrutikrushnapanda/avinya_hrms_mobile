import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";

export const AttendanceWeb: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.webContainer}>
        <View style={styles.webCard}>
          <Text style={styles.webTitle}>Attendance Overview</Text>
          <View style={styles.webStatsGrid}>
            <View style={styles.webStatBox}>
              <Text style={styles.webStatLabel}>Attendance Rate</Text>
              <Text style={styles.webStatValue}>--</Text>
            </View>
            <View style={styles.webStatBox}>
              <Text style={styles.webStatLabel}>Total Working Days</Text>
              <Text style={styles.webStatValue}>--</Text>
            </View>
            <View style={styles.webStatBox}>
              <Text style={styles.webStatLabel}>Total Worked Days</Text>
              <Text style={[styles.webStatValue, { color: "#00C851" }]}>--</Text>
            </View>
          </View>
        </View>

        <View style={styles.webFilterSection}>
          <TouchableOpacity style={styles.webFilterButton}>
            <FontAwesome name="calendar" size={16} color="#035F91" />
            <Text style={styles.webFilterText}>Select Month</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.webTableContainer}>
          <View style={styles.webTableHeader}>
            <Text style={[styles.webTableCell, { flex: 2 }]}>Date</Text>
            <Text style={[styles.webTableCell, { flex: 1 }]}>Status</Text>
            <Text style={[styles.webTableCell, { flex: 1.5 }]}>Check In</Text>
            <Text style={[styles.webTableCell, { flex: 1.5 }]}>Check Out</Text>
          </View>
          <ScrollView style={styles.webTableBody}>
            <View style={styles.webTableRow}>
              <Text style={[styles.webTableCell, { flex: 2 }]}>Mon, Jan 01, 2024</Text>
              <View style={[styles.webTableCell, { flex: 1 }]}>
                <View style={[styles.webStatusBadge, { backgroundColor: "#00C851" }]}>
                  <Text style={styles.webStatusText}>Present</Text>
                </View>
              </View>
              <Text style={[styles.webTableCell, { flex: 1.5 }]}>09:00 AM</Text>
              <Text style={[styles.webTableCell, { flex: 1.5 }]}>06:00 PM</Text>
            </View>
            <View style={styles.webTableRow}>
              <Text style={[styles.webTableCell, { flex: 2 }]}>Tue, Jan 02, 2024</Text>
              <View style={[styles.webTableCell, { flex: 1 }]}>
                <View style={[styles.webStatusBadge, { backgroundColor: "#FFBB33" }]}>
                  <Text style={styles.webStatusText}>Late</Text>
                </View>
              </View>
              <Text style={[styles.webTableCell, { flex: 1.5 }]}>09:30 AM</Text>
              <Text style={[styles.webTableCell, { flex: 1.5 }]}>06:15 PM</Text>
            </View>
            <View style={styles.webTableRow}>
              <Text style={[styles.webTableCell, { flex: 2 }]}>Wed, Jan 03, 2024</Text>
              <View style={[styles.webTableCell, { flex: 1 }]}>
                <View style={[styles.webStatusBadge, { backgroundColor: "#00C851" }]}>
                  <Text style={styles.webStatusText}>Present</Text>
                </View>
              </View>
              <Text style={[styles.webTableCell, { flex: 1.5 }]}>08:45 AM</Text>
              <Text style={[styles.webTableCell, { flex: 1.5 }]}>05:30 PM</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  webContainer: {
    flex: 1,
    padding: horizontalScale(40),
    maxWidth: 1400,
    alignSelf: "center",
    width: "100%",
  },
  webCard: {
    backgroundColor: "#FFFFFF",
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
  webFilterSection: {
    marginBottom: verticalScale(20),
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  webFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E1F4FF",
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: "#035F91",
  },
  webFilterText: {
    color: "#035F91",
    fontSize: moderateScale(14),
    fontWeight: "600",
    marginLeft: horizontalScale(8),
  },
  webTableContainer: {
    backgroundColor: "#FFFFFF",
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
  emptyText: {
    textAlign: "center",
    padding: moderateScale(40),
    fontSize: moderateScale(14),
    color: "#999",
  },
});
