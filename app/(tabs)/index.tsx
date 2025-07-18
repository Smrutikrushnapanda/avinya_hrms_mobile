import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import HomeCalendar from "app/components/HomeCalender";
import UpcomingHoliday from "app/components/UpcomingHoliday";
import { CameraView } from "expo-camera";
import * as Location from "expo-location";
import * as Network from "expo-network";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import WifiManager from "react-native-wifi-reborn";
import { logAttendance, todayLogs } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import HomeCard from "../components/HomeCard";
import TabHeader from "../components/TabHeader";
import { darkTheme, lightTheme } from "../constants/colors";

const Index = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;

  const route = useRouter();
  const navigation = useNavigation();
  const cameraRef = useRef<CameraView>(null);
  const { user } = useAuthStore();

  const [time, setTime] = useState(new Date());
  const [showCamera, setShowCamera] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [isWifiValid, setIsWifiValid] = useState(false);
  const [isLocationValid, setIsLocationValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [punchInTime, setPunchInTime] = useState(null);
  const [lastPunch, setLastPunch] = useState(null);
  const [wifiInfo, setWifiInfo] = useState({
    ssid: "",
    bssid: "",
    localIP: "",
    publicIP: "",
    isValid: false,
  });
  const [isLoadingWifi, setIsLoadingWifi] = useState(true);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  const orgId = user?.organizationId;
  const userId = user?.userId;

  // Function to get public IP address
  const getPublicIP = async () => {
    try {
      console.log("🌐 Fetching public IP...");
      const response = await fetch("https://api.ipify.org?format=json", {
        method: "GET",
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Public IP fetched:", data.ip);
      return data.ip;
    } catch (error) {
      console.warn("⚠️ Failed to fetch public IP:", error);
      try {
        console.log("🔄 Trying fallback API...");
        const fallbackResponse = await fetch("https://httpbin.org/ip", {
          method: "GET",
          timeout: 10000,
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log("✅ Public IP from fallback:", fallbackData.origin);
          return fallbackData.origin;
        }
      } catch (fallbackError) {
        console.warn("⚠️ Fallback API also failed:", fallbackError);
      }
      return null;
    }
  };

  // Function to get WiFi SSID and IP
  const getWifiDetails = async (showAlerts: boolean = false) => {
    try {
      console.log("📡 Starting WiFi detection...");
      const networkState = await Network.getNetworkStateAsync();
      console.log("🌐 Network State:", networkState);

      if (
        !networkState.isConnected ||
        networkState.type !== Network.NetworkStateType.WIFI
      ) {
        console.log("🚫 Not connected to Wi-Fi");
        if (showAlerts) {
          Alert.alert(
            "WiFi Required",
            "Please connect to the office WiFi network to mark attendance."
          );
        }
        return {
          ssid: "",
          bssid: "",
          localIP: "",
          publicIP: "",
          isValid: false,
        };
      }

      const deviceIP = await Network.getIpAddressAsync();
      console.log("📱 Device IP Address:", deviceIP);

      const publicIP = await getPublicIP();
      console.log("🌍 Public IP Address:", publicIP);

      let ssid = "";
      let bssid = deviceIP;

      try {
        const netInfoState = await NetInfo.fetch();
        console.log("📡 NetInfo State:", netInfoState);

        if (netInfoState.type === "wifi" && netInfoState.details) {
          ssid = netInfoState.details.ssid || "";
          bssid = netInfoState.details.bssid || deviceIP;
          console.log("📶 NetInfo WiFi Details:", { ssid, bssid });
        }
      } catch (netInfoError) {
        console.warn("⚠️ NetInfo error:", netInfoError);
      }

      if (!ssid && WifiManager) {
        try {
          if (Platform.OS === "android") {
            if (typeof WifiManager.getCurrentWifiSSID === "function") {
              ssid = await WifiManager.getCurrentWifiSSID();
              console.log("📡 WifiManager SSID:", ssid);
            }

            if (typeof WifiManager.getBSSID === "function") {
              const wifiBSSID = await WifiManager.getBSSID();
              if (wifiBSSID) {
                bssid = wifiBSSID;
                console.log("🔗 WifiManager BSSID:", bssid);
              }
            }
          }
        } catch (wifiManagerError) {
          console.warn("⚠️ WifiManager error:", wifiManagerError);
        }
      }

      if (!deviceIP) {
        console.log("❌ No IP address available");
        if (showAlerts) {
          Alert.alert(
            "WiFi Required",
            "Please connect to the office WiFi network to mark attendance."
          );
        }
        return {
          ssid: "",
          bssid: "",
          localIP: "",
          publicIP: "",
          isValid: false,
        };
      }

      if (!ssid) {
        console.log("❌ Could not retrieve WiFi SSID");
        if (showAlerts) {
          Alert.alert(
            "WiFi Required",
            "Please connect to the office WiFi network to mark attendance."
          );
        }
        return {
          ssid: "",
          bssid: "",
          localIP: "",
          publicIP: "",
          isValid: false,
        };
      }

      const result = {
        ssid,
        bssid,
        localIP: deviceIP,
        publicIP: publicIP || "",
        isValid: true,
      };

      console.log("✅ Final WiFi Details:", result);
      return result;
    } catch (error) {
      console.error("❌ WiFi detection error:", error);
      if (showAlerts) {
        Alert.alert(
          "WiFi Error",
          "Failed to detect WiFi. Please ensure you're connected to the office WiFi."
        );
      }
      return { ssid: "", bssid: "", localIP: "", publicIP: "", isValid: false };
    }
  };

  // Function to fetch attendance logs
  const fetchAttendanceLogs = async () => {
    try {
      console.log(
        "📊 Fetching attendance logs for orgId:",
        orgId,
        "userId:",
        userId
      );
      const response = await todayLogs(orgId, userId);
      console.log("✅ Attendance logs fetched:", response.data);

      if (response.data && response.data.logs) {
        setAttendanceLogs(response.data.logs);
        setPunchInTime(response.data.punchInTime);
        setLastPunch(response.data.lastPunch);

        // Determine check-in status based on punchInTime and logs
        const today = new Date().toISOString().split("T")[0];
        const hasCheckInToday =
          response.data.punchInTime &&
          new Date(response.data.punchInTime).toISOString().split("T")[0] ===
            today;
        const hasCheckOutToday = response.data.logs.some(
          (log) =>
            log.type === "check-out" &&
            new Date(log.timestamp).toISOString().split("T")[0] === today
        );

        // User is checked in if punchInTime exists for today and no check-out today
        const isCurrentlyCheckedIn = hasCheckInToday && !hasCheckOutToday;
        setIsCheckedIn(isCurrentlyCheckedIn);
        console.log("🔄 isCheckedIn set to:", isCurrentlyCheckedIn);
      } else {
        console.warn("⚠️ No logs found in response:", response.data);
        setIsCheckedIn(false);
        setPunchInTime(null);
        setLastPunch(null);
      }
    } catch (error) {
      console.error("❌ Failed to fetch attendance logs:", error);
      setIsCheckedIn(false);
      setPunchInTime(null);
      setLastPunch(null);
      Alert.alert(
        "Error",
        "Failed to fetch attendance logs. Please try again."
      );
    }
  };

  // Initial WiFi and Location load on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingWifi(true);
      setIsLoadingLocation(true);
      console.log("🕓 Fetching initial data...");

      try {
        const wifiData = await getWifiDetails(false);
        console.log("📥 Initial WiFi Data:", wifiData);
        setWifiInfo(wifiData);
        setIsWifiValid(wifiData.isValid);

        const isLocationSuccess = await checkLocation();
        setIsLocationValid(isLocationSuccess);

        await fetchAttendanceLogs();
      } catch (error) {
        console.error("❌ Initial data fetch error:", error);
        setWifiInfo({
          ssid: "",
          bssid: "",
          localIP: "",
          publicIP: "",
          isValid: false,
        });
        setIsWifiValid(false);
        setIsLocationValid(false);
      } finally {
        setIsLoadingWifi(false);
        setIsLoadingLocation(false);
      }
    };

    fetchInitialData();
  }, []);

  // Check Wi-Fi connection
  const checkWifi = async (showAlerts: boolean = false) => {
    setIsLoadingWifi(true);
    try {
      const wifiDetails = await getWifiDetails(showAlerts);
      console.log("WiFi Check - Connected to:", wifiDetails.ssid);
      setIsWifiValid(wifiDetails.isValid);
      setWifiInfo(wifiDetails);
      return wifiDetails.isValid;
    } catch (error) {
      console.error("Wi-Fi check error:", error);
      setIsWifiValid(false);
      setWifiInfo({
        ssid: "",
        bssid: "",
        localIP: "",
        publicIP: "",
        isValid: false,
      });
      return false;
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // Check device location
  const checkLocation = async () => {
    setIsLoadingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setIsLocationValid(false);
        return false;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      console.log("Current Location:", { latitude, longitude });

      setIsLocationValid(true);
      return true;
    } catch (error) {
      console.error("Location check error:", error);
      setIsLocationValid(false);
      return false;
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Retry Wi-Fi connection
  const handleRetryWifi = async () => {
    await checkWifi(true);
  };

  // Retry Location fetch
  const handleRetryLocation = async () => {
    await checkLocation();
  };

  // Refresh handler for location
  const onRefresh = async () => {
    if (!isLocationValid) {
      setRefreshing(true);
      await checkLocation();
      setRefreshing(false);
    }
  };

  // Run Wi-Fi and location checks periodically
  useEffect(() => {
    const interval = setInterval(() => {
      checkWifi(false);
      checkLocation();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Hide bottom tabs when camera is open
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: {
        display: showCamera ? "none" : "flex",
      },
    });
  }, [showCamera, navigation]);

  const getTimePeriod = (hour: number) => {
    if (hour >= 5 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 17) return "Afternoon";
    if (hour >= 17 && hour < 20) return "Evening";
    return "Night";
  };

  const formattedTime = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const currentDate = time.toLocaleDateString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const timePeriod = getTimePeriod(time.getHours());

  const handleCheckIn = async () => {
    const isWifiConnected = await checkWifi(true);
    if (!isWifiConnected) {
      return;
    }
    setCheckoutMode(false);
    console.log("Camera opened for check-in");
    setShowCamera(true);
  };

  const handleCheckOut = async () => {
    const isWifiConnected = await checkWifi(true);
    if (!isWifiConnected) {
      return;
    }
    setCheckoutMode(true);
    console.log("Camera opened for check-out");
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        setIsSubmitting(true);
        console.log("=== Starting takePicture process ===");

        console.log("Step 1: Taking picture...");
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          skipProcessing: false,
        });

        console.log("Photo taken successfully:", {
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
        });

        if (!photo.uri) {
          throw new Error("Photo capture failed - no URI returned");
        }

        console.log("Step 2: Getting WiFi details...");
        const wifiDetails = await getWifiDetails(true);

        if (!wifiDetails.isValid) {
          console.error("WiFi validation failed");
          Alert.alert(
            "WiFi Required",
            "Please connect to the office WiFi network to mark attendance."
          );
          setIsSubmitting(false);
          setShowCamera(false);
          return;
        }

        console.log("WiFi details obtained:", {
          ssid: wifiDetails.ssid,
          bssid: wifiDetails.bssid,
          localIP: wifiDetails.localIP,
          publicIP: wifiDetails.publicIP,
        });

        console.log("Step 3: Getting location...");
        let latitude = 0;
        let longitude = 0;
        let locationAddress = "";

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.error("Location permission denied");
          Alert.alert(
            "Location Required",
            "Location permission is required to mark attendance. Please enable location services."
          );
          setIsSubmitting(false);
          setShowCamera(false);
          return;
        }

        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
          });
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;

          console.log("Location obtained:", { latitude, longitude });

          try {
            const reverseGeocode = await Location.reverseGeocodeAsync({
              latitude,
              longitude,
            });
            if (reverseGeocode.length > 0) {
              const address = reverseGeocode[0];
              locationAddress = `${address.street || ""} ${
                address.city || ""
              } ${address.region || ""}`.trim();
            }
          } catch (geocodeError) {
            console.log(
              "Reverse geocoding failed, using coordinates:",
              geocodeError
            );
            locationAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          }
        } catch (locationError) {
          console.error("Location error:", locationError);
          Alert.alert(
            "Location Error",
            "Unable to retrieve location. Please ensure location services are enabled and try again."
          );
          setIsSubmitting(false);
          setShowCamera(false);
          return;
        }

        console.log("Step 4: Preparing data for API...");
        const deviceInfo = `${Platform.OS} ${Platform.Version}`;

        const dataToSend = {
          organizationId: orgId,
          userId: userId,
          source: "mobile",
          timestamp: new Date().toISOString(),
          latitude,
          longitude,
          locationAddress,
          wifiSsid: wifiDetails.ssid,
          wifiBssid: wifiDetails.bssid,
          deviceInfo,
          enableFaceValidation: true,
          enableWifiValidation: true,
          enableGPSValidation: true,
          imageUri: photo.uri,
          type: checkoutMode ? "check-out" : "check-in",
        };

        console.log("Validating data before API call:");
        console.log("Type:", dataToSend.type);
        console.log("WiFi SSID:", dataToSend.wifiSsid);
        console.log("WiFi BSSID:", dataToSend.wifiBssid);
        console.log("Local IP:", wifiDetails.localIP);
        console.log("Public IP:", wifiDetails.publicIP);
        console.log(
          "organizationId:",
          dataToSend.organizationId,
          "- Length:",
          dataToSend.organizationId.length
        );
        console.log(
          "userId:",
          dataToSend.userId,
          "- Length:",
          dataToSend.userId.length
        );
        console.log("source:", dataToSend.source);
        console.log("imageUri exists:", !!dataToSend.imageUri);

        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(dataToSend.organizationId)) {
          console.error(
            "Invalid organizationId format:",
            dataToSend.organizationId
          );
          throw new Error("Invalid organization ID format");
        }

        if (!uuidRegex.test(dataToSend.userId)) {
          console.error("Invalid userId format:", dataToSend.userId);
          throw new Error("Invalid user ID format");
        }

        const validSources = ["mobile", "web", "biometric", "wifi", "manual"];
        if (!validSources.includes(dataToSend.source)) {
          console.error("Invalid source:", dataToSend.source);
          throw new Error("Invalid source value");
        }

        console.log("✅ All validations passed");

        console.log("Step 5: Checking network connectivity...");
        try {
          const networkState = await Network.getNetworkStateAsync();
          console.log("Network state:", {
            isConnected: networkState.isConnected,
            isInternetReachable: networkState.isInternetReachable,
            type: networkState.type,
          });

          if (!networkState.isConnected) {
            throw new Error("No network connection available");
          }
        } catch (networkError) {
          console.error("Network check failed:", networkError);
          Alert.alert(
            "Network Error",
            "Please check your internet connection and try again."
          );
          setIsSubmitting(false);
          setShowCamera(false);
          return;
        }

        console.log("Step 6: Making API call...");
        const response = await logAttendance(dataToSend);

        console.log("API call successful:", response.data);

        console.log("Step 7: Handling response...");
        const actionType = checkoutMode ? "Check-out" : "Check-in";

        if (response.data.status === "success") {
          Alert.alert(
            "Success",
            `${actionType} successful! Your attendance has been recorded.`,
            [
              {
                text: "OK",
                onPress: () => {
                  setIsCheckedIn(checkoutMode ? false : true);
                  setShowCamera(false);
                  setIsSubmitting(false);
                  setCheckoutMode(false);
                  fetchAttendanceLogs();
                },
              },
            ]
          );
        } else if (response.data.status === "anomaly") {
          const reasons = response.data.reasons || [];
          const reasonText =
            reasons.length > 0 ? reasons.join(", ") : "Unknown reason";

          Alert.alert(
            "Attendance Recorded with Anomaly",
            `Your ${actionType.toLowerCase()} has been recorded, but there's an anomaly detected: ${reasonText}. Please contact your administrator if needed.`,
            [
              {
                text: "OK",
                onPress: () => {
                  setIsCheckedIn(checkoutMode ? false : true);
                  setShowCamera(false);
                  setIsSubmitting(false);
                  setCheckoutMode(false);
                  fetchAttendanceLogs();
                },
              },
            ]
          );
        } else {
          Alert.alert(
            "Notice",
            `${actionType} processed with status: ${response.data.status}`,
            [
              {
                text: "OK",
                onPress: () => {
                  setIsCheckedIn(checkoutMode ? false : true);
                  setShowCamera(false);
                  setIsSubmitting(false);
                  setCheckoutMode(false);
                  fetchAttendanceLogs();
                },
              },
            ]
          );
        }

        console.log("=== takePicture process completed successfully ===");
      } catch (error: any) {
        console.error("=== takePicture process failed ===");
        console.error("Full error object:", error);
        console.error("Error message:", error.message);

        let errorMessage = "Failed to process attendance. Please try again.";

        if (error.message?.includes("Invalid organization ID format")) {
          errorMessage =
            "Invalid organization ID. Please contact your administrator.";
        } else if (error.message?.includes("Invalid user ID format")) {
          errorMessage = "Invalid user ID. Please contact your administrator.";
        } else if (error.message?.includes("Invalid source value")) {
          errorMessage =
            "Invalid source configuration. Please contact your administrator.";
        } else if (error.response?.status === 400) {
          const apiErrors = error.response.data?.message || [];
          if (Array.isArray(apiErrors)) {
            errorMessage = `Validation Error: ${apiErrors.join(", ")}`;
          } else {
            errorMessage =
              error.response.data?.message || "Invalid request data.";
          }
        } else if (
          error.message?.includes("Photo capture failed") ||
          error.message?.includes("no URI returned")
        ) {
          errorMessage = "Failed to capture photo. Please try again.";
        } else if (error.message?.includes("Image URI is missing")) {
          errorMessage =
            "Photo capture failed. Please try taking the photo again.";
        } else if (
          error.message?.includes("Network Error") ||
          error.message?.includes("network") ||
          error.code === "NETWORK_ERROR" ||
          error.code === "ERR_NETWORK"
        ) {
          errorMessage =
            "Network connection failed. Please check your internet connection and try again.";
        } else if (
          error.message?.includes("timeout") ||
          error.code === "ECONNABORTED"
        ) {
          errorMessage =
            "Request timeout. Please try again with a better connection.";
        } else if (error.response) {
          const status = error.response.status;
          const data = error.response.data;

          console.error("API Error Response:", {
            status,
            statusText: error.response.statusText,
            data,
          });

          switch (status) {
            case 401:
              errorMessage = "Authentication failed. Please login again.";
              break;
            case 403:
              errorMessage =
                "Access denied. Please contact your administrator.";
              break;
            case 413:
              errorMessage = "Image size too large. Please try again.";
              break;
            case 500:
              errorMessage = "Server error. Please try again later.";
              break;
            default:
              errorMessage =
                data.message || `Server error (${status}). Please try again.`;
          }
        } else if (error.request) {
          console.error(
            "Request made but no response received:",
            error.request
          );
          errorMessage =
            "No response from server. Please check your connection.";
        }

        Alert.alert("Error", errorMessage, [
          {
            text: "Retry",
            onPress: () => {
              setIsSubmitting(false);
            },
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              setIsSubmitting(false);
              setShowCamera(false);
              setCheckoutMode(false);
            },
          },
        ]);
      }
    } else {
      Alert.alert("Error", "Camera not initialized");
      console.error("Camera ref is null");
      setIsSubmitting(false);
      setShowCamera(false);
      setCheckoutMode(false);
    }
  };

  // Helper function to format time with AM/PM - Updated to show 00:00 instead of N/A
  const formatTime = (timestamp) => {
    if (!timestamp) return "00:00";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Helper function to format date - Updated to show current date instead of N/A
  const formatDate = (timestamp) => {
    if (!timestamp) {
      const today = new Date();
      return today.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    }
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Helper function to calculate working hours - Updated to show 0:00 HRS consistently
  const calculateWorkingHours = () => {
    if (!punchInTime) return "0:00 HRS";

    const checkInTime = new Date(punchInTime);
    const currentTime = new Date();
    const endTime = lastPunch ? new Date(lastPunch) : currentTime;

    const diffMs = endTime.getTime() - checkInTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${diffHours}:${diffMinutes.toString().padStart(2, "0")} HRS`;
  };

  // Button logic based on punchInTime and absence of check-out today
  const today = new Date().toISOString().split("T")[0];
  const hasCheckInToday =
    punchInTime && new Date(punchInTime).toISOString().split("T")[0] === today;
  const hasCheckOutToday = attendanceLogs.some(
    (log) =>
      log.type === "check-out" &&
      new Date(log.timestamp).toISOString().split("T")[0] === today
  );
  const showCheckInButton = !hasCheckInToday || hasCheckOutToday;
  const isCheckInDisabled = !isWifiValid || !isLocationValid;

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="front"
          ref={cameraRef}
          ratio="4:3"
        >
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => {
                setShowCamera(false);
                setCheckoutMode(false);
              }}
              disabled={isSubmitting}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.captureButton,
                isSubmitting && styles.captureButtonDisabled,
              ]}
              onPress={takePicture}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>

            <View style={styles.placeholderButton} />
          </View>
        </CameraView>

        {isSubmitting && (
          <View style={styles.loaderOverlay}>
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.text }]}>
                {checkoutMode
                  ? "Processing check-out..."
                  : "Processing check-in..."}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={
          !isLocationValid ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        <TabHeader />

        <HomeCard
          currentDate={currentDate}
          formattedTime={formattedTime}
          timePeriod={timePeriod}
          isCheckedIn={isCheckedIn}
          punchInTime={punchInTime}
          lastPunch={punchInTime}
          isLoadingWifi={isLoadingWifi}
          isWifiValid={isWifiValid}
          isLoadingLocation={isLoadingLocation}
          isLocationValid={isLocationValid}
          showCheckInButton={showCheckInButton}
          isCheckInDisabled={isCheckInDisabled}
          handleCheckIn={handleCheckIn}
          handleCheckOut={handleCheckOut}
          handleRetryWifi={handleRetryWifi}
          handleRetryLocation={handleRetryLocation}
          formatTime={formatTime}
        />

        <View style={styles.row}>
          <Text style={[styles.sectionDetails, { color: colors.text }]}>
            Your activity
          </Text>
          <TouchableOpacity
            onPress={() => {
              route.push("/(tabs)/attendance");
            }}
          >
            <Text style={[styles.viewall, { color: colors.primary }]}>
              View all
            </Text>
          </TouchableOpacity>
        </View>

        {/* Punch In Card - Always visible */}
        <View style={styles.attendanceCard}>
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: "#E4F1FF",
                },
              ]}
            >
              <Ionicons name={"arrow-forward"} size={20} color={"#1e7ba8"} />
            </View>
          </View>
          <View style={styles.infoContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Punch In</Text>
            <Text style={styles.subtitle}>{formatDate(punchInTime)}</Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={[styles.time, { color: colors.text }]}>
              {formatTime(punchInTime)}
            </Text>
            <Text style={styles.status}>
              {punchInTime ? "Completed" : "Not done"}
            </Text>
          </View>
        </View>

        {/* Last Punch Card - Always visible */}
        <View style={styles.attendanceCard}>
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: "#ffe4e4ff",
                },
              ]}
            >
              <Ionicons name={"arrow-back"} size={20} color={"#a81e1eff"} />
            </View>
          </View>
          <View style={styles.infoContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              Last Punch
            </Text>
            <Text style={styles.subtitle}>{formatDate(lastPunch)}</Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={[styles.time, { color: colors.text }]}>
              {formatTime(lastPunch)}
            </Text>
            <Text style={styles.status}>
              {lastPunch ? "Completed" : "Not done"}
            </Text>
          </View>
        </View>

        {/* Working Hours Card - Always visible */}
        <View style={styles.attendanceCard}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconBox, { backgroundColor: "#C2FFC7" }]}>
              <MaterialIcons name="laptop" size={20} color="#399918" />
            </View>
          </View>
          <View style={styles.infoContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              Working Hours
            </Text>
            <Text style={styles.subtitle}>
              {punchInTime ? formatDate(punchInTime) : formatDate(null)}
            </Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={[styles.time, { color: colors.text }]}>
              {calculateWorkingHours()}
            </Text>
            <Text style={styles.status}>
              {punchInTime ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>

        <View>
          <HomeCalendar />
        </View>
        <View>
          <UpcomingHoliday />
        </View>
      </ScrollView>
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
    zIndex: 9999,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: 30,
  },
  cameraButton: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: "center",
    minWidth: 80,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  placeholderButton: {
    width: 80,
    height: 50,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionDetails: {
    fontSize: 17,
    fontWeight: "800",
  },
  viewall: {
    fontSize: 14,
    fontWeight: "600",
  },
  attendanceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e7ba8",
  },
  subtitle: {
    fontSize: 12,
    color: "#999",
  },
  timeContainer: {
    alignItems: "flex-end",
  },
  time: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e7ba8",
  },
  status: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
  },
  captureButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "#ccc",
    borderWidth: 2,
    opacity: 0.6,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loaderContainer: {
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 10,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "500",
  },
});