import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import Header from "app/components/Header";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import { applyLeave, getLeaveTypes } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import { darkTheme, lightTheme } from "../constants/colors";

const LeaveForm = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [reason, setReason] = useState("");
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuthStore();
  const userId = user?.userId;
  const orgId = user?.organizationId;
  const route = useRouter();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const normalizeDate = (d: Date) => {
    const normalized = new Date(d);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const onStartDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowStartPicker(false);
    }
    if (event?.type === "dismissed" || !selectedDate) {
      return;
    }
    const normalized = normalizeDate(selectedDate);
    const safeDate = normalized < today ? today : normalized;
    setStartDate(safeDate);
    if (endDate < safeDate) {
      setEndDate(safeDate);
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowEndPicker(false);
    }
    if (event?.type === "dismissed" || !selectedDate) {
      return;
    }
    const normalized = normalizeDate(selectedDate);
    const safeDate = normalized < startDate ? startDate : normalized;
    setEndDate(safeDate);
  };

  const formatDate = (date) => {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  useEffect(() => {
    const loadLeaveTypes = async () => {
      if (!orgId) return;
      try {
        const res = await getLeaveTypes(orgId);
        const data = res.data || [];
        setLeaveTypes(Array.isArray(data) ? data : []);
      } catch (error) {
        Alert.alert("Leave Types", "Failed to load leave types.");
      }
    };
    loadLeaveTypes();
  }, [orgId]);

  const handleSubmit = async () => {
    if (!userId) {
      Alert.alert("Leave Application", "User not found. Please login again.");
      return;
    }
    if (!leaveTypeId) {
      Alert.alert("Leave Application", "Please select a leave type.");
      return;
    }
    if (startDate > endDate) {
      Alert.alert("Leave Application", "End date must be after start date.");
      return;
    }

    setSubmitting(true);
    try {
      await applyLeave(userId, {
        leaveTypeId,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        reason: reason.trim(),
      });
      Alert.alert("Success", "Leave request submitted.", [
        { text: "OK", onPress: () => route.replace("/(tabs)/leave") },
      ]);
    } catch (error: any) {
      console.error("Apply leave failed:", error);
      const message =
        error?.response?.data?.message || "Failed to submit leave request.";
      Alert.alert("Leave Application", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Leave" />

      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <View style={styles.statsContainer}>
            {/* Form Header */}
            <View style={styles.formHeader}>
              <Feather name="file-text" size={24} color="#0077B6" />
              <Text style={styles.formTitle}>Apply for Leave</Text>
            </View>

            {/* Leave Type Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Leave Type</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={leaveTypeId}
                  onValueChange={(itemValue) => setLeaveTypeId(itemValue)}
                  style={styles.picker}
                  dropdownIconColor="#0077B6"
                >
                  <Picker.Item
                    label="Select Leave Type"
                    value=""
                    color="#888"
                  />
                  {leaveTypes.map((type) => (
                    <Picker.Item
                      key={type.id}
                      label={type.name}
                      value={type.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Date Inputs */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Start Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    onChange={onStartDateChange}
                    minimumDate={today}
                  />
                )}
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>End Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={styles.dateText}>{formatDate(endDate)}</Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="default"
                    onChange={onEndDateChange}
                    minimumDate={startDate}
                  />
                )}
              </View>
            </View>

            {/* Reason */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reason</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Enter reason for leave...(optional)"
                placeholderTextColor="#888"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather
                    name="send"
                    size={16}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.submitButtonText}>Submit Application</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

export default LeaveForm;

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
    marginTop: verticalScale(10),
  },
  formHeader: {
    alignItems: "center",
    marginBottom: verticalScale(20),
  },
  formTitle: {
    fontSize: moderateScale(16),
    fontWeight: "bold",
    color: "#0077B6",
    marginTop: verticalScale(4),
  },
  inputGroup: {
    marginBottom: verticalScale(16),
  },
  label: {
    fontSize: moderateScale(14),
    color: "#333",
    marginBottom: verticalScale(6),
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: moderateScale(8),
    backgroundColor: "#F1F8FB",
    overflow: "hidden",
  },
  picker: {
    height: verticalScale(50),
    width: "100%",
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    backgroundColor: "#F1F8FB",
    justifyContent: "center",
  },
  dateText: {
    color: "#333",
    fontSize: moderateScale(14),
  },
  placeholderText: {
    color: "#888",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    backgroundColor: "#F1F8FB",
    height: verticalScale(100),
    color: "#333",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
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
});
