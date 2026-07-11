import React from "react";
import { View } from "react-native";
import { AlertNotificationRoot } from "react-native-alert-notification";

export default function AlertProvider({ children }: { children: React.ReactNode }) {
  return (
    <AlertNotificationRoot>
      <View style={{ flex: 1 }}>{children}</View>
    </AlertNotificationRoot>
  );
}
