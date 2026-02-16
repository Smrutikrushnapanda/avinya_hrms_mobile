import Header from "app/components/Header";
import React, { useEffect } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";

const { width: screenWidth } = Dimensions.get("window");

const Skeleton = ({ width, height, style }) => {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width, {
        duration: 1200,
        easing: Easing.linear,
      }),
      -1,
      true
    );
  }, [width]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        styles.skeletonContainer,
        { width, height, borderRadius: moderateScale(8) },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.skeletonShimmer,
          { width: width * 2, height },
          animatedStyle,
        ]}
      />
    </View>
  );
};

const ViewAllHolidaysSkeleton = ({ colors }) => {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Holidays" />

      {/* Skeleton for StatsSection */}
      <View style={[styles.statsContainer, { backgroundColor: colors.white }]}>
        <Skeleton
          width={horizontalScale(150)}
          height={verticalScale(20)}
          style={{ alignSelf: "center", marginBottom: verticalScale(15) }}
        />
        <View style={styles.statsRow}>
          {[...Array(4)].map((_, index) => (
            <View key={index} style={styles.statItem}>
              <Skeleton
                width={moderateScale(40)}
                height={moderateScale(40)}
                style={{ borderRadius: moderateScale(20), marginBottom: verticalScale(4) }}
              />
              <Skeleton width={moderateScale(60)} height={moderateScale(12)} />
            </View>
          ))}
        </View>
      </View>

      {/* Skeleton for TabSelector */}
      <View style={styles.content}>
        <View style={[styles.tabContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.tabBar, { backgroundColor: colors.white }]}>
            {[...Array(4)].map((_, index) => (
              <View
                key={index}
                style={[styles.tabItem, { marginHorizontal: horizontalScale(2) }]}
              >
                <Skeleton
                  width={moderateScale(60)}
                  height={moderateScale(30)}
                  style={{ borderRadius: moderateScale(8) }}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Skeleton for Holiday Cards */}
        <FlatList
          data={[1, 2, 3]}
          renderItem={() => (
            <View style={[styles.holidayCard, { backgroundColor: colors.white }]}>
              <View style={styles.dateSection}>
                <Skeleton
                  width={moderateScale(60)}
                  height={moderateScale(60)}
                  style={{ borderRadius: moderateScale(12) }}
                />
              </View>
              <View style={styles.contentSection}>
                <View style={styles.headerSection}>
                  <Skeleton
                    width={horizontalScale(150)}
                    height={moderateScale(16)}
                    style={{ marginBottom: verticalScale(8) }}
                  />
                  <Skeleton
                    width={moderateScale(80)}
                    height={moderateScale(20)}
                    style={{ borderRadius: moderateScale(12) }}
                  />
                </View>
                <Skeleton
                  width={horizontalScale(120)}
                  height={moderateScale(14)}
                  style={{ marginBottom: verticalScale(8) }}
                />
                <Skeleton
                  width={moderateScale(100)}
                  height={moderateScale(20)}
                  style={{ borderRadius: moderateScale(12) }}
                />
              </View>
            </View>
          )}
          keyExtractor={(item) => item.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: horizontalScale(20),
  },
  tabContainer: {
    marginTop: verticalScale(20),
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: moderateScale(12),
    padding: moderateScale(4),
    marginHorizontal: horizontalScale(4),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    borderWidth: 1,
    borderColor: "#ccc",
  },
  tabItem: {
    flex: 1,
    paddingVertical: verticalScale(12),
    paddingHorizontal: horizontalScale(8),
    borderRadius: moderateScale(8),
    marginHorizontal: horizontalScale(2),
  },
  statsContainer: {
    marginHorizontal: horizontalScale(20),
    marginTop: verticalScale(-80),
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  listContainer: {
    paddingBottom: verticalScale(20),
    paddingTop: verticalScale(15),
  },
  holidayCard: {
    flexDirection: "row",
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    marginBottom: verticalScale(12),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
  },
  dateSection: {
    marginRight: horizontalScale(16),
    alignItems: "center",
  },
  contentSection: {
    flex: 1,
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: verticalScale(8),
  },
  skeletonContainer: {
    backgroundColor: "#e0e0e0",
    overflow: "hidden",
  },
  skeletonShimmer: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
});

export default ViewAllHolidaysSkeleton;