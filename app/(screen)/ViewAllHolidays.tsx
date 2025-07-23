import { Ionicons } from "@expo/vector-icons";
import Header from "app/components/Header";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import { getHolidaysByFinancialYear } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import { darkTheme, lightTheme } from "../constants/colors";

const { width: screenWidth } = Dimensions.get('window');

const ViewAllHolidays = () => {
  const systemColorScheme = useColorScheme() ?? "light";
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === "dark");
  const colors = isDarkMode ? darkTheme : lightTheme;

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'all'
  const [filteredHolidays, setFilteredHolidays] = useState([]);

  const router = useRouter();
  const { user } = useAuthStore();
  const orgId = user?.organizationId;

  // Get current financial year
  const getCurrentFinancialYear = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    if (currentMonth >= 3) {
      return currentYear;
    } else {
      return currentYear - 1;
    }
  };

  // Fetch holidays from API
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
      Alert.alert("Error", "Failed to fetch holidays. Please try again.");
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  // Filter holidays based on active tab
  const filterHolidays = (holidayList, tab) => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    let filtered = [];
    
    if (tab === 'upcoming') {
      filtered = holidayList.filter((holiday) => {
        const holidayDate = new Date(holiday.date);
        holidayDate.setHours(0, 0, 0, 0);
        return holidayDate >= currentDate;
      });
    } else {
      filtered = holidayList;
    }

    setFilteredHolidays(filtered);
  };

  useEffect(() => {
    if (orgId) {
      fetchHolidays();
    }
  }, [orgId]);

  useEffect(() => {
    filterHolidays(holidays, activeTab);
  }, [activeTab, holidays]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHolidays(true);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString("en-US", { month: "short" }),
      fullDate: date.toLocaleDateString("en-GB", {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
  };

  // Calculate days remaining
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

  // Tab selector
  const TabSelector = () => (
    <View style={[styles.tabContainer, { backgroundColor: colors.white }]}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'upcoming' && [styles.activeTab, { backgroundColor: colors.primary }]
        ]}
        onPress={() => setActiveTab('upcoming')}
      >
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'upcoming' ? '#fff' : colors.grey },
            activeTab === 'upcoming' && styles.activeTabText
          ]}
        >
          Upcoming
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'all' && [styles.activeTab, { backgroundColor: colors.primary }]
        ]}
        onPress={() => setActiveTab('all')}
      >
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'all' ? '#fff' : colors.grey },
            activeTab === 'all' && styles.activeTabText
          ]}
        >
          All Holidays
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Holiday card component
  const HolidayCard = ({ item, index }) => {
    const { day, month, fullDate } = formatDate(item.date);
    const daysRemaining = getDaysRemaining(item.date);
    const isPast = new Date(item.date) < new Date();

    return (
      <View style={[styles.holidayCard, { backgroundColor: colors.white }]}>
        {/* Left section with date */}
        <View style={styles.dateSection}>
          <View style={[
            styles.dateBox,
            { backgroundColor: item.isOptional ? "#FF8C00" : colors.primary }
          ]}>
            <Text style={styles.dayText}>{day}</Text>
            <Text style={styles.monthText}>{month}</Text>
          </View>
        </View>

        {/* Main content */}
        <View style={styles.contentSection}>
          <View style={styles.headerSection}>
            <Text style={[styles.holidayName, { color: colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={[
              styles.typeBadge,
              { backgroundColor: item.isOptional ? "#FFF3E0" : "#E3F2FD" }
            ]}>
              <Ionicons
                name={item.isOptional ? "calendar" : "calendar"}
                size={12}
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

          <Text style={[styles.fullDate, { color: colors.grey }]}>
            {fullDate}
          </Text>

          {!isPast && (
            <View style={styles.countdownContainer}>
              <Ionicons name="time-outline" size={14} color={colors.primary} />
              <Text style={[styles.daysRemaining, { color: colors.primary }]}>
                {daysRemaining}
              </Text>
            </View>
          )}

          {isPast && (
            <View style={[styles.countdownContainer, { backgroundColor: "rgba(150, 150, 150, 0.1)" }]}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#666" />
              <Text style={[styles.daysRemaining, { color: "#666" }]}>
                {daysRemaining}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Statistics section
  const StatsSection = () => {
    const upcomingCount = holidays.filter(holiday => 
      new Date(holiday.date) >= new Date()
    ).length;
    const totalCount = holidays.length;
    const restrictedCount = holidays.filter(holiday => holiday.isOptional).length;
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

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Holidays" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading holidays...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed: Added title prop to Header */}
      <Header title="Holidays" />
      
      {/* Statistics section - moved to normal flow instead of absolute positioning */}
      <StatsSection />
      
      <View style={styles.content}>
        <TabSelector />
        
        {filteredHolidays.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={60} color="#ccc" />
            <Text style={[styles.emptyText, { color: colors.grey }]}>
              {activeTab === 'upcoming' ? 'No upcoming holidays' : 'No holidays found'}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(15),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
  },
  headerRight: {
    width: moderateScale(40),
  },
  content: {
    flex: 1,
    paddingHorizontal: horizontalScale(20),
    // Removed marginTop since StatsSection is no longer absolute
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: moderateScale(12),
    padding: moderateScale(4),
    marginVertical: verticalScale(20),
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(2),
  },
  tab: {
    flex: 1,
    paddingVertical: verticalScale(12),
    paddingHorizontal: horizontalScale(16),
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  activeTab: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(2),
  },
  tabText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  // Fixed: Removed absolute positioning and adjusted styling
  statsContainer: {
    marginHorizontal: horizontalScale(20),
    marginTop: verticalScale(-80),
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
  },
  statsTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    marginBottom: verticalScale(15),
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    marginBottom: verticalScale(4),
  },
  statLabel: {
    fontSize: moderateScale(12),
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: verticalScale(20),
    paddingTop: verticalScale(10),
  },
  holidayCard: {
    flexDirection: 'row',
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    marginBottom: verticalScale(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
  },
  dateSection: {
    marginRight: horizontalScale(16),
    alignItems: 'center',
  },
  dateBox: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: moderateScale(24),
  },
  monthText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  contentSection: {
    flex: 1,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(8),
  },
  holidayName: {
    flex: 1,
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    lineHeight: moderateScale(20),
    marginRight: horizontalScale(12),
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  badgeIcon: {
    marginRight: horizontalScale(4),
  },
  typeText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  fullDate: {
    fontSize: moderateScale(14),
    marginBottom: verticalScale(8),
    lineHeight: moderateScale(18),
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
    alignSelf: 'flex-start',
  },
  daysRemaining: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    marginLeft: horizontalScale(4),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: verticalScale(10),
    fontSize: moderateScale(16),
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(60),
  },
  emptyText: {
    fontSize: moderateScale(16),
    marginTop: verticalScale(15),
    fontWeight: '500',
  },
});

export default ViewAllHolidays;