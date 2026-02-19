import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import useAuthStore from "../store/useUserStore";
import WelcomeScreen from "./(screen)/welcome";

export default function Index() {
  const router = useRouter();
  const { initializeAuth } = useAuthStore();
  const routedRef = useRef(false);

  const [checkingStorage, setCheckingStorage] = useState(true);
  const [hasToken, setHasToken] = useState<string | null>(null);

  useEffect(() => {
    if (routedRef.current) return;

    const checkLogin = async () => {
      try {
        await initializeAuth();
        const authState = useAuthStore.getState();
        if (authState.isAuthenticated && authState.accessToken) {
          routedRef.current = true;
          router.replace("/dashboard-wrapper");
          return;
        }

        const storedToken = await AsyncStorage.getItem("token");
        if (storedToken) {
          setHasToken(storedToken);
          routedRef.current = true;
          router.replace("/dashboard-wrapper");
        }
      } catch (err) {
        console.log("Error checking login:", err);
      } finally {
        setCheckingStorage(false);
      }
    };

    checkLogin();
  }, []);

  if (checkingStorage) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (!hasToken) {
    return (
      <View style={{ flex: 1 }}>
        <WelcomeScreen />
      </View>
    );
  }

  return null;
}
