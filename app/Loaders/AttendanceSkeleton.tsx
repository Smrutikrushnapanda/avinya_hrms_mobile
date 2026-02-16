import Header from 'app/components/Header';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";

interface AttendanceSkeletonProps {
  colors: any; // Matches the type used in Attendance (darkTheme or lightTheme)
}

const ShimmerPlaceholder = ({ style }: { style: any }) => {
  const translateX = useSharedValue(-100);

  // useEffect(() => {
  //   translateX.value = withRepeat(
  //     withTiming(100, {
  //       duration: 1000,
  //       easing: Easing.linear,
  //     }),
  //     -1,
  //     true
  //   );
  // }, [translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[style, styles.shimmerContainer]}>
      <Animated.View style={[styles.shimmer, animatedStyle]} />
    </View>
  );
};

const AttendanceSkeleton: React.FC<AttendanceSkeletonProps> = ({ colors }) => {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Attendance" />

      {/* Card Wrapper */}
      <View style={styles.cardWrapper}>
        {/* Overview Card Skeleton */}
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <View style={styles.triangle} />
          <View style={styles.triangle2} />
          <View style={styles.triangle3} />
          <View style={styles.triangle4} />
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ShimmerPlaceholder style={styles.progressCircle} />
              <ShimmerPlaceholder style={styles.statLabelPlaceholder} />
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <ShimmerPlaceholder style={styles.statNumberPlaceholder} />
              <ShimmerPlaceholder style={styles.statLabelPlaceholder} />
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <ShimmerPlaceholder style={styles.statNumberPlaceholder} />
              <ShimmerPlaceholder style={styles.statLabelPlaceholder} />
            </View>
          </View>
        </View>

        {/* Activities Section */}
        <View style={styles.activities}>
          <View style={styles.sectionHeader}>
            <ShimmerPlaceholder style={styles.sectionTitlePlaceholder} />
            <ShimmerPlaceholder style={styles.filterButtonPlaceholder} />
          </View>

          <ScrollView
            style={styles.activityScroll}
            contentContainerStyle={{ paddingBottom: verticalScale(20) }}
            showsVerticalScrollIndicator={false}
          >
            {/* Attendance Card Skeletons - Exactly 5 Cards */}
            {[...Array(5)].map((_, index) => (
              <View key={index} style={[styles.attendanceCard, { backgroundColor: colors.white }]}>
                <ShimmerPlaceholder style={styles.ribbonPlaceholder} />
                <View style={styles.dateSection}>
                  <ShimmerPlaceholder style={styles.iconCircle} />
                  <ShimmerPlaceholder style={styles.dateTextPlaceholder} />
                </View>
                <View style={styles.timeSection}>
                  <View style={styles.timeRow}>
                    <ShimmerPlaceholder style={styles.timeIconPlaceholder} />
                    <ShimmerPlaceholder style={styles.timeTextPlaceholder} />
                    <View style={styles.timeSeparator} />
                    <ShimmerPlaceholder style={styles.timeIconPlaceholder} />
                    <ShimmerPlaceholder style={styles.timeTextPlaceholder} />
                  </View>
                </View>
              </View>
            ))}
            <ShimmerPlaceholder style={styles.loadMoreButtonPlaceholder} />
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  shimmerContainer: {
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
  },
  shimmer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    opacity: 0.3,
  },
  cardWrapper: {
    marginTop: verticalScale(-90),
    paddingHorizontal: horizontalScale(20),
    zIndex: 10,
  },
  card: {
    borderRadius: moderateScale(20),
    padding: moderateScale(24),
    elevation: 2, // Match Attendance component
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    borderWidth: 1,
    borderColor: '#E8ECEF',
    marginBottom: verticalScale(20),
    position: 'relative',
    overflow: 'hidden',
    minHeight: verticalScale(110), // Ensure consistent height with Attendance card
  },
  triangle: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: '#E1F4FF',
    borderRightColor: 'transparent',
  },
  triangle2: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: '#E1F4FF',
    borderRightColor: 'transparent',
    transform: [{ rotate: '180deg' }],
  },
  triangle3: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: '#E1F4FF',
    borderRightColor: 'transparent',
    transform: [{ rotate: '270deg' }],
  },
  triangle4: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: '#E1F4FF',
    borderRightColor: 'transparent',
    transform: [{ rotate: '90deg' }],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: verticalScale(10),
    marginTop: verticalScale(8), // Match Attendance component
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressCircle: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    marginBottom: verticalScale(8),
  },
  statNumberPlaceholder: {
    width: horizontalScale(50),
    height: moderateScale(28),
    borderRadius: moderateScale(4),
    marginBottom: verticalScale(8),
  },
  statLabelPlaceholder: {
    width: horizontalScale(80),
    height: moderateScale(13),
    borderRadius: moderateScale(4),
    height: verticalScale(50), // Match statLabel height in Attendance
  },
  verticalDivider: {
    width: 1,
    height: verticalScale(50),
    backgroundColor: '#E8ECEF',
    marginHorizontal: horizontalScale(15),
  },
  activities: {
    marginTop: verticalScale(20),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  sectionTitlePlaceholder: {
    width: horizontalScale(120),
    height: moderateScale(18),
    borderRadius: moderateScale(4),
  },
  filterButtonPlaceholder: {
    width: horizontalScale(120),
    height: moderateScale(30),
    borderRadius: moderateScale(20),
  },
  activityScroll: {
    maxHeight: verticalScale(400),
  },
  attendanceCard: {
    borderRadius: moderateScale(7),
    padding: moderateScale(12),
    marginTop: verticalScale(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    borderLeftWidth: 4,
    borderLeftColor: '#E0E0E0',
  },
  ribbonPlaceholder: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: horizontalScale(60),
    height: moderateScale(20),
    borderTopRightRadius: moderateScale(12),
    borderBottomLeftRadius: moderateScale(8),
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  iconCircle: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: 50,
    marginRight: horizontalScale(10),
  },
  dateTextPlaceholder: {
    width: horizontalScale(120),
    height: moderateScale(14),
    borderRadius: moderateScale(4),
  },
  timeSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: verticalScale(8),
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 1,
  },
  timeIconPlaceholder: {
    width: moderateScale(14),
    height: moderateScale(14),
    borderRadius: moderateScale(7),
  },
  timeTextPlaceholder: {
    width: horizontalScale(80),
    height: moderateScale(13),
    borderRadius: moderateScale(4),
    marginLeft: horizontalScale(6),
    marginRight: horizontalScale(12),
  },
  timeSeparator: {
    width: 1,
    height: moderateScale(14),
    backgroundColor: '#E0E0E0',
    marginHorizontal: horizontalScale(8),
  },
  loadMoreButtonPlaceholder: {
    width: '100%',
    height: moderateScale(40),
    borderRadius: moderateScale(8),
    marginTop: verticalScale(12),
    marginBottom: verticalScale(60),
  },
});

export default AttendanceSkeleton;
