import { Feather } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Header from "app/components/Header";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import CustomDialog from "../components/CustomDialog";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import { applyWfh } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import { darkTheme, lightTheme } from "../constants/colors";

const WfhForm = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const route = useRouter();
  const { user } = useAuthStore();
  const userId = user?.userId;

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const normalizeDate = (d: Date) => {
    const normalized = new Date(d);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const onStartDateConfirm = (selectedDate: Date) => {
    setShowStartPicker(false);
    const normalized = normalizeDate(selectedDate);
    const safeDate = normalized < today ? today : normalized;
    setStartDate(safeDate);
    if (endDate < safeDate) {
      setEndDate(safeDate);
    }
  };

  const onEndDateConfirm = (selectedDate: Date) => {
    setShowEndPicker(false);
    const normalized = normalizeDate(selectedDate);
    const safeDate = normalized < startDate ? startDate : normalized;
    setEndDate(safeDate);
  };

  const formatDate = (date: Date) =>
    `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;

  const handleSubmit = async () => {
    if (!userId) {
      showDialog("DANGER", "WFH", "User not found. Please login again.");
      return;
    }
    if (startDate > endDate) {
      showDialog("WARNING", "WFH", "End date must be after start date.");
      return;
    }
    setSubmitting(true);
    try {
      await applyWfh(userId, {
        date: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        reason: reason.trim(),
      });
      showDialog("SUCCESS", "Success", "WFH request submitted.", [
        { text: "OK", onPress: () => { setDialogVisible(false); route.replace("/(tabs)/wfh"); } },
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to submit WFH request.";
      showDialog("DANGER", "WFH", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="WFH" />
      <View style={styles.cardWrapper}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          <View style={styles.formHeader}>
            <Feather name="home" size={24} color={colors.primary} />
            <Text style={[styles.formTitle, { color: colors.primary }]}>
              Apply Work From Home
            </Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Start Date</Text>
              <TouchableOpacity
                style={[
                  styles.dateInput,
                  { borderColor: colors.border, backgroundColor: colors.inputBackground },
                ]}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {formatDate(startDate)}
                </Text>
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={showStartPicker}
                mode="date"
                date={startDate}
                onConfirm={onStartDateConfirm}
                onCancel={() => setShowStartPicker(false)}
                minimumDate={today}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>End Date</Text>
              <TouchableOpacity
                style={[
                  styles.dateInput,
                  { borderColor: colors.border, backgroundColor: colors.inputBackground },
                ]}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {formatDate(endDate)}
                </Text>
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={showEndPicker}
                mode="date"
                date={endDate}
                onConfirm={onEndDateConfirm}
                onCancel={() => setShowEndPicker(false)}
                minimumDate={startDate}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Reason</Text>
            <TextInput
              style={[
                styles.textArea,
                { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.text },
              ]}
              placeholder="Enter reason for WFH...(optional)"
              placeholderTextColor={colors.textMuted}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <Feather
                  name="send"
                  size={16}
                  color={colors.onPrimary}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.submitButtonText, { color: colors.onPrimary }]}>
                  Submit Request
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <CustomDialog isVisible={dialogVisible} type={dialogType as any} title={dialogTitle} message={dialogMessage} buttons={dialogButtons} onCancel={() => setDialogVisible(false)} />
    </View>
  );
};

export default WfhForm;

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
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0077B6",
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(10),
  },
  submitButtonText: {
    color: "#fff",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
});
