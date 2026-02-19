import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Header from "app/components/Header";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import CustomDialog from "../components/CustomDialog";
import { useRouter } from "expo-router";
import { getEmployeeProfile, timeSlips } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import {
  horizontalScale,
  moderateScale,
  verticalScale,
} from "utils/metrics";
import { darkTheme, lightTheme } from "../constants/colors";

const AddTimeSlip = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const router = useRouter();

  const user = useAuthStore((state) => state.user);

  // Initialize dates
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // State management
  const [selectedDate, setSelectedDate] = useState(yesterday); // Default to yesterday
  const [selectedOption, setSelectedOption] = useState("");
  const [checkInTime, setCheckInTime] = useState(new Date());
  const [checkOutTime, setCheckOutTime] = useState(new Date());
  const [reason, setReason] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerType, setTimePickerType] = useState(""); // "checkin" or "checkout"
  const [loading, setLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState(null);

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

  useEffect(() => {
    const fetchEmployeeId = async () => {
      if (user?.userId) {
        try {
          const res = await getEmployeeProfile(user.userId);
          console.log("✅ Extracted Employee ID:", res.data.id);
          setEmployeeId(res.data.id);
        } catch (err: any) {
          console.error(
            "❌ Error fetching employee profile:",
            err.response?.data || err.message
          );
          showDialog(
            "DANGER",
            "Error",
            "Failed to fetch employee profile. Please try again."
          );
        }
      }
    };
    fetchEmployeeId();
  }, [user?.userId]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleDateChange = (event: any, newDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (newDate) {
      setSelectedDate(newDate);
    }
  };

  const handleTimeChange = (event: any, newTime?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (newTime) {
      if (timePickerType === "checkin") {
        setCheckInTime(newTime);
      } else {
        setCheckOutTime(newTime);
      }
    }
  };

  const openTimePicker = (type: string) => {
    setTimePickerType(type);
    setShowTimePicker(true);
  };

  // Handle reason input with 50-word limit
  const handleReasonChange = (text: string) => {
    const words = text.trim().split(/\s+/);
    if (words.length > 50) {
      // Keep only the first 50 words
      const truncated = words.slice(0, 50).join(" ");
      setReason(truncated);
    } else {
      setReason(text);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOption) {
      showDialog(
        "DANGER",
        "Error",
        "Please select an option (Check In, Check Out, or Both)"
      );
      return;
    }

    if (!reason.trim()) {
      showDialog("DANGER", "Error", "Please provide a reason");
      return;
    }

    // Validate word count (redundant due to real-time limit, but kept for safety)
    const wordCount = reason.trim().split(/\s+/).length;
    if (wordCount > 50) {
      showDialog("DANGER", "Error", "Reason cannot exceed 50 words.");
      return;
    }

    if (!user?.userId || !user?.organizationId) {
      showDialog("DANGER", "Error", "User information is missing. Please log in again.");
      return;
    }

    if (!employeeId) {
      showDialog(
        "DANGER",
        "Error",
        "Employee information is missing. Please try again."
      );
      return;
    }

    // Validate times for today's date
    if (selectedDate.toDateString() === today.toDateString()) {
      const now = new Date();
      if (
        (selectedOption !== "checkout" && checkInTime > now) ||
        (selectedOption !== "checkin" && checkOutTime > now)
      ) {
        showDialog("DANGER", "Error", "Cannot select future times for today.");
        return;
      }
    }

    // Map selectedOption → missingType
    const missingType =
      selectedOption === "checkin"
        ? "IN"
        : selectedOption === "checkout"
        ? "OUT"
        : "BOTH";

    // Build payload cleanly
    const payload: any = {
      employeeId,
      organizationId: user.organizationId,
      date: selectedDate.toISOString().split("T")[0],
      missingType,
      reason: reason.trim(),
    };

    if (missingType !== "OUT") {
      payload.correctedIn = checkInTime.toISOString();
    }
    if (missingType !== "IN") {
      payload.correctedOut = checkOutTime.toISOString();
    }

    try {
      setLoading(true);
      console.log("Sending Payload:", payload);

      const res = await timeSlips(payload);
      console.log("API Response:", res.data);

      showDialog("SUCCESS", "Success", "Time slip submitted successfully!", [
        {
          text: "OK",
          onPress: () => { setDialogVisible(false); router.push("/(tabs)/TimeSlips"); },
        },
      ]);

      // Reset form
      setSelectedOption("");
      setReason("");
      setCheckInTime(new Date());
      setCheckOutTime(new Date());
    } catch (error: any) {
      console.error(
        "Error submitting time slip:",
        error.response?.data || error.message
      );
      showDialog(
        "DANGER",
        "Error",
        error.response?.data?.message ||
          "Failed to submit time slip. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Calculate word count for display
  const wordCount = reason.trim().split(/\s+/).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Time Slips" />

      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <View style={styles.statsContainer}>
            {/* Form Header */}
            <View style={styles.formHeader}>
              <Feather name="clock" size={24} color="#0077B6" />
              <Text style={styles.formTitle}>Apply for Time Slip</Text>
            </View>

            {/* Date Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  style={[
                    styles.dateText,
                    { color: selectedDate ? "#333" : "#888" },
                  ]}
                >
                  {formatDate(selectedDate)}
                </Text>
                <Feather name="calendar" size={16} color="#0077B6" />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={handleDateChange}
                maximumDate={today}
              />
            )}

            {/* Option Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Time</Text>
              <View style={styles.radioContainer}>
                {["Check In", "Check Out", "Both"].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.radioButton}
                    onPress={() =>
                      setSelectedOption(
                        option === "Check In"
                          ? "checkin"
                          : option === "Check Out"
                          ? "checkout"
                          : "both"
                      )
                    }
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        selectedOption ===
                          (option === "Check In"
                            ? "checkin"
                            : option === "Check Out"
                            ? "checkout"
                            : "both") && styles.radioCircleSelected,
                      ]}
                    >
                      {selectedOption ===
                        (option === "Check In"
                          ? "checkin"
                          : option === "Check Out"
                          ? "checkout"
                          : "both") && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.radioLabel, { color: colors.text }]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Time Inputs */}
            {selectedOption && (
              <View style={styles.row}>
                {(selectedOption === "checkin" ||
                  selectedOption === "both") && (
                  <View
                    style={[
                      styles.inputGroup,
                      {
                        flex: 1,
                        marginRight: selectedOption === "both" ? 8 : 0,
                      },
                    ]}
                  >
                    <Text style={styles.label}>Check In Time</Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => openTimePicker("checkin")}
                    >
                      <Text style={styles.timeText}>
                        {formatTime(checkInTime)}
                      </Text>
                      <Feather name="clock" size={16} color="#0077B6" />
                    </TouchableOpacity>
                  </View>
                )}

                {(selectedOption === "checkout" ||
                  selectedOption === "both") && (
                  <View
                    style={[
                      styles.inputGroup,
                      {
                        flex: 1,
                        marginLeft: selectedOption === "both" ? 8 : 0,
                      },
                    ]}
                  >
                    <Text style={styles.label}>Check Out Time</Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => openTimePicker("checkout")}
                    >
                      <Text style={styles.timeText}>
                        {formatTime(checkOutTime)}
                      </Text>
                      <Feather name="clock" size={16} color="#0077B6" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {showTimePicker && (
              <DateTimePicker
                value={
                  timePickerType === "checkin" ? checkInTime : checkOutTime
                }
                mode="time"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={handleTimeChange}
              />
            )}

            {/* Reason */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reason</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Enter reason for time slip..."
                placeholderTextColor="#888"
                value={reason}
                onChangeText={handleReasonChange}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={styles.wordCountContainer}>
                <Text
                  style={[
                    styles.wordCountText,
                    { color: wordCount > 45 ? "#FF0000" : "#666" },
                  ]}
                >
                  {wordCount}/50 words
                </Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedOption || !reason.trim() || loading) &&
                  styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={!selectedOption || !reason.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather
                    name="send"
                    size={16}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.submitButtonText}>
                    Submit Application
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <CustomDialog isVisible={dialogVisible} type={dialogType as any} title={dialogTitle} message={dialogMessage} buttons={dialogButtons} onCancel={() => setDialogVisible(false)} />
    </View>
  );
};

export default AddTimeSlip;

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  statsContainer: { marginTop: verticalScale(10) },
  formHeader: { alignItems: "center", marginBottom: verticalScale(20) },
  formTitle: {
    fontSize: moderateScale(16),
    fontWeight: "bold",
    color: "#0077B6",
    marginTop: verticalScale(4),
  },
  inputGroup: { marginBottom: verticalScale(16) },
  label: {
    fontSize: moderateScale(14),
    color: "#333",
    marginBottom: verticalScale(6),
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    backgroundColor: "#F1F8FB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: { fontSize: moderateScale(14) },
  timeText: { color: "#333", fontSize: moderateScale(14) },
  textArea: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    backgroundColor: "#F1F8FB",
    height: verticalScale(100),
    fontSize: moderateScale(14),
    color: "#333",
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  submitButton: {
    backgroundColor: "#0077B6",
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(8),
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: verticalScale(10),
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: moderateScale(14),
  },
  disabledButton: { opacity: 0.6 },
  radioContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: horizontalScale(8),
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(4),
    paddingHorizontal: horizontalScale(8),
    flex: 1,
    justifyContent: "flex-start",
  },
  radioCircle: {
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    borderWidth: 2,
    borderColor: "#0077B6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: horizontalScale(8),
  },
  radioCircleSelected: { borderColor: "#0077B6", backgroundColor: "#E6F0FA" },
  radioDot: {
    width: moderateScale(10),
    height: moderateScale(10),
    borderRadius: moderateScale(5),
    backgroundColor: "#0077B6",
  },
  radioLabel: { fontSize: moderateScale(14), fontWeight: "500" },
  wordCountContainer: {
    marginTop: verticalScale(4),
    alignSelf: "flex-end",
  },
  wordCountText: {
    fontSize: moderateScale(12),
  },
});
