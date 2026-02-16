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

const MessageSkeleton = ({ colors }) => {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Messages" />

      {/* Skeleton for Search and Filter Card */}
      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchWrapper}>
              <Skeleton
                width={moderateScale(20)}
                height={moderateScale(20)}
                style={[styles.searchIcon, { borderRadius: moderateScale(10) }]}
              />
              <Skeleton
                width={horizontalScale(200)}
                height={moderateScale(14)}
                style={{ flex: 1, marginHorizontal: horizontalScale(12) }}
              />
              <Skeleton
                width={moderateScale(18)}
                height={moderateScale(18)}
                style={[styles.clearButton, { borderRadius: moderateScale(9) }]}
              />
            </View>
            <Skeleton
              width={moderateScale(48)}
              height={moderateScale(48)}
              style={[styles.filterButton, { borderRadius: moderateScale(12) }]}
            />
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterBar}>
            {[...Array(4)].map((_, index) => (
              <View key={index} style={styles.filterItem}>
                <Skeleton
                  width={moderateScale(50)}
                  height={moderateScale(14)}
                  style={{ borderRadius: moderateScale(20) }}
                />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Skeleton for Messages Section */}
      <View style={styles.messagesSection}>
        <View style={styles.messagesHeader}>
          <Skeleton
            width={horizontalScale(150)}
            height={moderateScale(16)}
            style={{ borderRadius: moderateScale(8) }}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.messagesList}
        >
          {[...Array(3)].map((_, index) => (
            <View
              key={index}
              style={[
                styles.notificationCard,
                index === 2 && styles.lastCard,
              ]}
            >
              <View style={styles.cardContent}>
                <Skeleton
                  width={moderateScale(44)}
                  height={moderateScale(44)}
                  style={[styles.avatar, { borderRadius: moderateScale(22) }]}
                />
                <View style={styles.notificationContent}>
                  <View style={styles.titleRow}>
                    <View style={styles.titleContainer}>
                      <Skeleton
                        width={horizontalScale(100)}
                        height={moderateScale(14)}
                        style={{ marginRight: horizontalScale(8) }}
                      />
                      <View style={styles.metaInfo}>
                        <Skeleton
                          width={moderateScale(12)}
                          height={moderateScale(12)}
                          style={{ borderRadius: moderateScale(6) }}
                        />
                        <Skeleton
                          width={moderateScale(6)}
                          height={moderateScale(6)}
                          style={[styles.priorityDot, { borderRadius: moderateScale(3) }]}
                        />
                      </View>
                    </View>
                    <Skeleton
                      width={moderateScale(60)}
                      height={moderateScale(11)}
                    />
                  </View>
                  <Skeleton
                    width={horizontalScale(150)}
                    height={moderateScale(13)}
                    style={{ marginBottom: verticalScale(4) }}
                  />
                  <Skeleton
                    width={horizontalScale(250)}
                    height={moderateScale(12)}
                    style={{ marginBottom: verticalScale(2) }}
                  />
                  <Skeleton
                    width={horizontalScale(200)}
                    height={moderateScale(12)}
                  />
                </View>
              </View>
              <View style={styles.cardActions}>
                <Skeleton
                  width={moderateScale(16)}
                  height={moderateScale(16)}
                  style={{ borderRadius: moderateScale(8) }}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardWrapper: {
    marginTop: verticalScale(-100),
    paddingHorizontal: horizontalScale(16),
    zIndex: 10,
  },
  card: {
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(8),
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(12),
    marginBottom: verticalScale(16),
  },
  searchWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: moderateScale(12),
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(12),
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchIcon: {
    marginRight: horizontalScale(12),
  },
  clearButton: {
    padding: moderateScale(4),
  },
  filterButton: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(12),
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f5f5f5",
    borderRadius: moderateScale(16),
    paddingVertical: verticalScale(8),
  },
  filterItem: {
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
  },
  messagesSection: {
    flex: 1,
    paddingHorizontal: horizontalScale(16),
    marginTop: verticalScale(20),
  },
  messagesHeader: {
    marginBottom: verticalScale(16),
  },
  messagesList: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: verticalScale(100),
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderColor: "#E0E0E0",
  },
  lastCard: {
    marginBottom: verticalScale(20),
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
  },
  avatar: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: "#0077B6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: horizontalScale(12),
    position: "relative",
  },
  notificationContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: verticalScale(4),
  },
  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginRight: horizontalScale(8),
  },
  metaInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  priorityDot: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
    marginLeft: horizontalScale(6),
  },
  cardActions: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: horizontalScale(8),
  },
  skeletonContainer: {
    backgroundColor: "#e0e0e0",
    overflow: "hidden",
  },
  skeletonShimmer: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
});

export default MessageSkeleton;