import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import useAuthStore from "../store/useUserStore";
import WelcomeScreen from "./(screen)/welcome";

SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();
  const { initializeAuth } = useAuthStore();
  const routedRef = useRef(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (routedRef.current) return;

    const checkLogin = async () => {
      try {
        await initializeAuth();
        const authState = useAuthStore.getState();
        if (authState.isAuthenticated && authState.accessToken) {
          routedRef.current = true;
          router.replace("/(tabs)");
          return;
        }

        const storedToken = await AsyncStorage.getItem("token");
        if (storedToken) {
          routedRef.current = true;
          router.replace("/(tabs)");
          return;
        }

        setShowWelcome(true);
      } catch (err) {
        console.log("Error checking login:", err);
        setShowWelcome(true);
      } finally {
        await SplashScreen.hideAsync();
      }
    };

    checkLogin();
  }, []);

  if (!showWelcome) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <WelcomeScreen />
    </View>
  );
}
