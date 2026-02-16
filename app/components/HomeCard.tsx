import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { getCurrentTime } from "../../api/api"; // Adjust import path as needed
import { darkTheme, lightTheme } from "../constants/colors";

interface HomeCardProps {
  userName: string;
  punchInTime: string | null;
  lastPunch: string | null;
  isCheckedIn: boolean;
  isLoadingWifi: boolean;
  isWifiValid: boolean;
  isLoadingLocation: boolean;
  isLocationValid: boolean;
  showWifiStatus: boolean;
  showLocationStatus: boolean;
  isCheckInDisabled: boolean;
  handleCheckIn: () => void;
  handleCheckOut: () => void;
  handleRetryWifi: () => void;
  handleRetryLocation: () => void;
  formatTime: (time: string) => string;
}

const HomeCard = ({
  userName,
  punchInTime,
  lastPunch,
  isCheckedIn,
  isLoadingWifi,
  isWifiValid,
  isLoadingLocation,
  isLocationValid,
  showWifiStatus,
  showLocationStatus,
  isCheckInDisabled,
  handleCheckIn,
  handleCheckOut,
  handleRetryWifi,
  handleRetryLocation,
  formatTime,
}: HomeCardProps) => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  // State for server time
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [isLoadingTime, setIsLoadingTime] = useState(true);

  useEffect(() => {
    let secondInterval: NodeJS.Timeout;
    let resyncInterval: NodeJS.Timeout;

    const fetchServerTime = async () => {
      try {
        const response = await getCurrentTime();
        const data = response.data;
        if (data?.isoTime) {
          setServerTime(new Date(data.isoTime));
        } else {
          console.error("Invalid time data received from server");
          setServerTime(new Date());
        }
      } catch (error) {
        console.error("Failed to fetch server time:", error);
        setServerTime(new Date());
      } finally {
        setIsLoadingTime(false);
      }
    };

    // Initial fetch
    fetchServerTime();

    // Update time every second (client-side)
    secondInterval = setInterval(() => {
      setServerTime((prev) => {
        if (!prev) return new Date();
        const newTime = new Date(prev);
        newTime.setSeconds(newTime.getSeconds() + 1);
        return newTime;
      });
    }, 1000);

    // Re-sync with server every 2 minutes (120000 ms)
    resyncInterval = setInterval(fetchServerTime, 120000);

    return () => {
      clearInterval(secondInterval);
      clearInterval(resyncInterval);
    };
  }, []);

  // Format date and time
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short", // Changed from "long" to "short" for abbreviated month names
      day: "numeric",
    });
  };

  const formatTimeWithSeconds = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const getTimePeriod = (date: Date) => {
    const hours = date.getHours();
    if (hours >= 5 && hours < 12) return "Morning";
    if (hours >= 12 && hours < 17) return "Afternoon";
    if (hours >= 17 && hours < 20) return "Evening";
    return "Night";
  };

  // Function to get greeting based on time period
  const getGreeting = (period: string) => {
    switch (period.toLowerCase()) {
      case "morning":
        return "Good Morning";
      case "afternoon":
        return "Good Afternoon";
      case "evening":
        return "Good Evening";
      case "night":
        return "Good Night";
      default:
        return "Hello";
    }
  };

  // Determine button text, handler, and color based on punchInTime
  const buttonText = punchInTime !== null ? "Punch Out" : "Punch In";
  const buttonHandler = punchInTime !== null ? handleCheckOut : handleCheckIn;
  const buttonColor = punchInTime !== null ? "#bb1515ff" : "#00b406ff";

  // Render loading state while fetching time
  if (isLoadingTime || !serverTime) {
    return (
      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.text }]}>
            Loading server time...
          </Text>
        </View>
      </View>
    );
  }

  const currentDate = formatDate(serverTime);
  const formattedTime = formatTimeWithSeconds(serverTime);
  const timePeriod = getTimePeriod(serverTime);

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
                👋 {getGreeting(timePeriod)} {userName}
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
        {(showWifiStatus || showLocationStatus) && (
          <View style={styles.statusContainer}>
            {showWifiStatus && (isLoadingWifi ? (
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
            ))}
            {showLocationStatus && (isLoadingLocation ? (
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
            ))}
          </View>
        )}
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
    marginTop: -100,
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
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 15,
    fontWeight: "600",
    color: "#1e7ba8",
    marginBottom: 2,
  },
  subText: {
    fontSize: 13,
    color: "#555",
    marginTop: 4,
  },
  timeText: {
    fontSize: 15,
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
