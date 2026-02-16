import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from "@react-native-community/netinfo";
import HomeCalendar from "app/components/HomeCalender";
import MessageModal from "app/components/MessageModal";
import UpcomingHoliday from "app/components/UpcomingHoliday";
import { Camera, CameraView } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
import * as Network from "expo-network";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  BackHandler,
  Image,
  Linking,
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
import { getCurrentTime, getOrganization, logAttendance, todayLogs } from "../../api/api";
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
  const { user, isAuthenticated, accessToken, initializeAuth } = useAuthStore();
  const [time, setTime] = useState<Date>(new Date());
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<"front" | "back">("front");
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
  const [checkoutMode, setCheckoutMode] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [isWifiValid, setIsWifiValid] = useState<boolean>(false);
  const [isLocationValid, setIsLocationValid] = useState<boolean>(false);
  const [cameraPermission, setCameraPermission] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [attendanceLogs, setAttendanceLogs] = useState<Array<any>>([]);
  const [punchInTime, setPunchInTime] = useState<string | null>(null);
  const [lastPunch, setLastPunch] = useState<string | null>(null);
  const [wifiInfo, setWifiInfo] = useState<{
    ssid: string;
    bssid: string;
    localIP: string;
    publicIP: string;
    isValid: boolean;
  }>({
    ssid: "",
    bssid: "",
    localIP: "",
    publicIP: "",
    isValid: false,
  });
  const [isLoadingWifi, setIsLoadingWifi] = useState<boolean>(true);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [dialogVisible, setDialogVisible] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<string>("INFO");
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [dialogMessage, setDialogMessage] = useState<string>("");
  const [dialogOnConfirm, setDialogOnConfirm] = useState<() => void>(() => () => {});
  const [cachedWifi, setCachedWifi] = useState<any>(null);
  const [cachedLocation, setCachedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [lastSubmission, setLastSubmission] = useState<number>(0);
  const [initializationRetryCount, setInitializationRetryCount] = useState<number>(0);
  const [workingHours, setWorkingHours] = useState<string>("0:00:00 hours");
  const [showMessageModal, setShowMessageModal] = useState<boolean>(false);
  const [validationRules, setValidationRules] = useState<{
    enableWifiValidation: boolean;
    enableGPSValidation: boolean;
  }>({ enableWifiValidation: true, enableGPSValidation: true });
  const [validationRulesLoaded, setValidationRulesLoaded] = useState<boolean>(false);
  const orgId = user?.organizationId;
  const userId = user?.userId;
  const hasFetchedLocation = useRef<boolean>(false);
  const hasFetchedWifi = useRef<boolean>(false);

  const showDialog = (
    type: string,
    title: string,
    message: string,
    onConfirm: () => void = () => setDialogVisible(false)
  ) => {
    setDialogType(type);
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogOnConfirm(() => onConfirm);
    setDialogVisible(true);
  };

  const fetchOrgValidationRules = async () => {
    if (!orgId) return;
    try {
      const response = await getOrganization(orgId);
      const org = response.data || {};
      const enableWifiValidation =
        typeof org.enableWifiValidation === "boolean" ? org.enableWifiValidation : true;
      const enableGPSValidation =
        typeof org.enableGpsValidation === "boolean" ? org.enableGpsValidation : true;
      setValidationRules({ enableWifiValidation, enableGPSValidation });
      setValidationRulesLoaded(true);
      if (!enableWifiValidation) {
        setIsWifiValid(true);
        setIsLoadingWifi(false);
        hasFetchedWifi.current = true;
      }
      if (!enableGPSValidation) {
        setIsLocationValid(true);
        setIsLoadingLocation(false);
        hasFetchedLocation.current = true;
      }
    } catch (error) {
      console.error("Failed to fetch organization validation settings:", error);
    }
  };

  const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  const getWifiDetails = async (showAlerts: boolean = false, retryCount: number = 0): Promise<{
    ssid: string;
    bssid: string;
    localIP: string;
    publicIP: string;
    isValid: boolean;
  }> => {
    const maxRetries = 1;
    const retryDelay = 1000;
    try {
      console.log(`📡 Starting WiFi detection... (Attempt ${retryCount + 1}/${maxRetries + 1})`);

      if (retryCount === 0) {
        await sleep(1000);
      }
      const networkState = await Network.getNetworkStateAsync();
      console.log("🌐 Network State:", networkState);
      if (!networkState.isConnected) {
        console.log("🚫 Device not connected to any network");
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying WiFi detection in ${retryDelay}ms...`);
          await sleep(retryDelay);
          return getWifiDetails(showAlerts, retryCount + 1);
        }
        if (showAlerts) {
          showDialog("DANGER", "Network Required", "Please connect to a network and try again.");
        }
        return { ssid: "", bssid: "", localIP: "", publicIP: "", isValid: false };
      }
      if (networkState.type !== Network.NetworkStateType.WIFI) {
        console.log("🚫 Not connected to Wi-Fi (using mobile data or other)");
        if (retryCount < maxRetries) {
          console.log(`🔄 Checking for WiFi again in ${retryDelay}ms...`);
          await sleep(retryDelay);
          return getWifiDetails(showAlerts, retryCount + 1);
        }
        if (showAlerts) {
          showDialog("DANGER", "WiFi Required", "Please connect to the office WiFi network.");
        }
        return { ssid: "", bssid: "", localIP: "", publicIP: "", isValid: false };
      }
      const deviceIP = await Network.getIpAddressAsync();
      console.log("📱 Device IP Address:", deviceIP);
      if (!deviceIP) {
        console.log("❌ No IP address available");
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying IP fetch in ${retryDelay}ms...`);
          await sleep(retryDelay);
          return getWifiDetails(showAlerts, retryCount + 1);
        }
        if (showAlerts) {
          showDialog("DANGER", "WiFi Error", "Unable to retrieve WiFi details. Please check your connection.");
        }
        return { ssid: "", bssid: "", localIP: "", publicIP: "", isValid: false };
      }
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
      if (!ssid) {
        console.log("❌ No SSID available");
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying SSID fetch in ${retryDelay}ms...`);
          await sleep(retryDelay);
          return getWifiDetails(showAlerts, retryCount + 1);
        }
        if (showAlerts) {
          showDialog("DANGER", "WiFi Error", "Unable to detect WiFi network name. Please ensure you're connected to WiFi.");
        }
        return { ssid: "", bssid: "", localIP: "", publicIP: "", isValid: false };
      }
      const result = { ssid, bssid, localIP: deviceIP, publicIP: "", isValid: true };
      console.log("✅ Final WiFi Details:", result);
      return result;
    } catch (error) {
      console.error("❌ WiFi detection error:", error);
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying WiFi detection in ${retryDelay}ms...`);
        await sleep(retryDelay);
        return getWifiDetails(showAlerts, retryCount + 1);
      }
      if (showAlerts) {
        showDialog("DANGER", "WiFi Error", "Failed to detect WiFi. Please check your connection and try again.");
      }
      return { ssid: "", bssid: "", localIP: "", publicIP: "", isValid: false };
    }
  };

  const checkAndRequestCameraPermission = async (): Promise<boolean> => {
    try {
      console.log("🎥 Checking camera permission status...");
      const { status: currentStatus } = await Camera.getCameraPermissionsAsync();
      console.log("📋 Current permission status:", currentStatus);
      if (currentStatus === "granted") {
        console.log("✅ Camera permission already granted");
        setCameraPermission("granted");
        return true;
      }
      if (currentStatus === "denied") {
        console.log("❌ Camera permission denied - requesting again...");
        const { status: retryStatus } = await Camera.requestCameraPermissionsAsync();
        console.log("🔄 Retry permission result:", retryStatus);
        setCameraPermission(retryStatus);
        if (retryStatus === "granted") {
          console.log("🎉 Camera permission granted after retry!");
          return true;
        } else {
          console.log("⚠️ Permission still denied, opening app settings...");
          if (AppState.currentState === "active") {
            Linking.openSettings();
          }
          return false;
        }
      }
      console.log("📱 Requesting camera permission for the first time...");
      const { status: newStatus } = await Camera.requestCameraPermissionsAsync();
      console.log("📸 First request result:", newStatus);
      setCameraPermission(newStatus);
      if (newStatus === "granted") {
        return true;
      }
      if (AppState.currentState === "active") {
        Linking.openSettings();
      }
      return false;
    } catch (error) {
      console.error("❌ Camera permission error:", error);
      Alert.alert(
        "Camera Permission Error",
        "Unable to request camera permission. Please check app settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
  };

  const fetchAttendanceLogs = async (): Promise<void> => {
    try {
      if (!isAuthenticated || !accessToken || !orgId || !userId) {
        return;
      }
      console.log("📊 Fetching attendance logs for orgId:", orgId, "userId:", userId);
      const response = await todayLogs(orgId, userId);
      if (response.data && response.data.logs) {
        setAttendanceLogs(response.data.logs);
        setPunchInTime(response.data.punchInTime);
        setLastPunch(response.data.lastPunch);
        const today = new Date().toISOString().split("T")[0];
        const hasCheckInToday =
          response.data.punchInTime &&
          new Date(response.data.punchInTime).toISOString().split("T")[0] === today;
        const hasCheckOutToday = response.data.logs.some(
          (log: any) =>
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
      console.log("❌ Failed to fetch attendance logs:", error);
    }
  };

  const checkWifi = async (showAlerts: boolean = false): Promise<boolean> => {
    if (!validationRules.enableWifiValidation) {
      setWifiInfo({ ssid: "", bssid: "", localIP: "", publicIP: "", isValid: true });
      setCachedWifi(null);
      setIsWifiValid(true);
      setIsLoadingWifi(false);
      return true;
    }
    setIsLoadingWifi(true);
    try {
      const cachedWifiData = await AsyncStorage.getItem('cachedWifi');
      if (cachedWifiData) {
        const parsedWifi = JSON.parse(cachedWifiData);
        if (parsedWifi.isValid) {
          setWifiInfo(parsedWifi);
          setIsWifiValid(true);
          setCachedWifi(parsedWifi);
          return true;
        }
      }
      const wifiDetails = await getWifiDetails(showAlerts);
      console.log("WiFi Check - Connected to:", wifiDetails.ssid);
      setWifiInfo(wifiDetails);
      setIsWifiValid(wifiDetails.isValid);
      setCachedWifi(wifiDetails);
      if (wifiDetails.isValid) {
        await AsyncStorage.setItem('cachedWifi', JSON.stringify(wifiDetails));
      }
      return wifiDetails.isValid;
    } catch (error) {
      console.error("Wi-Fi check error:", error);
      setWifiInfo({ ssid: "", bssid: "", localIP: "", publicIP: "", isValid: false });
      setIsWifiValid(false);
      setCachedWifi(null);
      return false;
    } finally {
      setIsLoadingWifi(false);
    }
  };

  const checkLocation = async (retryCount: number = 0): Promise<boolean> => {
    if (!validationRules.enableGPSValidation) {
      setCachedLocation(null);
      setIsLocationValid(true);
      setIsLoadingLocation(false);
      return true;
    }
    const maxRetries = 1;
    const retryDelay = 1000;
    setIsLoadingLocation(true);
    try {
      console.log(`📍 Checking location permissions... (Attempt ${retryCount + 1}/${maxRetries + 1})`);
      const cachedLocationData = await AsyncStorage.getItem('cachedLocation');
      if (cachedLocationData) {
        const parsedLocation = JSON.parse(cachedLocationData);
        setCachedLocation(parsedLocation);
        setIsLocationValid(true);
        return true;
      }
      let permissionResult;
      try {
        permissionResult = await Location.requestForegroundPermissionsAsync();
      } catch (permError) {
        console.error("Permission request error:", permError);
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying permission request in ${retryDelay}ms...`);
          await sleep(retryDelay);
          return checkLocation(retryCount + 1);
        }
        throw permError;
      }
      if (permissionResult.status !== "granted") {
        setIsLocationValid(false);
        console.log("❌ Location permission not granted");
        Alert.alert(
          "Location Permission Required",
          "Location permission is needed to mark attendance. Please enable location access in app settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }
      console.log("✅ Location permission granted");
      console.log("📍 Fetching current location...");
      let location = null;
      let attempt = 1;
      const maxLocationRetries = 3;
      while (attempt <= maxLocationRetries && !location) {
        try {
          console.log(`📍 Location fetch attempt ${attempt}/${maxLocationRetries}`);
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeout: 8000,
            maximumAge: 5000,
          });
          console.log("📍 Location fetched successfully on attempt", attempt);
        } catch (error) {
          console.warn(`⚠️ Location fetch attempt ${attempt} failed:`, error);
          attempt++;
          if (attempt > maxLocationRetries) {
            if (retryCount < maxRetries) {
              console.log(`🔄 Retrying entire location check in ${retryDelay}ms...`);
              await sleep(retryDelay);
              return checkLocation(retryCount + 1);
            }
            throw new Error("Failed to fetch location after all retries");
          }
          await sleep(1500);
        }
      }
      if (!location) {
        throw new Error("Unable to fetch location after maximum retries");
      }
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCachedLocation(locationData);
      setIsLocationValid(true);
      await AsyncStorage.setItem('cachedLocation', JSON.stringify(locationData));
      console.log("✅ Location check successful:", locationData);
      return true;
    } catch (error) {
      console.error("❌ Location check error:", error);
      setIsLocationValid(false);
      setCachedLocation(null);
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying location check in ${retryDelay}ms...`);
        await sleep(retryDelay);
        return checkLocation(retryCount + 1);
      }
      Alert.alert(
        "Location Error",
        "Unable to fetch location. Please ensure location services are enabled and try again.",
        [{ text: "OK", style: "cancel" }]
      );
      return false;
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleRetryWifi = async (): Promise<void> => {
    if (!validationRules.enableWifiValidation) {
      setWifiInfo({ ssid: "", bssid: "", localIP: "", publicIP: "", isValid: true });
      setCachedWifi(null);
      setIsWifiValid(true);
      setIsLoadingWifi(false);
      return;
    }
    setIsLoadingWifi(true);
    try {
      setCachedWifi(null);
      setWifiInfo({ ssid: "", bssid: "", localIP: "", publicIP: "", isValid: false });
      const wifiData = await getWifiDetails(true);
      setWifiInfo(wifiData);
      setIsWifiValid(wifiData.isValid);
      setCachedWifi(wifiData);
      if (wifiData.isValid) {
        await AsyncStorage.setItem('cachedWifi', JSON.stringify(wifiData));
      }
      console.log("🔄 WiFi retry completed:", wifiData.isValid ? "Connected" : "Not Connected");
    } catch (error) {
      console.error("WiFi retry error:", error);
      setWifiInfo({ ssid: "", bssid: "", localIP: "", publicIP: "", isValid: false });
      setIsWifiValid(false);
      setCachedWifi(null);
    } finally {
      setIsLoadingWifi(false);
    }
  };

  const handleRetryLocation = async (): Promise<void> => {
    if (!validationRules.enableGPSValidation) {
      setCachedLocation(null);
      setIsLocationValid(true);
      setIsLoadingLocation(false);
      return;
    }
    setIsLoadingLocation(true);
    try {
      setCachedLocation(null);
      const isLocationSuccess = await checkLocation();
      setIsLocationValid(isLocationSuccess);
      if (isLocationSuccess && cachedLocation) {
        await AsyncStorage.setItem('cachedLocation', JSON.stringify(cachedLocation));
      }
      console.log("🔄 Location retry completed:", isLocationSuccess ? "Available" : "Not Available");
    } catch (error) {
      console.error("Location retry error:", error);
      setIsLocationValid(false);
      setCachedLocation(null);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      if (!validationRulesLoaded) {
        showDialog("INFO", "Please Wait", "Loading attendance settings. Try again in a moment.");
        return;
      }
      // Reset states to ensure fresh data
      setIsLoadingWifi(true);
      setIsLoadingLocation(true);
      setCachedWifi(null);
      setCachedLocation(null);
      setTime(new Date()); // Update current time immediately
      setShowMessageModal(true); // Show MessageModal on refresh

      // Clear cached AsyncStorage to force fresh checks
      await AsyncStorage.removeItem('cachedWifi');
      await AsyncStorage.removeItem('cachedLocation');

      // Fetch all data in parallel
      const [wifiResult, locationResult, attendanceResult] = await Promise.allSettled([
        validationRules.enableWifiValidation ? checkWifi(true) : Promise.resolve(true),
        validationRules.enableGPSValidation ? checkLocation() : Promise.resolve(true),
        fetchAttendanceLogs(),
      ]);

      // Handle WiFi result
      if (validationRules.enableWifiValidation) {
        if (wifiResult.status === 'fulfilled' && wifiResult.value) {
          setIsWifiValid(true);
          setWifiInfo(wifiResult.value);
          await AsyncStorage.setItem('cachedWifi', JSON.stringify(wifiResult.value));
        } else {
          setIsWifiValid(false);
          setWifiInfo({ ssid: "", bssid: "", localIP: "", publicIP: "", isValid: false });
          showDialog("WARNING", "WiFi Check Failed", "Could not verify WiFi connection. Please try again.");
        }
      } else {
        setIsWifiValid(true);
      }

      // Handle location result
      if (validationRules.enableGPSValidation) {
        if (locationResult.status === 'fulfilled' && locationResult.value) {
          setIsLocationValid(true);
          if (cachedLocation) {
            await AsyncStorage.setItem('cachedLocation', JSON.stringify(cachedLocation));
          }
        } else {
          setIsLocationValid(false);
          setCachedLocation(null);
          showDialog("WARNING", "Location Check Failed", "Could not verify location. Please ensure location services are enabled.");
        }
      } else {
        setIsLocationValid(true);
      }

      // Handle attendance logs (no need to check status since fetchAttendanceLogs updates state internally)
      if (attendanceResult.status === 'rejected') {
        showDialog("WARNING", "Attendance Fetch Failed", "Could not fetch attendance logs. Please try again.");
      }

      // Update working hours (will trigger recalculation via useEffect)
      setTime(new Date()); // Ensure time is updated again for UI consistency
    } catch (error) {
      console.error("Comprehensive refresh error:", error);
      showDialog("DANGER", "Refresh Error", "Failed to refresh some data. Please try again.");
    } finally {
      setIsLoadingWifi(false);
      setIsLoadingLocation(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && (!hasFetchedLocation.current || !hasFetchedWifi.current)) {
        console.log("✅✅✅ App has come to the foreground!");
        if (orgId && userId) {
          try {
            if (!validationRulesLoaded) {
              return;
            }
            if (validationRules.enableGPSValidation && !hasFetchedLocation.current) {
              await checkLocation();
              hasFetchedLocation.current = true;
            }
            if (validationRules.enableWifiValidation && !hasFetchedWifi.current) {
              await checkWifi(false);
              hasFetchedWifi.current = true;
            }
          } catch (error) {
            console.error("Failed to fetch location or WiFi on app foreground:", error);
          }
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [orgId, userId, validationRules.enableGPSValidation, validationRules.enableWifiValidation]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      initializeAuth().catch((error) => {
        console.error("Failed to initialize auth in home tab:", error);
      });
    }
  }, [isAuthenticated, accessToken, initializeAuth]);

  useEffect(() => {
    if (orgId) {
      fetchOrgValidationRules();
    }
  }, [orgId]);

  useEffect(() => {
    const fetchInitialData = async (): Promise<void> => {
      console.log("🚀 Starting initial data fetch...");
      setIsLoadingWifi(true);
      setIsLoadingLocation(true);
      try {
        if (!validationRulesLoaded) {
          return;
        }
        const [wifiResult, locationResult] = await Promise.allSettled([
          validationRules.enableWifiValidation ? checkWifi(false) : Promise.resolve(true),
          validationRules.enableGPSValidation ? checkLocation() : Promise.resolve(true),
        ]);
        if (validationRules.enableWifiValidation) {
          if (wifiResult.status === "fulfilled") {
            console.log("✅ WiFi check completed:", wifiResult.value);
            hasFetchedWifi.current = true;
          } else {
            console.error("❌ WiFi check failed:", wifiResult.reason);
            setIsWifiValid(false);
            setCachedWifi(null);
          }
        } else {
          setIsWifiValid(true);
        }
        if (validationRules.enableGPSValidation) {
          if (locationResult.status === "fulfilled") {
            console.log("✅ Location check completed:", locationResult.value);
            hasFetchedLocation.current = true;
          } else {
            console.error("❌ Location check failed:", locationResult.reason);
            setIsLocationValid(false);
            setCachedLocation(null);
          }
        } else {
          setIsLocationValid(true);
        }
      } catch (error) {
        console.error("❌ Initial data fetch error:", error);
        if (initializationRetryCount < 2) {
          console.log(`🔄 Retrying initialization (attempt ${initializationRetryCount + 1})...`);
          setInitializationRetryCount((prev) => prev + 1);
          setTimeout(() => {
            fetchInitialData();
          }, 3000);
          return;
        }
        showDialog(
          "DANGER",
          "Initialization Error",
          "Failed to load initial data. Please check your network connection and try refreshing."
        );
      } finally {
        setIsLoadingWifi(false);
        setIsLoadingLocation(false);
      }
    };
    if (isAuthenticated && accessToken && orgId && userId) {
      fetchInitialData();
    }
  }, [
    isAuthenticated,
    accessToken,
    orgId,
    userId,
    initializationRetryCount,
    validationRules.enableGPSValidation,
    validationRules.enableWifiValidation,
    validationRulesLoaded,
  ]);

  useEffect(() => {
    if (isAuthenticated && accessToken && orgId && userId) {
      fetchAttendanceLogs().catch((error) => {
        console.log("Initial attendance fetch failed:", error);
      });
      const interval = setInterval(() => {
        fetchAttendanceLogs().catch((error) => {
          console.log("Periodic attendance refresh failed:", error);
        });
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [orgId, userId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!punchInTime) {
      setWorkingHours("0:00:00 hours");
      return;
    }
    const interval = setInterval(() => {
      const checkInTime = new Date(punchInTime);
      const hasCheckOutToday = attendanceLogs.some(
        (log: any) =>
          log.type === "check-out" &&
          new Date(log.timestamp).toISOString().split("T")[0] === new Date().toISOString().split("T")[0]
      );
      const endTime = hasCheckOutToday && lastPunch ? new Date(lastPunch) : new Date();
      const diffMs = endTime.getTime() - checkInTime.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      setWorkingHours(
        `${diffHours}:${diffMinutes.toString().padStart(2, "0")}:${diffSeconds.toString().padStart(2, "0")} hours`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [punchInTime, lastPunch, attendanceLogs]);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        tabBarStyle: {
          display: showCamera || previewImage ? "none" : "flex",
        },
      });
      const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
        if (showCamera || previewImage) {
          if (previewImage) {
            setPreviewImage(null);
            setShowCamera(true);
          } else {
            setShowCamera(false);
            setCheckoutMode(false);
          }
          return true;
        }
        return false;
      });

      return () => backHandler.remove();
    }, [showCamera, previewImage])
  );

  const getTimePeriod = (hour: number): string => {
    if (hour >= 5 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 17) return "Afternoon";
    if (hour >= 17 && hour < 20) return "Evening";
    return "Night";
  };

  const formattedTime = time
    .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
    .toUpperCase();
  const currentDate = time.toLocaleDateString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timePeriod = getTimePeriod(time.getHours());

  const handleCheckIn = async (): Promise<void> => {
    try {
      if (!validationRulesLoaded) {
        showDialog("INFO", "Please Wait", "Loading attendance settings. Try again in a moment.");
        return;
      }
      if (validationRules.enableWifiValidation) {
        const isWifiConnected = await checkWifi(true);
        if (!isWifiConnected) {
          return;
        }
      }
      const hasCameraPermission = await checkAndRequestCameraPermission();
      if (!hasCameraPermission) {
        console.log("❌ Camera permission denied, cannot proceed");
        return;
      }
      setCheckoutMode(false);
      setCameraFacing("front"); // Ensure front camera is used
      console.log("✅ Camera opened for check-in");
      setShowCamera(true);
    } catch (error) {
      console.error("❌ Error in handleCheckIn:", error);
      showDialog("DANGER", "Error", "Failed to open camera. Please try again.");
    }
  };

  const handleCheckOut = async (): Promise<void> => {
    try {
      if (!validationRulesLoaded) {
        showDialog("INFO", "Please Wait", "Loading attendance settings. Try again in a moment.");
        return;
      }
      if (validationRules.enableWifiValidation) {
        const isWifiConnected = await checkWifi(true);
        if (!isWifiConnected) {
          return;
        }
      }
      const hasCameraPermission = await checkAndRequestCameraPermission();
      if (!hasCameraPermission) {
        console.log("❌ Camera permission denied, cannot proceed");
        return;
      }
      setCheckoutMode(true);
      setCameraFacing("front"); // Ensure front camera is used
      console.log("✅ Camera opened for check-out");
      setShowCamera(true);
    } catch (error) {
      console.error("❌ Error in handleCheckOut:", error);
      showDialog("DANGER", "Error", "Failed to open camera. Please try again.");
    }
  };

  const toggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === "front" ? "back" : "front"));
  };

  const takePicture = async (): Promise<void> => {
    if (cameraRef.current) {
      try {
        setIsSubmitting(true);
        console.log("=== Starting takePicture process ===");
        const startPicture = Date.now();
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.3,
          skipProcessing: true,
        });
        const resizedPhoto = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        console.log("Photo resized:", {
          uri: resizedPhoto.uri,
          width: resizedPhoto.width,
          height: resizedPhoto.height,
        });
        console.log(`takePicture took ${Date.now() - startPicture}ms`);
        setPreviewImage(resizedPhoto.uri);
        setShowCamera(false);
        setIsSubmitting(false);
      } catch (error) {
        console.error("=== takePicture process failed ===");
        console.error("Error message:", (error as Error).message);
        showDialog(
          "DANGER",
          "Error",
          "Failed to capture photo. Please try again.",
          () => {
            setIsSubmitting(false);
            setShowCamera(true);
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

  const handleSubmitImage = async (): Promise<void> => {
    if (!previewImage) {
      showDialog("DANGER", "Error", "No image to submit", () => {
        setIsSubmitting(false);
        setPreviewImage(null);
      });
      return;
    }
    const now = Date.now();
    if (now - lastSubmission < 5000) {
      showDialog("INFO", "Please Wait", "Submission in progress. Please wait a moment.");
      return;
    }
    setLastSubmission(now);
    setIsSubmitting(true);
    console.log("=== Starting submit image process ===");
    const startTotal = Date.now();
    try {
      const startChecks = Date.now();
      console.log("Step 1: Validating WiFi and location...");
      const shouldValidateWifi = validationRules.enableWifiValidation;
      const shouldValidateGPS = validationRules.enableGPSValidation;
      let wifiDetails = cachedWifi;
      let latitude: number | undefined = cachedLocation?.latitude;
      let longitude: number | undefined = cachedLocation?.longitude;
      let locationAddress: string | undefined;
      const [wifiResult, locationResult, timeResult] = await Promise.all([
        shouldValidateWifi
          ? wifiDetails && wifiDetails.isValid
            ? Promise.resolve(wifiDetails)
            : getWifiDetails(true)
          : Promise.resolve({ ssid: "", bssid: "", localIP: "", publicIP: "", isValid: true }),
        shouldValidateGPS
          ? cachedLocation
            ? Promise.resolve(cachedLocation)
            : (async () => {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== "granted") return null;
                const location = await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.Balanced,
                  timeout: 8000,
                });
                return { latitude: location.coords.latitude, longitude: location.coords.longitude };
              })()
          : Promise.resolve(null),
        getCurrentTime(),
      ]);
      wifiDetails = wifiResult;
      setCachedWifi(wifiDetails);
      if (shouldValidateWifi && !wifiDetails.isValid) {
        console.error("WiFi validation failed");
        showDialog("DANGER", "WiFi Required", "Please connect to the office WiFi network.", () => {
          setIsSubmitting(false);
          setPreviewImage(null);
        });
        return;
      }
      if (shouldValidateGPS && !locationResult) {
        console.error("Location validation failed");
        showDialog("DANGER", "Location Required", "Location permission is required.", () => {
          setIsSubmitting(false);
          setPreviewImage(null);
        });
        return;
      }
      if (shouldValidateGPS && locationResult) {
        latitude = locationResult.latitude;
        longitude = locationResult.longitude;
        setCachedLocation({ latitude, longitude });
      }
      console.log(`WiFi and location checks took ${Date.now() - startChecks}ms`);
      if (shouldValidateGPS && latitude != null && longitude != null) {
        const startGeocode = Date.now();
        console.log("Step 2: Reverse geocoding...");
        try {
          const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (reverseGeocode.length > 0) {
            const address = reverseGeocode[0];
            locationAddress = `${address.street || ""} ${address.city || ""} ${address.region || ""}`.trim();
          }
        } catch (geocodeError) {
          console.log("Reverse geocoding failed, using coordinates:", geocodeError);
          locationAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        }
        console.log(`Reverse geocoding took ${Date.now() - startGeocode}ms`);
      }
      const startValidation = Date.now();
      console.log("Step 3: Preparing data for API...");
      const deviceInfo = `${Platform.OS} ${Platform.Version}`;
      const isoTime = timeResult.data.isoTime || new Date().toISOString();
      const dataToSend = {
        organizationId: orgId,
        userId: userId,
        source: "mobile",
        timestamp: isoTime,
        latitude,
        longitude,
        locationAddress,
        wifiSsid: shouldValidateWifi ? wifiDetails.ssid : undefined,
        wifiBssid: shouldValidateWifi ? wifiDetails.bssid : undefined,
        deviceInfo,
        enableFaceValidation: true,
        enableWifiValidation: validationRules.enableWifiValidation,
        enableGPSValidation: validationRules.enableGPSValidation,
        imageUri: previewImage,
        type: checkoutMode ? "check-out" : "check-in",
      };
      console.log("Validating data before API call...");
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
      console.log(`Validation took ${Date.now() - startValidation}ms`);
      const startNetworkCheck = Date.now();
      console.log("Step 4: Checking network connectivity...");
      const networkState = await Network.getNetworkStateAsync();
      console.log(`Network check took ${Date.now() - startNetworkCheck}ms`);
      if (!networkState.isConnected) {
        throw new Error("No network connection available");
      }
      const startApi = Date.now();
      console.log("Step 5: Making API call...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await logAttendance({ ...dataToSend, signal: controller.signal });
        clearTimeout(timeoutId);
        console.log(`API call took ${Date.now() - startApi}ms`);
        console.log("Step 6: Handling response...");
        const actionType = checkoutMode ? "Check-out" : "Check-in";
        if (response.data.status === "success") {
          Alert.alert("Success", `${actionType} successful! Your attendance has been recorded.`, [
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
          ]);
        } else if (response.data.status === "anomaly") {
          const reasons = response.data.reasons || [];
          const reasonText = reasons.length > 0 ? reasons.join(", ") : "Unknown reason";
          Alert.alert("Attendance Failed", `Attendance could not be recorded: ${reasonText}.`, [
            {
              text: "OK",
              onPress: () => {
                setIsSubmitting(false);
                setPreviewImage(null);
                setCheckoutMode(false);
                fetchAttendanceLogs();
              },
            },
          ]);
        } else {
          Alert.alert(
            "Attendance Failed",
            "Please ensure you are connected to the office Wi-Fi or within the office premises. Contact the administrator if the issue persists.",
            [
              {
                text: "OK",
                onPress: () => {
                  setIsSubmitting(false);
                  setPreviewImage(null);
                  setCheckoutMode(false);
                  fetchAttendanceLogs();
                },
              },
            ]
          );
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        throw error;
      }
      console.log(`Total submission time: ${Date.now() - startTotal}ms`);
    } catch (error: any) {
      console.error("=== submitImage process failed ===");
      console.error("Error message:", error.message);
      let errorMessage = "Failed to process attendance. Please try again.";
      if (error.message?.includes("Invalid organization ID format")) {
        errorMessage = "Invalid organization ID. Please contact your administrator.";
      } else if (error.message?.includes("Invalid user ID format")) {
        errorMessage = "Invalid user ID. Please contact your administrator.";
      } else if (error.message?.includes("Invalid source value")) {
        errorMessage = "Invalid source configuration. Please contact your administrator.";
      } else if (error.message?.includes("No network connection available")) {
        errorMessage = "No network connection available. Please check your internet connection.";
      } else if (error.name === "AbortError") {
        errorMessage = "Request timeout. Please try again with a better connection.";
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
            errorMessage = "Access denied. Please contact administrator.";
            break;
          case 413:
            errorMessage = "Image size too large. Please try again.";
            break;
          case 500:
            errorMessage = "Server error. Please try again later.";
            break;
          default:
            errorMessage = data?.message || `Server error (${status}). Please try again.`;
        }
      } else if (error.request) {
        console.error("Request made but no response received:", error.request);
        errorMessage = "No response from server. Please check your connection.";
      } else {
        errorMessage = "Failed to fetch current time. Please try again.";
      }
      showDialog("DANGER", "Error", errorMessage, () => {
        setIsSubmitting(false);
        setPreviewImage(null);
        setCheckoutMode(false);
      });
    } finally {
      console.log(`Total submission time (including error handling): ${Date.now() - startTotal}ms`);
      setIsSubmitting(false);
    }
  };

  const formatTime = (timestamp: string | null): string => {
    if (!timestamp) return "00:00 AM";
    const date = new Date(timestamp);
    return date
      .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
      .toUpperCase();
  };

  const formatDate = (timestamp: string | null): string => {
    if (!timestamp) {
      const today = new Date();
      return today.toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" });
    }
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" });
  };

  const handleRefreshWorkingHours = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await fetchAttendanceLogs();
      setTime(new Date());
    } catch (error) {
      console.error("Working hours refresh error:", error);
      showDialog("DANGER", "Error", "Failed to refresh working hours. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const hasCheckInToday = punchInTime && new Date(punchInTime).toISOString().split("T")[0] === today;
  const hasCheckOutToday = attendanceLogs.some(
    (log: any) =>
      log.type === "check-out" &&
      new Date(log.timestamp).toISOString().split("T")[0] === today
  );
  const showCheckInButton = !hasCheckInToday || hasCheckOutToday;
  const isCheckInDisabled =
    !validationRulesLoaded ||
    (validationRules.enableWifiValidation && !isWifiValid) ||
    (validationRules.enableGPSValidation && !isLocationValid);

  if (previewImage) {
    return (
      <View style={styles.previewContainer}>
        <Image
          source={{ uri: previewImage }}
          style={[styles.previewImage, cameraFacing === "front" && { transform: [{ scaleX: -1 }] }]}
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
                {checkoutMode ? "Processing check-out..." : "Processing check-in..."}
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
          facing={cameraFacing}
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
              style={[styles.captureButton, isSubmitting && styles.captureButtonDisabled]}
              onPress={takePicture}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={toggleCameraFacing}
              disabled={isSubmitting}
            >
              <Ionicons name="camera-reverse" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </CameraView>
        {isSubmitting && (
          <View style={styles.loaderOverlay}>
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.text }]}>
                {checkoutMode ? "Processing check-out..." : "Processing check-in..."}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MessageModal isVisible={showMessageModal} onClose={() => setShowMessageModal(false)} />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
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
          showWifiStatus={validationRulesLoaded && validationRules.enableWifiValidation}
          showLocationStatus={validationRulesLoaded && validationRules.enableGPSValidation}
          showCheckInButton={showCheckInButton}
          isCheckInDisabled={isCheckInDisabled}
          handleCheckIn={handleCheckIn}
          handleCheckOut={handleCheckOut}
          handleRetryWifi={handleRetryWifi}
          handleRetryLocation={handleRetryLocation}
          formatTime={formatTime}
        />
        <View style={styles.row}>
          <Text style={[styles.sectionDetails, { color: colors.text }]}>Today Attendance</Text>
          <TouchableOpacity onPress={() => route.push("/(tabs)/attendance")}>
            <Text style={[styles.viewall, { color: colors.primary }]}>View all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.attendanceCard}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconBox, { backgroundColor: "#E4F1FF" }]}>
              <Ionicons name="arrow-forward" size={20} color="#1e7ba8" />
            </View>
          </View>
          <View style={styles.infoContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Punch In</Text>
            <Text style={styles.subtitle}>{formatDate(punchInTime)}</Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={[styles.time, { color: colors.text }]}>{formatTime(punchInTime)}</Text>
            <Text style={styles.status}>{punchInTime ? "Completed" : "Not done"}</Text>
          </View>
        </View>
        <View style={styles.attendanceCard}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconBox, { backgroundColor: "#ffe4e4ff" }]}>
              <Ionicons name="arrow-back" size={20} color="#a81e1eff" />
            </View>
          </View>
          <View style={styles.infoContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Last Punch</Text>
            <Text style={styles.subtitle}>{formatDate(lastPunch)}</Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={[styles.time, { color: colors.text }]}>{formatTime(lastPunch)}</Text>
            <Text style={styles.status}>{lastPunch ? "Completed" : "Not done"}</Text>
          </View>
        </View>
        <View style={styles.attendanceCard}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconBox, { backgroundColor: "#C2FFC7" }]}>
              <MaterialIcons name="laptop" size={20} color="#399918" />
            </View>
          </View>
          <View style={styles.infoContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Working Hours</Text>
            <Text style={styles.subtitle}>{punchInTime ? formatDate(punchInTime) : formatDate(null)}</Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={[styles.time, { color: colors.text }]}>{workingHours}</Text>
            <TouchableOpacity onPress={handleRefreshWorkingHours} disabled={refreshing}>
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

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },
  cameraContainer: { flex: 1, position: "relative", zIndex: 9999 },
  camera: { flex: 1 },
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
  placeholderButton: { width: horizontalScale(80), height: verticalScale(50) },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: horizontalScale(20),
    marginTop: verticalScale(10),
  },
  sectionDetails: { fontSize: moderateScale(17), fontWeight: "800" },
  viewall: { fontSize: moderateScale(14), fontWeight: "600" },
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
  iconContainer: { marginRight: horizontalScale(12) },
  iconBox: {
    width: horizontalScale(40),
    height: horizontalScale(40),
    borderRadius: horizontalScale(20),
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: { flex: 1 },
  title: { fontSize: moderateScale(16), fontWeight: "600", color: "#1e7ba8" },
  subtitle: { fontSize: moderateScale(12), color: "#999" },
  timeContainer: { alignItems: "flex-end" },
  time: { fontSize: moderateScale(16), fontWeight: "600", color: "#1e7ba8" },
  status: { fontSize: moderateScale(10), color: "#999", marginTop: verticalScale(2) },
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
  previewContainer: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  previewImage: { width: "100%", height: "70%", borderRadius: moderateScale(10) },
  previewButtons: { width: "90%", marginTop: verticalScale(20), gap: verticalScale(16) },
  previewButton: {
    width: "100%",
    paddingVertical: verticalScale(16),
    paddingHorizontal: moderateScale(20),
    borderRadius: moderateScale(16),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
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
  submitButton: { backgroundColor: "#4CAF50", borderWidth: 0, shadowColor: "#2E7D32" },
  retakeButton: { backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#FF6B6B", shadowColor: "#FF6B6B" },
  buttonText: { fontSize: moderateScale(16), fontWeight: "700", letterSpacing: 0.5 },
  submitText: { color: "#FFFFFF" },
  retakeText: { color: "#FF6B6B" },
});

export default Index;
