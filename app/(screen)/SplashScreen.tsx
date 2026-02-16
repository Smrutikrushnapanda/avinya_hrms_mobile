import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, BackHandler, Image } from "react-native";

export default function SplashScreen() {
  const router = useRouter();
  const ref = useRef(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);

  useEffect(() => {
    // Disable Android back button during splash screen
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        return true; // Prevent default back behavior
      }
    );

    // Fixed-duration splash fallback (replace with video later)
    const timer = setTimeout(() => {
      handleVideoEnd();
    }, 5000); // Increased to 5 seconds for safety

    // Navigation function
    const handleVideoEnd = () => {
      setIsVideoPlaying(false);
      router.replace("/(screen)/welcome");
    };

    // Cleanup
    return () => {
      backHandler.remove();
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar
        style="light"
        translucent={true}
        hidden={true} // Hide status bar completely during splash
      />

      <Image
        ref={ref}
        source={require("../../assets/images/splash-icon.png")}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Multiple overlay layers to absolutely prevent any touch events */}
      <View style={styles.touchBlocker} pointerEvents="none" />

      {/* Additional absolute overlay that captures all touches */}
      <View
        style={styles.absoluteOverlay}
        pointerEvents={isVideoPlaying ? "auto" : "none"}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={() => {}} // Absorb all touch events
        onResponderMove={() => {}}
        onResponderRelease={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  image: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  touchBlocker: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  absoluteOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 999,
  },
});
