import Header from "app/components/Header";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";

const SkeletonPlaceholder = ({ width, height, style }: { width: number; height: number; style?: any }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["#E5E7EB", "#D1D5DB"],
  });

  return (
    <Animated.View
      style={[
        styles.placeholder,
        { width, height, backgroundColor },
        style,
      ]}
    />
  );
};

const TimeslipApproveSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
    <Header/>

      {/* Stats Card */}
      <View style={styles.cardWrapper}>
        <View style={styles.card}>
          <View style={styles.triangle} />
          <View style={styles.triangle2} />
          <View style={styles.triangle3} />
          <View style={styles.triangle4} />
          <View style={styles.contentContainer}>
            <View style={styles.statsContainer}>
              {[1, 2, 3].map((_, index) => (
                <View key={index} style={styles.statItem}>
                  <SkeletonPlaceholder
                    width={moderateScale(8)}
                    height={moderateScale(8)}
                    style={styles.statDot}
                  />
                  <SkeletonPlaceholder
                    width={horizontalScale(40)}
                    height={verticalScale(24)}
                    style={styles.statNumber}
                  />
                  <SkeletonPlaceholder
                    width={horizontalScale(60)}
                    height={verticalScale(12)}
                    style={styles.statLabel}
                  />
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {[1, 2].map((_, index) => (
          <SkeletonPlaceholder
            key={index}
            width={horizontalScale(100)}
            height={verticalScale(32)}
            style={styles.tabItem}
          />
        ))}
      </View>

      {/* Check All */}
      <View style={styles.checkAllContainer}>
        <SkeletonPlaceholder width={horizontalScale(80)} height={verticalScale(20)} />
        <SkeletonPlaceholder width={moderateScale(20)} height={moderateScale(20)} style={styles.checkbox} />
      </View>

      {/* Timeslip List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {[1, 2].map((_, index) => (
          <View key={index} style={styles.timestampCard}>
            {/* Date Badge */}
            <SkeletonPlaceholder
              width={horizontalScale(80)}
              height={verticalScale(20)}
              style={styles.dateBadge}
            />
            {/* Checkbox */}
            <SkeletonPlaceholder
              width={moderateScale(20)}
              height={moderateScale(20)}
              style={styles.checkbox}
            />
            {/* Time Entries */}
            <View style={styles.timeEntriesContainer}>
              {/* Check In */}
              <View style={styles.timeEntry}>
                <View style={styles.timeEntryHeader}>
                  <SkeletonPlaceholder
                    width={moderateScale(32)}
                    height={moderateScale(32)}
                    style={styles.entryIcon}
                  />
                  <SkeletonPlaceholder
                    width={horizontalScale(60)}
                    height={verticalScale(12)}
                  />
                </View>
                <View style={styles.timeDetails}>
                  <SkeletonPlaceholder
                    width={horizontalScale(80)}
                    height={verticalScale(18)}
                    style={styles.timeValue}
                  />
                  <View style={styles.statusContainer}>
                    <SkeletonPlaceholder
                      width={moderateScale(8)}
                      height={moderateScale(8)}
                      style={styles.statusIndicator}
                    />
                    <SkeletonPlaceholder
                      width={horizontalScale(60)}
                      height={verticalScale(11)}
                    />
                  </View>
                </View>
              </View>
              {/* Divider */}
              <View style={styles.verticalDivider}>
                <SkeletonPlaceholder
                  width={1}
                  height={moderateScale(60)}
                  style={styles.dividerLine}
                />
                <SkeletonPlaceholder
                  width={moderateScale(6)}
                  height={moderateScale(6)}
                  style={styles.dividerDot}
                />
              </View>
              {/* Check Out */}
              <View style={styles.timeEntry}>
                <View style={styles.timeEntryHeader}>
                  <SkeletonPlaceholder
                    width={moderateScale(32)}
                    height={moderateScale(32)}
                    style={styles.entryIcon}
                  />
                  <SkeletonPlaceholder
                    width={horizontalScale(60)}
                    height={verticalScale(12)}
                  />
                </View>
                <View style={styles.timeDetails}>
                  <SkeletonPlaceholder
                    width={horizontalScale(80)}
                    height={verticalScale(18)}
                    style={styles.timeValue}
                  />
                  <View style={styles.statusContainer}>
                    <SkeletonPlaceholder
                      width={moderateScale(8)}
                      height={moderateScale(8)}
                      style={styles.statusIndicator}
                    />
                    <SkeletonPlaceholder
                      width={horizontalScale(60)}
                      height={verticalScale(11)}
                    />
                  </View>
                </View>
              </View>
            </View>
            {/* Individual Buttons */}
            <View style={styles.individualButtonContainer}>
              <SkeletonPlaceholder
                width={horizontalScale(100)}
                height={verticalScale(32)}
                style={styles.individualButton}
              />
              <SkeletonPlaceholder
                width={horizontalScale(100)}
                height={verticalScale(32)}
                style={styles.individualButton}
              />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bulk Buttons */}
      <View style={styles.buttonContainer}>
        <SkeletonPlaceholder
          width={horizontalScale(140)}
          height={verticalScale(48)}
          style={styles.actionButton}
        />
        <SkeletonPlaceholder
          width={horizontalScale(140)}
          height={verticalScale(48)}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: horizontalScale(50),
    paddingVertical: verticalScale(40), // Increased to match typical header height
    alignItems: "center",
  },
  cardWrapper: {
    marginTop: verticalScale(-90), // Adjusted for less aggressive overlap
    paddingHorizontal: horizontalScale(20),
    zIndex: 10,
  },
  card: {
    borderRadius: moderateScale(20),
    padding: moderateScale(60), // Reduced padding for tighter layout
    borderWidth: 2,
    borderColor: "#005F90",
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
    borderTopWidth: moderateScale(40), // Reduced triangle size
    borderRightWidth: moderateScale(40),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#B3E5FC",
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
    borderTopColor: "#B3E5FC",
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
    borderTopColor: "#B3E5FC",
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
    borderTopColor: "#B3E5FC",
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
    borderRadius: moderateScale(4),
    marginBottom: verticalScale(8),
  },
  statNumber: {
    marginBottom: verticalScale(4),
  },
  statLabel: {},
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f8f9fa",
    borderRadius: moderateScale(38),
    marginTop: verticalScale(10), // Slight increase for spacing
    marginHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(6),
  },
  tabItem: {
    borderRadius: moderateScale(38),
  },
  checkAllContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(16),
  },
  checkbox: {
    marginLeft: horizontalScale(8),
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: horizontalScale(20),
    paddingTop: verticalScale(20),
  },
  scrollContent: {
    paddingBottom: verticalScale(120), // Matches original
  },
  timestampCard: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(16),
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  dateBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    borderBottomLeftRadius: moderateScale(8),
    zIndex: 1,
  },
  timeEntriesContainer: {
    flexDirection: "row",
    padding: moderateScale(16),
    paddingTop: verticalScale(20),
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
    borderRadius: moderateScale(16),
    marginRight: horizontalScale(8),
  },
  timeDetails: {
    alignItems: "flex-start",
  },
  timeValue: {
    marginBottom: verticalScale(8),
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    borderRadius: moderateScale(4),
    marginRight: horizontalScale(6),
  },
  verticalDivider: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: horizontalScale(16),
    position: "relative",
  },
  dividerLine: {
    borderRadius: moderateScale(1),
  },
  dividerDot: {
    position: "absolute",
    borderRadius: moderateScale(3),
  },
  individualButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: moderateScale(16),
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    marginTop: verticalScale(8),
  },
  individualButton: {
    borderRadius: moderateScale(20),
    marginHorizontal: horizontalScale(4),
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
    borderRadius: moderateScale(24),
    marginHorizontal: horizontalScale(12),
  },
  placeholder: {
    borderRadius: moderateScale(4),
  },
});

export default TimeslipApproveSkeleton;