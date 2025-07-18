import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
            borderColor: item.isOptional ? "#FFA500" : colors.primary,
          },
        ]}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <Text style={[styles.dayText, { color: colors.text }]}>{day}</Text>
            <Text style={[styles.monthText, { color: colors.text }]}>
              {month}
            </Text>
          </View>
          <View style={styles.typeContainer}>
            <View
              style={[
                styles.typeIndicator,
                {
                  backgroundColor: item.isOptional ? "#FFA500" : colors.primary,
                },
              ]}
            >
              <Ionicons
                name={item.isOptional ? "ellipse-outline" : "ellipse"}
                size={8}
                color="#fff"
              />
            </View>
            <Text
              style={[
                styles.typeText,
                {
                  color: item.isOptional ? "#FFA500" : colors.primary,
                },
              ]}
            >
              {item.isOptional ? "Optional" : "Holiday"}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text
            style={[styles.holidayName, { color: colors.text }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>
          <Text style={[styles.daysRemaining, { color: "#666" }]}>
            {daysRemaining}
          </Text>
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
        <TouchableOpacity>
          <Text style={[styles.viewAllText, { color: colors.primary }]}>
            View All
          </Text>
        </TouchableOpacity>
      </View>
      <View
        style={[
          {
            backgroundColor: "white",
            borderRadius: 20,
            padding: 10,
            marginHorizontal: 8,
            marginVertical: 8,
            elevation: 3,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            marginBottom: 40,
          },
        ]}
      >
        <FlatList
          data={upcomingHolidays}
          renderItem={renderHolidayCard}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          snapToInterval={
            styles.holidayCard.width + styles.listContainer.paddingHorizontal
          }
          snapToAlignment="start"
          decelerationRate="fast"
          pagingEnabled={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 5,
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
    width: 160,
    height: 130,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginRight: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 10,
    marginTop: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  dateContainer: {
    alignItems: "center",
  },
  dayText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  monthText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  typeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  cardBody: {
    flex: 1,
    justifyContent: "space-between",
  },
  holidayName: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  daysRemaining: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
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
});

export default UpcomingHoliday;
