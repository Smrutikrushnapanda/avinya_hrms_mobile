import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "app/components/Header";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
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

// Define interfaces for type safety
interface User {
  userId?: string;
  organizationId?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  dob?: string;
  email?: string;
  userName?: string;
  mobileNumber?: string;
}

interface ProfileData {
  id?: string;
  userId?: string;
  organizationId?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  personalEmail?: string;
  workEmail?: string;
  contactNumber?: string;
  bloodGroup?: string;
  employeeCode?: string;
  department?: { name?: string };
  designation?: { name?: string };
  dateOfJoining?: string;
  employmentType?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  photoUrl?: string;
  aadharPhotoUrl?: string;
  passportPhotoUrl?: string;
  panCardPhotoUrl?: string;
  status?: string;
  user?: {
    userName?: string;
    email?: string;
    mobileNumber?: string;
  };
  manager?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    employeeCode?: string;
  };
}

interface Theme {
  white: string;
  background: string;
  text: string;
  grey: string;
  primary: string;
}

interface ActionButtonProps {
  icon: string;
  title: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}

interface InfoItemProps {
  icon: string;
  label: string;
  value?: string | JSX.Element;
  onPress?: () => void;
  showChevron?: boolean;
}


const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Storage keys
const STORAGE_KEYS = {
  PROFILE_DATA: "profile_data",
  PROFILE_TIMESTAMP: "profile_timestamp",
  LOCAL_PROFILE_PHOTO: "local_profile_photo",
};

// Cache duration (24 hours in milliseconds)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

