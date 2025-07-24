import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import HomeCalendar from "app/components/HomeCalender";
import UpcomingHoliday from "app/components/UpcomingHoliday";
import { Camera, CameraView } from "expo-camera";
import * as Location from "expo-location";
import * as Network from "expo-network";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import { logAttendance, todayLogs } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import CustomDialog from "../components/CustomDialog";
import HomeCard from "../components/HomeCard";
import TabHeader from "../components/TabHeader";
import { darkTheme, lightTheme } from "../constants/colors";

const Index = () => {
  const colorScheme = useColorScheme() || "light";
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
  const [cameraPermission, setCameraPermission] = useState(null);
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
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // State for CustomDialog
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogType, setDialogType] = useState("INFO");
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogOnConfirm, setDialogOnConfirm] = useState(() => () => {});

  const orgId = user?.organizationId;
  const userId = user?.userId;

  // Function to show dialog
  const showDialog = (
    type,
    title,
    message,
    onConfirm = () => setDialogVisible(false)
  ) => {
    setDialogType(type);
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogOnConfirm(() => onConfirm);
    setDialogVisible(true);
  };

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

    if (!deviceIP) {
      console.log("❌ No IP address available");
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
    return {
      ssid: "",
      bssid: "",
      localIP: "",
      publicIP: "",
      isValid: false,
    };
  }
};


  const checkAndRequestCameraPermission = async () => {
    try {
      console.log("🎥 Checking camera permission status...");
      const { status: currentStatus } =
        await Camera.getCameraPermissionsAsync();
      console.log("📋 Current permission status:", currentStatus);

      if (currentStatus === "granted") {
        console.log("✅ Camera permission already granted");
        setCameraPermission("granted");
        return true;
      }

      if (currentStatus === "denied") {
        console.log(
          "❌ Camera permission was previously denied - requesting again..."
        );
        const { status: retryStatus } =
          await Camera.requestCameraPermissionsAsync();
        console.log("🔄 Retry permission request result:", retryStatus);

        setCameraPermission(retryStatus);

        if (retryStatus === "granted") {
          console.log("🎉 Camera permission granted on retry!");
          return true;
        } else {
          showDialog(
            "DANGER",
            "Camera Permission Required",
            "Camera access is needed to take attendance photos. Please allow camera permission to continue.",
            async () => {
              const { status: finalStatus } =
                await Camera.requestCameraPermissionsAsync();
              if (finalStatus === "granted") {
                setCameraPermission("granted");
                return true;
              } else {
                showDialog(
                  "DANGER",
                  "Permission Needed",
                  "Camera permission is required for attendance. You can enable it in your device settings."
                );
                return false;
              }
            }
          );
          return false;
        }
      }

      if (currentStatus === "undetermined") {
        console.log("📱 Requesting camera permission for the first time...");
        const { status: newStatus } =
          await Camera.requestCameraPermissionsAsync();
        console.log("✅ Permission request result:", newStatus);

        setCameraPermission(newStatus);

        if (newStatus === "granted") {
          console.log("🎉 Camera permission granted!");
          return true;
        } else if (newStatus === "denied") {
          showDialog(
            "DANGER",
            "Camera Permission Required",
            "Camera access is needed to take attendance photos. Please allow camera permission to continue.",
            async () => {
              const { status: retryStatus } =
                await Camera.requestCameraPermissionsAsync();
              setCameraPermission(retryStatus);
              if (retryStatus !== "granted") {
                showDialog(
                  "DANGER",
                  "Permission Required",
                  "Camera access is required for attendance photos."
                );
              }
              return retryStatus === "granted";
            }
          );
          return false;
        }
      }

      console.log("⚠️ Unexpected permission status:", currentStatus);
      const { status: fallbackStatus } =
        await Camera.requestCameraPermissionsAsync();
      setCameraPermission(fallbackStatus);
      return fallbackStatus === "granted";
    } catch (error) {
      console.error("❌ Camera permission error:", error);
      showDialog(
        "DANGER",
        "Permission Error",
        "Unable to request camera permission. Please try again.",
        async () => {
          try {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setCameraPermission(status);
            return status === "granted";
          } catch (retryError) {
            console.error("Retry permission error:", retryError);
            return false;
          }
        }
      );
      return false;
    }
  };

  const fetchAttendanceLogs = async () => {
    try {
      console.log(
        "📊 Fetching attendance logs for orgId:",
        orgId,
        "userId:",
        userId
      );
      const response = await todayLogs(orgId, userId);
      // console.log("✅ Attendance logs fetched:", response.data);

      if (response.data && response.data.logs) {
        setAttendanceLogs(response.data.logs);
        setPunchInTime(response.data.punchInTime);
        setLastPunch(response.data.lastPunch);

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

        const isCurrentlyCheckedIn = hasCheckInToday && !hasCheckOutToday;
        setIsCheckedIn(isCurrentlyCheckedIn);
        console.log("🔄 isCheckedIn set to:", isCurrentlyCheckedIn);
      } else {
        console.warn("⚠️ No logs found in response:", response.data);
      }
    } catch (error) {
      console.error("❌ Failed to fetch attendance logs:", error);
      showDialog(
        "INFO",
        "Network Issue",
        "Activity data will be fetched when mobile data is available."
      );
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      if (initialCheckComplete) return;

      setIsLoadingWifi(true);
      setIsLoadingLocation(true);
      console.log("🕓 Fetching initial data...");

      try {
        await fetchAttendanceLogs();
      } catch (error) {
        console.error("❌ Initial attendance fetch error:", error);
      }

      try {
        const wifiData = await getWifiDetails(false);
        console.log("📥 Initial WiFi Data:", wifiData);
        setWifiInfo(wifiData);
        setIsWifiValid(wifiData.isValid);
      } catch (error) {
        console.error("❌ Initial WiFi check error:", error);
        setWifiInfo({
          ssid: "",
          bssid: "",
          localIP: "",
          publicIP: "",
          isValid: false,
        });
        setIsWifiValid(false);
      }

      try {
        const isLocationSuccess = await checkLocation();
        setIsLocationValid(isLocationSuccess);
      } catch (error) {
        console.error("❌ Initial location check error:", error);
        setIsLocationValid(false);
      }

      setIsLoadingWifi(false);
      setIsLoadingLocation(false);
      setInitialCheckComplete(true);
    };

    fetchInitialData();
  }, []);

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

  const checkLocation = async () => {
    setIsLoadingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setIsLocationValid(false);
        showDialog(
          "DANGER",
          "Location Permission Required",
          "Location permission is needed to mark attendance. Please enable location services."
        );
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
      showDialog(
        "DANGER",
        "Location Error",
        "Unable to retrieve location. Please ensure location services are enabled."
      );
      return false;
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleRetryWifi = async () => {
    try {
      setIsLoadingWifi(true);
      const wifiData = await getWifiDetails(true);
      setWifiInfo(wifiData);
      setIsWifiValid(wifiData.isValid);

      await fetchAttendanceLogs();
    } catch (error) {
      console.error("WiFi retry error:", error);
      try {
        await fetchAttendanceLogs();
      } catch (dataError) {
        console.error(
          "Attendance data fetch error during WiFi retry:",
          dataError
        );
      }
    } finally {
      setIsLoadingWifi(false);
    }
  };

  const handleRetryLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const isLocationSuccess = await checkLocation();
      setIsLocationValid(isLocationSuccess);

      await fetchAttendanceLogs();
    } catch (error) {
      console.error("Location retry error:", error);
      try {
        await fetchAttendanceLogs();
      } catch (dataError) {
        console.error(
          "Attendance data fetch error during location retry:",
          dataError
        );
      }
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAttendanceLogs();
      if (!isLocationValid) {
        await checkLocation();
      }
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAttendanceLogs().catch((error) => {
        console.log("Periodic attendance refresh failed:", error);
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      navigation.setOptions({
        tabBarStyle: {
          display: showCamera || previewImage ? "none" : "flex",
        },
      });

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (showCamera || previewImage) {
            if (previewImage) {
              setPreviewImage(null);
              setShowCamera(true); // Return to camera instead of closing
            } else {
              setShowCamera(false);
              setCheckoutMode(false);
            }
            return true;
          }
          return false;
        }
      );

      return () => backHandler.remove();
    }, [showCamera, previewImage, navigation, route])
  );

  const getTimePeriod = (hour: number) => {
    if (hour >= 5 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 17) return "Afternoon";
    if (hour >= 17 && hour < 20) return "Evening";
    return "Night";
  };

  const formattedTime = time
    .toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();

  const currentDate = time.toLocaleDateString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const timePeriod = getTimePeriod(time.getHours());

  const handleCheckIn = async () => {
    try {
      const isWifiConnected = await checkWifi(true);
      if (!isWifiConnected) {
        return;
      }

      const hasCameraPermission = await checkAndRequestCameraPermission();
      if (!hasCameraPermission) {
        console.log("❌ Camera permission denied, cannot proceed");
        return;
      }

      setCheckoutMode(false);
      console.log("✅ Camera opened for check-in");
      setShowCamera(true);
    } catch (error) {
      console.error("❌ Error in handleCheckIn:", error);
      showDialog("DANGER", "Error", "Failed to open camera. Please try again.");
    }
  };

  const handleCheckOut = async () => {
    try {
      const isWifiConnected = await checkWifi(true);
      if (!isWifiConnected) {
        return;
      }

      const hasCameraPermission = await checkAndRequestCameraPermission();
      if (!hasCameraPermission) {
        console.log("❌ Camera permission denied, cannot proceed");
        return;
      }

      setCheckoutMode(true);
      console.log("✅ Camera opened for check-out");
      setShowCamera(true);
    } catch (error) {
      console.error("❌ Error in handleCheckOut:", error);
      showDialog("DANGER", "Error", "Failed to open camera. Please try again.");
    }
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
          mirror: false, // Disable mirroring
        });

        console.log("Photo taken successfully:", {
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
        });

        if (!photo.uri) {
          throw new Error("Photo capture failed - no URI returned");
        }

        setPreviewImage(photo.uri);
        setShowCamera(false);
        setIsSubmitting(false);
      } catch (error) {
        console.error("=== takePicture process failed ===");
        console.error("Error message:", error.message);
        showDialog(
          "DANGER",
          "Error",
          "Failed to capture photo. Please try again.",
          () => {
            setIsSubmitting(false);
            setShowCamera(true); // Reopen camera for retry
          }
        );
        setIsSubmitting(false);
        setCheckoutMode(false);
      }
    } else {
      showDialog("DANGER", "Error", "Camera not initialized");
      console.error("Camera ref is null");
      setIsSubmitting(false);
      setShowCamera(false);
      setCheckoutMode(false);
    }
  };

  const handleSubmitImage = async () => {
    if (!previewImage) {
      showDialog("DANGER", "Error", "No image to submit", () => {
        setIsSubmitting(false);
        setPreviewImage(null);
      });
      return;
    }

    setIsSubmitting(true);
    console.log("=== Starting submit image process ===");

    try {
      // Step 1: Get WiFi details
      console.log("Step 1: Getting WiFi details...");
      const wifiDetails = await getWifiDetails(true);

      if (!wifiDetails.isValid) {
        console.error("WiFi validation failed");
        showDialog(
          "DANGER",
          "WiFi Required",
          "Please connect to the office WiFi network to mark attendance.",
          () => {
            setIsSubmitting(false);
            setPreviewImage(null);
          }
        );
        return;
      }

      console.log("WiFi details obtained:", {
        ssid: wifiDetails.ssid,
        bssid: wifiDetails.bssid,
        localIP: wifiDetails.localIP,
        publicIP: wifiDetails.publicIP,
      });

      // Step 2: Get location
      console.log("Step 2: Getting location...");
      let latitude = 0;
      let longitude = 0;
      let locationAddress = "";

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Location permission denied");
        showDialog(
          "DANGER",
          "Location Required",
          "Location permission is required to mark attendance. Please enable location services.",
          () => {
            setIsSubmitting(false);
            setPreviewImage(null);
          }
        );
        return;
      }

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
          locationAddress = `${address.street || ""} ${address.city || ""} ${
            address.region || ""
          }`.trim();
        }
      } catch (geocodeError) {
        console.log(
          "Reverse geocoding failed, using coordinates:",
          geocodeError
        );
        locationAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }

      // Step 3: Prepare data for API
      console.log("Step 3: Preparing data for API...");
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
        imageUri: previewImage,
        type: checkoutMode ? "check-out" : "check-in",
      };

      console.log("Validating data before API call:", {
        type: dataToSend.type,
        wifiSsid: dataToSend.wifiSsid,
        wifiBssid: dataToSend.wifiBssid,
        localIP: wifiDetails.localIP,
        publicIP: wifiDetails.publicIP,
        organizationId: dataToSend.organizationId,
        userId: dataToSend.userId,
        source: dataToSend.source,
        imageUri: !!dataToSend.imageUri,
      });

      // Validate UUIDs and source
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(dataToSend.organizationId)) {
        throw new Error("Invalid organization ID format");
      }
      if (!uuidRegex.test(dataToSend.userId)) {
        throw new Error("Invalid user ID format");
      }
      const validSources = ["mobile", "web", "biometric", "wifi", "manual"];
      if (!validSources.includes(dataToSend.source)) {
        throw new Error("Invalid source value");
      }

      console.log("✅ All validations passed");

      // Step 4: Check network connectivity
      console.log("Step 4: Checking network connectivity...");
      const networkState = await Network.getNetworkStateAsync();
      console.log("Network state:", {
        isConnected: networkState.isConnected,
        isInternetReachable: networkState.isInternetReachable,
        type: networkState.type,
      });

      if (!networkState.isConnected) {
        throw new Error("No network connection available");
      }

      // Step 5: Make API call
      console.log("Step 5: Making API call...");
      const response = await logAttendance(dataToSend);
      console.log("API call successful:", response.data);

      // Step 6: Handle response
      console.log("Step 6: Handling response...");
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
                setPreviewImage(null);
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
          "Attendance Failed",
          "Please ensure that you are connected to the office Wi-Fi or within the office premises.",
          [
            {
              text: "OK",
              onPress: () => {
                setIsCheckedIn(checkoutMode ? false : true);
                setPreviewImage(null);
                setIsSubmitting(false);
                setCheckoutMode(false);
                fetchAttendanceLogs();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Attendance Failed",
          "Please ensure you are connected to the office Wi-Fi or within the office premises. Contact the administrator if the issue persists.",
          [
            {
              text: "OK",
              onPress: () => {
                setIsCheckedIn(checkoutMode ? false : true);
                setPreviewImage(null);
                setIsSubmitting(false);
                setCheckoutMode(false);
                fetchAttendanceLogs();
              },
            },
          ]
        );
      }

      console.log("=== submitImage process completed successfully ===");
    } catch (error) {
      console.error("=== submitImage process failed ===");
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
      } else if (error.message?.includes("No network connection available")) {
        errorMessage =
          "No network connection available. Please check your internet connection.";
      } else if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        console.error("API Error Response:", { status, data });

        switch (status) {
          case 400:
            errorMessage = data?.message
              ? Array.isArray(data.message)
                ? `Validation Error: ${data.message.join(", ")}`
                : data.message
              : "Invalid request data.";
            break;
          case 401:
            errorMessage = "Authentication failed. Please login again.";
            break;
          case 403:
            errorMessage = "Access denied. Please contact your administrator.";
            break;
          case 413:
            errorMessage = "Image size too large. Please try again.";
            break;
          case 500:
            errorMessage = "Server error. Please try again later.";
            break;
          default:
            errorMessage =
              data?.message || `Server error (${status}). Please try again.`;
        }
      } else if (error.request) {
        console.error("Request made but no response received:", error.request);
        errorMessage = "No response from server. Please check your connection.";
      } else if (
        error.message?.includes("timeout") ||
        error.code === "ECONNABORTED"
      ) {
        errorMessage =
          "Request timeout. Please try again with a better connection.";
      }

      showDialog("DANGER", "Error", errorMessage, () => {
        setIsSubmitting(false);
        setPreviewImage(null);
        setCheckoutMode(false);
      });
    } finally {
      console.log("=== submitImage process finalized ===");
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "00:00 AM";
    const date = new Date(timestamp);
    return date
      .toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .toUpperCase();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) {
      const today = new Date();
      return today.toLocaleDateString("en-IN", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    }
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const calculateWorkingHours = () => {
    if (!punchInTime) return "0:00 hours";

    const checkInTime = new Date(punchInTime);
    const hasCheckOutToday = attendanceLogs.some(
      (log) =>
        log.type === "check-out" &&
        new Date(log.timestamp).toISOString().split("T")[0] ===
          new Date().toISOString().split("T")[0]
    );

    const endTime =
      hasCheckOutToday && lastPunch ? new Date(lastPunch) : new Date();

    const diffMs = endTime.getTime() - checkInTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${diffHours}:${diffMinutes.toString().padStart(2, "0")} hours`;
  };

  const handleRefreshWorkingHours = async () => {
    setRefreshing(true);
    try {
      await fetchAttendanceLogs();
      setTime(new Date());
    } catch (error) {
      console.error("Working hours refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const canFetchData = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return networkState.isConnected;
    } catch (error) {
      console.error("Network check failed:", error);
      return false;
    }
  };

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

  if (previewImage) {
    return (
      <View style={styles.previewContainer}>
        <Image
          source={{ uri: previewImage }}
          style={styles.previewImage}
          resizeMode="contain"
        />
        <View style={styles.previewButtons}>
  <TouchableOpacity
    style={[styles.previewButton, styles.submitButton]}
    onPress={handleSubmitImage}
    disabled={isSubmitting}
    activeOpacity={0.8}
  >
    <View style={styles.buttonContent}>
      {isSubmitting ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <>
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
          <Text style={[styles.buttonText, styles.submitText]}>Submit</Text>
        </>
      )}
    </View>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.previewButton, styles.retakeButton]}
    onPress={() => {
      setPreviewImage(null);
      setShowCamera(true);
    }}
    disabled={isSubmitting}
    activeOpacity={0.8}
  >
    <View style={styles.buttonContent}>
      <Ionicons name="camera-outline" size={22} color="#FF6B6B" />
      <Text style={[styles.buttonText, styles.retakeText]}>Retake</Text>
    </View>
  </TouchableOpacity>
</View>
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

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          ratio="4:3"
          autoFocus="on"
          pictureSize="Medium"
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
          userName={user?.name || user?.firstName || "User"}
          isCheckedIn={isCheckedIn}
          punchInTime={punchInTime}
          lastPunch={lastPunch}
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
            Today Attendance
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
            <TouchableOpacity
              onPress={handleRefreshWorkingHours}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="refresh" size={16} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View>
          <HomeCalendar />
        </View>
        <View>
          <UpcomingHoliday />
        </View>
      </ScrollView>

      {/* Add CustomDialog to the render tree */}
      <CustomDialog
        isVisible={dialogVisible}
        type={dialogType}
        title={dialogTitle}
        message={dialogMessage}
        onConfirm={dialogOnConfirm}
        onCancel={() => setDialogVisible(false)}
      />
    </View>
  );
};

export default Index;

// Styles remain unchanged
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
    padding: moderateScale(30),
  },
  cameraButton: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(25),
    alignItems: "center",
    minWidth: horizontalScale(80),
  },
  captureButton: {
    width: horizontalScale(80),
    height: horizontalScale(80),
    borderRadius: horizontalScale(40),
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  captureButtonInner: {
    width: horizontalScale(60),
    height: horizontalScale(60),
    borderRadius: horizontalScale(30),
    backgroundColor: "#fff",
  },
  placeholderButton: {
    width: horizontalScale(80),
    height: verticalScale(50),
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: horizontalScale(20),
    marginTop: verticalScale(10),
  },
  sectionDetails: {
    fontSize: moderateScale(17),
    fontWeight: "800",
  },
  viewall: {
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  attendanceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    marginHorizontal: horizontalScale(20),
    marginTop: verticalScale(12),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    marginRight: horizontalScale(12),
  },
  iconBox: {
    width: horizontalScale(40),
    height: horizontalScale(40),
    borderRadius: horizontalScale(20),
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#1e7ba8",
  },
  subtitle: {
    fontSize: moderateScale(12),
    color: "#999",
  },
  timeContainer: {
    alignItems: "flex-end",
  },
  time: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#1e7ba8",
  },
  status: {
    fontSize: moderateScale(10),
    color: "#999",
    marginTop: verticalScale(2),
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
    paddingVertical: verticalScale(20),
    paddingHorizontal: horizontalScale(30),
    borderRadius: moderateScale(10),
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    alignItems: "center",
  },
  loaderText: {
    marginTop: verticalScale(10),
    fontSize: moderateScale(16),
    fontWeight: "500",
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "70%",
    borderRadius: moderateScale(10),
    transform: [{ scaleX: -1 }],
  },
  previewButtons: {
    width: "90%",
    marginTop: verticalScale(20),
    gap: verticalScale(16),
  },

  previewButton: {
    width: "100%",
    paddingVertical: verticalScale(16),
    paddingHorizontal: moderateScale(20),
    borderRadius: moderateScale(16),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(10),
  },

  submitButton: {
    backgroundColor: "#4CAF50",
    borderWidth: 0,
    // Gradient effect simulation with shadow
    shadowColor: "#2E7D32",
  },

  retakeButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FF6B6B",
    shadowColor: "#FF6B6B",
  },

  buttonText: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  submitText: {
    color: "#FFFFFF",
  },

  retakeText: {
    color: "#FF6B6B",
  },
});

// Alternative design with more modern styling
const alternativeStyles = StyleSheet.create({
  previewButtons: {
    width: "90%",
    marginTop: verticalScale(24),
    gap: verticalScale(14),
  },

  previewButton: {
    width: "100%",
    paddingVertical: verticalScale(18),
    paddingHorizontal: moderateScale(24),
    borderRadius: moderateScale(20),
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(12),
    zIndex: 1,
  },

  submitButton: {
    backgroundColor: "#00C851",
    // Add gradient background if using react-native-linear-gradient
    shadowColor: "#00C851",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },

  retakeButton: {
    backgroundColor: "rgba(255, 133, 133, 1)",
    borderWidth: 2,
    borderColor: "#FF6B6B",
    shadowColor: "#FF6B6B",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  buttonText: {
    fontSize: moderateScale(17),
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  submitText: {
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  retakeText: {
    color: "#FF6B6B",
    fontWeight: "600",
  },

  // Add disabled state styling
  disabledButton: {
    opacity: 0.6,
    transform: [{ scale: 0.98 }],
  },
});
