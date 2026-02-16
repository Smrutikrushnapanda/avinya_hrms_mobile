import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { monthlyAttendance } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import { darkTheme, lightTheme } from "../constants/colors";

// Get screen dimensions for responsive sizing
const { width: screenWidth } = Dimensions.get('window');
const daySize = Math.min((screenWidth - 60) / 7, 45); // Responsive day size
const circleSize = Math.min(daySize * 0.9, 32); // Smaller circle size (70% of daySize)
const todayCircleSize = circleSize * 1.1; // 10% larger for today
const textSize = Math.min(daySize * 0.45, 14); // Larger text size relative to circle

// Define types for attendance data
type AttendanceStatus = "present" | "absent" | "half-day" | "pending";

interface AttendanceRecord {
  date: string;
  status: AttendanceStatus;
  isSunday: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isOptional?: boolean;
  inTime?: string; // e.g., "09:00 AM"
  outTime?: string; // e.g., "05:00 PM"
  inPhotoUrl?: string; // URL for check-in photo
  outPhotoUrl?: string; // URL for check-out photo
}

interface AttendanceData {
  [date: string]: AttendanceRecord;
}

interface MarkedDate {
  selected: boolean;
  selectedColor: string;
  selectedTextColor: string;
  customStyles?: {
    container?: any;
    text?: any;
  };
  customText?: string;
}

interface MarkedDates {
  [date: string]: MarkedDate;
}