const ProfilePage: React.FC = () => {
  const systemColorScheme = useColorScheme() ?? "light";
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    systemColorScheme === "dark"
  );
  const colors: Theme = isDarkMode ? darkTheme : lightTheme;

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [headerOpacity] = useState<Animated.Value>(new Animated.Value(0));
  const [isImageModalVisible, setIsImageModalVisible] =
    useState<boolean>(false);
  const [modalImageUri, setModalImageUri] = useState<string | null>(null);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<
    "general" | "personal" | "documents" | "policy"
  >("general");

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
  const initializeProfile = async (): Promise<void> => {
    try {
      const storedLocalPhoto = await AsyncStorage.getItem(
        STORAGE_KEYS.LOCAL_PROFILE_PHOTO
      );
      if (storedLocalPhoto) {
        setLocalPhotoUri(storedLocalPhoto);
      }

      // Check if cache is valid
      const cacheValid = await isCacheValid();
      if (cacheValid) {
        const cachedProfile = await loadCachedProfile();
        if (cachedProfile) {
          console.log("Using valid cached profile data");
          setProfileData(cachedProfile);
          setIsLoadingProfile(false);
          return; // Exit if valid cache is found
        }
      }

      // If cache is invalid or no cached data, fetch fresh data
      console.log("No valid cache found, fetching fresh profile data");
      await fetchProfileData();
    } catch (error) {
      console.error("Error initializing profile:", error);
      Alert.alert("Error", "Failed to initialize profile data.");
      setIsLoadingProfile(false);
    }
  };

  // Load profile data from AsyncStorage
  const loadCachedProfile = async (): Promise<ProfileData | null> => {
    try {
      const cachedProfile = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_DATA);
      if (cachedProfile) {
        const parsedProfile = JSON.parse(cachedProfile) as ProfileData;
        // console.log("Loaded cached profile:", JSON.stringify(parsedProfile, null, 2));
        return parsedProfile;
      }
      console.log("No cached profile found");
      return null;
    } catch (error) {
      console.error("Error loading cached profile:", error);
      return null;
    }
  };

  // Check if cached data is still valid
  const isCacheValid = async (): Promise<boolean> => {
    try {
      const timestamp = await AsyncStorage.getItem(
        STORAGE_KEYS.PROFILE_TIMESTAMP
      );
      if (!timestamp) return false;

      const cacheTime = parseInt(timestamp);
      const currentTime = Date.now();

      return currentTime - cacheTime < CACHE_DURATION;
    } catch (error) {
      console.error("Error checking cache validity:", error);
      return false;
    }
  };

  // Save profile data to AsyncStorage
  const saveProfileToCache = async (data: ProfileData): Promise<void> => {
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
  const clearProfileCache = async (): Promise<void> => {
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

  const fetchProfileData = async (isRefresh: boolean = false): Promise<void> => {
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

      setProfileData(response.data);

      // Save to cache
      await saveProfileToCache(response.data);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      // Try to load cached data as fallback
      const cachedProfile = await loadCachedProfile();
      if (cachedProfile) {
        console.log("Using cached profile as fallback:", JSON.stringify(cachedProfile, null, 2));
        setProfileData(cachedProfile);
      } else {
        // Use user store data as last resort
        if (user) {
          const fallbackData: ProfileData = {
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
          console.log("Using fallback data:", JSON.stringify(fallbackData, null, 2));
          setProfileData(fallbackData);
          await saveProfileToCache(fallbackData);
        }
      }
      Alert.alert("Error", `Failed to fetch profile data: ${error.message}`);
    } finally {
      setIsLoadingProfile(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await clearProfileCache();
    await fetchProfileData(true);
  };

  const handleChangePassword = (): void => {
    console.log("Change password pressed");
    // Add navigation to change password screen
    // router.push("/(profile)/change-password");
  };

  const handleEditProfile = (): void => {
    console.log("Edit profile pressed");
    // Add navigation to edit profile screen
    // router.push("/(profile)/edit-profile");
  };

  const handlePickLocalPhoto = async (): Promise<void> => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Allow photo access to continue.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        setLocalPhotoUri(uri);
        await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_PROFILE_PHOTO, uri);
      }
    } catch (error) {
      console.error("Error picking local photo:", error);
      Alert.alert("Error", "Failed to update profile photo.");
    }
  };

  const handleLogout = async (): Promise<void> => {
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
              STORAGE_KEYS.LOCAL_PROFILE_PHOTO,
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
  const forceRefreshProfile = async (): Promise<void> => {
    await clearProfileCache();
    await fetchProfileData();
  };

  // Get display data with proper fallbacks
  const getDisplayData = (): ProfileData | User => {
    if (profileData) return profileData;
    if (user) return user;
    return {};
  };

  const displayData = getDisplayData();

  const getFullName = (): string => {
    if (!displayData) return "Unknown User";

    const firstName = displayData.firstName || "";
    const middleName = displayData.middleName || "";
    const lastName = displayData.lastName || "";

    return `${firstName} ${middleName} ${lastName}`.trim() || "Unknown User";
  };

  const getManagerName = (): string => {
    if (!displayData?.manager) return "Unknown Manager";

    const firstName = displayData.manager.firstName || "";
    const middleName = displayData.manager.middleName || "";
    const lastName = displayData.manager.lastName || "";

    return `${firstName} ${middleName} ${lastName}`.trim() || "Unknown Manager";
  };

  const getManagerEmployeeCode = (): string => {
    return displayData?.manager?.employeeCode || "N/A";
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-GB");
    } catch (error) {
      return "N/A";
    }
  };

  const getStatusColor = (status?: string): string => {
    if (!status) return "#FF9800";
    return status.toLowerCase() === "active" ? "#4CAF50" : "#FF9800";
  };

  const formatEmploymentType = (type?: string): string => {
    if (!type) return "N/A";
    return type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ");
  };

  const formatGender = (gender?: string): string => {
    if (!gender) return "N/A";
    return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
  };

  const ProfileCard: React.FC = () => (
    <View style={[styles.profileCard, { backgroundColor: colors.white }]}>
      {/* Triangle decorations */}
      <View style={styles.triangle} />
      <View style={styles.triangle2} />
      <View style={styles.triangle3} />
      <View style={styles.triangle4} />

      {/* Main content */}
      <View style={styles.profileImageSection}>
        <TouchableOpacity
          style={styles.profileImageContainer}
          onPress={() => {
            const imageUri =
              localPhotoUri ||
              displayData?.photoUrl ||
              "https://cdn-icons-png.flaticon.com/512/9187/9187532.png";
            setModalImageUri(imageUri);
            setIsImageModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          {/* Decorative ring around profile image */}
          <View
            style={[
              styles.profileImageRing,
              { borderColor: "#c9e8ffff" },
            ]}
          />

          <Image
            source={{
              uri:
                localPhotoUri ||
                displayData?.photoUrl ||
                "https://cdn-icons-png.flaticon.com/512/9187/9187532.png",
            }}
            style={[styles.profileImage, { borderColor: colors.primary }]}
            onError={(error) => {
              console.log("Image load error:", error);
            }}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.changePhotoButton, { borderColor: colors.primary }]}
          onPress={handlePickLocalPhoto}
        >
          <Ionicons name="camera-outline" size={16} color={colors.primary} />
          <Text style={[styles.changePhotoText, { color: colors.primary }]}>
            Change Photo
          </Text>
        </TouchableOpacity>

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
              },
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


  const AccordionSection: React.FC<{
    id: "general" | "personal" | "documents" | "policy";
    title: string;
    icon: string;
    children: React.ReactNode;
  }> = ({ id, title, icon, children }) => {
    const isOpen = openSection === id;
    return (
      <View style={[styles.accordionSection, { backgroundColor: colors.white }]}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setOpenSection(id)}
          activeOpacity={0.8}
        >
          <View style={styles.accordionHeaderLeft}>
            <Ionicons name={icon} size={18} color={colors.primary} />
            <Text style={[styles.accordionTitle, { color: colors.text }]}>
              {title}
            </Text>
          </View>
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.grey}
          />
        </TouchableOpacity>
        {isOpen && <View style={styles.accordionBody}>{children}</View>}
      </View>
    );
  };

  const DocumentItem: React.FC<{
    label: string;
    uri?: string;
  }> = ({ label, uri }) => (
    <TouchableOpacity
      style={styles.documentItem}
      onPress={() => {
        if (!uri) return;
        setModalImageUri(uri);
        setIsImageModalVisible(true);
      }}
      activeOpacity={uri ? 0.8 : 1}
    >
      <View style={styles.documentPreview}>
        {uri ? (
          <Image source={{ uri }} style={styles.documentImage} />
        ) : (
          <View style={styles.documentPlaceholder}>
            <Ionicons name="document-outline" size={18} color={colors.grey} />
            <Text style={[styles.documentPlaceholderText, { color: colors.grey }]}>
              No file
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.documentLabel, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  const InfoItem: React.FC<InfoItemProps> = ({
    icon,
    label,
    value,
    onPress,
    showChevron = false,
  }) => (
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
        {typeof value === "string" ? (
          <Text style={[styles.infoText, { color: colors.text }]}>
            {value || "N/A"}
          </Text>
        ) : (
          value
        )}
      </View>
      {showChevron && onPress && (
        <Ionicons
          name="chevron-forward-outline"
          size={16}
          color={colors.grey}
        />
      )}
    </TouchableOpacity>
  );

  const ActionButton: React.FC<ActionButtonProps> = ({
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

        <AccordionSection
          id="general"
          title="General Info"
          icon="briefcase-outline"
        >
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
            icon="man-outline"
            label="Reporting Manager"
            value={
              <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {getManagerName()}{" "}
                <Text style={{ fontSize: 11 }}>
                  ({getManagerEmployeeCode()})
                </Text>
              </Text>
            }
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
          {(displayData?.emergencyContactName ||
            displayData?.emergencyContactPhone) && (
            <>
              <InfoItem
                icon="person-outline"
                label="Emergency Contact"
                value={displayData?.emergencyContactName}
              />
              <InfoItem
                icon="call-outline"
                label="Emergency Phone"
                value={displayData?.emergencyContactPhone}
              />
            </>
          )}
        </AccordionSection>

        <AccordionSection
          id="personal"
          title="Personal Info"
          icon="person-outline"
        >
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
        </AccordionSection>

        <AccordionSection
          id="documents"
          title="Documents Center"
          icon="document-text-outline"
        >
          <View style={styles.documentGrid}>
            <DocumentItem
              label="Aadhar"
              uri={displayData?.aadharPhotoUrl}
            />
            <DocumentItem
              label="Passport"
              uri={displayData?.passportPhotoUrl}
            />
            <DocumentItem
              label="PAN Card"
              uri={displayData?.panCardPhotoUrl}
            />
          </View>
        </AccordionSection>

        <AccordionSection
          id="policy"
          title="Company Policy"
          icon="shield-checkmark-outline"
        >
          <View style={styles.policyCard}>
            <Text style={[styles.policyText, { color: colors.text }]}>
              Follow attendance policy, keep profile details updated, and submit
              timeslips within 48 hours of a missed punch.
            </Text>
            <Text style={[styles.policyHint, { color: colors.grey }]}>
              This section can be updated by HR.
            </Text>
          </View>
        </AccordionSection>

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

      {/* Image Modal */}
      <Modal
        visible={isImageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setIsImageModalVisible(false)}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{
              uri:
                modalImageUri ||
                localPhotoUri ||
                displayData?.photoUrl ||
                "https://cdn-icons-png.flaticon.com/512/9187/9187532.png",
            }}
            style={styles.modalImage}
            resizeMode="contain"
            onError={(error) => {
              console.log("Modal image load error:", error);
            }}
          />
        </View>
      </Modal>
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

  // ProfileCard styles with Attendance card background
  profileCard: {
    borderRadius: moderateScale(20),
    padding: moderateScale(10),
    marginBottom: verticalScale(20),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    borderWidth: 1,
    borderColor: "#E8ECEF",
    position: "relative",
    overflow: "hidden",
  },

  // Triangle decorations matching Attendance card
  triangle: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#E1F4FF",
    borderRightColor: "transparent",
  },
  triangle2: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#E1F4FF",
    borderRightColor: "transparent",
    transform: [{ rotate: "180deg" }],
  },
  triangle3: {
    position: "absolute",
    bottom: 10,
    left: 10,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#E1F4FF",
    borderRightColor: "transparent",
    transform: [{ rotate: "270deg" }],
  },
  triangle4: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#E1F4FF",
    borderRightColor: "transparent",
    transform: [{ rotate: "90deg" }],
  },

  // Profile elements
  profileImageSection: {
    alignItems: "center",
    marginBottom: verticalScale(20),
    zIndex: 3,
    position: "relative",
  },

  profileImageContainer: {
    position: "relative",
    marginBottom: verticalScale(16),
  },

  profileImageRing: {
    position: "absolute",
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

  profileInfo: {
    alignItems: "center",
    zIndex: 3,
  },

  profileName: {
    fontSize: moderateScale(24),
    fontWeight: "bold",
    marginBottom: verticalScale(6),
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.1)",
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
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: moderateScale(10),
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(6),
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
  changePhotoButton: {
    marginTop: verticalScale(6),
    borderWidth: 1,
    borderRadius: moderateScale(20),
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(6),
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(6),
  },
  changePhotoText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  accordionSection: {
    borderRadius: moderateScale(16),
    marginBottom: verticalScale(12),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(8),
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(8),
  },
  accordionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(8),
  },
  accordionTitle: {
    fontSize: moderateScale(16),
    fontWeight: "700",
  },
  accordionBody: {
    paddingBottom: verticalScale(8),
  },
  documentGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: horizontalScale(8),
  },
  documentItem: {
    flex: 1,
    alignItems: "center",
  },
  documentPreview: {
    width: "100%",
    height: verticalScale(90),
    borderRadius: moderateScale(10),
    overflow: "hidden",
    backgroundColor: "#F5F6F8",
    marginBottom: verticalScale(6),
  },
  documentImage: {
    width: "100%",
    height: "100%",
  },
  documentPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  documentPlaceholderText: {
    fontSize: moderateScale(11),
    marginTop: verticalScale(4),
  },
  documentLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  policyCard: {
    padding: moderateScale(10),
    borderRadius: moderateScale(12),
    backgroundColor: "#F5F8FF",
  },
  policyText: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    lineHeight: moderateScale(18),
  },
  policyHint: {
    fontSize: moderateScale(11),
    marginTop: verticalScale(6),
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
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.7,
  },
  modalCloseButton: {
    position: "absolute",
    top: verticalScale(40),
    right: horizontalScale(20),
    zIndex: 4,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: moderateScale(20),
    padding: moderateScale(8),
  },
});

export default ProfilePage;
