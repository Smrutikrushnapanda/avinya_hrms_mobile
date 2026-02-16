import Header from "app/components/Header";
import React, { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";

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

const LeaveSkeleton = ({ colors }) => {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Leave" />

      {/* Skeleton for Summary Card */}
      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          {[...Array(4)].map((_, index) => (
            <View key={index}>
              <View style={styles.leaveRow}>
                <Skeleton
                  width={moderateScale(36)}
                  height={moderateScale(36)}
                  style={[styles.iconWrapper, { borderRadius: moderateScale(18) }]}
                />
                <View style={styles.textContainer}>
                  <Skeleton
                    width={horizontalScale(100)}
                    height={moderateScale(14)}
                    style={{ marginBottom: verticalScale(4) }}
                  />
                  <Skeleton width={horizontalScale(60)} height={moderateScale(12)} />
                </View>
                <View style={styles.rightContainer}>
                  <Skeleton
                    width={moderateScale(30)}
                    height={moderateScale(18)}
                    style={{ marginBottom: verticalScale(4) }}
                  />
                  <Skeleton width={moderateScale(60)} height={moderateScale(12)} />
                </View>
              </View>
              {index < 3 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>

      {/* Skeleton for Filter Tabs */}
      <View style={styles.tabBar}>
        {[...Array(4)].map((_, index) => (
          <View key={index} style={styles.tabItem}>
            <Skeleton
              width={moderateScale(50)}
              height={moderateScale(14)}
              style={{ borderRadius: moderateScale(20) }}
            />
          </View>
        ))}
      </View>

      {/* Skeleton for Leave Applications */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {[...Array(3)].map((_, index) => (
          <View key={index} style={styles.leaveCard}>
            <View style={styles.leaveCardHeader}>
              <Skeleton width={moderateScale(80)} height={moderateScale(14)} />
              <Skeleton width={moderateScale(80)} height={moderateScale(14)} />
            </View>
            <View style={styles.leaveCardBody}>
              <View>
                <Skeleton
                  width={moderateScale(60)}
                  height={moderateScale(12)}
                  style={{ marginBottom: verticalScale(4) }}
                />
                <Skeleton width={moderateScale(100)} height={moderateScale(14)} />
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Skeleton
                  width={moderateScale(60)}
                  height={moderateScale(12)}
                  style={{ marginBottom: verticalScale(4) }}
                />
                <Skeleton width={moderateScale(60)} height={moderateScale(14)} />
              </View>
            </View>
            <View style={styles.statusContainer}>
              <Skeleton
                width={moderateScale(16)}
                height={moderateScale(16)}
                style={{ borderRadius: moderateScale(8), marginRight: horizontalScale(6) }}
              />
              <Skeleton width={moderateScale(60)} height={moderateScale(13)} />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Skeleton for Floating Action Button */}
      <View style={styles.floatingButton}>
        <Skeleton
          width={moderateScale(24)}
          height={moderateScale(24)}
          style={{ borderRadius: moderateScale(12) }}
        />
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
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
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
  rightContainer: {
    alignItems: "flex-end",
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
    backgroundColor: "#f5f5f5",
    borderRadius: moderateScale(16),
    marginTop: verticalScale(24),
    marginHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(8),
  },
  tabItem: {
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: horizontalScale(20),
    paddingTop: verticalScale(20),
  },
  scrollContent: {
    paddingBottom: verticalScale(100),
  },
  leaveCard: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: verticalScale(16),
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowRadius: moderateScale(2),
  },
  leaveCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  leaveCardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  floatingButton: {
    position: "absolute",
    bottom: verticalScale(100),
    left: "76%",
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
  },
  skeletonContainer: {
    backgroundColor: "#e0e0e0",
    overflow: "hidden",
  },
  skeletonShimmer: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
});

export default LeaveSkeleton;