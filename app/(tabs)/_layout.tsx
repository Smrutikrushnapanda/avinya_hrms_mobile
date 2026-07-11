import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { NetworkInfo } from "react-native-network-info";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import { getAuthProfile, getOrganizationPlan } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import CustomDialog from "../components/CustomDialog";
import { darkTheme, lightTheme } from "../constants/colors";
import type { AppTheme } from "../constants/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type OrganizationPlanType = "BASIC" | "PRO" | "ENTERPRISE" | null;

type PlanSource = {
  organizationId?: string | null;
  employee?: { organizationId?: string | null };
  organization?: {
    id?: string | null;
    planType?: string | number | null;
    pricingTypeId?: string | number | null;
    planName?: string | null;
    pricingTypeName?: string | null;
    pricingType?: {
      typeId?: string | number | null;
      typeName?: string | null;
    };
  };
  planType?: string | number | null;
  pricingTypeId?: string | number | null;
  planName?: string | null;
  pricingTypeName?: string | null;
  pricingType?: {
    typeId?: string | number | null;
    typeName?: string | null;
  };
};

function normalizeOrganizationPlanType(
  planType?: string | number | null
): OrganizationPlanType {
  const normalizedType =
    planType == null ? "" : String(planType).trim().toUpperCase();

  if (
    normalizedType === "BASIC" ||
    normalizedType === "PRO" ||
    normalizedType === "ENTERPRISE"
  ) {
    return normalizedType as OrganizationPlanType;
  }

  if (normalizedType === "1") return "BASIC";
  if (normalizedType === "2") return "PRO";
  if (normalizedType === "3") return "ENTERPRISE";

  return null;
}

