import React, { useEffect } from 'react';
import { Dimensions, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { horizontalScale, moderateScale, verticalScale } from 'utils/metrics';
import { darkTheme, lightTheme } from '../constants/colors';

const { width: screenWidth } = Dimensions.get('window');

const SkeletonLoader = ({ style }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? darkTheme : lightTheme;
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1, // Infinite repeats
      true // Reverse on each repeat
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.skeleton, { backgroundColor: colors.grey }, style, animatedStyle]}
    />
  );
};

const IndexSkeleton = () => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Today Attendance Section Skeleton */}
        <View style={styles.row}>
          <SkeletonLoader style={styles.sectionTitlePlaceholder} />
          <SkeletonLoader style={styles.viewAllPlaceholder} />
        </View>

        {/* Attendance Cards Skeleton */}
        {[...Array(3)].map((_, index) => (
          <View key={index} style={styles.attendanceCard}>
            <SkeletonLoader style={styles.iconBoxPlaceholder} />
            <View style={styles.infoContainer}>
              <SkeletonLoader style={styles.titlePlaceholder} />
              <SkeletonLoader style={styles.subtitlePlaceholder} />
            </View>
            <View style={styles.timeContainer}>
              <SkeletonLoader style={styles.timePlaceholder} />
              <SkeletonLoader style={styles.statusPlaceholder} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: horizontalScale(20),
    marginTop: verticalScale(10),
  },
  sectionTitlePlaceholder: {
    width: horizontalScale(120),
    height: verticalScale(20),
    borderRadius: moderateScale(4),
  },
  viewAllPlaceholder: {
    width: horizontalScale(60),
    height: verticalScale(14),
    borderRadius: moderateScale(4),
  },
  attendanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    marginHorizontal: horizontalScale(20),
    marginTop: verticalScale(12),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconBoxPlaceholder: {
    width: horizontalScale(40),
    height: horizontalScale(40),
    borderRadius: horizontalScale(20),
  },
  infoContainer: {
    flex: 1,
    marginLeft: horizontalScale(12),
  },
  titlePlaceholder: {
    width: horizontalScale(80),
    height: verticalScale(16),
    borderRadius: moderateScale(4),
  },
  subtitlePlaceholder: {
    width: horizontalScale(60),
    height: verticalScale(12),
    borderRadius: moderateScale(4),
    marginTop: verticalScale(4),
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  timePlaceholder: {
    width: horizontalScale(60),
    height: verticalScale(16),
    borderRadius: moderateScale(4),
  },
  statusPlaceholder: {
    width: horizontalScale(50),
    height: verticalScale(10),
    borderRadius: moderateScale(4),
    marginTop: verticalScale(2),
  },
  skeleton: {
    opacity: 0.3, // Base opacity, animated via reanimated
  },
});

export default IndexSkeleton;