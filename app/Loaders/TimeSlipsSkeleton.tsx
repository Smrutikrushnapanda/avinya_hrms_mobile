// app/Loaders/TimeSlipsSkeleton.tsx
import { Feather } from "@expo/vector-icons";
import Header from "app/components/Header";
import { darkTheme, lightTheme } from "app/constants/colors";
import React from "react";
import { ScrollView, StyleSheet, View, useColorScheme } from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";

export default function TimeSlipsSkeleton() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Time Slips" />
      {/* Summary Card Skeleton */}
      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <View style={styles.triangle} />
          <View style={styles.triangle2} />
          <View style={styles.triangle3} />
          <View style={styles.triangle4} />
          <View style={styles.contentContainer}>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: "#D1D5DB" }]} />
                <View style={[styles.statNumberPlaceholder, { backgroundColor: "#E5E7EB" }]} />
                <View style={[styles.statLabelPlaceholder, { backgroundColor: "#E5E7EB" }]} />
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: "#D1D5DB" }]} />
                <View style={[styles.statNumberPlaceholder, { backgroundColor: "#E5E7EB" }]} />
                <View style={[styles.statLabelPlaceholder, { backgroundColor: "#E5E7EB" }]} />
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: "#D1D5DB" }]} />
                <View style={[styles.statNumberPlaceholder, { backgroundColor: "#E5E7EB" }]} />
                <View style={[styles.statLabelPlaceholder, { backgroundColor: "#E5E7EB" }]} />
              </View>
            </View>
          </View>
        </View>
      </View>
      {/* Tab Bar Skeleton */}
      <View style={styles.tabBar}>
        {["All", "Pending", "Accepted", "Rejected"].map((_, index) => (
          <View
            key={index}
            style={[styles.tabItem, index === 0 && styles.tabItemActive]}
          >
            <View style={[styles.tabTextPlaceholder, { backgroundColor: "#E5E7EB" }]} />
          </View>
        ))}
      </View>
      {/* Timeslip Cards Skeleton */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {[1, 2, 3].map((_, index) => (
          <View key={index} style={styles.timestampCard}>
            <View style={[styles.dateBadge, { backgroundColor: "#E5E7EB" }]} />
            <View style={styles.timeEntriesContainer}>
              <View style={styles.timeEntry}>
                <View style={styles.timeEntryHeader}>
                  <View style={[styles.entryIcon, { backgroundColor: "#E5E7EB" }]} />
                  <View style={[styles.entryLabelPlaceholder, { backgroundColor: "#E5E7EB" }]} />
                </View>
                <View style={styles.timeDetails}>
                  <View style={[styles.timeValuePlaceholder, { backgroundColor: "#E5E7EB" }]} />
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusIndicator, { backgroundColor: "#D1D5DB" }]} />
                    <View style={[styles.statusTextPlaceholder, { backgroundColor: "#E5E7EB" }]} />
                  </View>
                </View>
              </View>
              <View style={styles.verticalDivider}>
                <View style={styles.dividerLine} />
                <View style={styles.dividerDot} />
              </View>
              <View style={styles.timeEntry}>
                <View style={styles.timeEntryHeader}>
                  <View style={[styles.entryIcon, { backgroundColor: "#E5E7EB" }]} />
                  <View style={[styles.entryLabelPlaceholder, { backgroundColor: "#E5E7EB" }]} />
                </View>
                <View style={styles.timeDetails}>
                  <View style={[styles.timeValuePlaceholder, { backgroundColor: "#E5E7EB" }]} />
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusIndicator, { backgroundColor: "#D1D5DB" }]} />
                    <View style={[styles.statusTextPlaceholder, { backgroundColor: "#E5E7EB" }]} />
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.actionButtonContainer}>
              <View style={[styles.seeStatusButton, { backgroundColor: "#E5E7EB" }]} />
            </View>
          </View>
        ))}
      </ScrollView>
      {/* FAB Skeleton */}
      <View style={styles.fab}>
        <View style={[styles.fabIconPlaceholder, { backgroundColor: "#E5E7EB" }]} />
      </View>
    </View>
  );
}

// Styles (same as TimeSlips to ensure consistency)
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
  contentContainer: {
    zIndex: 2,
    position: "relative",
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
  statNumberPlaceholder: {
    width: moderateScale(40),
    height: moderateScale(24),
    borderRadius: moderateScale(4),
    marginBottom: verticalScale(4),
  },
  statLabelPlaceholder: {
    width: moderateScale(50),
    height: moderateScale(12),
    borderRadius: moderateScale(4),
  },
  statDivider: {
    width: 1,
    height: moderateScale(40),
    backgroundColor: "#E5E7EB",
    marginHorizontal: horizontalScale(16),
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
    backgroundColor: "#0079b65f",
  },
  tabTextPlaceholder: {
    width: moderateScale(50),
    height: moderateScale(13),
    borderRadius: moderateScale(4),
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
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowRadius: moderateScale(4),
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  dateBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(6),
    borderBottomLeftRadius: moderateScale(8),
    zIndex: 1,
  },
  timeEntriesContainer: {
    flexDirection: "row",
    padding: moderateScale(16),
    paddingTop: moderateScale(20),
  },
  timeEntry: {
    flex: 1,
  },
  timeEntryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  entryIcon: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    justifyContent: "center",
    alignItems: "center",
    marginRight: horizontalScale(8),
  },
  entryLabelPlaceholder: {
    width: moderateScale(60),
    height: moderateScale(12),
    borderRadius: moderateScale(4),
  },
  timeDetails: {
    alignItems: "flex-start",
  },
  timeValuePlaceholder: {
    width: moderateScale(80),
    height: moderateScale(18),
    borderRadius: moderateScale(4),
    marginBottom: verticalScale(8),
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    marginRight: horizontalScale(6),
  },
  statusTextPlaceholder: {
    width: moderateScale(50),
    height: moderateScale(11),
    borderRadius: moderateScale(4),
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
    backgroundColor: "#E5E7EB",
    borderRadius: moderateScale(1),
  },
  dividerDot: {
    position: "absolute",
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(1),
    backgroundColor: "#008dd45d",
  },
  actionButtonContainer: {
    padding: moderateScale(16),
    paddingTop: moderateScale(12),
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  seeStatusButton: {
    height: moderateScale(40),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  fab: {
    position: "absolute",
    bottom: verticalScale(60),
    left: "85%",
    transform: [{ translateX: -moderateScale(28) }],
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
  fabIconPlaceholder: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    backgroundColor: "#E5E7EB",
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
});