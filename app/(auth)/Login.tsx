import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from "react-native";
import { login } from "../../api/api"; // Ensure path is correct
import useAuthStore from "../../store/useUserStore"; // Import the Zustand store
import { darkTheme, lightTheme } from "../constants/colors";

const Login = () => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userIdError, setUserIdError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const router = useRouter();

  const { setAuth, initializeAuth } = useAuthStore();

  // Initialize auth state on component mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const validateInputs = () => {
    let isValid = true;
    setUserIdError("");
    setPasswordError("");

    if (!userId.trim()) {
      setUserIdError("User ID is required");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateInputs()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await login({
        userName: userId,
        password: password,
      });

      const { access_token, user } = response.data;

      // Use Zustand store to set auth data
      await setAuth({ access_token, user });

      router.replace("/(tabs)");
    } catch (error) {
      console.error("Login Error:", error);
      Alert.alert(
        "Login Failed",
        error?.response?.data?.message || "Invalid credentials"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: "#ffffff" }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Background Design */}
          <View style={styles.backgroundContainer}>
            <View
              style={[styles.blueCircle, { backgroundColor: colors.secondary }]}
            />
            <View
              style={[styles.tealCircle, { backgroundColor: colors.primary }]}
            />
          </View>

          {/* Logo/Icon Container */}
          <View style={styles.logoContainer}>
            <View
              style={[styles.iconContainer, { backgroundColor: colors.white }]}
            >
              <Ionicons
                name="person-outline"
                size={24}
                color={colors.primary}
              />
            </View>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={[styles.loginTitle, { color: colors.primary }]}>
              LOGIN
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                User Id
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: userIdError ? colors.red : colors.primary,
                    backgroundColor: colors.white,
                    color: colors.text,
                  },
                ]}
                value={userId}
                onChangeText={setUserId}
                placeholder=""
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => {
                  // Focus next input if you have a ref
                }}
              />
              {userIdError ? (
                <Text style={[styles.errorText, { color: colors.red }]}>
                  {userIdError}
                </Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                Password
              </Text>
              <View
                style={[
                  styles.passwordContainer,
                  {
                    borderColor: passwordError ? colors.red : colors.primary,
                    backgroundColor: colors.white,
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.passwordInput,
                    {
                      borderColor: passwordError ? colors.red : colors.primary,
                      color: colors.text,
                    },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder=""
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.grey}
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? (
                <Text style={[styles.errorText, { color: colors.red }]}>
                  {passwordError}
                </Text>
              ) : null}
            </View>

            <View style={styles.optionsContainer}>
              {/* <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: colors.grey, backgroundColor: colors.white },
                    rememberMe && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  {rememberMe && (
                    <Ionicons name="checkmark" size={12} color={colors.white} />
                  )}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                  Remember Me
                </Text>
              </TouchableOpacity> */}

              <TouchableOpacity
                onPress={() => router.push("/(auth)/Forgetpassword")}
              >
                <Text
                  style={[styles.forgotPassword, { color: colors.primary }]}
                >
                  Forget Password ?
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[styles.loginButtonText, { color: colors.white }]}>
                  Log In
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: "100%",
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
    paddingBottom: 40,
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
  checkboxChecked: {},
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
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});
