import { FontAwesome5 } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NetworkInfo } from "react-native-network-info";

import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const TabLayout = () => {
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [translateY] = useState(new Animated.Value(SCREEN_HEIGHT));

  const openBottomSheet = () => {
    setIsBottomSheetVisible(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };
  useEffect(() => {
    const checkWifiInfo = async () => {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("Permission required", "Please allow location access");
          return;
        }
      }

      const ssid = await NetworkInfo.getSSID();
      const bssid = await NetworkInfo.getBSSID();

      console.log("SSID:", ssid);
      console.log("BSSID:", bssid);

      // Optional: Match your expected WiFi
      if (ssid !== "YOUR_WIFI_NAME" || bssid !== "xx:xx:xx:xx:xx:xx") {
        Alert.alert(
          "Invalid Wi-Fi",
          "Please connect to the official office Wi-Fi before proceeding."
        );
      }
    };

    checkWifiInfo();
  }, []);

  const closeBottomSheet = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsBottomSheetVisible(false);
    });
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return gestureState.dy > 0 && gestureState.vy > 0;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dy > 150 || gestureState.vy > 0.5) {
        closeBottomSheet();
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const serviceItems = [
    { icon: "credit-card", name: "Payslips", color: "#026D94" },
    { icon: "home", name: "WFH", color: "#026D94" },
    { icon: "rupee-sign", name: "Expenses", color: "#026D94" },
    { icon: "clock", name: "OT", color: "#026D94" },
    { icon: "file-alt", name: "Report", color: "#026D94" },
    { icon: "bullhorn", name: "Notice", color: "#026D94" },
    { icon: "map-marker-alt", name: "Field Visit", color: "#026D94" },
    { icon: "question-circle", name: "Help", color: "#026D94" },
  ];

  return (
    <>
      {/* Bottom Sheet Modal */}
      <Modal
        visible={isBottomSheetVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeBottomSheet}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={closeBottomSheet}
          />
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [{ translateY }],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <View style={styles.dragHandle} />
            <ScrollView style={styles.sheetScrollView}>
              <View style={styles.sheetContent}>
                <View style={styles.sheetHeader}>
                  <FontAwesome5 name="th-large" size={24} color="#026D94" />
                  <Text style={styles.sheetTitle}>Services</Text>
                  <Text style={styles.sheetDescription}>
                    Select a service from the options below
                  </Text>
                </View>

                {/* Services Grid */}
                <View style={styles.servicesGrid}>
                  {serviceItems.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.serviceItem}
                      onPress={() => {
                        // Handle service item press
                        console.log(`${item.name} pressed`);
                      }}
                    >
                      <View style={styles.serviceIconContainer}>
                        <FontAwesome5
                          name={item.icon}
                          size={24}
                          color={item.color}
                        />
                      </View>
                      <Text style={styles.serviceItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Bottom Tabs */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 70,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: "#ffffff",
            elevation: 10,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: -2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            paddingBottom: 10,
            paddingTop: 10,
          },
          tabBarShowLabel: true,
          tabBarActiveTintColor: "#026D94",
          tabBarInactiveTintColor: "#b9b9b9",
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
            marginTop: 5,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <FontAwesome5 name="home" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="attendance"
          options={{
            title: "Attendance",
            tabBarIcon: ({ color }) => (
              <FontAwesome5 name="calendar-check" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="services"
          options={{
            title: "Services",
            tabBarIcon: () => null,
            tabBarButton: () => (
              <TouchableOpacity
                style={styles.fabButton}
                onPress={openBottomSheet}
              >
                <View style={styles.fabCircle}>
                  <FontAwesome5 name="th-large" size={24} color="#fff" />
                </View>
                {/* Add label manually */}
                <Text style={styles.fabLabel}>Services</Text>
              </TouchableOpacity>
            ),
          }}
        />

        <Tabs.Screen
          name="leave"
          options={{
            title: "Leave",
            tabBarIcon: ({ color }) => (
              <FontAwesome5 name="upload" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="message"
          options={{
            title: "Message",
            tabBarIcon: ({ color }) => (
              <FontAwesome5 name="envelope" size={20} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
};

const styles = StyleSheet.create({
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    minHeight: "50%",
    maxHeight: "80%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  dragHandle: {
    width: horizontalScale(40),
    height: verticalScale(4),
    backgroundColor: "#026D94",
    borderRadius: 2,
    alignSelf: "center",
    marginVertical: 10,
  },
  sheetScrollView: {
    flex: 1,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: horizontalScale(20),
    paddingBottom: verticalScale(20),
  },
  sheetHeader: {
    alignItems: "center",
    marginBottom: verticalScale(30),
  },
  sheetTitle: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    color: "#026D94",
    marginTop: verticalScale(10),
    marginBottom: verticalScale(5),
  },
  sheetDescription: {
    fontSize: moderateScale(14),
    color: "#666",
    textAlign: "center",
  },

  // Services Grid Styles
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: horizontalScale(10),
  },
  serviceItem: {
    width: "23%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(20),
    borderWidth: 1,
    borderColor: "#e9ecef",
    padding: moderateScale(10),
  },
  serviceIconContainer: {
    marginBottom: verticalScale(8),
  },
  serviceItemText: {
    fontSize: moderateScale(11),
    color: "#026D94",
    textAlign: "center",
    fontWeight: "500",
    lineHeight: moderateScale(14),
  },

  // FAB Button Styles
  fabButton: {
    top: verticalScale(-30),
    justifyContent: "center",
    alignItems: "center",
  },
  fabCircle: {
    width: horizontalScale(60),
    height: verticalScale(60),
    // borderRadius: 28,
    backgroundColor: "#026D94",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderWidth: 5,
    borderRadius: moderateScale(100),
    borderColor: "#fff",
  },
  fabLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#000",
    fontWeight: "500",
  },
});

export default TabLayout;
