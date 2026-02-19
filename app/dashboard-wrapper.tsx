import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Dimensions, Platform, View } from "react-native";
import AttendanceWeb from "./web-attendance";
import TabLayout from "./(tabs)/_layout";

export default function DashboardWrapper() {
  const router = useRouter();
  const { width } = Dimensions.get("window");
  const isWeb = Platform.OS === "web";
  const isMobile = width < 768;
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    if (isWeb && !isMobile) {
      router.replace("/web-attendance");
    }
  }, []);

  if (isWeb && !isMobile) {
    return <AttendanceWeb />;
  }

  return <TabLayout />;
}
