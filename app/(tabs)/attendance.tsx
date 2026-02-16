import { AntDesign, FontAwesome, Ionicons } from "@expo/vector-icons";
import Header from "app/components/Header";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  useColorScheme,
} from "react-native";
import { monthlyAttendance } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import {
  horizontalScale,
  moderateScale,
  verticalScale,
} from "utils/metrics";
import { darkTheme, lightTheme } from "../constants/colors";
import AttendanceSkeleton from "../Loaders/AttendanceSkeleton";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const Attendance = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const { user } = useAuthStore();
  const currentDate = new Date();

  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [displayedItems, setDisplayedItems] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [hasMoreData, setHasMoreData] = useState<boolean>(true);
  const [totalWorkingDays, setTotalWorkingDays] = useState<number>(0);
  const [employeeWorkingDays, setEmployeeWorkingDays] = useState<number>(0);
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState<boolean>(false);
  const [pickerYear, setPickerYear] = useState<number>(currentDate.getFullYear());
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [selectedMonth, setSelectedMonth] = useState<number>(
    currentDate.getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    currentDate.getFullYear()
  );

  const ITEMS_PER_PAGE = 5;

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

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= currentYear - 3; y--) {
      years.push(y);
    }
    if (!years.includes(selectedYear)) {
      years.unshift(selectedYear);
    }
    return years;
  };

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

  const getBadgeProps = (status: string, isSunday: boolean) => {
    if (isSunday) {
      return { color: "#026D94", text: "Sunday" };
    }
    
    const statusLower = status?.toLowerCase();
    
    switch (statusLower) {
      case "absent":
        return { color: "#FF4444", text: "Absent" };
      case "late":
        return { color: "#FFBB33", text: "Late" };
      case "halfday":
      case "half_day":
      case "half-day":
        return { color: "#e67b00ff", text: "Half Day" };
      case "present":
        return { color: "#00C851", text: "Present" };
      case "holiday":
        return { color: "#9C27B0", text: "Holiday" };
      case "pending":
        return { color: "#FFA500", text: "Pending" };
      default:
        const capitalizedStatus = status?.charAt(0).toUpperCase() + status?.slice(1).toLowerCase();
        return { color: "#FFA500", text: capitalizedStatus || "Unknown" };
    }
  };

  const getIconProps = (status: string, isSunday: boolean, isHoliday: boolean) => {
    if (isHoliday) {
      return {
        name: "gift",
        color: "#9C27B0",
        backgroundColor: "#F3E5F5"
      };
    }
    
    if (isSunday) {
      return {
        name: "sun-o",
        color: "#026D94",
        backgroundColor: "#E1F4FF"
      };
    }
    
    const statusLower = status?.toLowerCase();
    
    switch (statusLower) {
      case "absent":
        return {
          name: "times-circle",
          color: "#FF4444",
          backgroundColor: "#FFE6E6"
        };
      case "late":
        return {
          name: "clock-o",
          color: "#FFBB33",
          backgroundColor: "#FFF4E0"
        };
      case "halfday":
      case "half_day":
      case "half-day":
        return {
          name: "adjust",
          color: "#e67b00ff",
          backgroundColor: "#FFF0E6"
        };
      case "present":
        return {
          name: "check-circle",
          color: "#00C851",
          backgroundColor: "#E8F5E8"
        };
      case "holiday":
        return {
          name: "gift",
          color: "#9C27B0",
          backgroundColor: "#F3E5F5"
        };
      case "pending":
        return {
          name: "hourglass-half",
          color: "#FFA500",
          backgroundColor: "#FFF4E0"
        };
      default:
        return {
          name: "question-circle",
          color: "#FFA500",
          backgroundColor: "#FFF4E0"
        };
    }
  };

  const sortAttendanceData = (data: any[]) => {
    return data.sort((a, b) => {
      const dateA = new Date(a.originalDate || a.date);
      const dateB = new Date(b.originalDate || b.date);
      const dateComparison = dateB.getTime() - dateA.getTime();
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

  const calculateWorkingDays = (records: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = selectedYear;
    const month = selectedMonth - 1;
    const workingDays: Date[] = [];
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const endDay = lastDayOfMonth + 1;

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
        if (endIndex >= attendanceData.length) {
          setHasMoreData(false);
        }
      } else {
        setHasMoreData(false);
      }
      setLoadingMore(false);
    }, 500);
  }, [attendanceData, currentPage, loadingMore, hasMoreData]);

  const fetchAttendanceData = async () => {
    if (!user?.userId || !user?.organizationId) {
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

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isCurrentMonth =
        selectedYear === today.getFullYear() &&
        selectedMonth === today.getMonth() + 1;

      const filteredRecords = isCurrentMonth
        ? attendanceRecords.filter((record: any) => {
            const recordDate = new Date(record.date || record.attendanceDate);
            recordDate.setHours(0, 0, 0, 0);
            return recordDate <= today;
          })
        : attendanceRecords;

      const transformedData = filteredRecords.map((record: any) => ({
        originalDate: record.date || record.attendanceDate,
        date: formatDate(record.date || record.attendanceDate),
        inTime: record.inTime || record.checkInTime || record.clockIn || null,
        outTime: record.outTime || record.checkOutTime || record.clockOut || null,
        inPhotoUrl: record.inPhotoUrl || null,
        outPhotoUrl: record.outPhotoUrl || null,
        status: record.status || record.attendanceStatus || "present",
        isHoliday: record.isHoliday || false,
        isSunday: record.isSunday || false,
        isOptionalHoliday: record.isOptionalHoliday || false,
      }));

      const sortedData = sortAttendanceData(transformedData);
      setAttendanceData(sortedData);
      setCurrentPage(0);
      setDisplayedItems([]);
      setHasMoreData(true);
      const initialItems = sortedData.slice(0, ITEMS_PER_PAGE);
      setDisplayedItems(initialItems);
      setCurrentPage(1);
      setHasMoreData(sortedData.length > ITEMS_PER_PAGE);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [user?.userId, user?.organizationId, selectedMonth, selectedYear]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(0);
    setDisplayedItems([]);
    setHasMoreData(true);
    await fetchAttendanceData();
    setRefreshing(false);
  };

  const toggleMonthPicker = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const toValue = showMonthPicker ? 0 : 1;
    Animated.timing(rotateAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    if (!showMonthPicker) {
      setPickerYear(selectedYear);
    }
    setShowMonthPicker(!showMonthPicker);
  };

  const handleMonthSelect = (month: number) => {
    setSelectedMonth(month);
    setSelectedYear(pickerYear);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setShowMonthPicker(false);
  };

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const handlePhotoClick = (photoUrl: string | null) => {
    if (photoUrl) {
      setSelectedPhotoUrl(photoUrl);
      setShowPhotoModal(true);
    } else {
      Alert.alert("No Photo", "No photo available for this time.");
    }
  };

  const attendancePercentage = totalWorkingDays
    ? ((employeeWorkingDays / totalWorkingDays) * 100).toFixed(1)
    : "0.0";

  const PhotoModal = () => (
    <Modal
      visible={showPhotoModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowPhotoModal(false)}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.modalCloseButton}
          onPress={() => setShowPhotoModal(false)}
        >
          <AntDesign name="close" size={30} color="#fff" />
        </TouchableOpacity>
        <Image
          source={{
            uri: selectedPhotoUrl || "https://cdn-icons-png.flaticon.com/512/9187/9187532.png",
          }}
          style={styles.modalImage}
          resizeMode="contain"
          onError={(error) => {
            console.log("Modal image load error:", error);
          }}
        />
      </View>
    </Modal>
  );

  if (loading) {
    return <AttendanceSkeleton colors={colors} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Attendance" />
      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <View style={styles.triangle} />
          <View style={styles.triangle2} />
          <View style={styles.triangle3} />
          <View style={styles.triangle4} />
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.progressCircle}>
                <Text style={styles.progressText}>{attendancePercentage}%</Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.text }]}>
                Attendance Rate
              </Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalWorkingDays}</Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>
                Total Working Days
              </Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: "#00C851" }]}>
                {employeeWorkingDays}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>
                Total Worked Days
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.activities}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionDetails, { color: colors.text }]}>
              Attendance Details
            </Text>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={toggleMonthPicker}
              activeOpacity={0.7}
            >
              <FontAwesome name="calendar" size={16} color="#035F91" />
              <Text style={styles.filterButtonText}>
                {monthNames[selectedMonth - 1]} {selectedYear}
              </Text>
              <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
                <FontAwesome name="chevron-down" size={12} color="#035F91" />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Inline Month Picker */}
          {showMonthPicker && (
            <View style={[styles.monthPickerCard, { backgroundColor: colors.white }]}>
              {/* Year Selection */}
              <Text style={[styles.pickerSectionTitle, { color: colors.text }]}>Year</Text>
              <View style={styles.pickerYearGrid}>
                {generateYears().map((year) => {
                  const isActive = year === pickerYear;
                  return (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.pickerYearItem,
                        { backgroundColor: colors.background },
                        isActive && styles.pickerYearItemActive,
                      ]}
                      onPress={() => setPickerYear(year)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.pickerYearIcon,
                          { backgroundColor: isActive ? "rgba(255,255,255,0.2)" : colors.primary + "15" },
                        ]}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color={isActive ? "#fff" : colors.primary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.pickerYearText,
                          { color: colors.text },
                          isActive && styles.pickerYearTextActive,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Month Selection */}
              <Text style={[styles.pickerSectionTitle, { color: colors.text, marginTop: verticalScale(16) }]}>Month</Text>
              <View style={styles.pickerMonthGrid}>
                {monthNames.map((monthName, index) => {
                  const monthNumber = index + 1;
                  const isFutureMonth =
                    pickerYear > currentDate.getFullYear() ||
                    (pickerYear === currentDate.getFullYear() &&
                      monthNumber > currentDate.getMonth() + 1);
                  const isSelected =
                    selectedMonth === monthNumber && selectedYear === pickerYear;

                  return (
                    <TouchableOpacity
                      key={`${pickerYear}-${monthNumber}`}
                      style={[
                        styles.pickerMonthButton,
                        { backgroundColor: colors.background },
                        isSelected && styles.pickerMonthSelected,
                        isFutureMonth && styles.pickerMonthDisabled,
                      ]}
                      onPress={() => {
                        if (!isFutureMonth) {
                          handleMonthSelect(monthNumber);
                        }
                      }}
                      disabled={isFutureMonth}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pickerMonthText,
                          { color: colors.text },
                          isSelected && styles.pickerMonthTextSelected,
                          isFutureMonth && styles.pickerMonthTextDisabled,
                        ]}
                      >
                        {monthName.substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

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
              contentContainerStyle={{ paddingBottom: verticalScale(20) }}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={["#035F91"]}
                  tintColor="#035F91"
                />
              }
            >
              {displayedItems.map((item: any, index: number) => {
                const { color: badgeColor, text: badgeText } = getBadgeProps(
                  item.status,
                  item.isSunday
                );
                const { name: iconName, color: iconColor, backgroundColor: iconBgColor } = getIconProps(
                  item.status,
                  item.isSunday,
                  item.isHoliday
                );

                return (
                  <View
                    key={`${item.originalDate}-${index}`}
                    style={[
                      styles.attendanceCard,
                      { borderLeftColor: badgeColor },
                    ]}
                  >
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
                    <View style={styles.dateSection}>
                      <View
                        style={[
                          styles.iconCircle,
                          { backgroundColor: iconBgColor }
                        ]}
                      >
                        <FontAwesome
                          name={iconName}
                          size={16}
                          color={iconColor}
                        />
                      </View>
                      <Text
                        style={[styles.dateText, { color: iconColor }]}
                      >
                        {item.date}
                      </Text>
                    </View>
                    <View style={styles.timeSection}>
                      <View style={styles.timeRow}>
                        <FontAwesome name="clock-o" size={14} color="#999" />
                        <TouchableOpacity
                          onPress={() => handlePhotoClick(item.inPhotoUrl)}
                        >
                          <Text style={styles.timeText}>
                            Punch In: {item.inTime || "--"}
                          </Text>
                        </TouchableOpacity>
                        <View style={styles.timeSeparator} />
                        <FontAwesome name="clock-o" size={14} color="#999" />
                        <TouchableOpacity
                          onPress={() => handlePhotoClick(item.outPhotoUrl)}
                        >
                          <Text style={styles.timeText}>
                            Last Punch: {item.outTime || "--"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
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
      <PhotoModal />
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
    borderRadius: moderateScale(20),
    padding: moderateScale(24),
   elevation:2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    borderWidth: 1,
    borderColor: "#E8ECEF",
    backgroundColor: "#FFFFFF",
    position: "relative",
    overflow: "hidden",
  },
  triangle: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#E1F4FF",
    borderRightColor: "transparent",
  },
  triangle2: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#E1F4FF",
    borderRightColor: "transparent",
    transform: [{ rotate: "180deg" }],
  },
  triangle3: {
    position: "absolute",
    bottom: 10,
    left: 10,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#E1F4FF",
    borderRightColor: "transparent",
    transform: [{ rotate: "270deg" }],
  },
  triangle4: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#E1F4FF",
    borderRightColor: "transparent",
    transform: [{ rotate: "90deg" }],
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(24),
    paddingBottom: verticalScale(0),
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECEF",
  },
  overviewTitle: {
    fontSize: moderateScale(20),
    fontWeight: "700",
    marginLeft: horizontalScale(12),
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: verticalScale(10),
    marginTop:8
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: moderateScale(28),
    fontWeight: "700",
    color: "#035F91",
    marginBottom: verticalScale(8),
  },
  statLabel: {
    fontSize: moderateScale(13),
    textAlign: "center",
    fontWeight: "500",
    opacity: 0.9,
    height: verticalScale(50),
  },
  progressCircle: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    backgroundColor: "#035F91",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(8),
    borderWidth: 2,
    borderColor: "#026D94",
  },
  progressText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#FFFFFF",
  },
  verticalDivider: {
    width: 1,
    height: verticalScale(50),
    backgroundColor: "#E8ECEF",
    marginHorizontal: horizontalScale(15),
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
    borderRadius: moderateScale(7),
    padding: moderateScale(12),
    marginTop: verticalScale(12),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    borderLeftWidth: 4,
  },
  sectionDetails: {
    fontSize: moderateScale(18),
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
    padding: moderateScale(8),
    borderRadius: 50,
    marginRight: horizontalScale(10),
  },
  dateText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
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
    gap: 1,
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
    marginBottom: 60,
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
  monthPickerModalContainer: {
    width: screenWidth * 0.9,
    maxHeight: screenHeight * 0.7,
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  monthPickerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECEF",
  },
  monthPickerModalTitle: {
    fontSize: moderateScale(20),
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  monthPickerCloseButton: {
    padding: moderateScale(8),
    borderRadius: moderateScale(20),
  },
  monthPickerModalContent: {
    paddingVertical: verticalScale(16),
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: verticalScale(40),
    right: horizontalScale(20),
    zIndex: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: moderateScale(20),
    padding: moderateScale(8),
  },
  modalImage: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.7,
  },
  yearSection: {
    marginBottom: verticalScale(20),
  },
  yearTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    marginBottom: verticalScale(12),
    marginLeft: horizontalScale(8),
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: horizontalScale(8),
  },
  monthButton: {
    width: "30%",
    padding: moderateScale(12),
    marginBottom: verticalScale(12),
    borderRadius: moderateScale(8),
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8ECEF",
  },
  selectedMonthButton: {
    backgroundColor: "#035F91",
    borderColor: "#026D94",
  },
  disabledMonthButton: {
    backgroundColor: "#E0E0E0",
    borderColor: "#D3D3D3",
    opacity: 0.6,
  },
  monthButtonText: {
    fontSize: moderateScale(14),
    color: "#333",
    fontWeight: "500",
  },
  selectedMonthButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  disabledMonthButtonText: {
    color: "#999",
  },

  // Inline Month Picker styles
  monthPickerCard: {
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    marginBottom: verticalScale(12),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#E8ECEF",
  },
  pickerSectionTitle: {
    fontSize: moderateScale(15),
    fontWeight: "bold",
    marginBottom: verticalScale(10),
  },
  pickerYearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: horizontalScale(8),
  },
  pickerYearItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(12),
    flex: 1,
    minWidth: (screenWidth - horizontalScale(100)) / 2,
  },
  pickerYearItemActive: {
    backgroundColor: "#026D94",
  },
  pickerYearIcon: {
    width: horizontalScale(30),
    height: horizontalScale(30),
    borderRadius: horizontalScale(15),
    justifyContent: "center",
    alignItems: "center",
    marginRight: horizontalScale(8),
  },
  pickerYearText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  pickerYearTextActive: {
    color: "#fff",
  },
  pickerMonthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: horizontalScale(8),
  },
  pickerMonthButton: {
    width: (screenWidth - horizontalScale(112)) / 4,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(10),
    alignItems: "center",
    justifyContent: "center",
  },
  pickerMonthText: {
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  pickerMonthSelected: {
    backgroundColor: "#026D94",
  },
  pickerMonthTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  pickerMonthDisabled: {
    backgroundColor: "#F2F2F2",
  },
  pickerMonthTextDisabled: {
    color: "#999",
  },
});

export default Attendance;