function extractPlanFromSource(source?: PlanSource | null): {
  organizationId: string | null;
  planType: OrganizationPlanType;
} {
  const organizationId =
    source?.organizationId ??
    source?.organization?.id ??
    source?.employee?.organizationId ??
    null;

  const planType = normalizeOrganizationPlanType(
    source?.planType ??
      source?.pricingTypeId ??
      source?.pricingType?.typeId ??
      source?.organization?.planType ??
      source?.organization?.pricingTypeId ??
      source?.organization?.pricingType?.typeId ??
      null
  );

  return { organizationId, planType };
}

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

  const iconName = (focused ? name : `${name}-outline`) as any;

  return (
    <Animated.View style={{ transform: [{ scale }, { translateY }] }}>
      <Ionicons name={iconName} size={22} color={color} />
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
          <Ionicons
            name={item.icon}
            size={24}
            color={item.disabled ? colors.textMuted : item.color}
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

// ─── Main Tab Layout ──────────────────────────────────────────────────────────
const TabLayout = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const tabActiveColor = colors.primary;
  const tabInactiveColor = colors.textMuted;
  const { user } = useAuthStore();
  const [planType, setPlanType] = useState<OrganizationPlanType>(() => {
    return normalizeOrganizationPlanType(user?.planType ?? null);
  });
  const isBasicPlan = planType === "BASIC";

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
  const flatListRef = useRef<Animated.FlatList<any>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const tabRoutes = useMemo(
    () =>
      isBasicPlan
        ? ["index", "attendance", "leave", "wfh", "TimeSlips"]
        : ["index", "attendance", "leave", "TimeSlips"],
    [isBasicPlan]
  );

  const tabBarItems = useMemo(
    () =>
      isBasicPlan
        ? ["index", "attendance", "leave", "wfh", "TimeSlips"]
        : ["index", "attendance", "services", "leave", "TimeSlips"],
    [isBasicPlan]
  );

  const router = useRouter();

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
    const cachedPlanType = normalizeOrganizationPlanType(user?.planType ?? null);
    if (cachedPlanType && cachedPlanType !== planType) {
      setPlanType(cachedPlanType);
    }
  }, [user?.planType, planType]);

  useEffect(() => {
    const checkWifiInfo = async () => {
      if (Platform.OS === "web" || !NetworkInfo) return;
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log("Location permission denied");
          return;
        }
      }
      try {
        const ssid = await NetworkInfo.getSSID();
        const bssid = await NetworkInfo.getBSSID();
        console.log("SSID:", ssid, "BSSID:", bssid);
      } catch (e) {
        console.log("Error fetching WiFi info:", e);
      }
    };
    checkWifiInfo();
  }, []);

  useEffect(() => {
    let active = true;

    const loadPlanType = async () => {
      try {
        const profileRes = await getAuthProfile();
        const profileData = (profileRes?.data ?? null) as PlanSource | null;
        const fromProfile = extractPlanFromSource(profileData);

        let resolvedPlanType = fromProfile.planType;

        if (!resolvedPlanType && fromProfile.organizationId) {
          try {
            const orgPlanRes = await getOrganizationPlan(fromProfile.organizationId);
            const orgPlan = (orgPlanRes?.data ?? null) as {
              planType?: string | number | null;
              pricingTypeId?: string | number | null;
              name?: string | null;
              planName?: string | null;
              pricingTypeName?: string | null;
              plan?: {
                planType?: string | number | null;
                pricingTypeId?: string | number | null;
                name?: string | null;
                planName?: string | null;
              };
            } | null;

            if (orgPlan) {
              resolvedPlanType = normalizeOrganizationPlanType(
                orgPlan.planType ??
                  orgPlan.pricingTypeId ??
                  orgPlan.plan?.planType ??
                  orgPlan.plan?.pricingTypeId ??
                  null
              );
            }
          } catch (error) {
            console.log("Failed to load organization plan:", error);
          }
        }

        if (active) {
          setPlanType((current) => resolvedPlanType ?? current ?? null);
        }
      } catch (error) {
        console.log("Failed to resolve plan type:", error);
      }
    };

    loadPlanType();

    return () => {
      active = false;
    };
  }, []);

  const serviceItems = [
    { icon: "checkmark-done-outline", name: "Attend",   color: colors.primary, disabled: false },
    { icon: "calendar-outline",       name: "Leave",    color: colors.primary, disabled: false },
    { icon: "chatbubble-ellipses-outline", name: "Messages", color: colors.primary, disabled: false },
    { icon: "card-outline",           name: "Payslips", color: colors.primary, disabled: false },
    { icon: "laptop-outline",         name: "WFH",      color: colors.primary, disabled: false },
    { icon: "newspaper-outline",      name: "Posts",    color: colors.primary, disabled: false },
    { icon: "document-text-outline",  name: "Policies", color: colors.primary, disabled: false },
    { icon: "help-circle-outline",    name: "Help",     color: colors.textMuted, disabled: true  },
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
    const routeMap: Record<string, string> = {
      Attend:   "/(tabs)/attendance",
      Leave:    "/(tabs)/leave",
      WFH:      "/(tabs)/wfh",
      Payslips: "/(screen)/payslips",
      Messages: "/(screen)/chat",
      Holidays: "/(screen)/ViewAllHolidays",
      Posts:    "/(screen)/posts",
      Policies: "/(tabs)/services",
    };
    if (routeMap[item.name]) {
      setTimeout(() => router.push(routeMap[item.name] as any), 350);
    }
  };

  const tabLabels = useMemo(
    () =>
      isBasicPlan
        ? ["Home", "Attendance", "Leave", "WFH", "Time Slip"]
        : ["Home", "Attendance", "Services", "Leave", "Time Slip"],
    [isBasicPlan]
  );

  const scrollX = useRef(new Animated.Value(0)).current;

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (idx !== activeIndex) setActiveIndex(idx);
    },
    [activeIndex]
  );

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
              <View style={[styles.dragHandle, { backgroundColor: colors.primary }]} />

              <ScrollView
                style={styles.sheetScrollView}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.sheetContent}>
                  <View style={styles.sheetHeader}>
                    <Ionicons name="grid" size={24} color={colors.primary} />
                    <Text style={[styles.sheetTitle, { color: colors.primary }]}>Services</Text>
                    <Text style={[styles.sheetDescription, { color: colors.textSecondary }]}>
                      Select a service from the options below
                    </Text>
                  </View>

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

        {/* Paged horizontal scroll — Instagram-like smoothness */}
        <Animated.FlatList
          ref={flatListRef}
          data={tabRoutes}
          keyExtractor={(item) => item}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          scrollEventThrottle={32}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          onMomentumScrollEnd={onMomentumEnd}
          renderItem={({ item: route }) => {
            const pageIndex = tabRoutes.indexOf(route);
            const distance = Math.abs(pageIndex - activeIndex);
            const shouldRender = distance <= 1;
            const Screen = TAB_SCREENS[route];
            return (
              <View style={{ width: SCREEN_WIDTH, flex: 1, backgroundColor: colors.background }}>
                {shouldRender && Screen ? <Screen /> : <View style={{ flex: 1 }} />}
              </View>
            );
          }}
        />

        {/* ── Custom Tab Bar (bottom) ── */}
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          {tabBarItems.map((route, idx) => {
            const isServicesTab = route === "services";
            const pageIndex = tabRoutes.indexOf(route);
            const isFocused = isServicesTab ? false : activeIndex === pageIndex;
            let icon = "home";
            if (route === "attendance") icon = "checkmark-done-circle";
            else if (route === "leave") icon = "calendar";
            else if (route === "wfh") icon = "laptop";
            else if (route === "TimeSlips") icon = "time";
            else if (route === "services") icon = "grid";

            return (
              <TouchableOpacity
                key={route}
                style={styles.tabItem}
                activeOpacity={0.7}
                onPress={() => {
                  if (isServicesTab) {
                    openBottomSheet();
                  } else {
                    flatListRef.current?.scrollToOffset({
                      offset: pageIndex * SCREEN_WIDTH,
                      animated: true,
                    });
                    setActiveIndex(pageIndex);
                  }
                }}
              >
                {isServicesTab ? (
                  <View style={[styles.serviceGlow, { shadowColor: colors.primary }]}>
                    <View style={[styles.serviceCircle, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
                      <Ionicons name="grid" size={22} color={colors.onPrimary} />
                    </View>
                  </View>
                ) : (
                  <AnimatedTabIcon
                    name={icon}
                    color={isFocused ? tabActiveColor : tabInactiveColor}
                    focused={isFocused}
                  />
                )}
                <Text
                  style={{
                    fontSize: moderateScale(11),
                    fontWeight: isFocused ? "700" : "500",
                    color: isFocused ? tabActiveColor : tabInactiveColor,
                    marginTop: isServicesTab ? 4 : 2,
                  }}
                >
                  {tabLabels[idx]}
                </Text>
              </TouchableOpacity>
            );
          })}
          
        </View>

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

// ─── Static tab screen imports (required for Metro bundler) ────────────────────
import HomeTab from "./index";
import AttendanceTab from "./attendance";
import LeaveTab from "./leave";
import WfhTab from "./wfh";
import TimeSlipsTab from "./TimeSlips";

const TAB_SCREENS: Record<string, React.ComponentType> = {
  index: HomeTab,
  attendance: AttendanceTab,
  leave: LeaveTab,
  wfh: WfhTab,
  TimeSlips: TimeSlipsTab,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Tab Bar (bottom) ──
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    height: verticalScale(64),
    paddingBottom: verticalScale(6),
    paddingTop: verticalScale(6),
    borderTopWidth: 1,
    elevation: 12,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(2),
  },
  serviceGlow: {
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    marginTop: verticalScale(-10),
  },
  serviceCircle: {
    width: horizontalScale(48),
    height: horizontalScale(48),
    borderRadius: horizontalScale(24),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
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

  // ── Tab Content Placeholder ──
  tabPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default TabLayout;