import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import AdminTabHeader from "app/components/AdminTabHeader";
import { darkTheme, lightTheme } from "../constants/colors";

const Services = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AdminTabHeader title="Services" />
      <Text>services</Text>
    </View>
  );
};

export default Services;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
