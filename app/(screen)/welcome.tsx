import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import { getActiveNotices } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import OndemandNotifications from "../components/OndemandNotifications";
import { darkTheme, lightTheme } from "../constants/colors";

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const Welcome = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [noticeData, setNoticeData] = useState(null);
  const { isAuthenticated, initializeAuth } = useAuthStore();

  useEffect(() => {
    checkAuthAndNotices();
  }, []);

  const checkAuthAndNotices = async () => {
    try {
      await initializeAuth();
      const authState = useAuthStore.getState();
      if (authState.isAuthenticated && authState.accessToken) {
        const response = await getActiveNotices();
        const notice = response.data;
        if (
          notice &&
          notice.start_at &&
          notice.end_at &&
          notice.title &&
          notice.message &&
          notice.bg_image_url
        ) {
          const nowDate = new Date().toISOString().split("T")[0];
          const start = new Date(notice.start_at).toISOString().split("T")[0];
          const end = new Date(notice.end_at).toISOString().split("T")[0];
          const isNoticeActive = start <= nowDate && nowDate <= end;
          if (isNoticeActive) {
            setNoticeData(notice);
            setShowNotifications(true);
            setIsLoading(false);
          } else {
            router.replace("/(tabs)");
          }
        } else {
          router.replace("/(tabs)");
        }
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error checking auth or notices:", error);
      setIsLoading(false);
    }
  };

  const handleNotificationsClose = () => {
    setShowNotifications(false);
    router.replace("/(tabs)");
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <>
      <OndemandNotifications
        isVisible={showNotifications}
        onClose={handleNotificationsClose}
      />
      {!showNotifications && (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Background decoration - optional */}
          <View style={styles.backgroundDecoration}>
            <View style={styles.circle1} />
            <View style={styles.circle2} />
          </View>

          {/* Content Container */}
          <View style={styles.contentContainer}>
            {/* Logo Section */}
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              {/* Illustration */}
              <View style={styles.illustrationContainer}>
                <Image
                  source={require("../../assets/images/welcome-main.png")}
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>

              {/* Text Content */}
              <View style={styles.textContent}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Welcome to Abhinya
                </Text>
                <Text style={[styles.description, { color: colors.text }]}>
                  A modern attendance management system designed to simplify how institutions
                  and organizations track presence, time, and productivity.
                </Text>
              </View>

              {/* Button */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={() => router.push("/(auth)/Login")}
                >
                  <Text style={[styles.buttonText, { color: colors.white }]}>
                    Get Started
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
    </>
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
    gap: moderateScale(20),
  },
  loadingText: {
    fontSize: moderateScale(16),
    fontWeight: "500",
  },
  backgroundDecoration: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    opacity: 0.1,
  },
  circle1: {
    position: 'absolute',
    width: screenWidth * 0.6,
    height: screenWidth * 0.6,
    borderRadius: screenWidth * 0.3,
    backgroundColor: '#4a90e2',
    top: -screenWidth * 0.2,
    right: -screenWidth * 0.1,
  },
  circle2: {
    position: 'absolute',
    width: screenWidth * 0.4,
    height: screenWidth * 0.4,
    borderRadius: screenWidth * 0.2,
    backgroundColor: '#4a90e2',
    bottom: -screenWidth * 0.1,
    left: -screenWidth * 0.05,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: horizontalScale(20),
    paddingTop: verticalScale(40),
    paddingBottom: verticalScale(30),
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: verticalScale(30),
  },
  logo: {
    width: horizontalScale(200),
    height: verticalScale(80),
  },
  mainContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  illustrationContainer: {
    alignItems: "center",
    flex: 0.6,
    justifyContent: 'center',
  },
  illustration: {
    width: '100%',
    aspectRatio: 1, // Adjust based on your actual image ratio
    resizeMode: 'contain',
  },
  textContent: {
    flex: 0.3,
    paddingHorizontal: horizontalScale(10),
  },
  title: {
    fontSize: moderateScale(28),
    fontWeight: "700",
    marginBottom: verticalScale(10),
    textAlign: 'center',
  },
  description: {
    fontSize: moderateScale(16),
    textAlign: "center",
    lineHeight: moderateScale(24),
    color: '#666', // Subtle gray for description
    marginBottom: verticalScale(30),
  },
  buttonContainer: {
    marginBottom: verticalScale(40),
    alignItems: 'center',
  },
  button: {
    paddingVertical: moderateScale(15),
    paddingHorizontal: moderateScale(40),
    borderRadius: moderateScale(12),
    alignItems: "center",
    elevation: moderateScale(3),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '80%',
  },
  buttonText: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    letterSpacing: moderateScale(0.5),
  },
});

export default Welcome;