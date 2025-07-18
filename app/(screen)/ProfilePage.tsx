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
import { profile } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import { darkTheme, lightTheme } from "../constants/colors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

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
  const { user, logout: logoutFromStore, clearAuth } = useAuthStore();

  useEffect(() => {
    fetchProfileData();
    
    // Animate header on mount
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchProfileData = async (isRefresh = false) => {
    if (!user?.userName) {
      console.log("No username available, skipping profile fetch");
      setIsLoadingProfile(false);
      return;
    }

    try {
      if (!isRefresh) setIsLoadingProfile(true);
      const response = await profile();
      
      if (!response.data) {
        throw new Error("No data returned from API");
      }
      
      setProfileData(response.data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      if (error.response?.status === 404 && user) {
        setProfileData(user);
      } else {
        Alert.alert("Error", `Failed to fetch profile data: ${error.message}`);
      }
    } finally {
      setIsLoadingProfile(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileData(true);
  };

  const handleChangePassword = () => {
    console.log("Change password pressed");
    // router.push("/change-password");
  };

  const handleEditProfile = () => {
    console.log("Edit profile pressed");
    // router.push("/edit-profile");
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

            await AsyncStorage.multiRemove([
              "userToken",
              "refreshToken",
              "sessionId",
              "authData",
              "userSession",
              "loginCredentials",
            ]);

            await logoutFromStore();
            clearAuth();
            setProfileData(null);

            router.replace("/(auth)/Login");
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout completely. Please try again.");
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const displayData = profileData || user;
  const fullName = displayData
    ? `${displayData.firstName || ""} ${displayData.middleName || ""} ${displayData.lastName || ""}`.trim()
    : "User";

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB");
    } catch (error) {
      return dateString;
    }
  };

  const ProfileCard = () => (
    <View style={[styles.profileCard, { backgroundColor: colors.white }]}>
      <View style={styles.profileImageSection}>
        <View style={styles.profileImageContainer}>
          <Image
            source={{
              uri: displayData?.profileImage || "https://cdn-icons-png.flaticon.com/512/9187/9187532.png",
            }}
            style={styles.profileImage}
          />
          <View style={styles.statusIndicator} />
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {fullName}
          </Text>
          <Text style={[styles.profileRole, { color: colors.grey }]}>
            {displayData?.designation || "Software Developer"}
          </Text>
          <View style={styles.profileBadge}>
            <Text style={styles.badgeText}>Active</Text>
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
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + "15" }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.grey }]}>{label}</Text>
        <Text style={[styles.infoText, { color: colors.text }]}>{value}</Text>
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward-outline" size={16} color={colors.grey} />
      )}
    </TouchableOpacity>
  );

  const ActionButton = ({ icon, title, onPress, color = colors.primary, disabled = false }) => (
    <TouchableOpacity
      style={[
        styles.actionButton,
        { backgroundColor: color },
        disabled && { opacity: 0.6 }
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading profile...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header/>
      
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

        <InfoSection title="Personal Information">
          <InfoItem
            icon="mail-outline"
            label="Email"
            value={displayData?.email || "N/A"}
          />
          <InfoItem
            icon="call-outline"
            label="Phone"
            value={displayData?.mobileNumber || "N/A"}
          />
          <InfoItem
            icon="calendar-outline"
            label="Date of Birth"
            value={formatDate(displayData?.dob)}
          />
          <InfoItem
            icon="person-outline"
            label="Gender"
            value={displayData?.gender
              ? displayData.gender.charAt(0).toUpperCase() + displayData.gender.slice(1).toLowerCase()
              : "N/A"}
          />
        </InfoSection>

        <InfoSection title="Account Information">
          <InfoItem
            icon="id-card-outline"
            label="User ID"
            value={displayData?.userId || "N/A"}
          />
          <InfoItem
            icon="person-circle-outline"
            label="Username"
            value={displayData?.userName || "N/A"}
          />
          <InfoItem
            icon="business-outline"
            label="Department"
            value={displayData?.department || "Technology"}
          />
          <InfoItem
            icon="location-outline"
            label="Office Location"
            value={displayData?.location || "Mumbai, India"}
          />
        </InfoSection>

        <InfoSection title="Settings & Security">
          <InfoItem
            icon="lock-closed-outline"
            label="Change Password"
            value="Update your password"
            onPress={handleChangePassword}
            showChevron={true}
          />
          <InfoItem
            icon="notifications-outline"
            label="Notifications"
            value="Manage notifications"
            onPress={() => console.log("Notifications")}
            showChevron={true}
          />
          <InfoItem
            icon="shield-checkmark-outline"
            label="Privacy Settings"
            value="Control your privacy"
            onPress={() => console.log("Privacy")}
            showChevron={true}
          />
        </InfoSection>

        <View style={styles.actionSection}>
          <ActionButton
            icon="create-outline"
            title="Edit Profile"
            onPress={handleEditProfile}
          />
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
    marginTop: 10,
    fontSize: 16,
    fontWeight: "500",
  },
  headerContainer: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  editButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
    marginTop: -90,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  profileImageSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#fff",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4CAF50",
    borderWidth: 3,
    borderColor: "#fff",
  },
  profileInfo: {
    alignItems: "center",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 6,
    textAlign: "center",
  },
  profileRole: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  profileBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  profileStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#f0f0f0",
  },
  infoSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  infoText: {
    fontSize: 16,
    fontWeight: "600",
  },
  actionSection: {
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ProfilePage;