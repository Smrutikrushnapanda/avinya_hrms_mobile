import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";

interface ServicesWebProps {
  colors: any;
  onServicePress: (serviceName: string) => void;
}

const serviceItems = [
  {
    icon: "calendar-check",
    name: "Attendance",
    color: "#026D94",
    description: "View and manage attendance records",
  },
  {
    icon: "calendar-alt",
    name: "Leave",
    color: "#026D94",
    description: "Apply and track leave requests",
  },
  {
    icon: "clock",
    name: "Time Slip",
    color: "#026D94",
    description: "Submit and approve time slips",
  },
  {
    icon: "comment-alt",
    name: "Messages",
    color: "#026D94",
    description: "Internal messaging system",
  },
  {
    icon: "credit-card",
    name: "Payslips",
    color: "#026D94",
    description: "View your payslips",
  },
  {
    icon: "home",
    name: "WFH",
    color: "#026D94",
    description: "Work from home requests",
  },
];

export const ServicesWeb: React.FC<ServicesWebProps> = ({
  colors,
  onServicePress,
}) => {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.webContainer}>
        <View style={[styles.webCard, { backgroundColor: colors.white }]}>
          <Text style={styles.webTitle}>Services</Text>
          <Text style={styles.webSubtitle}>
            Access all available services and features
          </Text>

          <View style={styles.webServicesGrid}>
            {serviceItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.webServiceCard, { backgroundColor: colors.white }]}
                onPress={() => onServicePress(item.name)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.webServiceIconContainer,
                    { backgroundColor: "#E1F4FF" },
                  ]}
                >
                  <FontAwesome5
                    name={item.icon}
                    size={32}
                    color={item.color}
                  />
                </View>
                <Text style={styles.webServiceName}>{item.name}</Text>
                <Text style={styles.webServiceDescription}>
                  {item.description}
                </Text>
                <View style={styles.webServiceArrow}>
                  <FontAwesome5 name="arrow-right" size={16} color={item.color} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
  webCard: {
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
  webTitle: {
    fontSize: moderateScale(32),
    fontWeight: "700",
    color: "#035F91",
    marginBottom: verticalScale(8),
  },
  webSubtitle: {
    fontSize: moderateScale(16),
    color: "#666",
    marginBottom: verticalScale(40),
  },
  webServicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: horizontalScale(24),
    justifyContent: "space-between",
  },
  webServiceCard: {
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
  },
  webServiceIconContainer: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(16),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(16),
  },
  webServiceName: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#035F91",
    marginBottom: verticalScale(8),
    textAlign: "center",
  },
  webServiceDescription: {
    fontSize: moderateScale(13),
    color: "#666",
    textAlign: "center",
    marginBottom: verticalScale(16),
    lineHeight: moderateScale(18),
  },
  webServiceArrow: {
    marginTop: verticalScale(12),
  },
});
