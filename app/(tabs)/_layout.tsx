import { FontAwesome5 } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
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
import CustomDialog from "../components/CustomDialog";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const TabLayout = () => {
  const router = useRouter();
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [translateY] = useState(new Animated.Value(SCREEN_HEIGHT));
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogType, setDialogType] = useState("INFO");

  const openBottomSheet = () => {
    setIsBottomSheetVisible(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

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

  useEffect(() => {
    const checkWifiInfo = async () => {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log("Location permission denied");
          return;
        }
      }
      const ssid = await NetworkInfo.getSSID();
      const bssid = await NetworkInfo.getBSSID();
      console.log("SSID:", ssid);
      console.log("BSSID:", bssid);
    };
    checkWifiInfo();
  }, []);

  const serviceItems = [
    {
      icon: "calendar-check",
      name: "Attend",
      color: "#026D94",
      disabled: false,
    },
    { icon: "calendar-alt", name: "Leave", color: "#026D94", disabled: false },
    {
      icon: "comment-alt", // FontAwesome5 message icon
      name: "Messages",
      color: "#026D94",
      disabled: false,
      type: "FontAwesome5", // optional, if you're mixing icon sets
    },
    { icon: "credit-card", name: "Payslips", color: "#026D94", disabled: false },
    { icon: "home", name: "WFH", color: "#026D94", disabled: false },
    { icon: "question-circle", name: "Help", color: "#999", disabled: true },
  ];

  return (
    <>
      <View style={styles.container}>
        <Modal
          visible={isBottomSheetVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeBottomSheet}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.backdrop}
              activeOpacity={1}
              onPress={closeBottomSheet}
            />
            <Animated.View
              style={[styles.bottomSheet, { transform: [{ translateY }] }]}
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
                  <View style={styles.servicesGrid}>
                    {serviceItems.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.serviceItem,
                          item.disabled && styles.disabledServiceItem,
                        ]}
                        onPress={() => {
                          if (item.disabled) {
                            setDialogTitle("Coming Soon");
                            setDialogMessage(
                              `${item.name} service is under development.`
                            );
                            setDialogType("INFO");
                            setDialogVisible(true);
                            return;
                          }
                          closeBottomSheet();
                          switch (item.name) {
                            case "Attend":
                              router.push("/(tabs)/attendance");
                              break;
                            case "Leave":
                              router.push("/(tabs)/leave");
                              break;
                            case "WFH":
                              router.push("/(tabs)/wfh");
                              break;
                            case "Payslips":
                              router.push("/(screen)/payslips");
                              break;
                            case "Messages":
                              router.push("/(screen)/chat");
                              break;
                            case "Holidays":
                              router.push("/(screen)/ViewAllHolidays");
                              break;
                            default:
                              console.log(`${item.name} pressed`);
                          }
                        }}
                      >
                        <View style={styles.serviceIconContainer}>
                          <FontAwesome5
                            name={item.icon}
                            size={24}
                            color={item.disabled ? "#555" : item.color}
                          />
                        </View>
                        <Text
                          style={[
                            styles.serviceItemText,
                            item.disabled && { color: "#555" },
                          ]}
                        >
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: true,
            tabBarActiveTintColor: "#026D94",
            tabBarInactiveTintColor: "#b9b9b9",
            tabBarLabelStyle: {
              fontSize: moderateScale(12),
              fontWeight: "500",
              marginBottom: verticalScale(0),
            },
            tabBarIconStyle: {
              marginBottom: verticalScale(2),
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
              tabBarLabel: ({ focused }) => (
                <Text
                  style={{
                    color: focused ? "#026D94" : "#b9b9b9",
                    fontSize: moderateScale(12),
                    fontWeight: "500",
                    marginBottom: verticalScale(0),
                  }}
                >
                  Home
                </Text>
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
              tabBarLabel: ({ focused }) => (
                <Text
                  style={{
                    color: focused ? "#026D94" : "#b9b9b9",
                    fontSize: moderateScale(12),
                    fontWeight: "500",
                    marginBottom: verticalScale(0),
                  }}
                >
                  Attendance
                </Text>
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
              tabBarLabel: ({ focused }) => (
                <Text
                  style={{
                    color: focused ? "#026D94" : "#b9b9b9",
                    fontSize: moderateScale(12),
                    fontWeight: "500",
                    marginBottom: verticalScale(0),
                  }}
                >
                  Leave
                </Text>
              ),
            }}
          />
          <Tabs.Screen
            name="TimeSlips"
            options={{
              title: "Time Slip",
              tabBarIcon: ({ color }) => (
                <FontAwesome5 name="clock" size={20} color={color} />
              ),
              tabBarLabel: ({ focused }) => (
                <Text
                  style={{
                    color: focused ? "#026D94" : "#b9b9b9",
                    fontSize: moderateScale(12),
                    fontWeight: "500",
                    marginBottom: verticalScale(0),
                  }}
                >
                  Time Slip
                </Text>
              ),
            }}
            listeners={{
              tabPress: (e) => {
                router.push("/(tabs)/TimeSlips");
              },
            }}
          />
          <Tabs.Screen
            name="services"
            options={{
              title: "Services",
              tabBarIcon: ({ color }) => (
                <FontAwesome5 name="th-large" size={20} color={color} />
              ),
              tabBarLabel: ({ focused }) => (
                <Text
                  style={{
                    color: focused ? "#026D94" : "#b9b9b9",
                    fontSize: moderateScale(12),
                    fontWeight: "500",
                    marginBottom: verticalScale(0),
                  }}
                >
                  Services
                </Text>
              ),
            }}
            listeners={{
              tabPress: (e) => {
                e.preventDefault();
                openBottomSheet();
              },
            }}
          />
          <Tabs.Screen
            name="wfh"
            options={{
              href: null,
            }}
          />
        </Tabs>

        <CustomDialog
          isVisible={dialogVisible}
          type={dialogType}
          title={dialogTitle}
          message={dialogMessage}
          onConfirm={() => setDialogVisible(false)}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
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
    height: "45%",
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
    marginVertical: verticalScale(10),
  },
  sheetScrollView: {
    flex: 1,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: horizontalScale(20),
    paddingBottom: verticalScale(30),
  },
  sheetHeader: {
    alignItems: "center",
    marginBottom: verticalScale(20),
    paddingTop: verticalScale(10),
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
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: horizontalScale(5),
  },
  serviceItem: {
    width: "23%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(15),
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

  disabledServiceItem: {
    backgroundColor: "#f8f9fa",
    borderColor: "#d0d0d0",
  },
});

export default TabLayout;
