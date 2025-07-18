import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { darkTheme, lightTheme } from "../constants/colors";

const Forgetpassword = () => {
  const [email, setEmail] = useState("");

  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: colors.white }]}>
      {/* Background Design */}
      <View style={styles.backgroundContainer}>
        <View
          style={[styles.blueCircle, { backgroundColor: colors.secondary }]}
        />
        <View
          style={[styles.tealCircle, { backgroundColor: colors.primary }]}
        />
        {/* <View
          style={[styles.bottomCurve, { backgroundColor: colors.secondary }]}
        /> */}
      </View>

      {/* Logo/Icon Container */}
      <View style={styles.logoContainer}>
        <View style={[styles.iconContainer, { backgroundColor: colors.white }]}>
          <Ionicons name="person-outline" size={24} color={colors.primary} />
        </View>
      </View>

      {/* Login Form */}
      <View style={styles.formContainer}>
        <Text style={[styles.loginTitle, { color: colors.primary }]}>
          FORGET PASSWORD
        </Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.primary,
                backgroundColor: colors.white,
                color: colors.text,
              },
            ]}
            value={email}
            onChangeText={setEmail}
            placeholder=""
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.loginButtonText, { color: colors.white }]}>
            Log In
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "red",
  },
  backgroundContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blueCircle: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: "100%",
    top: -220,
    left: -250,
  },
  tealCircle: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    top: -90,
    right: -110,
  },
  bottomCurve: {
    position: "absolute",
    width: 480,
    height: 240,
    borderRadius: 240,
    bottom: -120,
    left: -40,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 200,
    marginBottom: 40,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 40,
    letterSpacing: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "800",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 12,
  },
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    marginTop: 10,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderRadius: 3,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    // Applied inline when checked
  },
  checkboxLabel: {
    fontSize: 14,
  },
  forgotPassword: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  loginButton: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Forgetpassword;
