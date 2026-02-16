import React, { useEffect } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { horizontalScale, moderateScale, verticalScale } from 'utils/metrics';
import { darkTheme, lightTheme } from '../constants/colors';

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

const HomeCardSkeleton = () => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <View style={styles.cardWrapper}>
      <View style={[styles.card, { backgroundColor: colors.white }]}>
        <View style={styles.cardContent}>
          <View style={styles.leftSection}>
            <View>
              <SkeletonLoader style={styles.greetingPlaceholder} />
              <SkeletonLoader style={styles.datePlaceholder} />
              <SkeletonLoader style={styles.subTextPlaceholder} />
            </View>
          </View>
          <View style={styles.rightSection}>
            <SkeletonLoader style={styles.timePlaceholder} />
            <SkeletonLoader style={styles.subTextPlaceholder} />
          </View>
        </View>

        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <SkeletonLoader style={styles.iconPlaceholder} />
            <SkeletonLoader style={styles.statusTextPlaceholder} />
          </View>
          <View style={styles.statusItem}>
            <SkeletonLoader style={styles.iconPlaceholder} />
            <SkeletonLoader style={styles.statusTextPlaceholder} />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <SkeletonLoader style={styles.buttonPlaceholder} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginTop: verticalScale(-100),
    paddingHorizontal: horizontalScale(20),
    zIndex: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    minHeight: verticalScale(150),
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftSection: {
    flex: 1,
    paddingRight: horizontalScale(10),
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  greetingPlaceholder: {
    width: horizontalScale(150),
    height: verticalScale(18),
    borderRadius: moderateScale(4),
    marginBottom: verticalScale(4),
  },
  datePlaceholder: {
    width: horizontalScale(120),
    height: verticalScale(15),
    borderRadius: moderateScale(4),
    marginBottom: verticalScale(2),
  },
  subTextPlaceholder: {
    width: horizontalScale(100),
    height: verticalScale(13),
    borderRadius: moderateScale(4),
    marginTop: verticalScale(4),
  },
  timePlaceholder: {
    width: horizontalScale(80),
    height: verticalScale(15),
    borderRadius: moderateScale(4),
  },
  statusContainer: {
    marginTop: verticalScale(5),
    marginBottom: verticalScale(5),
    paddingTop: verticalScale(10),
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(6),
    flex: 1,
    minWidth: horizontalScale(150),
  },
  iconPlaceholder: {
    width: horizontalScale(16),
    height: verticalScale(16),
    borderRadius: moderateScale(8),
  },
  statusTextPlaceholder: {
    width: horizontalScale(100),
    height: verticalScale(12),
    borderRadius: moderateScale(4),
    marginLeft: horizontalScale(8),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: verticalScale(10),
  },
  buttonPlaceholder: {
    flex: 1,
    height: verticalScale(44),
    borderRadius: moderateScale(8),
  },
  skeleton: {
    opacity: 0.3,
  },
});

export default HomeCardSkeleton;