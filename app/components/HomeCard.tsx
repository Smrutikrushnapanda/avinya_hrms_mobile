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
    let secondInterval: any;
    let resyncInterval: any;

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
      month: "short",
      day: "numeric",
    });
  };

  const formatTimeNoSeconds = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
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

  // Determine button text and handler based on isCheckedIn
  const buttonText = isCheckedIn ? "Punch Out" : "Punch In";
  const buttonHandler = isCheckedIn ? handleCheckOut : handleCheckIn;

  // Render loading state while fetching time
  if (isLoadingTime || !serverTime) {
    return (
      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: colors.primary }]}>
          <ActivityIndicator size="large" color={colors.onPrimary} />
          <Text style={[styles.statusText, { color: colors.onPrimary }]}>
            Loading server time...
          </Text>
        </View>
      </View>
    );
  }

  const currentDate = formatDate(serverTime);
  const formattedTime = formatTimeNoSeconds(serverTime);
  const timePeriod = getTimePeriod(serverTime);

  return (
    <View style={styles.cardWrapper}>
      <View style={[styles.card, { backgroundColor: colors.primary }]}>
        <View style={styles.contentRow}>
          <View style={styles.textContainer}>
            <Text style={[styles.dateText, { color: "rgba(255,255,255,0.85)" }]}>{currentDate}</Text>
            <Text style={[styles.timeText, { color: colors.onPrimary }]}>{formattedTime}</Text>
            <Text style={[styles.subText, { color: "rgba(255,255,255,0.85)" }]}>
              👋 {getGreeting(timePeriod)} {userName.split(" ")[0]}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, isCheckInDisabled && styles.buttonDisabled]}
            onPress={buttonHandler}
            disabled={isCheckInDisabled}
            activeOpacity={0.9}
          >
            <Ionicons
              name="finger-print"
              size={22}
              color={colors.primary}
              style={styles.buttonIcon}
            />
            <Text style={[styles.buttonText, { color: colors.primary }]}>{buttonText}</Text>
          </TouchableOpacity>
        </View>

        {(showWifiStatus || showLocationStatus) && (
          <View style={styles.statusContainer}>
            {showWifiStatus && (isLoadingWifi ? (
              <View style={styles.statusItem}>
                <ActivityIndicator size={12} color={colors.onPrimary} />
                <Text style={[styles.statusText, { color: colors.onPrimary }]}>
                  Checking WiFi...
                </Text>
              </View>
            ) : (
              <View style={styles.statusItem}>
                <Ionicons
                  name="wifi"
                  size={14}
                  color={isWifiValid ? "#4ADE80" : "#FCA5A5"}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: isWifiValid ? "#4ADE80" : "#FCA5A5" },
                  ]}
                  numberOfLines={1}
                >
                  {isWifiValid ? `WiFi: Connected` : "WiFi: Offline"}
                </Text>
                {!isWifiValid && (
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleRetryWifi}
                  >
                    <Ionicons name="refresh" size={12} color={colors.onPrimary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {showLocationStatus && (isLoadingLocation ? (
              <View style={styles.statusItem}>
                <ActivityIndicator size={12} color={colors.onPrimary} />
                <Text style={[styles.statusText, { color: colors.onPrimary }]}>
                  Locating...
                </Text>
              </View>
            ) : (
              <View style={styles.statusItem}>
                <Ionicons
                  name="location"
                  size={14}
                  color={isLocationValid ? "#4ADE80" : "#FCA5A5"}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: isLocationValid ? "#4ADE80" : "#FCA5A5" },
                  ]}
                  numberOfLines={1}
                >
                  {isLocationValid ? "Location: OK" : "Location: Err"}
                </Text>
                {!isLocationValid && (
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleRetryLocation}
                  >
                    <Ionicons name="refresh" size={12} color={colors.onPrimary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export default HomeCard;

const styles = StyleSheet.create({
  cardWrapper: {
    marginTop: 8,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    overflow: "hidden",
  },
  contentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    paddingRight: 10,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 28,
    fontWeight: "900",
    marginTop: 2,
    letterSpacing: -0.5,
  },
  subText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  statusContainer: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  statusText: {
    fontSize: 10,
    marginLeft: 4,
    fontWeight: "600",
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 6,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  retryButton: {
    padding: 2,
    marginLeft: 4,
  },
});
