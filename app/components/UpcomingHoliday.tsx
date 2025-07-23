import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { getHolidaysByFinancialYear } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import { darkTheme, lightTheme } from "../constants/colors";

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 40; // Full width minus padding
const router=useRouter();

const UpcomingHoliday = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const { user } = useAuthStore();

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);

  const orgId = user?.organizationId;

  // Get current financial year
  const getCurrentFinancialYear = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Financial year starts from April (month 3 in 0-based indexing)
    if (currentMonth >= 3) {
      return currentYear;
    } else {
      return currentYear - 1;
    }
  };

  // Fetch holidays from API
  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const financialYear = getCurrentFinancialYear();
      const response = await getHolidaysByFinancialYear({
        organizationId: orgId,
        fromYear: financialYear,
      });

      if (response.data) {
        setHolidays(response.data);
        filterUpcomingHolidays(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch holidays:", error);
      Alert.alert("Error", "Failed to fetch holidays. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter and get upcoming holidays
  const filterUpcomingHolidays = (holidayList) => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const upcoming = holidayList
      .filter((holiday) => {
        const holidayDate = new Date(holiday.date);
        holidayDate.setHours(0, 0, 0, 0);
        return holidayDate >= currentDate;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 6); // Get only next 6 holidays

    setUpcomingHolidays(upcoming);
  };

  useEffect(() => {
    if (orgId) {
      fetchHolidays();
    }
  }, [orgId]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" });
    return { day, month };
  };

  // Calculate days remaining
  const getDaysRemaining = (dateString) => {
    const holidayDate = new Date(dateString);
    const currentDate = new Date();
    holidayDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);

    const diffTime = holidayDate - currentDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks`;
    return `${Math.floor(diffDays / 30)} months`;
  };

  // Render holiday card
  const renderHolidayCard = ({ item }) => {
    const { day, month } = formatDate(item.date);
    const daysRemaining = getDaysRemaining(item.date);

    return (
      <TouchableOpacity
        style={[
          styles.holidayCard,
          {
            backgroundColor: colors.background,
          },
        ]}
        activeOpacity={0.8}
      >
        {/* Background Gradient Effect */}
        <View 
          style={[
            styles.gradientOverlay,
            {
              backgroundColor: item.isOptional ? 'rgba(255, 165, 0, 0.08)' : 'rgba(74, 144, 226, 0.08)',
            }
          ]} 
        />
        
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <View style={styles.leftSection}>
            <View style={styles.dateBox}>
              <Text style={[styles.dayText, { color: item.isOptional ? "#FF8C00" : "#4A90E2" }]}>
                {day}
              </Text>
              <View style={[styles.monthBadge, { backgroundColor: item.isOptional ? "#FF8C00" : "#4A90E2" }]}>
                <Text style={styles.monthText}>{month}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.rightSection}>
            <View style={[styles.typeBadge, { backgroundColor: item.isOptional ? "#FFF3E0" : "#E3F2FD" }]}>
              <Ionicons
                name={item.isOptional ? "calendar" : "calendar"}
                size={12}
                color={item.isOptional ? "#FF8C00" : "#4A90E2"}
                style={styles.badgeIcon}
              />
              <Text
                style={[
                  styles.typeText,
                  { color: item.isOptional ? "#FF8C00" : "#4A90E2" },
                ]}
              >
                {item.isOptional ? "Restricted" : "Public Holiday"}
              </Text>
            </View>
          </View>
        </View>

        {/* Body Section */}
        <View style={styles.cardBody}>
  <View style={styles.nameAndCountdown}>
    <Text
      style={[styles.holidayName, { color: colors.text }]}
      numberOfLines={2}
      ellipsizeMode="tail"
    >
      {item.name}
    </Text>

    <View style={styles.countdownContainer}>
      <Ionicons 
        name="time-outline" 
        size={14} 
        color="#666" 
        style={styles.clockIcon}
      />
      <Text style={styles.daysRemaining}>
        {daysRemaining}
      </Text>
    </View>
  </View>

</View>

      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading holidays...
        </Text>
      </View>
    );
  }

  if (upcomingHolidays.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={40} color="#ccc" />
        <Text style={[styles.emptyText, { color: "#999" }]}>
          No upcoming holidays
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Upcoming Holidays
        </Text>
        <TouchableOpacity onPress={() => router.push("/ViewAllHolidays")}>
  <Text style={[styles.viewAllText, { color: colors.primary }]}>
    View All
  </Text>
</TouchableOpacity>
      </View>
      <FlatList
        data={upcomingHolidays}
        renderItem={renderHolidayCard}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        snapToInterval={CARD_WIDTH + 12} // Card width + margin
        snapToAlignment="start"
        decelerationRate="fast"
        pagingEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // marginTop: 5,
    marginBottom:25
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  holidayCard: {
    width: CARD_WIDTH,
    height: 140,
    borderRadius: 20,
    padding: 0,
    marginRight: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    marginBottom: 15,
    marginTop: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    paddingBottom: 12,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateBox: {
    alignItems: "center",
  },
  dayText: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
  },
  monthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  monthText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rightSection: {
    alignItems: "flex-end",
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  badgeIcon: {
    marginRight: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    justifyContent: "space-between",
  },
  holidayName: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 12,
  },
  footerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  clockIcon: {
    marginRight: 4,
  },
  daysRemaining: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  nameAndCountdown: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
},
});

export default UpcomingHoliday;