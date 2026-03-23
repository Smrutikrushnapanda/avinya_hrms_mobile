import { FontAwesome5 } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { NetworkInfo } from "react-native-network-info";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import CustomDialog from "../components/CustomDialog";
import { darkTheme, lightTheme } from "../constants/colors";
import type { AppTheme } from "../constants/colors";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Animated Tab Icon ────────────────────────────────────────────────────────
const AnimatedTabIcon = ({
  name,
  color,
  focused,
}: {
  name: string;
  color: string;
  focused: boolean;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1.25,
            useNativeDriver: true,
            tension: 200,
            friction: 6,
          }),
          Animated.timing(translateY, {
            toValue: -3,
            duration: 200,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
        ]),
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1.1,
            useNativeDriver: true,
            tension: 200,
            friction: 8,
          }),
        ]),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 8,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]).start();
    }
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }, { translateY }] }}>
      <FontAwesome5 name={name} size={20} color={color} solid={focused} />
    </Animated.View>
  );
};

// ─── Animated Service Item ────────────────────────────────────────────────────
const ServiceItemButton = ({
  item,
  index,
  onPress,
  sheetVisible,
  colors,
}: {
  item: any;
  index: number;
  onPress: () => void;
  sheetVisible: boolean;
  colors: AppTheme;
}) => {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (sheetVisible) {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          delay: index * 50,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]).start();
    } else {
      scale.setValue(0.6);
      opacity.setValue(0);
      translateY.setValue(20);
    }
  }, [sheetVisible]);

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  return (
    <Animated.View
      style={{
        width: "23%",
        opacity,
        transform: [{ scale: pressScale }, { translateY }],
        marginBottom: verticalScale(15),
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.serviceItem,
          {
            backgroundColor: item.disabled ? colors.chip : colors.inputBackground,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.serviceIconContainer}>
          <FontAwesome5
            name={item.icon}
            size={24}
            color={item.disabled ? colors.textMuted : item.color}
            solid
          />
        </View>
        <Text
          style={[
            styles.serviceItemText,
            { color: item.disabled ? colors.textMuted : item.color },
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Center Tab Button (FAB style from old UI) ────────────────────────────────
const CenterTabButton = ({
  onPress,
  colors,
}: {
  onPress: () => void;
  colors: AppTheme;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.9,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 8,
      }),
    ]).start();
    onPress();
  };

  return (
    <View style={styles.fabContainer}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        style={styles.fabButton}
      >
        <Animated.View
          style={[
            styles.fabCircle,
            {
              transform: [{ scale }],
              backgroundColor: colors.primary,
              borderColor: colors.surface,
            },
          ]}
        >
          <FontAwesome5 name="th-large" size={22} color={colors.onPrimary} />
        </Animated.View>
      </TouchableOpacity>
      <Text style={[styles.fabLabel, { color: colors.primary }]}>Services</Text>
    </View>
  );
};

// ─── Main Tab Layout ──────────────────────────────────────────────────────────
const TabLayout = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const tabActiveColor = colors.primary;
  const tabInactiveColor = colors.textMuted;

  const router = useRouter();
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [sheetAnimVisible, setSheetAnimVisible] = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogType, setDialogType] = useState<
    "SUCCESS" | "DANGER" | "WARNING" | "INFO"
  >("INFO");

  const openBottomSheet = () => {
    setIsBottomSheetVisible(true);
    setSheetAnimVisible(true);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp),
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeBottomSheet = () => {
    setSheetAnimVisible(false);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 320,
        useNativeDriver: true,
        easing: Easing.in(Easing.exp),
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsBottomSheetVisible(false);
    });
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) =>
      gestureState.dy > 5 && gestureState.vy > 0,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
        backdropOpacity.setValue(
          Math.max(0, 1 - gestureState.dy / (SCREEN_HEIGHT * 0.4))
        );
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 150 || gestureState.vy > 0.5) {
        closeBottomSheet();
      } else {
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 200,
            friction: 20,
          }),
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
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
      console.log("SSID:", ssid, "BSSID:", bssid);
    };
    checkWifiInfo();
  }, []);

  const serviceItems = [
    { icon: "calendar-check", name: "Attend",   color: colors.primary, disabled: false },
    { icon: "calendar-alt",   name: "Leave",    color: colors.primary, disabled: false },
    { icon: "comment-alt",    name: "Messages", color: colors.primary, disabled: false },
    { icon: "credit-card",    name: "Payslips", color: colors.primary, disabled: false },
    { icon: "home",           name: "WFH",      color: colors.primary, disabled: false },
    { icon: "newspaper",      name: "Posts",    color: colors.primary, disabled: false },
    { icon: "file-alt",       name: "Policies", color: colors.primary, disabled: false },
    { icon: "question-circle",name: "Help",     color: colors.textMuted, disabled: true  },
  ];

  const handleServicePress = (item: any) => {
    if (item.disabled) {
      setDialogTitle("Coming Soon");
      setDialogMessage(`${item.name} service is under development.`);
      setDialogType("INFO");
      setDialogVisible(true);
      return;
    }
    closeBottomSheet();
    const routes: Record<string, string> = {
      Attend:   "/(tabs)/attendance",
      Leave:    "/(tabs)/leave",
      WFH:      "/(tabs)/wfh",
      Payslips: "/(screen)/payslips",
      Messages: "/(screen)/chat",
      Holidays: "/(screen)/ViewAllHolidays",
      Posts:    "/(screen)/posts",
      Policies: "/(tabs)/services",
    };
    if (routes[item.name]) {
      setTimeout(() => router.push(routes[item.name] as any), 350);
    }
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* ── Bottom Sheet Modal ── */}
        <Modal
          visible={isBottomSheetVisible}
          transparent
          animationType="none"
          onRequestClose={closeBottomSheet}
          statusBarTranslucent
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.backdrop,
                { opacity: backdropOpacity, backgroundColor: colors.overlay },
              ]}
            >
              <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={1}
                onPress={closeBottomSheet}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  transform: [{ translateY }],
                  backgroundColor: colors.surface,
                  shadowColor: colors.shadow,
                },
              ]}
              {...panResponder.panHandlers}
            >
              {/* Drag handle */}
              <View style={[styles.dragHandle, { backgroundColor: colors.primary }]} />

              <ScrollView
                style={styles.sheetScrollView}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.sheetContent}>
                  {/* Header */}
                  <View style={styles.sheetHeader}>
                    <FontAwesome5 name="th-large" size={24} color={colors.primary} />
                    <Text style={[styles.sheetTitle, { color: colors.primary }]}>Services</Text>
                    <Text style={[styles.sheetDescription, { color: colors.textSecondary }]}>
                      Select a service from the options below
                    </Text>
                  </View>

                  {/* Services grid */}
                  <View style={styles.servicesGrid}>
                    {serviceItems.map((item, index) => (
                      <ServiceItemButton
                        key={index}
                        item={item}
                        index={index}
                        sheetVisible={sheetAnimVisible}
                        colors={colors}
                        onPress={() => handleServicePress(item)}
                      />
                    ))}
                  </View>
                </View>
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        {/* ── Tab Navigator ── */}
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: true,
            tabBarActiveTintColor: tabActiveColor,
            tabBarInactiveTintColor: tabInactiveColor,
            tabBarStyle: {
              height: verticalScale(64),
              paddingBottom: verticalScale(6),
              paddingTop: verticalScale(6),
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.surface,
              shadowColor: colors.shadow,
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: -4 },
              elevation: 12,
            },
            tabBarLabelStyle: {
              fontSize: moderateScale(12),
              fontWeight: "500",
              marginBottom: verticalScale(0),
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
              tabBarIcon: ({ color, focused }) => (
                <AnimatedTabIcon name="home" color={color} focused={focused} />
              ),
              tabBarLabel: ({ focused }) => (
                <Text style={{ color: focused ? tabActiveColor : tabInactiveColor, fontSize: moderateScale(12), fontWeight: "500" }}>
                  Home
                </Text>
              ),
            }}
          />
          <Tabs.Screen
            name="attendance"
            options={{
              title: "Attendance",
              tabBarIcon: ({ color, focused }) => (
                <AnimatedTabIcon name="calendar-check" color={color} focused={focused} />
              ),
              tabBarLabel: ({ focused }) => (
                <Text style={{ color: focused ? tabActiveColor : tabInactiveColor, fontSize: moderateScale(12), fontWeight: "500" }}>
                  Attendance
                </Text>
              ),
            }}
          />
          <Tabs.Screen
            name="services"
            options={{
              title: "Services",
              tabBarButton: () => (
                <CenterTabButton onPress={openBottomSheet} colors={colors} />
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
            name="leave"
            options={{
              title: "Leave",
              tabBarIcon: ({ color, focused }) => (
                <AnimatedTabIcon name="calendar-minus" color={color} focused={focused} />
              ),
              tabBarLabel: ({ focused }) => (
                <Text style={{ color: focused ? tabActiveColor : tabInactiveColor, fontSize: moderateScale(12), fontWeight: "500" }}>
                  Leave
                </Text>
              ),
            }}
          />
          <Tabs.Screen
            name="TimeSlips"
            options={{
              title: "Time Slip",
              tabBarIcon: ({ color, focused }) => (
                <AnimatedTabIcon name="clock" color={color} focused={focused} />
              ),
              tabBarLabel: ({ focused }) => (
                <Text style={{ color: focused ? tabActiveColor : tabInactiveColor, fontSize: moderateScale(12), fontWeight: "500" }}>
                  Time Slip
                </Text>
              ),
            }}
            listeners={{
              tabPress: () => {
                router.push("/(tabs)/TimeSlips");
              },
            }}
          />
          <Tabs.Screen
            name="wfh"
            options={{ href: null }}
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
  },

  // ── Modal / Sheet ──
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheet: {
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    height: "45%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },

  // ── Drag handle ──
  dragHandle: {
    width: horizontalScale(40),
    height: verticalScale(4),
    borderRadius: 2,
    alignSelf: "center",
    marginVertical: verticalScale(10),
  },

  // ── Sheet content ──
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
    marginTop: verticalScale(10),
    marginBottom: verticalScale(5),
  },
  sheetDescription: {
    fontSize: moderateScale(14),
    textAlign: "center",
  },

  // ── Services Grid ──
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: horizontalScale(5),
  },
  serviceItem: {
    width: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: moderateScale(12),
    borderWidth: 1,
    padding: moderateScale(10),
  },
  serviceIconContainer: {
    marginBottom: verticalScale(8),
  },
  serviceItemText: {
    fontSize: moderateScale(11),
    textAlign: "center",
    fontWeight: "500",
    lineHeight: moderateScale(14),
  },

  // ── FAB Center Button ──
  fabContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: verticalScale(-35),
  },
  fabButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  fabCircle: {
    width: horizontalScale(56),
    height: horizontalScale(56),
    borderRadius: horizontalScale(28),
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 3,
  },
  fabLabel: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(11),
    fontWeight: "500",
    textAlign: "center",
  },
});

export default TabLayout;
