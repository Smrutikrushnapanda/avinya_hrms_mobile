import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import useAuthStore from "../../store/useUserStore"; // Adjust path as needed
import { darkTheme, lightTheme } from "../constants/colors";

const Welcome = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Get auth store functions and state
  const { isAuthenticated, initializeAuth } = useAuthStore();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Initialize auth from AsyncStorage
      await initializeAuth();

      // Check if user is authenticated after initialization
      const authState = useAuthStore.getState();

      if (authState.isAuthenticated && authState.accessToken) {
        // User is authenticated, navigate to home screen
        router.replace("/(tabs)"); // Adjust the route according to your app structure
      } else {
        // User is not authenticated, stay on welcome screen
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      // If there's an error, show welcome screen
      setIsLoading(false);
    }
  };

  // Show loading indicator while checking token
  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/logo.png")} // Adjust path as needed
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Main Image Section */}
      <View style={styles.imageContainer}>
        <Image
          source={require("../../assets/images/welcome-main.png")} // Adjust path as needed
          style={styles.mainImage}
          resizeMode="contain"
        />
      </View>

      {/* Welcome message box */}
      <View style={[styles.welcomemsg, { backgroundColor: colors.white }]}>
        <View>
          <Text style={[styles.welcomeText, { color: colors.text }]}>
            Welcome
          </Text>
          <Text style={[styles.welcomemessage, { color: colors.text }]}>
            Abhinya is a modern attendance management system designed to
            simplify how institutions and organizations track presence, time,
            and productivity.
          </Text>
        </View>

        {/* Get Started Button */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(auth)/Login")}
        >
          <Text style={[styles.btnText, { color: colors.white }]}>
            Get Started
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Welcome;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: moderateScale(20),
  },
  loadingText: {
    fontSize: moderateScale(16),
    fontWeight: "500",
  },
  logoContainer: {
    alignItems: "center",
    marginTop: verticalScale(50),
  },
  logo: {
    width: horizontalScale(250),
    height: verticalScale(100),
  },
  imageContainer: {
    alignItems: "center",
    marginTop: verticalScale(30),
  },
  mainImage: {
    height: verticalScale(300),
    width: "100%",
  },
  welcomemsg: {
    height: horizontalScale(350),
    width: "100%",
    borderTopRightRadius: moderateScale(40),
    borderTopLeftRadius: moderateScale(40),
    padding: moderateScale(40),
    justifyContent: "space-between",
  },
  welcomeText: {
    fontSize: moderateScale(24),
    fontWeight: "600",
  },
  welcomemessage: {
    fontSize: moderateScale(16),
    textAlign: "left",
    paddingTop: verticalScale(20),
    // flex: 1,
    fontWeight: "400",
  },
  btn: {
    paddingVertical: moderateScale(14),
    paddingHorizontal: moderateScale(20),
    borderRadius: moderateScale(10),
    alignItems: "center",
    elevation: moderateScale(5),
  },
  btnText: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
