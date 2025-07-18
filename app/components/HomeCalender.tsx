import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
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

// Define types for attendance data
type AttendanceStatus = "present" | "absent" | "half-day" | "pending";

interface AttendanceRecord {
  date: string;
  status: AttendanceStatus;
  isSunday: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isOptional?: boolean;
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
  const [showHolidayModal, setShowHolidayModal] = useState<boolean>(false);
  const [selectedHoliday, setSelectedHoliday] =
    useState<AttendanceRecord | null>(null);
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
      console.error("User ID or Organization ID not found");
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

    // If it's a holiday, show holiday modal
    if (dayData?.isHoliday && dayData?.holidayName) {
      setSelectedHoliday(dayData);
      setShowHolidayModal(true);
    }

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

  const generateMarkedDates = (): MarkedDates => {
    const marked: MarkedDates = {};

    Object.keys(attendanceData).forEach((date: string) => {
      const record = attendanceData[date];
      let backgroundColor: string;

      // Priority: Sunday > Holiday > Status
      if (record.isSunday) {
        backgroundColor = "#026D94"; // Red for Sunday
      } else if (record.isHoliday) {
        backgroundColor = "#9C27B0"; // Purple for holidays
      } else {
        switch (record.status) {
          case "present":
            backgroundColor = "#00C851"; // Green
            break;
          case "absent":
            backgroundColor = "#ff4444"; // Red
            break;
          case "half-day":
            backgroundColor = "#FF8800"; // Orange
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

      // Add "H" for optional holidays
      if (record.isHoliday && record.isOptional) {
        markedDate.customStyles = {
          container: {
            backgroundColor: backgroundColor,
            borderRadius: 16,
            position: "relative",
          },
          text: {
            color: "#ffffff",
            fontWeight: "bold",
            fontSize: 12,
          },
        };
        markedDate.customText = "H";
      }

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

            return (
              <TouchableOpacity
                onPress={() => onDayPress(date as DateData)}
                style={[
                  styles.dayContainer,
                  marking?.selected && {
                    backgroundColor: marking.selectedColor,
                    borderRadius: 16,
                  },
                  isToday &&
                    !marking?.selected && {
                      borderWidth: 2,
                      borderColor: colors.primary,
                      borderRadius: 16,
                    },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    {
                      color: marking?.selected
                        ? marking.selectedTextColor
                        : state === "disabled"
                        ? colors.grey
                        : colors.text,
                    },
                    isToday &&
                      !marking?.selected && {
                        color: colors.primary,
                        fontWeight: "bold",
                      },
                  ]}
                >
                  {date?.day}
                </Text>
                {dayData?.isHoliday && dayData?.isOptional && (
                  <Text style={styles.holidayIndicator}>H</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Info Modal */}
      <Modal visible={showInfo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.white }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Legend
            </Text>

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
                style={[styles.legendDot, { backgroundColor: "#ff4444" }]}
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
                style={[styles.legendDot, { backgroundColor: "#9C27B0" }]}
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
                "H" indicates optional holiday
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowInfo(false)}
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Holiday Modal */}
      <Modal visible={showHolidayModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.white }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Holiday Information
            </Text>

            <View style={styles.holidayInfo}>
              <Text style={[styles.holidayDate, { color: colors.text }]}>
                {selectedHoliday?.date}
              </Text>
              <Text style={[styles.holidayName, { color: colors.primary }]}>
                {selectedHoliday?.holidayName}
              </Text>
              {selectedHoliday?.isOptional && (
                <Text style={[styles.holidayType, { color: colors.text }]}>
                  (Optional Holiday)
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setShowHolidayModal(false)}
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
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
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayText: {
    fontSize: 16,
    textAlign: "center",
  },
  holidayIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    fontSize: 10,
    fontWeight: "bold",
    color: "#ffffff",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 8,
    width: 14,
    height: 14,
    textAlign: "center",
    lineHeight: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: 300,
    borderRadius: 12,
    padding: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
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
  },
  modalButton: {
    marginTop: 20,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  holidayInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  holidayDate: {
    fontSize: 16,
    marginBottom: 8,
  },
  holidayName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  holidayType: {
    fontSize: 14,
    fontStyle: "italic",
  },
});