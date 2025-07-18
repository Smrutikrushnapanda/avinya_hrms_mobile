import { Feather } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import Header from "app/components/Header";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { darkTheme, lightTheme } from "../constants/colors";

const LeaveForm = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;

  const [leaveType, setLeaveType] = useState("");

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
                  selectedValue={leaveType}
                  onValueChange={(itemValue) => setLeaveType(itemValue)}
                  style={styles.picker}
                  dropdownIconColor="#0077B6"
                >
                  <Picker.Item
                    label="Select Leave Type"
                    value=""
                    color="#888"
                  />
                  <Picker.Item label="Casual Leave (CL)" value="casual" />
                  <Picker.Item label="Sick Leave (SL)" value="sick" />
                  <Picker.Item label="Earned Leave (EL)" value="earned" />
                  <Picker.Item label="Floating Holiday (FH)" value="floating" />
                </Picker>
              </View>
            </View>

            {/* Date Inputs */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Start Date</Text>
                <View style={styles.dateInput}>
                  <Text style={styles.placeholderText}>mm/dd/yyyy</Text>
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>End Date</Text>
                <View style={styles.dateInput}>
                  <Text style={styles.placeholderText}>mm/dd/yyyy</Text>
                </View>
              </View>
            </View>

            {/* Reason */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reason</Text>
              <View style={styles.textArea}>
                <Text style={styles.placeholderText}>
                  Enter reason for leave...(optional)
                </Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitButton}>
              <Feather
                name="send"
                size={16}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.submitButtonText}>Submit Application</Text>
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
    marginTop: -90,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statsContainer: {
    marginTop: 10,
  },
  formHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0077B6",
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#333",
    marginBottom: 6,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#F1F8FB",
    overflow: "hidden",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F1F8FB",
  },
  placeholderText: {
    color: "#888",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F1F8FB",
    height: 100,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  submitButton: {
    backgroundColor: "#0077B6",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
