import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View, useColorScheme } from 'react-native';
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
const daySize = Math.min((screenWidth - 60) / 7, 45);
const circleSize = Math.min(daySize * 0.9, 32);

const SkeletonLoader = ({ style }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? darkTheme : lightTheme;
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
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

const HomeCalendarSkeleton = () => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <SkeletonLoader style={styles.sectionTitlePlaceholder} />
        <SkeletonLoader style={styles.iconPlaceholder} />
      </View>
      <View style={[styles.calendar, { backgroundColor: colors.white }]}>
        <View style={styles.calendarGrid}>
          {[...Array(6)].map((_, rowIndex) => (
            <View key={rowIndex} style={styles.calendarRow}>
              {[...Array(7)].map((_, colIndex) => (
                <View key={colIndex} style={styles.dayContainer}>
                  <SkeletonLoader style={styles.circleContainer} />
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calendarContainer: {
    paddingHorizontal: horizontalScale(20),
    marginTop: verticalScale(15),
    marginBottom: verticalScale(10),
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitlePlaceholder: {
    width: horizontalScale(100),
    height: verticalScale(17),
    borderRadius: moderateScale(4),
  },
  iconPlaceholder: {
    width: horizontalScale(20),
    height: verticalScale(20),
    borderRadius: moderateScale(10),
  },
  calendar: {
    borderRadius: moderateScale(10),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: verticalScale(10),
    marginBottom: verticalScale(35),
  },
  calendarGrid: {
    flexDirection: 'column',
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(2),
  },
  dayContainer: {
    width: daySize,
    height: daySize,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
  },
  circleContainer: {
    width: circleSize,
    height: circleSize,
    borderRadius: circleSize / 2,
  },
  skeleton: {
    opacity: 0.3,
  },
});

export default HomeCalendarSkeleton;