import { FontAwesome5 } from "@expo/vector-icons";
import Header from "app/components/Header";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from "react-native";
import {
  horizontalScale,
  moderateScale,
  verticalScale,
} from "utils/metrics";
import { darkTheme, lightTheme } from "../constants/colors";

const ServicesWeb = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const router = useRouter();

  const serviceItems = [
    {
      icon: "calendar-check",
      name: "Attendance",
      color: "#026D94",
      description: "View and manage attendance records",
      route: "/(tabs)/attendance",
    },
    {
      icon: "calendar-alt",
      name: "Leave",
      color: "#026D94",
      description: "Apply and track leave requests",
      route: "/(tabs)/leave",
    },
    {
      icon: "clock",
      name: "Time Slip",
      color: "#026D94",
      description: "Submit and approve time slips",
      route: "/(tabs)/TimeSlips",
    },
    {
      icon: "comment-alt",
      name: "Messages",
      color: "#026D94",
      description: "Internal messaging system",
      route: "/(screen)/chat",
    },
    {
      icon: "credit-card",
      name: "Payslips",
      color: "#026D94",
      description: "View your payslips",
      route: "/(screen)/payslips",
    },
    {
      icon: "home",
      name: "WFH",
      color: "#026D94",
      description: "Work from home requests",
      route: "/(tabs)/wfh",
    },
  ];

  const handleServicePress = (route: string) => {
    router.push(route);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Services" />
      <View style={styles.webContainer}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={styles.title}>Services</Text>
          <Text style={styles.subtitle}>
            Access all available services and features
          </Text>

          <ScrollView style={styles.servicesGrid}>
            {serviceItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.serviceCard, { backgroundColor: colors.white }]}
                onPress={() => handleServicePress(item.route)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.serviceIconContainer,
                    { backgroundColor: "#E1F4FF" },
                  ]}
                >
                  <FontAwesome5
                    name={item.icon}
                    size={32}
                    color={item.color}
                  />
                </View>
                <Text style={styles.serviceName}>{item.name}</Text>
                <Text style={styles.serviceDescription}>
                  {item.description}
                </Text>
                <View style={styles.serviceArrow}>
                  <FontAwesome5 name="arrow-right" size={16} color={item.color} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webContainer: {
    flex: 1,
    padding: horizontalScale(40),
    maxWidth: 1400,
    alignSelf: "center",
    width: "100%",
  },
  card: {
    borderRadius: moderateScale(12),
    padding: moderateScale(40),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#E8ECEF",
  },
  title: {
    fontSize: moderateScale(32),
    fontWeight: "700",
    color: "#035F91",
    marginBottom: verticalScale(8),
  },
  subtitle: {
    fontSize: moderateScale(16),
    color: "#666",
    marginBottom: verticalScale(40),
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  serviceCard: {
    width: "30%",
    minWidth: horizontalScale(200),
    padding: moderateScale(24),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: "#E8ECEF",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginRight: "3.33%",
    marginBottom: verticalScale(24),
  },
  serviceIconContainer: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(16),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(16),
  },
  serviceName: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#035F91",
    marginBottom: verticalScale(8),
    textAlign: "center",
  },
  serviceDescription: {
    fontSize: moderateScale(13),
    color: "#666",
    textAlign: "center",
    marginBottom: verticalScale(16),
    lineHeight: moderateScale(18),
  },
  serviceArrow: {
    marginTop: verticalScale(12),
  },
});

export default ServicesWeb;
