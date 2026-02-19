import { FontAwesome } from "@expo/vector-icons";
import Header from "app/components/Header";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  horizontalScale,
  moderateScale,
  verticalScale,
} from "utils/metrics";

const AttendanceWeb = () => {
  return (
    <View style={styles.container}>
      <Header title="Attendance" />
      <View style={styles.cardWrapper}>
        <View style={styles.card}>
          <View style={styles.triangle} />
          <View style={styles.triangle2} />
          <View style={styles.triangle3} />
          <View style={styles.triangle4} />
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.progressCircle}>
                <Text style={styles.progressText}>--</Text>
              </View>
              <Text style={styles.statLabel}>Attendance Rate</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>--</Text>
              <Text style={styles.statLabel}>Total Working Days</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: "#00C851" }]}>--</Text>
              <Text style={styles.statLabel}>Total Worked Days</Text>
            </View>
          </View>
        </View>

        <View style={styles.activities}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionDetails}>Attendance Details</Text>
            <TouchableOpacity style={styles.filterButton}>
              <FontAwesome name="calendar" size={16} color="#035F91" />
              <Text style={styles.filterButtonText}>Select Month</Text>
              <FontAwesome name="chevron-down" size={12} color="#035F91" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.activityScroll}>
            <View style={[styles.attendanceCard, { borderLeftColor: "#00C851" }]}>
              <View style={[styles.ribbon, { backgroundColor: "#00C851" }]}>
                <Text style={styles.ribbonText}>Present</Text>
              </View>
              <View style={styles.dateSection}>
                <View style={[styles.iconCircle, { backgroundColor: "#E8F5E8" }]}>
                  <FontAwesome name="check-circle" size={16} color="#00C851" />
                </View>
                <Text style={[styles.dateText, { color: "#00C851" }]}>Mon, Jan 01, 2024</Text>
              </View>
              <View style={styles.timeSection}>
                <View style={styles.timeRow}>
                  <FontAwesome name="clock-o" size={14} color="#999" />
                  <Text style={styles.timeText}>Punch In: 09:00 AM</Text>
                  <View style={styles.timeSeparator} />
                  <FontAwesome name="clock-o" size={14} color="#999" />
                  <Text style={styles.timeText}>Last Punch: 06:00 PM</Text>
                </View>
              </View>
            </View>

            <View style={[styles.attendanceCard, { borderLeftColor: "#FFBB33" }]}>
              <View style={[styles.ribbon, { backgroundColor: "#FFBB33" }]}>
                <Text style={styles.ribbonText}>Late</Text>
              </View>
              <View style={styles.dateSection}>
                <View style={[styles.iconCircle, { backgroundColor: "#FFF4E0" }]}>
                  <FontAwesome name="clock-o" size={16} color="#FFBB33" />
                </View>
                <Text style={[styles.dateText, { color: "#FFBB33" }]}>Tue, Jan 02, 2024</Text>
              </View>
              <View style={styles.timeSection}>
                <View style={styles.timeRow}>
                  <FontAwesome name="clock-o" size={14} color="#999" />
                  <Text style={styles.timeText}>Punch In: 09:30 AM</Text>
                  <View style={styles.timeSeparator} />
                  <FontAwesome name="clock-o" size={14} color="#999" />
                  <Text style={styles.timeText}>Last Punch: 06:15 PM</Text>
                </View>
              </View>
            </View>

            <View style={[styles.attendanceCard, { borderLeftColor: "#00C851" }]}>
              <View style={[styles.ribbon, { backgroundColor: "#00C851" }]}>
                <Text style={styles.ribbonText}>Present</Text>
              </View>
              <View style={styles.dateSection}>
                <View style={[styles.iconCircle, { backgroundColor: "#E8F5E8" }]}>
                  <FontAwesome name="check-circle" size={16} color="#00C851" />
                </View>
                <Text style={[styles.dateText, { color: "#00C851" }]}>Wed, Jan 03, 2024</Text>
              </View>
              <View style={styles.timeSection}>
                <View style={styles.timeRow}>
                  <FontAwesome name="clock-o" size={14} color="#999" />
                  <Text style={styles.timeText}>Punch In: 08:45 AM</Text>
                  <View style={styles.timeSeparator} />
                  <FontAwesome name="clock-o" size={14} color="#999" />
                  <Text style={styles.timeText}>Last Punch: 05:30 PM</Text>
                </View>
              </View>
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
  cardWrapper: {
    marginTop: verticalScale(-90),
    paddingHorizontal: horizontalScale(20),
    zIndex: 10,
  },
  card: {
    borderRadius: moderateScale(20),
    padding: moderateScale(24),
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
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: verticalScale(10),
    marginTop: 8,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: moderateScale(28),
    fontWeight: "700",
    color: "#035F91",
    marginBottom: verticalScale(8),
  },
  statLabel: {
    fontSize: moderateScale(13),
    textAlign: "center",
    fontWeight: "500",
    color: "#333",
    opacity: 0.9,
    height: verticalScale(50),
  },
  progressCircle: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    backgroundColor: "#035F91",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(8),
    borderWidth: 2,
    borderColor: "#026D94",
  },
  progressText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#FFFFFF",
  },
  verticalDivider: {
    width: 1,
    height: verticalScale(50),
    backgroundColor: "#E8ECEF",
    marginHorizontal: horizontalScale(15),
  },
  activities: {
    marginTop: verticalScale(20),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(10),
  },
  sectionDetails: {
    fontSize: moderateScale(18),
    fontWeight: "800",
    color: "#333",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E1F4FF",
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
    borderWidth: 1,
    borderColor: "#035F91",
    gap: horizontalScale(6),
  },
  filterButtonText: {
    color: "#035F91",
    fontSize: moderateScale(13),
    fontWeight: "500",
  },
  activityScroll: {
    maxHeight: verticalScale(400),
  },
  attendanceCard: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(7),
    padding: moderateScale(12),
    marginTop: verticalScale(12),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    borderLeftWidth: 4,
  },
  ribbon: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(2),
    borderTopRightRadius: moderateScale(12),
    borderBottomLeftRadius: moderateScale(8),
  },
  ribbonText: {
    color: "#fff",
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  dateSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(8),
  },
  iconCircle: {
    padding: moderateScale(8),
    borderRadius: 50,
    marginRight: horizontalScale(10),
  },
  dateText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  timeSection: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: verticalScale(8),
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 1,
  },
  timeText: {
    marginLeft: horizontalScale(6),
    marginRight: horizontalScale(12),
    fontSize: moderateScale(13),
    color: "#333",
  },
  timeSeparator: {
    width: 1,
    height: moderateScale(14),
    backgroundColor: "#999",
    marginHorizontal: horizontalScale(8),
  },
});

export default AttendanceWeb;
