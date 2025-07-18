import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { darkTheme, lightTheme } from "../constants/colors";

interface HomeCardProps {
  currentDate: string;
  formattedTime: string;
  timePeriod: string;
  punchInTime: string | null;
  lastPunch: string | null;
  isCheckedIn: boolean;
  isLoadingWifi: boolean;
  isWifiValid: boolean;
  isLoadingLocation: boolean;
  isLocationValid: boolean;
  isCheckInDisabled: boolean;
  handleCheckIn: () => void;
  handleCheckOut: () => void;
  handleRetryWifi: () => void;
  handleRetryLocation: () => void;
  formatTime: (time: string) => string;
}

const HomeCard = ({
  currentDate,
  formattedTime,
  timePeriod,
  punchInTime,
  lastPunch,
  isCheckedIn,
  isLoadingWifi,
  isWifiValid,
  isLoadingLocation,
  isLocationValid,
  isCheckInDisabled,
  handleCheckIn,
  handleCheckOut,
  handleRetryWifi,
  handleRetryLocation,
  formatTime,
}: HomeCardProps) => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;

  // Determine button text, handler, and color based on punchInTime
  const buttonText = punchInTime !== null ? "Punch Out" : "Punch In";
  const buttonHandler = punchInTime !== null ? handleCheckOut : handleCheckIn;
  const buttonColor = punchInTime !== null ? "#bb1515ff" : "#00b406ff";

  return (
    <View style={styles.cardWrapper}>
      <View style={[styles.card, { backgroundColor: colors.white }]}>
        <View style={styles.cardContent}>
          <View style={styles.leftSection}>
            <View>
              <Text style={[styles.dateText, { color: colors.text }]}>
                {currentDate}
              </Text>
              <Text style={[styles.subText, { color: colors.grey }]}>
                {isCheckedIn
                  ? "You are checked in"
                  : punchInTime
                  ? `Last check-in: ${formatTime(punchInTime)}`
                  : "No check-in today"}
              </Text>
            </View>
          </View>

          <View style={styles.rightSection}>
            <Text style={[styles.timeText, { color: colors.text }]}>
              {formattedTime}
            </Text>
            <Text style={[styles.subText, { color: colors.grey }]}>
              {timePeriod}
            </Text>
          </View>
        </View>

        <View style={styles.statusContainer}>
          {isLoadingWifi ? (
            <View style={styles.statusItem}>
              <ActivityIndicator size={16} color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.text }]}>
                Loading WiFi details...
              </Text>
            </View>
          ) : (
            <View style={styles.statusItem}>
              <Ionicons
                name="wifi"
                size={16}
                color={isWifiValid ? "#00C851" : "#ff4444"}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isWifiValid ? "#00C851" : "#ff4444" },
                ]}
                numberOfLines={1}
              >
                {isWifiValid ? `WiFi: Connected` : "WiFi: Not Connected"}
              </Text>
              {!isWifiValid && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRetryWifi}
                >
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {isLoadingLocation ? (
            <View style={styles.statusItem}>
              <ActivityIndicator size={16} color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.text }]}>
                Loading Location details...
              </Text>
            </View>
          ) : (
            <View style={styles.statusItem}>
              <Ionicons
                name="location"
                size={16}
                color={isLocationValid ? "#00C851" : "#ff4444"}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isLocationValid ? "#00C851" : "#ff4444" },
                ]}
                numberOfLines={1}
              >
                {isLocationValid
                  ? "Location: Available"
                  : "Location: Unavailable"}
              </Text>
              {!isLocationValid && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRetryLocation}
                >
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: isCheckInDisabled ? "#A9A9A9" : buttonColor },
            ]}
            onPress={buttonHandler}
            disabled={isCheckInDisabled}
          >
            <Ionicons
              name={punchInTime !== null ? "exit-outline" : "camera"}
              size={20}
              color="#fff"
              style={styles.buttonIcon}
            />
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default HomeCard;

const styles = StyleSheet.create({
  cardWrapper: {
    marginTop: -70,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    minHeight: 150,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  leftSection: {
    flex: 1,
    paddingRight: 10,
  },
  rightSection: {
    alignItems: "flex-end",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e7ba8",
  },
  subText: {
    fontSize: 13,
    color: "#555",
    marginTop: 4,
  },
  timeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e7ba8",
  },
  statusContainer: {
    marginTop: 5,
    marginBottom: 5,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    flex: 1,
    minWidth: 150,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 8,
    fontWeight: "500",
    flexShrink: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  retryButton: {
    padding: 4,
    marginLeft: 8,
  },
});