const HomeCalendar = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const { user } = useAuthStore();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [showDateModal, setShowDateModal] = useState<boolean>(false);
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [selectedDayData, setSelectedDayData] = useState<AttendanceRecord | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceData>({});
  const [currentMonth, setCurrentMonth] = useState<number>(
    new Date().getMonth() + 1
  );
  const [currentYear, setCurrentYear] = useState<number>(
    new Date().getFullYear()
  );

  // Function to fetch monthly attendance data
  const fetchMonthlyAttendance = async (month: number, year: number) => {
    if (!user?.userId || !user?.organizationId) {
      console.log("User ID or Organization ID not found");
      return;
    }

    try {
      const response = await monthlyAttendance(
        user.userId,
        month,
        year,
        user.organizationId
      );
      const attendanceRecords: AttendanceRecord[] = response.data;

      // Convert the response data to the format expected by the calendar
      const formattedAttendanceData: AttendanceData = {};

      attendanceRecords.forEach((record) => {
        const date = record.date;
        formattedAttendanceData[date] = record;
      });

      setAttendanceData(formattedAttendanceData);
    } catch (error) {
      console.error("Error fetching monthly attendance:", error);
      // Fallback to empty data on error
      setAttendanceData({});
    }
  };

  // Fetch data when component mounts or when month/year changes
  useEffect(() => {
    fetchMonthlyAttendance(currentMonth, currentYear);
  }, [currentMonth, currentYear, user?.userId, user?.organizationId]);

  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    const dayData = attendanceData[day.dateString];
    setSelectedDayData(dayData || { date: day.dateString, status: "pending" });
    setShowDateModal(true);
    console.log("Selected date:", day.dateString);
  };

  const onMonthChange = (month: any) => {
    const newMonth = month.month;
    const newYear = month.year;

    if (newMonth !== currentMonth || newYear !== currentYear) {
      setCurrentMonth(newMonth);
      setCurrentYear(newYear);
    }
  };

  // Function to format date for display
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return "";
    
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();
      
      // Add ordinal suffix to day
      const getOrdinalSuffix = (num: number): string => {
        const j = num % 10;
        const k = num % 100;
        if (j === 1 && k !== 11) return "st";
        if (j === 2 && k !== 12) return "nd";
        if (j === 3 && k !== 13) return "rd";
        return "th";
      };
      
      return `${day}${getOrdinalSuffix(day)} of ${month} ${year}`;
    } catch (error) {
      return dateString; // Fallback to original string if parsing fails
    }
  };

  const generateMarkedDates = (): MarkedDates => {
    const marked: MarkedDates = {};

    Object.keys(attendanceData).forEach((date: string) => {
      const record = attendanceData[date];
      let backgroundColor: string;

      // Priority: Sunday > Holiday > Status
      if (record.isSunday) {
        backgroundColor = "#026D94"; // Blue for Sunday
      } else if (record.isHoliday) {
        backgroundColor = "#ffb4b4ff"; // Blue for holidays
      } else {
        switch (record.status) {
          case "present":
            backgroundColor = "#00C851"; // Green
            break;
          case "absent":
            backgroundColor = "#ba0010ff"; // Improved red color - softer and more professional
            break;
          case "half-day":
            backgroundColor = "#e67b00ff"; // Orange
            break;
          case "pending":
            // Skip marking for pending status - let it appear as normal day
            return;
          default:
            // Skip marking for any other status
            return;
        }
      }

      const markedDate: MarkedDate = {
        selected: true,
        selectedColor: backgroundColor,
        selectedTextColor: "#ffffff",
      };

      marked[date] = markedDate;
    });

    // Highlight selected date if it's not already marked
    if (selectedDate && !attendanceData[selectedDate]) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: colors.primary,
        selectedTextColor: "#ffffff",
      };
    }

    return marked;
  };

  // Helper function to get border color for attendance status
  const getAttendanceBorderColor = (dayData: AttendanceRecord | undefined): string | null => {
    if (!dayData) return null;
    
    // Priority: Sunday > Holiday > Status
    if (dayData.isSunday) {
      return "#026D94"; // Blue for Sunday
    } else if (dayData.isHoliday) {
      return "#045faaff"; // Black border for holidays
    } else {
      switch (dayData.status) {
        case "present":
          return "#00C851"; // Green
        case "absent":
          return "#ba0010ff"; // Improved red color - softer and professional
        case "half-day":
          return "#e67b00ff"; // Orange
        case "pending":
          return null; // No special border for pending
        default:
          return null;
      }
    }
  };

  // Helper function to get light background color for attendance status
  const getAttendanceLightBackgroundColor = (dayData: AttendanceRecord | undefined): string | null => {
    if (!dayData) return null;
    
    if (dayData.isSunday) {
      return "#026D94"; 
    } else if (dayData.isHoliday) {
      return "transparent"; 
    } else {
      switch (dayData.status) {
        case "present":
          return "rgba(0, 200, 80, 0.09)"; 
        case "absent":
          return "rgba(186, 0, 16, 0.09)";
        case "half-day":
          return "rgba(230, 123, 0, 0.09)"; 
        case "pending":
          return null;
        default:
          return null;
      }
    }
  };

  // Function to calculate duration between inTime and outTime
  const calculateDuration = (inTime?: string, outTime?: string): string => {
    if (!inTime || !outTime) return "N/A";

    try {
      // Parse times (assuming "HH:MM AM/PM" format)
      const parseTime = (timeStr: string) => {
        const [time, period] = timeStr.split(" ");
        let [hours, minutes] = time.split(":").map(Number);
        if (period === "PM" && hours !== 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;
        return new Date(0, 0, 0, hours, minutes).getTime();
      };

      const inTimestamp = parseTime(inTime);
      const outTimestamp = parseTime(outTime);
      const durationMs = outTimestamp - inTimestamp;

      if (durationMs < 0) return "Invalid times";

      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    } catch (error) {
      return "N/A";
    }
  };

  // Function to open photo modal
  const openPhoto = (url?: string) => {
    if (url) {
      setSelectedPhotoUrl(url);
      setShowPhotoModal(true);
    }
  };

  return (
    <View>
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <Text style={[styles.sectionDetails, { color: colors.text }]}>
            Calendar
          </Text>
          <TouchableOpacity onPress={() => setShowInfo(true)}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        <Calendar
          onDayPress={onDayPress}
          onMonthChange={onMonthChange}
          markedDates={generateMarkedDates()}
          theme={{
            backgroundColor: colors.background,
            calendarBackground: colors.white,
            textSectionTitleColor: colors.text,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: "#ffffff",
            todayTextColor: colors.primary,
            dayTextColor: colors.text,
            textDisabledColor: colors.grey,
            arrowColor: colors.primary,
            monthTextColor: colors.text,
            textDayFontWeight: "400",
            textMonthFontWeight: "600",
            textDayHeaderFontWeight: "600",
          }}
          style={styles.calendar}
          markingType="custom"
          dayComponent={({ date, state, marking }) => {
            const dayData = attendanceData[date?.dateString || ""];
            const isToday =
              date?.dateString === new Date().toISOString().split("T")[0];

            // Get border color and light background color
            const borderColor = getAttendanceBorderColor(dayData);
            const lightBackgroundColor = getAttendanceLightBackgroundColor(dayData);

            // Determine holiday indicator text
            let holidayIndicator = null;
            if (dayData?.isHoliday) {
              if (dayData?.isOptional) {
                holidayIndicator = "RH"; // Optional holiday shows RH
              } else {
                holidayIndicator = "H"; // Normal holiday shows H
              }
            }

            return (
              <TouchableOpacity
                onPress={() => onDayPress(date as DateData)}
                style={styles.dayContainer}
              >
                <View
                  style={[
                    styles.circleContainer,
                    // Apply larger size for today
                    isToday && {
                      width: todayCircleSize,
                      height: todayCircleSize,
                    },
                    // Sunday design - solid blue background
                    dayData?.isSunday && {
                      backgroundColor: "#026D94",
                      borderRadius: isToday ? todayCircleSize / 2 : circleSize / 2,
                    },
                    // Holiday design - light background with border
                    dayData?.isHoliday && !dayData?.isSunday && {
                      backgroundColor: "transparent",
                      borderWidth: 2,
                      borderColor: borderColor || "transparent",
                      borderRadius: isToday ? todayCircleSize / 2 : circleSize / 2,
                    },
                    // Attendance status design - light background with border
                    borderColor && !dayData?.isSunday && !dayData?.isHoliday && {
                      backgroundColor: lightBackgroundColor || "transparent",
                      borderWidth: 2,
                      borderColor: borderColor,
                      borderRadius: isToday ? todayCircleSize / 2 : circleSize / 2,
                    },
                    // Today design - only apply if there's no attendance data
                    isToday && !dayData && {
                      borderWidth: 2,
                      borderColor: "#919191ff",
                      borderRadius: todayCircleSize / 2,
                      backgroundColor: "rgba(145, 145, 145, 0.2)",
                    },
                    // Today design with attendance data - add a subtle border to indicate today
                    isToday && dayData && {
                      borderWidth: dayData.isSunday ? 0 : 2,
                      borderColor: dayData.isSunday ? "transparent" : "#ffffff",
                      borderRadius: todayCircleSize / 2,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: dayData?.isSunday
                          ? "#ffffff" // White text for Sunday
                          : borderColor && !dayData?.isSunday
                          ? borderColor // Use border color for text
                          : isToday && !dayData
                          ? "#919191ff" // Grey text for today without attendance data
                          : state === "disabled"
                          ? colors.grey
                          : colors.text,
                      },
                      // Today text styling
                      isToday && {
                        fontWeight: "bold",
                      },
                      // Holiday text styling
                      dayData?.isHoliday && {
                        fontWeight: "bold",
                      },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.7}
                  >
                    {date?.day}
                  </Text>
                  {holidayIndicator && (
                    <View style={styles.holidayIndicatorContainer}>
                      <Text
                        style={[
                          styles.holidayIndicator,
                          {
                            color: "#ffffff",
                            backgroundColor: "rgba(0, 0, 0, 0.91)",
                          },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.5}
                      >
                        {holidayIndicator}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Info Modal */}
      <Modal visible={showInfo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.infoModalBox, { backgroundColor: colors.white }]}>
            <View style={styles.infoModalHeader}>
              <Text style={[styles.infoModalTitle, { color: colors.text }]}>Legend</Text>
              <TouchableOpacity onPress={() => setShowInfo(false)} style={styles.infoCloseButton}>
                <Ionicons name="close" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoModalContent}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: "#00C851" }]}
                />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  Present
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: "#ba0010ff" }]}
                />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  Absent
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: "#FF8800" }]}
                />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  Half Day
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: "#026D94" }]}
                />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  Sunday
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: "#2196F3" }]}
                />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  Holiday
                </Text>
              </View>

              <View style={styles.legendItem}>
                <Text
                  style={[
                    styles.legendText,
                    { color: colors.text, fontWeight: "bold" },
                  ]}
                >
                  "RH" = Restricted Holiday, "H" = Holiday
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Info Modal */}
      <Modal visible={showDateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.dateModalBox, { backgroundColor: colors.white }]}>
            <View style={[styles.dateModalHeader, { backgroundColor: colors.primary }]}>
              <Text style={[styles.dateModalTitle, { color: "#ffffff" }]}>
                {formatDateForDisplay(selectedDayData?.date || "")}
              </Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)} style={styles.dateCloseButton}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateModalContent}>
              {selectedDayData?.isHoliday ? (
                <>
                  <Text style={[styles.holidayName, { color: colors.primary }]}>
                    {selectedDayData?.holidayName}
                  </Text>
                  <Text style={[styles.holidayType, { color: colors.text }]}>
                    {selectedDayData?.isOptional ? "(Restricted Holiday)" : "(Holiday)"}
                  </Text>
                </>
              ) : (selectedDayData?.status === "present" || selectedDayData?.status === "half-day") ? (
                <View style={styles.attendanceInfo}>
                  <View style={styles.attendanceCard}>
                    <View style={styles.attendanceRow}>
                      <View style={styles.attendanceIconContainer}>
                        <Ionicons name="log-in-outline" size={24} color="#00C851" />
                      </View>
                      <View style={styles.attendanceTextContainer}>
                        <Text style={[styles.attendanceLabel, { color: colors.text }]}>Punch In</Text>
                        <Text style={[styles.attendanceTime, { color: colors.text }]}>
                          {selectedDayData?.inTime || "N/A"}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.attendanceRow}>
                      <View style={styles.attendanceIconContainer}>
                        <Ionicons name="log-out-outline" size={24} color="#ff4444" />
                      </View>
                      <View style={styles.attendanceTextContainer}>
                        <Text style={[styles.attendanceLabel, { color: colors.text }]}>Punch Out</Text>
                        <Text style={[styles.attendanceTime, { color: colors.text }]}>
                          {selectedDayData?.outTime || "N/A"}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.attendanceRow}>
                      <View style={styles.attendanceIconContainer}>
                        <Ionicons name="time-outline" size={24} color={colors.primary} />
                      </View>
                      <View style={styles.attendanceTextContainer}>
                        <Text style={[styles.attendanceLabel, { color: colors.text }]}>Duration</Text>
                        <Text style={[styles.attendanceTime, { color: colors.text }]}>
                          {calculateDuration(selectedDayData?.inTime, selectedDayData?.outTime)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <Text style={[styles.statusText, { color: colors.text }]}>
                  Status: {selectedDayData?.status.charAt(0).toUpperCase() + selectedDayData?.status.slice(1) || "No data"}
                </Text>
              )}
            </View>

            {/* Footer with photo links */}
            {(selectedDayData?.status === "present" || selectedDayData?.status === "half-day") && (
              <View style={styles.photoFooter}>
                <TouchableOpacity 
                  onPress={() => openPhoto(selectedDayData?.inPhotoUrl)} 
                  style={[
                    styles.photoButton,
                    { backgroundColor: selectedDayData?.inPhotoUrl ? colors.primary : colors.grey }
                  ]}
                  disabled={!selectedDayData?.inPhotoUrl}
                >
                  <Text style={styles.photoButtonText}>IN Photo</Text>
                </TouchableOpacity>
                
                <View style={styles.photoSeparator} />
                
                <TouchableOpacity 
                  onPress={() => openPhoto(selectedDayData?.outPhotoUrl)} 
                  style={[
                    styles.photoButton,
                    { backgroundColor: selectedDayData?.outPhotoUrl ? colors.primary : colors.grey }
                  ]}
                  disabled={!selectedDayData?.outPhotoUrl}
                >
                  <Text style={styles.photoButtonText}>OUT Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Photo Viewer Modal */}
      <Modal visible={showPhotoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.photoModalBox, { backgroundColor: colors.white }]}>
            <TouchableOpacity 
              onPress={() => setShowPhotoModal(false)} 
              style={[styles.photoCloseButton, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            {selectedPhotoUrl && (
              <Image
                source={{ uri: selectedPhotoUrl }}
                style={styles.fullPhoto}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HomeCalendar;

const styles = StyleSheet.create({
  calendarContainer: {
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionDetails: {
    fontSize: 17,
    fontWeight: "800",
  },
  calendar: {
    borderRadius: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: 10,
    marginBottom: 35,
  },
  dayContainer: {
    width: daySize,
    height: daySize,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    margin: 1,
  },
  circleContainer: {
    width: circleSize,
    height: circleSize,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayText: {
    fontSize: textSize,
    textAlign: "center",
    fontWeight: "500",
    maxWidth: circleSize - 4,
  },
  holidayIndicatorContainer: {
    position: "absolute",
    top: -2,
    right: -2,
    zIndex: 1,
  },
  holidayIndicator: {
    fontSize: Math.min(circleSize * 0.25, 8),
    fontWeight: "bold",
    backgroundColor: "rgba(22, 22, 22, 0.97)",
    borderRadius: Math.min(circleSize * 0.3, 8),
    paddingHorizontal: 2,
    paddingVertical: 1,
    minWidth: Math.min(circleSize * 0.5, 14),
    textAlign: "center",
    lineHeight: Math.min(circleSize * 0.3, 10),
    overflow: "hidden",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Info Modal Styles
  infoModalBox: {
    width: Math.min(screenWidth * 0.8, 300),
    borderRadius: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  infoModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  infoModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  infoCloseButton: {
    backgroundColor: "red",
    borderRadius: 15,
    padding: 2,
  },
  infoModalContent: {
    padding: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  legendText: {
    fontSize: 16,
    flex: 1,
  },

  // Date Modal Styles
  dateModalBox: {
    width: Math.min(screenWidth * 0.85, 350),
    borderRadius: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    overflow: "hidden",
  },
  dateModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  dateCloseButton: {
    borderRadius: 15,
    padding: 2,
  },
  dateModalContent: {
    padding: 20,
  },
  holidayName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
  },
  holidayType: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
  },
  statusText: {
    fontSize: 16,
    textAlign: "center",
  },
  attendanceInfo: {
    width: "100%",
  },
  attendanceCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
  },
  attendanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  attendanceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  attendanceTextContainer: {
    flex: 1,
  },
  attendanceLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    opacity: 0.7,
  },
  attendanceTime: {
    fontSize: 18,
    fontWeight: "bold",
  },

  // Photo Footer Styles
  photoFooter: {
    flexDirection: "row",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  photoButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  photoButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  photoSeparator: {
    width: 2,
    backgroundColor: "#ffffff",
    marginHorizontal: 8,
  },

  // Photo Modal Styles
  photoModalBox: {
    width: Math.min(screenWidth * 0.9, 400),
    height: Math.min(screenWidth * 0.9, 400),
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  photoCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
    borderRadius: 15,
    padding: 2,
  },
  fullPhoto: {
    width: "100%",
    height: "100%",
  },
}); 