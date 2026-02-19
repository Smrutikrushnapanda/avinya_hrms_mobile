import { Ionicons } from "@expo/vector-icons";
import Header from "app/components/Header";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import { getHolidaysByFinancialYear } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import { darkTheme, lightTheme } from "../constants/colors";
import CustomDialog from "../components/CustomDialog";

const { width: screenWidth } = Dimensions.get("window");

// Skeleton component
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

// Skeleton loader
const ViewAllHolidaysSkeleton = ({ colors }) => (
  <View style={[styles.container, { backgroundColor: colors.background }]}>
    <Header title="Holidays" />
    <View style={[styles.statsContainer, { backgroundColor: colors.white }]}>
      <Skeleton
        width={horizontalScale(150)}
        height={moderateScale(18)}
        style={{ alignSelf: "center", marginBottom: verticalScale(15) }}
      />
      <View style={styles.statsRow}>
        {[...Array(4)].map((_, index) => (
          <View key={index} style={styles.statItem}>
            <Skeleton
              width={moderateScale(40)}
              height={moderateScale(24)}
              style={{ marginBottom: verticalScale(4) }}
            />
            <Skeleton width={moderateScale(60)} height={moderateScale(12)} />
          </View>
        ))}
      </View>
    </View>

    <View style={styles.content}>
      <View style={[styles.tabContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.tabBar, { backgroundColor: colors.white }]}>
          {[...Array(4)].map((_, index) => (
            <View key={index} style={styles.tabItem}>
              <View style={styles.tabContent}>
                <Skeleton
                  width={moderateScale(16)}
                  height={moderateScale(16)}
                  style={[styles.tabIcon, { borderRadius: moderateScale(8) }]}
                />
                <Skeleton
                  width={moderateScale(50)}
                  height={moderateScale(11)}
                  style={{ marginTop: verticalScale(2) }}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      <FlatList
        data={[1, 2, 3, 4, 5, 6, 7, 8, 9]}
        renderItem={() => (
          <View style={[styles.holidayCard, { backgroundColor: colors.white }]}>
            <View style={styles.dateSection}>
              <View style={styles.dateBox}>
                <Skeleton
                  width="100%"
                  height={moderateScale(20)}
                  style={{ marginBottom: verticalScale(2) }}
                />
                <Skeleton
                  width="60%"
                  height={moderateScale(10)}
                  style={{ marginBottom: verticalScale(2) }}
                />
                <Skeleton width="40%" height={moderateScale(9)} />
              </View>
            </View>
            <View style={styles.contentSection}>
              <View style={styles.headerSection}>
                <Skeleton
                  width={horizontalScale(100)}
                  height={moderateScale(12)}
                  style={{ marginRight: horizontalScale(6) }}
                />
                <Skeleton
                  width={moderateScale(60)}
                  height={moderateScale(12)}
                  style={{ borderRadius: moderateScale(10) }}
                />
              </View>
              <Skeleton
                width={horizontalScale(100)}
                height={moderateScale(11)}
                style={{ marginVertical: verticalScale(4) }}
              />
              <Skeleton
                width={moderateScale(80)}
                height={moderateScale(11)}
                style={{ borderRadius: moderateScale(10) }}
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

const ViewAllHolidays = () => {
  const systemColorScheme = useColorScheme() ?? "light";
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === "dark");
  const colors = isDarkMode ? darkTheme : lightTheme;

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [filteredHolidays, setFilteredHolidays] = useState([]);
  const [dialogVisible, setDialogVisible] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<string>("INFO");
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [dialogMessage, setDialogMessage] = useState<string>("");
  const [dialogButtons, setDialogButtons] = useState<Array<{text: string, onPress: () => void, style?: 'default' | 'cancel' | 'destructive'}>>([]);

  const showDialog = (
    type: string,
    title: string,
    message: string,
    buttons?: {text: string, onPress?: () => void, style?: 'default' | 'cancel' | 'destructive'}[]
  ) => {
    setDialogType(type);
    setDialogTitle(title);
    setDialogMessage(message);
    if (buttons && buttons.length > 0) {
      setDialogButtons(buttons.map(btn => ({
        text: btn.text,
        onPress: btn.onPress || (() => setDialogVisible(false)),
        style: btn.style
      })));
    } else {
      setDialogButtons([{ text: "OK", onPress: () => setDialogVisible(false) }]);
    }
    setDialogVisible(true);
  };

  const router = useRouter();
  const { user } = useAuthStore();
  const orgId = user?.organizationId;

  function getCurrentFinancialYear() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    if (currentMonth >= 3) return currentYear;
    else return currentYear - 1;
  }

  // --- Fetch Holidays ---
  const fetchHolidays = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const financialYear = getCurrentFinancialYear();
      const response = await getHolidaysByFinancialYear({
        organizationId: orgId,
        fromYear: financialYear,
      });
      if (response.data) {
        const sortedHolidays = response.data.sort((a, b) => new Date(a.date) - new Date(b.date));
        setHolidays(sortedHolidays);
        filterHolidays(sortedHolidays, activeTab);
      }
    } catch (error) {
      console.error("Failed to fetch holidays:", error);
      showDialog("DANGER", "Error", "Failed to fetch holidays. Please try again.");
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  // --- Filter Holidays ---
  const filterHolidays = (holidayList, tab) => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    let filtered = [];
    if (tab === "Upcoming") {
      filtered = holidayList.filter((h) => {
        const d = new Date(h.date);
        d.setHours(0, 0, 0, 0);
        return d >= currentDate;
      });
    } else if (tab === "Public") {
      filtered = holidayList.filter((h) => !h.isOptional);
    } else if (tab === "Restricted") {
      filtered = holidayList.filter((h) => h.isOptional);
    } else if (tab === "Total") {
      filtered = holidayList;
    }
    setFilteredHolidays(filtered);
  };

  useEffect(() => {
    if (orgId) fetchHolidays();
  }, [orgId]);
  useEffect(() => {
    filterHolidays(holidays, activeTab);
  }, [activeTab, holidays]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHolidays(true);
  };

  // --- Helpers ---
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString("en-US", { month: "short" }),
      year: date.getFullYear(),
      fullDate: date.toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };
  };
  const getDaysRemaining = (dateString) => {
    const holidayDate = new Date(dateString);
    const currentDate = new Date();
    holidayDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
    const diffTime = holidayDate - currentDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} days`;
    if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} weeks`;
    return `In ${Math.floor(diffDays / 30)} months`;
  };
  const getTabCount = (tab) => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    switch (tab) {
      case "Upcoming":
        return holidays.filter((h) => new Date(h.date) >= currentDate).length;
      case "Public":
        return holidays.filter((h) => !h.isOptional).length;
      case "Restricted":
        return holidays.filter((h) => h.isOptional).length;
      case "Total":
        return holidays.length;
      default:
        return 0;
    }
  };

  // --- TabSelector ---
  const TabSelector = () => {
    const tabs = [
      { key: "Upcoming", label: "Upcoming", icon: "calendar-outline" },
      { key: "Public", label: "Public", icon: "calendar" },
      { key: "Restricted", label: "Restricted", icon: "calendar-clear-outline" },
      { key: "Total", label: "Total", icon: "calendar-sharp" },
    ];
    return (
      <View style={[styles.tabContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.tabBar, { backgroundColor: colors.white }]}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = getTabCount(tab.key);
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabItem,
                  isActive && [styles.tabItemActive, { backgroundColor: colors.primary }],
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.tabContent}>
                  <Text
                    style={[
                      styles.tabText,
                      { color: isActive ? "#fff" : colors.grey },
                      isActive && styles.tabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // --- HolidayCard ---
  const HolidayCard = ({ item, index }) => {
    const { day, month, year, fullDate } = formatDate(item.date);
    const daysRemaining = getDaysRemaining(item.date);
    const isPast = new Date(item.date) < new Date();

    return (
      <View style={[styles.holidayCard, { backgroundColor: colors.white }]}>
        {/* Left Section: Date */}
        <View style={styles.dateSection}>
          <View
            style={[
              styles.dateBox,
              {
                backgroundColor: item.isOptional ? "#FF8C00" : colors.primary,
              },
            ]}
          >
            <Text style={styles.dayText}>{day}</Text>
            <Text style={styles.monthText}>{month}</Text>
            <Text style={styles.yearText}>{year}</Text>
          </View>
        </View>

        {/* Right Section: Content */}
        <View style={styles.contentSection}>
          <View style={styles.headerSection}>
            <Text style={[styles.holidayName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: item.isOptional ? "#FFF3E0" : "#E3F2FD" }
              ]}
            >
              <Ionicons
                name={item.isOptional ? "calendar-clear-outline" : "calendar"}
                size={10}
                color={item.isOptional ? "#FF8C00" : colors.primary}
                style={styles.badgeIcon}
              />
              <Text
                style={[
                  styles.typeText,
                  { color: item.isOptional ? "#FF8C00" : colors.primary }
                ]}
              >
                {item.isOptional ? "Restricted" : "Public"}
              </Text>
            </View>
          </View>

          <Text style={[styles.fullDate, { color: colors.grey }]} numberOfLines={1}>
            {fullDate}
          </Text>

          {!isPast && (
            <View style={styles.countdownContainer}>
              <Ionicons name="time-outline" size={12} color={colors.primary} />
              <Text style={[styles.daysRemaining, { color: colors.primary }]}>{daysRemaining}</Text>
            </View>
          )}
          {isPast && (
            <View style={[styles.countdownContainer, { backgroundColor: "rgba(150, 150, 150, 0.1)" }]}>
              <Ionicons name="checkmark-circle-outline" size={12} color="#666" />
              <Text style={[styles.daysRemaining, { color: "#666" }]}>{daysRemaining}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // --- StatsSection ---
  const StatsSection = () => {
    const upcomingCount = holidays.filter((h) => new Date(h.date) >= new Date()).length;
    const totalCount = holidays.length;
    const restrictedCount = holidays.filter((h) => h.isOptional).length;
    const publicCount = totalCount - restrictedCount;
    return (
      <View style={[styles.statsContainer, { backgroundColor: colors.white }]}>
        <Text style={[styles.statsTitle, { color: colors.text }]}>
          Holiday Statistics
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{upcomingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.grey }]}>Upcoming</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#4CAF50" }]}>{publicCount}</Text>
            <Text style={[styles.statLabel, { color: colors.grey }]}>Public</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#FF8C00" }]}>{restrictedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.grey }]}>Restricted</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{totalCount}</Text>
            <Text style={[styles.statLabel, { color: colors.grey }]}>Total</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <ViewAllHolidaysSkeleton colors={colors} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Holidays" />
      <StatsSection />
      <View style={styles.content}>
        <TabSelector />
        {filteredHolidays.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={60} color="#ccc" />
            <Text style={[styles.emptyText, { color: colors.grey }]}>
              {activeTab === "Upcoming"
                ? "No upcoming holidays"
                : activeTab === "Public"
                ? "No public holidays"
                : activeTab === "Restricted"
                ? "No restricted holidays"
                : "No holidays found"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredHolidays}
            renderItem={({ item, index }) => <HolidayCard item={item} index={index} />}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </View>
      <CustomDialog isVisible={dialogVisible} type={dialogType as any} title={dialogTitle} message={dialogMessage} buttons={dialogButtons} onCancel={() => setDialogVisible(false)} />
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: horizontalScale(20),
  },
  tabContainer: { marginTop: verticalScale(20) },
  tabBar: {
    flexDirection: "row",
    borderRadius: moderateScale(20),
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
    borderRadius: moderateScale(20),
    marginHorizontal: horizontalScale(2),
  },
  tabItemActive: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(2),
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabIcon: { marginBottom: verticalScale(2) },
  tabText: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    textAlign: "center",
  },
  tabTextActive: { fontWeight: "700" },
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
  statsTitle: {
    fontSize: moderateScale(18),
    fontWeight: "bold",
    marginBottom: verticalScale(15),
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: { alignItems: "center" },
  statNumber: {
    fontSize: moderateScale(24),
    fontWeight: "bold",
    marginBottom: verticalScale(4),
  },
  statLabel: { fontSize: moderateScale(12), fontWeight: "500" },
  listContainer: {
    paddingBottom: verticalScale(20),
    paddingTop: verticalScale(15),
  },
  holidayCard: {
    flexDirection: "row",
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(8),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(3),
    minHeight: moderateScale(48),
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  dateSection: {
    flex: 0.15,
    justifyContent: "center",
    alignItems: "stretch",
    backgroundColor: "transparent",
  },
  dateBox: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: moderateScale(12),
    borderBottomLeftRadius: moderateScale(12),
    paddingVertical: moderateScale(6),
    minHeight: moderateScale(48),
    borderRightWidth: 2,
    borderRightColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: horizontalScale(2), height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(2),
    backgroundColor: "#e0e0e0",
  },
  dayText: {
    fontSize: moderateScale(20),
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    lineHeight: moderateScale(22),
  },
  monthText: {
    fontSize: moderateScale(10),
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    textTransform: "uppercase",
    marginTop: verticalScale(2),
  },
  yearText: {
    fontSize: moderateScale(9),
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    marginTop: verticalScale(2),
  },
  contentSection: {
    flex: 0.85,
    justifyContent: "flex-start",
    paddingTop: 0,
    paddingBottom: verticalScale(6),
    paddingLeft: horizontalScale(10),
    paddingRight: 0,
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(2),
  },
  holidayName: {
    flex: 1,
    fontSize: moderateScale(15),
    fontWeight: "700",
    lineHeight: moderateScale(14),
    marginRight: horizontalScale(6),
  },
typeBadge: {
  flexDirection: "row",
  alignItems: "center",
  paddingLeft: horizontalScale(6),
  paddingRight: 5,
  paddingVertical: verticalScale(3),
  // borderTopLeftRadius: moderateScale(10),
  borderBottomLeftRadius: moderateScale(10),
},
  badgeIcon: { marginRight: horizontalScale(3) },
  typeText: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    textTransform: "uppercase",
  },
  fullDate: {
    fontSize: moderateScale(11),
    marginBottom: verticalScale(4),
    lineHeight: moderateScale(14),
  },
  countdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(74, 144, 226, 0.1)",
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(10),
    alignSelf: "flex-start",
  },
  daysRemaining: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    marginLeft: horizontalScale(3),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: verticalScale(60),
  },
  emptyText: {
    fontSize: moderateScale(16),
    marginTop: verticalScale(15),
    fontWeight: "500",
  },
  skeletonContainer: {
    backgroundColor: "#e0e0e0",
    overflow: "hidden",
  },
  skeletonShimmer: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
});

export default ViewAllHolidays;
