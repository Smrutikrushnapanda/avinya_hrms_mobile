import React, { useEffect } from 'react';
import { Dimensions, FlatList, StyleSheet, View, useColorScheme } from 'react-native';
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
const CARD_WIDTH = screenWidth - 60;

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

const renderHolidayCardSkeleton = ({ colors }) => {
  return (
    <View
      style={[
        styles.holidayCard,
        {
          backgroundColor: colors.background,
          borderColor: '#4A90E2', // Default to public holiday border color
          borderWidth: 1,
        },
      ]}
    >
      {/* Gradient Overlay */}
      <View
        style={[
          styles.gradientOverlay,
          { backgroundColor: 'rgba(74, 144, 226, 0.08)' }, // Mimic public holiday gradient
        ]}
      />
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.leftSection}>
          <View style={styles.dateBox}>
            <SkeletonLoader style={styles.dayPlaceholder} />
            <SkeletonLoader style={styles.monthBadgePlaceholder} />
          </View>
        </View>
        <View style={styles.rightSection}>
          <SkeletonLoader style={styles.typeBadgePlaceholder} />
        </View>
      </View>
      {/* Card Body */}
      <View style={styles.cardBody}>
        <View style={styles.nameAndCountdown}>
          <SkeletonLoader style={styles.holidayNamePlaceholder} />
          <SkeletonLoader style={styles.countdownPlaceholder} />
        </View>
      </View>
    </View>
  );
};

const UpcomingHolidaySkeleton = () => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SkeletonLoader style={styles.sectionTitlePlaceholder} />
        <SkeletonLoader style={styles.viewAllPlaceholder} />
      </View>
      <FlatList
        data={[{ id: '1' }, { id: '2' }, { id: '3' }]}
        renderItem={() => renderHolidayCardSkeleton({ colors })}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        snapToInterval={CARD_WIDTH + 12}
        snapToAlignment="start"
        decelerationRate="fast"
        pagingEnabled
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: verticalScale(25),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: horizontalScale(20),
    marginBottom: verticalScale(10),
  },
  sectionTitlePlaceholder: {
    width: horizontalScale(120),
    height: verticalScale(17),
    borderRadius: moderateScale(4),
  },
  viewAllPlaceholder: {
    width: horizontalScale(60),
    height: verticalScale(14),
    borderRadius: moderateScale(4),
  },
  listContainer: {
    paddingHorizontal: horizontalScale(20),
  },
  holidayCard: {
    width: CARD_WIDTH,
    height: verticalScale(120),
    borderRadius: moderateScale(20),
    marginRight: horizontalScale(12),
    marginBottom: verticalScale(15),
    marginTop: verticalScale(8),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: moderateScale(20),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: moderateScale(12),
    paddingBottom: moderateScale(8),
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBox: {
    alignItems: 'center',
  },
  dayPlaceholder: {
    width: horizontalScale(40),
    height: verticalScale(28),
    borderRadius: moderateScale(4),
  },
  monthBadgePlaceholder: {
    width: horizontalScale(40),
    height: verticalScale(14),
    borderRadius: moderateScale(10),
    marginTop: verticalScale(4),
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  typeBadgePlaceholder: {
    width: horizontalScale(80),
    height: verticalScale(20),
    borderRadius: moderateScale(15),
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: horizontalScale(12),
    paddingBottom: verticalScale(12),
    justifyContent: 'space-between',
  },
  nameAndCountdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: horizontalScale(10),
  },
  holidayNamePlaceholder: {
    width: horizontalScale(150),
    height: verticalScale(16),
    borderRadius: moderateScale(4),
    marginBottom: verticalScale(8),
  },
  countdownPlaceholder: {
    width: horizontalScale(80),
    height: verticalScale(16),
    borderRadius: moderateScale(10),
  },
  skeleton: {
    opacity: 0.3,
  },
});

export default UpcomingHolidaySkeleton;