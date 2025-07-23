import { FontAwesome } from "@expo/vector-icons";
import Header from "app/components/Header";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { monthlyAttendance } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import {
  horizontalScale,
  moderateScale,
  verticalScale,
} from "../../utils/metrics";
import { darkTheme, lightTheme } from "../constants/colors";

const Attendance = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const { user } = useAuthStore();

  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [displayedItems, setDisplayedItems] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMoreData, setHasMoreData] = useState<boolean>(true);
  const [totalWorkingDays, setTotalWorkingDays] = useState<number>(0);
  const [employeeWorkingDays, setEmployeeWorkingDays] = useState<number>(0);
  const [showMonthPicker, setShowMonthPicker] = useState<boolean>(false);

  // Month and year state
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    currentDate.getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    currentDate.getFullYear()
  );

  const ITEMS_PER_PAGE = 5;

  // Month names for display
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Generate only 2025
  const generateYears = () => {
    return [2025];
  };

  // Function to format date to "Day, Mon DD, YYYY" format
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  // Function to get badge color and text based on status
  const getBadgeProps = (status: string, isSunday: boolean) => {
    if (isSunday) {
      return { color: "#800094", text: "Sunday" };
    }
    switch (status?.toLowerCase()) {
      case "absent":
        return { color: "#FF4444", text: "Absent" };
      case "late":
        return { color: "#FFBB33", text: "Half Day" };
      case "halfday":
      case "half_day":
        return { color: "#00B8D9", text: "Half Day" };
      case "present":
        return { color: "#00C851", text: "Present" };
      case "holiday":
        return { color: "#9C27B0", text: "Holiday" };
      default:
        return { color: "#00C851", text: "Present" };
    }
  };

  // Function to sort attendance data - latest first, with priority for late entries
  const sortAttendanceData = (data: any[]) => {
    return data.sort((a, b) => {
      const dateA = new Date(a.originalDate || a.date);
      const dateB = new Date(b.originalDate || b.date);

      // First sort by date (latest first)
      const dateComparison = dateB.getTime() - dateA.getTime();

      // If dates are the same, prioritize late entries
      if (dateComparison === 0) {
        const aIsLate = a.status?.toLowerCase() === "late";
        const bIsLate = b.status?.toLowerCase() === "late";

        if (aIsLate && !bIsLate) return -1;
        if (!aIsLate && bIsLate) return 1;
        return 0;
      }

      return dateComparison;
    });
  };

  // Calculate total working days from 1st to yesterday (excluding Sundays and mandatory holidays)
  const calculateWorkingDays = (records: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = selectedYear;
    const month = selectedMonth - 1; // JavaScript months are 0-indexed
    const workingDays: Date[] = [];

    // Get the last day of the selected month
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

    // If it's current month, only count up to yesterday, otherwise count full month
    const isCurrentMonth =
      year === today.getFullYear() && month === today.getMonth();
    const endDay = isCurrentMonth ? today.getDate() : lastDayOfMonth + 1;

    for (let day = 1; day < endDay; day++) {
      const date = new Date(year, month, day);
      workingDays.push(date);
    }

    const actualWorkingDays = workingDays.filter((date) => {
      const dateStr = date.toISOString().split("T")[0];
      const match = records.find((r) => {
        const recordDate = new Date(
          r.originalDate || r.date || r.attendanceDate
        );
        return recordDate.toISOString().split("T")[0] === dateStr;
      });

      const isHoliday = match?.isHoliday;
      const isOptionalHoliday = match?.isOptionalHoliday;
      const isSunday = date.getDay() === 0;
      return !isSunday && !(isHoliday && !isOptionalHoliday);
    });

    return actualWorkingDays.length;
  };

  // Function to load more items (lazy loading)
  const loadMoreItems = useCallback(() => {
    if (loadingMore || !hasMoreData) return;

    setLoadingMore(true);

    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const newItems = attendanceData.slice(startIndex, endIndex);

    setTimeout(() => {
      if (newItems.length > 0) {
        setDisplayedItems((prev) => [...prev, ...newItems]);
        setCurrentPage((prev) => prev + 1);

        // Check if there are more items to load
        if (endIndex >= attendanceData.length) {
          setHasMoreData(false);
        }
      } else {
        setHasMoreData(false);
      }
      setLoadingMore(false);
    }, 500); // Small delay to show loading state
  }, [attendanceData, currentPage, loadingMore, hasMoreData]);

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    if (!user?.userId || !user?.organizationId) {
      Alert.alert("Error", "User information not found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await monthlyAttendance(
        user.userId,
        selectedMonth,
        selectedYear,
        user.organizationId
      );

      // Handle response - check if it's an array or object
      let attendanceRecords = [];

      if (Array.isArray(response.data)) {
        attendanceRecords = response.data;
      } else if (response.data && response.data.success && response.data.data) {
        attendanceRecords = response.data.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        attendanceRecords = response.data.data;
      } else {
        console.error("API response format unexpected:", response.data);
        Alert.alert("Error", "Unexpected API response format");
        return;
      }

      // Get current date for comparison (ignoring time)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to midnight for comparison

      // Only filter out future dates if we're viewing the current month
      const isCurrentMonth =
        selectedYear === today.getFullYear() &&
        selectedMonth === today.getMonth() + 1;

      const filteredRecords = isCurrentMonth
        ? attendanceRecords.filter((record: any) => {
            const recordDate = new Date(record.date || record.attendanceDate);
            recordDate.setHours(0, 0, 0, 0); // Normalize to midnight
            return recordDate < today;
          })
        : attendanceRecords; // Show all records for past months

      // Transform the data to match the expected format
      const transformedData = filteredRecords.map((record: any) => ({
        originalDate: record.date || record.attendanceDate,
        date: formatDate(record.date || record.attendanceDate),
        inTime: record.inTime || record.checkInTime || record.clockIn || null,
        outTime:
          record.outTime || record.checkOutTime || record.clockOut || null,
        status: record.status || record.attendanceStatus || "present",
        isHoliday: record.isHoliday || false,
        isSunday: record.isSunday || false,
        isOptionalHoliday: record.isOptionalHoliday || false,
      }));

      // Sort the data - latest first, with priority for late entries
      const sortedData = sortAttendanceData(transformedData);
      setAttendanceData(sortedData);

      // Reset pagination state
      setCurrentPage(0);
      setDisplayedItems([]);
      setHasMoreData(true);

      // Load initial items
      const initialItems = sortedData.slice(0, ITEMS_PER_PAGE);
      setDisplayedItems(initialItems);
      setCurrentPage(1);
      setHasMoreData(sortedData.length > ITEMS_PER_PAGE);

      // Calculate working days statistics
      const presentDays = transformedData.filter(
        (record: any) => record.status?.toLowerCase() === "present"
      ).length;

      const halfDays = transformedData.filter(
        (record: any) =>
          record.status?.toLowerCase() === "halfday" ||
          record.status?.toLowerCase() === "half_day" ||
          record.status?.toLowerCase() === "late"
      ).length;

      setEmployeeWorkingDays(presentDays + halfDays * 0.5);
      setTotalWorkingDays(calculateWorkingDays(transformedData));
    } catch (error) {
      console.error("Error fetching attendance:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to fetch attendance"
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount and when month/year changes
  useEffect(() => {
    fetchAttendanceData();
  }, [user?.userId, user?.organizationId, selectedMonth, selectedYear]);

  // Function to handle refresh
  const handleRefresh = () => {
    setCurrentPage(0);
    setDisplayedItems([]);
    setHasMoreData(true);
    fetchAttendanceData();
  };

  // Handle month selection
  const handleMonthYearSelect = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setShowMonthPicker(false);
  };

  // Month Picker Modal Component
  const MonthPickerModal = () => (
    <Modal
      visible={showMonthPicker}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowMonthPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContainer, { backgroundColor: colors.white }]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select Month & Year
            </Text>
            <TouchableOpacity
              onPress={() => setShowMonthPicker(false)}
              style={styles.closeButton}
            >
              <FontAwesome name="times" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {generateYears().map((year) => (
              <View key={year} style={styles.yearSection}>
                <Text style={[styles.yearTitle, { color: colors.text }]}>
                  {year}
                </Text>
                <View style={styles.monthGrid}>
                  {monthNames.map((monthName, index) => {
                    const monthNumber = index + 1;
                    const isSelected =
                      selectedMonth === monthNumber && selectedYear === year;
                    const isFutureMonth =
                      year === currentDate.getFullYear() &&
                      monthNumber > currentDate.getMonth() + 1;

                    return (
                      <TouchableOpacity
                        key={monthNumber}
                        style={[
                          styles.monthButton,
                          isSelected && styles.selectedMonthButton,
                          isFutureMonth && styles.disabledMonthButton,
                        ]}
                        onPress={() =>
                          !isFutureMonth &&
                          handleMonthYearSelect(monthNumber, year)
                        }
                        disabled={isFutureMonth}
                      >
                        <Text
                          style={[
                            styles.monthButtonText,
                            isSelected && styles.selectedMonthButtonText,
                            isFutureMonth && styles.disabledMonthButtonText,
                          ]}
                        >
                          {monthName.substring(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Attendance" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#035F91" />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading attendance data...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <Header title="Attendance" />
        <View style={styles.cardWrapper}>
          <View style={[styles.card, { backgroundColor: colors.white }]}>
            <View style={styles.statsContainer}>
              {/* Box 1 - Total Working Days */}
              <View
                style={[styles.cardinner, { backgroundColor: colors.white }]}
              >
                <View style={styles.circleDecoration} />
                <View style={styles.cardContentinner}>
                  <View style={styles.labelRow}>
                    <View style={[styles.dot, { backgroundColor: "green" }]} />
                    <Text style={[styles.labelText, { color: colors.text }]}>
                      Total working days of this month
                    </Text>
                  </View>
                  <Text style={styles.valueText}>{totalWorkingDays}</Text>
                </View>
              </View>

              {/* Box 2 - Employee Working Days */}
              <View
                style={[styles.cardinner, { backgroundColor: colors.white }]}
              >
                <View style={styles.circleDecoration} />
                <View style={styles.cardContentinner}>
                  <View style={styles.labelRow}>
                    <View
                      style={[styles.dot, { backgroundColor: "#035F91" }]}
                    />
                    <Text style={[styles.labelText, { color: colors.text }]}>
                      Employee Working Days
                    </Text>
                  </View>
                  <Text style={styles.valueText}>{employeeWorkingDays}</Text>
                </View>
              </View>
            </View>

            {/* Refresh Button */}
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
            >
              <FontAwesome name="refresh" size={16} color="#035F91" />
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activities}>
            {/* Header with Filter */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionDetails, { color: colors.text }]}>
                Attendance History
              </Text>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowMonthPicker(true)}
              >
                <FontAwesome name="calendar" size={16} color="#035F91" />
                <Text style={styles.filterButtonText}>
                  {monthNames[selectedMonth - 1]} {selectedYear}
                </Text>
                <FontAwesome name="chevron-down" size={12} color="#035F91" />
              </TouchableOpacity>
            </View>

            {attendanceData.length === 0 ? (
              <View style={styles.noDataContainer}>
                <FontAwesome name="calendar-times-o" size={48} color="#ccc" />
                <Text style={[styles.noDataText, { color: colors.text }]}>
                  No attendance data found for {monthNames[selectedMonth - 1]}{" "}
                  {selectedYear}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.activityScroll}
                contentContainerStyle={{ paddingBottom: 20 }}
                nestedScrollEnabled
              >
                {displayedItems.map((item: any, index: number) => {
                  const { color: badgeColor, text: badgeText } = getBadgeProps(
                    item.status,
                    item.isSunday
                  );

                  const isNonWorkingDay = item.isHoliday || item.isSunday;
                  const isLate = item.status?.toLowerCase() === "late";

                  return (
                    <View
                      key={`${item.originalDate}-${index}`}
                      style={[
                        styles.attendanceCard,
                        { borderLeftColor: badgeColor },
                      ]}
                    >
                      {/* Header Ribbon */}
                      <View
                        style={[styles.ribbon, { backgroundColor: badgeColor }]}
                      >
                        <Text style={styles.ribbonText}>
                          {item.isHoliday
                            ? "Holiday"
                            : item.isSunday
                            ? "Sunday"
                            : badgeText}
                        </Text>
                      </View>

                      {/* Date Section */}
                      <View style={styles.dateSection}>
                        <View
                          style={[
                            styles.iconCircle,
                            isNonWorkingDay && styles.nonWorkingDayIcon,
                            isLate && styles.lateIcon,
                          ]}
                        >
                          <FontAwesome
                            name={
                              item.isHoliday
                                ? "gift"
                                : item.isSunday
                                ? "sun-o"
                                : isLate
                                ? "clock-o"
                                : "calendar"
                            }
                            size={16}
                            color={
                              isNonWorkingDay
                                ? "#800094"
                                : isLate
                                ? "#FFBB33"
                                : "#035F91"
                            }
                          />
                        </View>
                        <Text
                          style={[
                            styles.dateText,
                            isNonWorkingDay && styles.nonWorkingDayText,
                            isLate && styles.lateText,
                          ]}
                        >
                          {item.date}
                        </Text>
                      </View>

                      {/* Time Section */}
                      <View style={styles.timeSection}>
                        <View style={styles.timeRow}>
                          <FontAwesome name="clock-o" size={14} color="#999" />
                          <Text style={styles.timeText}>
                            In: {item.inTime || "--"}
                          </Text>
                          <View style={styles.timeSeparator} />
                          <FontAwesome name="clock-o" size={14} color="#999" />
                          <Text style={styles.timeText}>
                            Out: {item.outTime || "--"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Load More Button */}
                {hasMoreData && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={loadMoreItems}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <View style={styles.loadingMoreContainer}>
                        <ActivityIndicator size="small" color="#026D94" />
                        <Text style={styles.loadingMoreText}>
                          Loading more...
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.loadMoreContainer}>
                        <FontAwesome
                          name="angle-down"
                          size={18}
                          color="#026D94"
                        />
                        <Text style={styles.loadMoreText}>Load More</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                {/* End of list indicator */}
                {!hasMoreData && displayedItems.length > 0 && (
                  <View style={styles.endOfListContainer}>
                    <Text style={styles.endOfListText}>
                      You've reached the end of your attendance records
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Month Picker Modal */}
      <MonthPickerModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardWrapper: {
    marginTop: verticalScale(-90),
    paddingHorizontal: horizontalScale(20),
    zIndex: 10,
  },
  card: {
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(20),
  },
  cardinner: {
    width: "48%",
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    position: "relative",
  },
  cardContentinner: {
    zIndex: 2,
  },
  circleDecoration: {
    position: "absolute",
    bottom: verticalScale(-20),
    right: horizontalScale(-20),
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    backgroundColor: "#C6F3FF",
    zIndex: 1,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(8),
  },
  dot: {
    width: moderateScale(10),
    height: moderateScale(10),
    borderRadius: moderateScale(5),
    marginRight: horizontalScale(6),
  },
  labelText: {
    fontSize: moderateScale(12),
    flexShrink: 1,
    minHeight: verticalScale(50),
  },
  valueText: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    color: "#000",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(8),
    paddingHorizontal: horizontalScale(16),
    backgroundColor: "#E1F4FF",
    borderRadius: moderateScale(20),
    alignSelf: "center",
  },
  refreshText: {
    marginLeft: horizontalScale(8),
    fontSize: moderateScale(14),
    color: "#035F91",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: verticalScale(100),
  },
  loadingText: {
    marginTop: verticalScale(16),
    fontSize: moderateScale(16),
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: verticalScale(40),
  },
  noDataText: {
    marginTop: verticalScale(16),
    fontSize: moderateScale(16),
    textAlign: "center",
  },
  attendanceCard: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    marginTop: verticalScale(12),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    borderLeftWidth: 3,
  },
  sectionDetails: {
    fontSize: moderateScale(17),
    fontWeight: "800",
  },
  activities: {
    marginTop: verticalScale(20),
  },
  activityScroll: {
    maxHeight: verticalScale(400),
  },
  ribbon: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(2),
    borderTopRightRadius: moderateScale(12),
    borderBottomLeftRadius: moderateScale(8),
  },
  ribbonText: {
    color: "#fff",
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  dateSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(8),
  },
  iconCircle: {
    backgroundColor: "#E1F4FF",
    padding: moderateScale(8),
    borderRadius: 50,
    marginRight: horizontalScale(10),
  },
  lateIcon: {
    backgroundColor: "#FFF4E0",
  },
  nonWorkingDayIcon: {
    backgroundColor: "#F3E5F5",
  },
  dateText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
  lateText: {
    color: "#B8860B",
    fontWeight: "600",
  },
  nonWorkingDayText: {
    color: "#666",
  },
  timeSection: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: verticalScale(8),
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap:7
  },
  timeText: {
    marginLeft: horizontalScale(6),
    marginRight: horizontalScale(12),
    fontSize: moderateScale(13),
    color: "#333",
  },
  timeSeparator: {
    width: 1,
    height: moderateScale(14),
    backgroundColor: "#999",
    marginHorizontal: horizontalScale(8),
  },
  loadMoreButton: {
    backgroundColor: "#E1F4FF",
    marginTop: verticalScale(12),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadMoreText: {
    color: "#026D94",
    fontSize: moderateScale(14),
    fontWeight: "600",
    marginLeft: horizontalScale(8),
  },
  loadingMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingMoreText: {
    color: "#026D94",
    fontSize: moderateScale(14),
    fontWeight: "600",
    marginLeft: horizontalScale(8),
  },
  endOfListContainer: {
    alignItems: "center",
    paddingVertical: verticalScale(20),
  },
  endOfListText: {
    color: "#999",
    fontSize: moderateScale(14),
    fontStyle: "italic",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(10),
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E1F4FF",
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
    borderWidth: 1,
    borderColor: "#035F91",
  },
  filterButtonText: {
    color: "#035F91",
    fontSize: moderateScale(13),
    fontWeight: "500",
    marginHorizontal: horizontalScale(6),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    maxHeight: "70%",
    borderRadius: moderateScale(16),
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.25,
    shadowRadius: moderateScale(4),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: moderateScale(20),
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
  },
  yearSection: {
    marginBottom: verticalScale(20),
  },
  yearTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    marginBottom: verticalScale(10),
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  monthButton: {
    width: "30%",
    padding: moderateScale(10),
    marginBottom: verticalScale(10),
    borderRadius: moderateScale(8),
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  selectedMonthButton: {
    backgroundColor: "#035F91",
  },
  disabledMonthButton: {
    backgroundColor: "#e0e0e0",
    opacity: 0.6,
  },
  monthButtonText: {
    fontSize: moderateScale(14),
    color: "#333",
  },
  selectedMonthButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  disabledMonthButtonText: {
    color: "#999",
  },
  modalContent: {
    padding: 20,
  },
  closeButton: {
    color: "red",
  },
});

export default Attendance;