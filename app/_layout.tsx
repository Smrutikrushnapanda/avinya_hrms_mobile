// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Appearance } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
export default function RootLayout() {
  // const colorScheme = useColorScheme(); // Dark mode support (currently disabled)

  // Force light mode
  Appearance.setColorScheme("light");

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          translucent
          backgroundColor="transparent"
          style="dark" // Always light mode
          // style={colorScheme === "dark" ? "light" : "dark"} // Dark mode support (commented)
        />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
