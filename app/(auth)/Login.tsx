import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Import AsyncStorage
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import CustomDialog from "../components/CustomDialog";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
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

  const [dialogVisible, setDialogVisible] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<string>("INFO");
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [dialogMessage, setDialogMessage] = useState<string>("");
  const [dialogButtons, setDialogButtons] = useState<Array<{text: string, onPress: () => void, style?: 'default' | 'cancel' | 'destructive'}>>([]);

  const showDialog = (
    type: string,
    title: string,
    message: string,
    buttons?: {text: string, onPress?: () => void, style?: 'default' | 'cancel' | 'destructive'}[]
  ) => {
    setDialogType(type);
    setDialogTitle(title);
    setDialogMessage(message);
    if (buttons && buttons.length > 0) {
      setDialogButtons(buttons.map(btn => ({
        text: btn.text,
        onPress: btn.onPress || (() => setDialogVisible(false)),
        style: btn.style
      })));
    } else {
      setDialogButtons([{ text: "OK", onPress: () => setDialogVisible(false) }]);
    }
    setDialogVisible(true);
  };

  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const router = useRouter();

  const { setAuth, initializeAuth } = useAuthStore();

  // Load saved credentials on component mount
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedRememberMe = await AsyncStorage.getItem("rememberMe");
        if (savedRememberMe === "true") {
          setRememberMe(true);
          const savedUserId = await AsyncStorage.getItem("lastUserId");
          const savedPassword = await AsyncStorage.getItem("lastPassword");
          if (savedUserId) setUserId(savedUserId);
          if (savedPassword) setPassword(savedPassword);
        }
        initializeAuth();
      } catch (error) {
        console.error("Error loading credentials:", error);
      }
    };
    loadCredentials();
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

      // Save credentials if "Remember Me" is checked
      if (rememberMe) {
        await AsyncStorage.setItem("lastUserId", userId);
        await AsyncStorage.setItem("lastPassword", password);
        await AsyncStorage.setItem("rememberMe", "true");
      } else {
        // Clear saved credentials if "Remember Me" is unchecked
        await AsyncStorage.removeItem("lastUserId");
        await AsyncStorage.removeItem("lastPassword");
        await AsyncStorage.setItem("rememberMe", "false");
      }

      router.replace("/(tabs)");
    } catch (error) {
      console.error("Login Error:", error);
      showDialog("DANGER", "Login Failed", error?.response?.data?.message || "Invalid credentials");
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
              <TouchableOpacity
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
              </TouchableOpacity>

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
      <CustomDialog isVisible={dialogVisible} type={dialogType as any} title={dialogTitle} message={dialogMessage} buttons={dialogButtons} onCancel={() => setDialogVisible(false)} />
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
    backgroundColor: "#f2f2f2ff",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blueCircle: {
    position: "absolute",
    width: horizontalScale(520),
    height: horizontalScale(520),
    borderRadius: horizontalScale(260),
    top: verticalScale(-220),
    left: horizontalScale(-250),
  },
  tealCircle: {
    position: "absolute",
    width: horizontalScale(360),
    height: horizontalScale(360),
    borderRadius: horizontalScale(180),
    top: verticalScale(-90),
    right: horizontalScale(-110),
  },
  logoContainer: {
    alignItems: "center",
    marginTop: verticalScale(200),
    marginBottom: verticalScale(40),
  },
  iconContainer: {
    width: horizontalScale(60),
    height: horizontalScale(60),
    borderRadius: moderateScale(8),
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
    paddingHorizontal: horizontalScale(30),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(40),
  },
  loginTitle: {
    fontSize: moderateScale(24),
    fontWeight: "800",
    textAlign: "center",
    marginBottom: verticalScale(40),
    letterSpacing: 1,
  },
  inputContainer: {
    marginBottom: verticalScale(20),
  },
  label: {
    fontSize: moderateScale(16),
    marginBottom: verticalScale(8),
    fontWeight: "800",
  },
  input: {
    borderWidth: 1,
    borderRadius: moderateScale(8),
    paddingHorizontal: horizontalScale(15),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(16),
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: moderateScale(8),
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: horizontalScale(15),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(16),
  },
  eyeIcon: {
    padding: moderateScale(12),
  },
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(30),
    marginTop: verticalScale(10),
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: horizontalScale(16),
    height: horizontalScale(16),
    borderWidth: 1,
    borderRadius: moderateScale(3),
    marginRight: horizontalScale(8),
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    fontSize: moderateScale(14),
  },
  forgotPassword: {
    fontSize: moderateScale(14),
    textDecorationLine: "underline",
  },
  loginButton: {
    paddingVertical: verticalScale(15),
    borderRadius: moderateScale(8),
    alignItems: "center",
    marginTop: verticalScale(10),
  },
  loginButtonText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  errorText: {
    fontSize: moderateScale(12),
    marginTop: verticalScale(4),
  },
});