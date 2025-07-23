import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "app/components/Header";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import { logout as apiLogout, getEmployeeProfile } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import { darkTheme, lightTheme } from "../constants/colors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Storage keys
const STORAGE_KEYS = {
  PROFILE_DATA: "profile_data",
  PROFILE_TIMESTAMP: "profile_timestamp",
};

// Cache duration (24 hours in milliseconds)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

const ProfilePage = () => {
  const systemColorScheme = useColorScheme() ?? "light";
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === "dark");
  const colors = isDarkMode ? darkTheme : lightTheme;

  const [profileData, setProfileData] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [headerOpacity] = useState(new Animated.Value(0));

  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  useEffect(() => {
    initializeProfile();
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Load cached profile data first, then fetch if needed
  const initializeProfile = async () => {
    try {
      // Load cached data first
      const cachedData = await loadCachedProfile();
      if (cachedData) {
        setProfileData(cachedData);
        setIsLoadingProfile(false);
        
        // Check if cache is still valid
        const isValidCache = await isCacheValid();
        if (isValidCache) {
          console.log("Using cached profile data");
          return; // Use cached data and don't fetch
        }
      }
      
      // If no cache or cache expired, fetch from API
      await fetchProfileData();
    } catch (error) {
      console.error("Error initializing profile:", error);
      await fetchProfileData(); // Fallback to API fetch
    }
  };

  // Load profile data from AsyncStorage
  const loadCachedProfile = async () => {
    try {
      const cachedProfile = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_DATA);
      if (cachedProfile) {
        return JSON.parse(cachedProfile);
      }
      return null;
    } catch (error) {
      console.error("Error loading cached profile:", error);
      return null;
    }
  };

  // Check if cached data is still valid
  const isCacheValid = async () => {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_TIMESTAMP);
      if (!timestamp) return false;
      
      const cacheTime = parseInt(timestamp);
      const currentTime = Date.now();
      
      return (currentTime - cacheTime) < CACHE_DURATION;
    } catch (error) {
      console.error("Error checking cache validity:", error);
      return false;
    }
  };

  // Save profile data to AsyncStorage
  const saveProfileToCache = async (data) => {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.PROFILE_DATA, JSON.stringify(data)],
        [STORAGE_KEYS.PROFILE_TIMESTAMP, Date.now().toString()],
      ]);
      console.log("Profile data cached successfully");
    } catch (error) {
      console.error("Error saving profile to cache:", error);
    }
  };

  // Clear cached profile data
  const clearProfileCache = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PROFILE_DATA,
        STORAGE_KEYS.PROFILE_TIMESTAMP,
      ]);
      console.log("Profile cache cleared");
    } catch (error) {
      console.error("Error clearing profile cache:", error);
    }
  };

  const fetchProfileData = async (isRefresh = false) => {
    console.log("User data from store:", user);
    if (!user?.userId) {
      console.log("No user ID available, skipping profile fetch");
      setIsLoadingProfile(false);
      Alert.alert("Error", "User ID not found. Please log in again.");
      router.replace("/(auth)/Login");
      return;
    }

    try {
      if (!isRefresh) setIsLoadingProfile(true);

      console.log("Fetching profile for userId:", user.userId);
      const response = await getEmployeeProfile(user.userId);

      if (!response?.data) {
        throw new Error("No data returned from API");
      }

      console.log("Profile data received:", response.data);
      setProfileData(response.data);
      
      // Save to cache
      await saveProfileToCache(response.data);
      
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", `Failed to fetch profile data: ${error.message}`);

      // Use fallback data from the user store if available
      if (user) {
        const fallbackData = {
          id: user.userId,
          userId: user.userId,
          organizationId: user.organizationId,
          firstName: user.firstName,
          middleName: user.middleName,
          lastName: user.lastName,
          gender: user.gender,
          dateOfBirth: user.dob,
          personalEmail: user.email,
          workEmail: user.email,
          user: {
            userName: user.userName,
            email: user.email,
            mobileNumber: user.mobileNumber,
          },
          status: "active",
        };
        setProfileData(fallbackData);
        
        // Save fallback data to cache
        await saveProfileToCache(fallbackData);
      }
    } finally {
      setIsLoadingProfile(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Clear cache on manual refresh to force fresh data
    await clearProfileCache();
    await fetchProfileData(true);
  };

  const handleChangePassword = () => {
    console.log("Change password pressed");
    // Add navigation to change password screen
    // router.push("/(profile)/change-password");
  };

  const handleEditProfile = () => {
    console.log("Edit profile pressed");
    // Add navigation to edit profile screen
    // router.push("/(profile)/edit-profile");
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoggingOut(true);

            // Clear AsyncStorage including profile cache
            await AsyncStorage.multiRemove([
              "token",
              "user",
              "userToken",
              "refreshToken",
              "sessionId",
              "authData",
              "userSession",
              "loginCredentials",
              STORAGE_KEYS.PROFILE_DATA,
              STORAGE_KEYS.PROFILE_TIMESTAMP,
            ]);

            // Call API logout if needed (optional)
            try {
              if (user?.userName && user?.email) {
                await apiLogout();
              }
            } catch (logoutError) {
              console.log(
                "API logout failed, but continuing with local logout:",
                logoutError
              );
            }

            // Clear auth store
            await clearAuth();
            setProfileData(null);

            // Navigate to login
            router.replace("/(auth)/Login");
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert(
              "Error",
              "Failed to logout completely. Please try again."
            );
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  // Force refresh profile data (can be called from other parts of the app)
  const forceRefreshProfile = async () => {
    await clearProfileCache();
    await fetchProfileData();
  };

  // Get display data with proper fallbacks
  const getDisplayData = () => {
    if (profileData) return profileData;
    if (user) return user;
    return {};
  };

  const displayData = getDisplayData();

  const getFullName = () => {
    if (!displayData) return "Unknown User";

    const firstName = displayData.firstName || "";
    const middleName = displayData.middleName || "";
    const lastName = displayData.lastName || "";

    return `${firstName} ${middleName} ${lastName}`.trim() || "Unknown User";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-GB");
    } catch (error) {
      return "N/A";
    }
  };

  const getStatusColor = (status) => {
    if (!status) return "#FF9800";
    return status.toLowerCase() === "active" ? "#4CAF50" : "#FF9800";
  };

  const formatEmploymentType = (type) => {
    if (!type) return "N/A";
    return type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ");
  };

  const formatGender = (gender) => {
    if (!gender) return "N/A";
    return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
  };

  const ProfileCard = () => (
    <View style={[styles.profileCard, { backgroundColor: colors.white }]}>
      {/* Background decorative elements */}
      <View style={styles.backgroundDecorations}>
        {/* Large background circle */}
        <View style={[
          styles.backgroundCircle,
          styles.backgroundCircleLarge,
          { backgroundColor: colors.primary + '08' }
        ]} />
        
        {/* Medium background circles */}
        <View style={[
          styles.backgroundCircle,
          styles.backgroundCircleMedium1,
          { backgroundColor: colors.primary + '05' }
        ]} />
        <View style={[
          styles.backgroundCircle,
          styles.backgroundCircleMedium2,
          { backgroundColor: colors.primary + '08' }
        ]} />
        
        {/* Small accent circles */}
        <View style={[
          styles.backgroundCircle,
          styles.backgroundCircleSmall1,
          { backgroundColor: colors.primary + '12' }
        ]} />
        <View style={[
          styles.backgroundCircle,
          styles.backgroundCircleSmall2,
          { backgroundColor: colors.primary + '10' }
        ]} />
        
        {/* Geometric shapes */}
        <View style={[
          styles.geometricShape,
          styles.triangleShape,
          { borderBottomColor: colors.primary + '06' }
        ]} />
        <View style={[
          styles.geometricShape,
          styles.squareShape,
          { backgroundColor: colors.primary + '05' }
        ]} />
      </View>

      {/* Gradient overlay for depth */}
      <View style={styles.gradientOverlay}>
        <View style={[
          styles.gradientTop,
          { backgroundColor: colors.primary + '03' }
        ]} />
        <View style={[
          styles.gradientBottom,
          { backgroundColor: colors.background + '02' }
        ]} />
      </View>

      {/* Main content */}
      <View style={styles.profileImageSection}>
        <View style={styles.profileImageContainer}>
          {/* Decorative ring around profile image */}
          <View style={[
            styles.profileImageRing,
            { borderColor: colors.primary + '20' }
          ]} />
          
          <Image
            source={{
              uri:
                displayData?.photoUrl ||
                "https://cdn-icons-png.flaticon.com/512/9187/9187532.png",
            }}
            style={[
              styles.profileImage,
              { borderColor: colors.primary }
            ]}
            onError={(error) => {
              console.log("Image load error:", error);
            }}
          />
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {getFullName()}
          </Text>
          <Text style={[styles.profileRole, { color: colors.grey }]}>
            {displayData?.designation?.name ||
              displayData?.employeeCode ||
              "Employee"}
          </Text>
          <View
            style={[
              styles.profileBadge,
              { 
                backgroundColor: getStatusColor(displayData?.status),
                shadowColor: getStatusColor(displayData?.status),
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 2,
              }
            ]}
          >
            <Text style={styles.badgeText}>
              {displayData?.status
                ? displayData.status.charAt(0).toUpperCase() +
                  displayData.status.slice(1)
                : "Unknown"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const InfoSection = ({ title, children }) => (
    <View style={[styles.infoSection, { backgroundColor: colors.white }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );

  const InfoItem = ({ icon, label, value, onPress, showChevron = false }) => (
    <TouchableOpacity
      style={[styles.infoItem, { backgroundColor: colors.background }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors.primary + "15" },
        ]}
      >
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.grey }]}>{label}</Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          {value || "N/A"}
        </Text>
      </View>
      {showChevron && (
        <Ionicons
          name="chevron-forward-outline"
          size={16}
          color={colors.grey}
        />
      )}
    </TouchableOpacity>
  );

  const ActionButton = ({
    icon,
    title,
    onPress,
    color = colors.primary,
    disabled = false,
  }) => (
    <TouchableOpacity
      style={[
        styles.actionButton,
        { backgroundColor: color },
        disabled && { opacity: 0.6 },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      {disabled ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Ionicons name={icon} size={20} color="#fff" />
      )}
      <Text style={styles.actionButtonText}>{title}</Text>
    </TouchableOpacity>
  );

  if (isLoadingProfile) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading profile...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Profile" />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <ProfileCard />

        {/* Employment Information */}
        <InfoSection title="Employment Information">
          <InfoItem
            icon="id-card-outline"
            label="Employee Code"
            value={displayData?.employeeCode}
          />
          <InfoItem
            icon="business-outline"
            label="Department"
            value={displayData?.department?.name}
          />
          <InfoItem
            icon="briefcase-outline"
            label="Designation"
            value={displayData?.designation?.name}
          />
          <InfoItem
            icon="calendar-outline"
            label="Date of Joining"
            value={formatDate(displayData?.dateOfJoining)}
          />
          <InfoItem
            icon="time-outline"
            label="Employment Type"
            value={formatEmploymentType(displayData?.employmentType)}
          />
        </InfoSection>

        {/* Personal Information */}
        <InfoSection title="Personal Information">
          <InfoItem
            icon="mail-outline"
            label="Personal Email"
            value={displayData?.personalEmail}
          />
          <InfoItem
            icon="mail-outline"
            label="Work Email"
            value={displayData?.workEmail || displayData?.user?.email}
          />
          <InfoItem
            icon="call-outline"
            label="Contact Number"
            value={
              displayData?.contactNumber || displayData?.user?.mobileNumber
            }
          />
          <InfoItem
            icon="calendar-outline"
            label="Date of Birth"
            value={formatDate(displayData?.dateOfBirth)}
          />
          <InfoItem
            icon="person-outline"
            label="Gender"
            value={formatGender(displayData?.gender)}
          />
          <InfoItem
            icon="water-outline"
            label="Blood Group"
            value={displayData?.bloodGroup}
          />
        </InfoSection>

        {/* Emergency Contact */}
        {(displayData?.emergencyContactName ||
          displayData?.emergencyContactPhone) && (
          <InfoSection title="Emergency Contact">
            <InfoItem
              icon="person-outline"
              label="Contact Name"
              value={displayData?.emergencyContactName}
            />
            <InfoItem
              icon="heart-outline"
              label="Relationship"
              value={displayData?.emergencyContactRelationship}
            />
            <InfoItem
              icon="call-outline"
              label="Contact Phone"
              value={displayData?.emergencyContactPhone}
            />
          </InfoSection>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <ActionButton
            icon="log-out-outline"
            title={isLoggingOut ? "Logging out..." : "Logout"}
            onPress={handleLogout}
            color="#ff4444"
            disabled={isLoggingOut}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: verticalScale(10),
    fontSize: moderateScale(16),
    fontWeight: "500",
  },
  scrollContainer: {
    flex: 1,
    marginTop: verticalScale(-90),
  },
  scrollContent: {
    paddingHorizontal: horizontalScale(20),
    paddingBottom: verticalScale(20),
  },
  
  // Enhanced ProfileCard styles
  profileCard: {
    borderRadius: moderateScale(20),
    padding: moderateScale(20),
    marginBottom: verticalScale(20),
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  
  // Background decorations
  backgroundDecorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  
  backgroundCircle: {
    position: 'absolute',
    borderRadius: 1000,
  },
  
  backgroundCircleLarge: {
    width: horizontalScale(200),
    height: horizontalScale(200),
    top: verticalScale(-80),
    right: horizontalScale(-60),
  },
  
  backgroundCircleMedium1: {
    width: horizontalScale(120),
    height: horizontalScale(120),
    top: verticalScale(-20),
    left: horizontalScale(-40),
  },
  
  backgroundCircleMedium2: {
    width: horizontalScale(100),
    height: horizontalScale(100),
    bottom: verticalScale(-30),
    right: horizontalScale(-20),
  },
  
  backgroundCircleSmall1: {
    width: horizontalScale(60),
    height: horizontalScale(60),
    top: verticalScale(40),
    right: horizontalScale(20),
  },
  
  backgroundCircleSmall2: {
    width: horizontalScale(40),
    height: horizontalScale(40),
    bottom: verticalScale(60),
    left: horizontalScale(30),
  },
  
  // Geometric shapes
  geometricShape: {
    position: 'absolute',
  },
  
  triangleShape: {
    width: 0,
    height: 0,
    top: verticalScale(20),
    left: horizontalScale(20),
    borderLeftWidth: horizontalScale(15),
    borderRightWidth: horizontalScale(15),
    borderBottomWidth: verticalScale(25),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '15deg' }],
  },
  
  squareShape: {
    width: horizontalScale(20),
    height: horizontalScale(20),
    bottom: verticalScale(40),
    right: horizontalScale(40),
    transform: [{ rotate: '45deg' }],
  },
  
  // Gradient overlay
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
  },
  
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderBottomLeftRadius: moderateScale(20),
    borderBottomRightRadius: moderateScale(20),
  },
  
  // Enhanced profile elements
  profileImageSection: {
    alignItems: "center",
    marginBottom: verticalScale(20),
    zIndex: 3,
    position: 'relative',
  },
  
  profileImageContainer: {
    position: "relative",
    marginBottom: verticalScale(16),
  },
  
  profileImageRing: {
    position: 'absolute',
    width: horizontalScale(100),
    height: horizontalScale(100),
    borderRadius: horizontalScale(50),
    borderWidth: 2,
    top: verticalScale(-10),
    left: horizontalScale(-10),
    zIndex: 1,
  },
  
  profileImage: {
    width: horizontalScale(80),
    height: horizontalScale(80),
    borderRadius: horizontalScale(40),
    borderWidth: 4,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 2,
  },
  
  statusIndicator: {
    position: "absolute",
    bottom: verticalScale(8),
    right: horizontalScale(8),
    width: horizontalScale(20),
    height: horizontalScale(20),
    borderRadius: horizontalScale(10),
    borderWidth: 3,
    zIndex: 3,
  },
  
  profileInfo: {
    alignItems: "center",
    zIndex: 3,
  },
  
  profileName: {
    fontSize: moderateScale(24),
    fontWeight: "bold",
    marginBottom: verticalScale(6),
    textAlign: "center",
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  profileRole: {
    fontSize: moderateScale(16),
    marginBottom: verticalScale(12),
    textAlign: "center",
  },
  
  profileBadge: {
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
  },
  
  badgeText: {
    color: "#fff",
    fontSize: moderateScale(12),
    fontWeight: "600",
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  
  infoSection: {
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    marginBottom: verticalScale(16),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: "bold",
    marginBottom: verticalScale(16),
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: moderateScale(12),
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(8),
  },
  iconContainer: {
    width: horizontalScale(40),
    height: horizontalScale(40),
    borderRadius: horizontalScale(20),
    justifyContent: "center",
    alignItems: "center",
    marginRight: horizontalScale(12),
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: moderateScale(12),
    fontWeight: "500",
    marginBottom: verticalScale(2),
  },
  infoText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  actionSection: {
    marginTop: verticalScale(20),
    gap: verticalScale(12),
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: moderateScale(16),
    borderRadius: moderateScale(12),
    gap: horizontalScale(8),
  },
  actionButtonText: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
});

export default ProfilePage;